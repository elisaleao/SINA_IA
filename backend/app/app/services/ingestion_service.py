import fitz  # PyMuPDF
import docx
import cv2
import os
import uuid
from PIL import Image
from google import genai
from config import settings
from services.math_speech_service import MathToSpeechService

class IngestionService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

    async def process_file(self, file_path: str, filename: str) -> tuple[str, str, list]:
        ext = os.path.splitext(filename)[1].lower()
        markdown_text = ""

        if ext == ".pdf":
            markdown_text = await self._process_pdf(file_path)
        elif ext in [".docx", ".doc"]:
            markdown_text = self._process_docx(file_path)
        elif ext in [".png", ".jpg", ".jpeg"]:
            markdown_text = await self._process_image(file_path)
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                markdown_text = f.read()

        # Extração de equações
        equations = fitz.re.findall(r'\$\$(.*?)\$\$|\$(.*?)\$', markdown_text)
        flat_equations = [eq[0] or eq[1] for eq in equations if eq[0] or eq[1]]

        # Gera versão falada/acessível para leitores de tela
        accessible_text = MathToSpeechService.latex_to_spoken_portuguese(markdown_text)

        return markdown_text, accessible_text, flat_equations

    async def _process_pdf(self, file_path: str) -> str:
        doc = fitz.open(file_path)
        full_text = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")

            # Se a página for escaneada/imagem sem texto
            if len(text.strip()) < 50 and self.client:
                pix = page.get_pixmap(dpi=150)
                img_path = f"{file_path}_p{page_num}.png"
                pix.save(img_path)
                ocr_text = await self._gemini_ocr(img_path)
                full_text.append(f"## Página {page_num + 1}\n{ocr_text}")
                if os.path.exists(img_path):
                    os.remove(img_path)
            else:
                full_text.append(f"## Página {page_num + 1}\n{text}")

        return "\n\n".join(full_text)

    def _process_docx(self, file_path: str) -> str:
        doc = docx.Document(file_path)
        paragraphs = []
        for p in doc.paragraphs:
            if p.text.strip():
                if p.style.name.startswith("Heading 1"):
                    paragraphs.append(f"# {p.text}")
                elif p.style.name.startswith("Heading 2"):
                    paragraphs.append(f"## {p.text}")
                else:
                    paragraphs.append(p.text)
        return "\n\n".join(paragraphs)

    async def _process_image(self, file_path: str) -> str:
        # Pre-processamento com OpenCV
        img = cv2.imread(file_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        processed_path = f"{file_path}_processed.png"
        cv2.imwrite(processed_path, gray)

        if self.client:
            ocr_text = await self._gemini_ocr(processed_path)
        else:
            ocr_text = "Texto extraído via OCR local indisponível (requer API Key)."

        if os.path.exists(processed_path):
            os.remove(processed_path)
        return ocr_text

    async def _gemini_ocr(self, image_path: str) -> str:
        with open(image_path, "rb") as img_file:
            image_bytes = img_file.read()

        response = self.client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[
                """Transcreva o documento nesta imagem em formato Markdown limpo.
                Regras Estritas para Acessibilidade:
                1. Todas as equações e cálculos matemáticos DEVEM ser escritas em sintaxe LaTeX válida ($...$ para inline e $$...$$ para bloco).
                2. Para tabelas, use Markdown formatado com cabeçalho.
                3. Para diagramas ou esquemas gráficos, crie uma descrição textual detalhada (alt-text).""",
                genai.types.Part.from_bytes(data=image_bytes, mime_type="image/png")
            ]
        )
        return response.text