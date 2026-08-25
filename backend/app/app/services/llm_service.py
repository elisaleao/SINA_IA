from google import genai
from config import settings
from models import TeacherConfig, GenerationType
from services.math_speech_service import MathToSpeechService

class LLMService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None

    async def generate_content(self, text: str, gen_type: GenerationType, config: TeacherConfig) -> tuple[str, str]:
        if not self.client:
            raise ValueError("GEMINI_API_KEY não configurada.")

        prompt_system = f"""
        Você é um tutor acadêmico especializado em gerar materiais didáticos para estudantes com deficiência visual.
        
        Parâmetros do Professor:
        - Nível Pedagógico: {config.pedagogical_level}
        - Detalhamento de Cálculos: {config.math_detail_level}
        - Tom: {config.tone}

        Diretrizes de Resposta:
        1. Formate todas as expressões matemáticas em LaTeX ($...$ ou $$...$$).
        2. Estruture em Markdown hierárquico claro (# para títulos principais, ## para subseções).
        3. Para questões (quizzes), inclua feedback explicativo passo a passo após a pergunta.
        """

        task_prompt = ""
        if gen_type == GenerationType.SUMMARY:
            task_prompt = "Gere um resumo detalhado e estruturado com os pontos principais e fórmulas do seguinte conteúdo:\n\n"
        elif gen_type == GenerationType.QUIZ:
            task_prompt = "Crie 3 questões de fixação com gabarito comentado a partir do seguinte texto:\n\n"
        elif gen_type == GenerationType.STUDY_GUIDE:
            task_prompt = "Crie um guia de estudos em tópicos com passo a passo prático sobre o conteúdo:\n\n"

        response = self.client.models.generate_content(
            model='gemini-1.5-flash',
            contents=[prompt_system, task_prompt + text[:15000]] # Limitando tokens de entrada
        )
        
        output_markdown = response.text
        spoken_output = MathToSpeechService.latex_to_spoken_portuguese(output_markdown)
        
        return output_markdown, spoken_output