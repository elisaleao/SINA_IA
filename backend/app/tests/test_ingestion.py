from unittest.mock import MagicMock

import cv2
import docx
import numpy as np
import pymupdf as fitz
import pytest

from app.services.ingestion_service import IngestionService


@pytest.mark.asyncio
async def test_process_pdf_with_text_and_equations(tmp_path):
    pdf_path = tmp_path / 'documento_teste.pdf'

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (50, 72),
        'Introdução à Física Quântica: A energia é calculada por $$E = m c^2$$. '
        'Além disso, $x + y = 10$ representa uma reta no plano.',
    )
    doc.save(str(pdf_path))
    doc.close()

    service = IngestionService()
    markdown, accessible, equations = await service.process_file(
        str(pdf_path), 'documento_teste.pdf'
    )

    assert '## Página 1' in markdown
    assert 'Física Quântica' in markdown
    assert len(equations) >= 2
    assert any('E = m c^2' in eq for eq in equations)
    assert any('x + y = 10' in eq for eq in equations)
    assert 'elevado a' in accessible or 'vezes' in accessible


@pytest.mark.asyncio
async def test_process_docx_headings_and_paragraphs(tmp_path):
    docx_path = tmp_path / 'aula_algoritmos.docx'

    doc = docx.Document()
    doc.add_heading('Estruturas de Dados', level=1)
    doc.add_heading('Pilhas e Filas', level=2)
    doc.add_paragraph(
        'Uma pilha segue a política LIFO com complexidade $O(1)$.'
    )
    doc.save(str(docx_path))

    service = IngestionService()
    markdown, accessible, equations = await service.process_file(
        str(docx_path), 'aula_algoritmos.docx'
    )

    assert '# Estruturas de Dados' in markdown
    assert '## Pilhas e Filas' in markdown
    assert 'complexidade' in markdown
    assert 'O(1)' in equations
    assert isinstance(accessible, str)


@pytest.mark.asyncio
async def test_process_plain_text(tmp_path):
    txt_path = tmp_path / 'notas.txt'
    txt_path.write_text(
        'Conteúdo em texto puro com fórmula: $a^2 + b^2 = c^2$.',
        encoding='utf-8',
    )

    service = IngestionService()
    markdown, accessible, equations = await service.process_file(
        str(txt_path), 'notas.txt'
    )

    assert 'Conteúdo em texto puro' in markdown
    assert 'a^2 + b^2 = c^2' in equations
    assert isinstance(accessible, str)


@pytest.mark.asyncio
async def test_process_image_without_client(tmp_path):
    img_path = tmp_path / 'exemplo.png'
    img = np.ones((50, 50, 3), dtype=np.uint8) * 255
    cv2.imwrite(str(img_path), img)

    service = IngestionService()
    service.client = None

    markdown, accessible, equations = await service.process_file(
        str(img_path), 'exemplo.png'
    )

    assert 'indisponível' in markdown.lower()
    assert equations == []
    assert isinstance(accessible, str)


@pytest.mark.asyncio
async def test_process_image_with_mocked_gemini(tmp_path):
    img_path = tmp_path / 'esquema.png'
    img = np.ones((60, 60, 3), dtype=np.uint8) * 128
    cv2.imwrite(str(img_path), img)

    service = IngestionService()
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = 'Transcrição OCR: Fórmula quadrática $x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$.'
    mock_client.models.generate_content.return_value = mock_response
    service.client = mock_client

    markdown, accessible, equations = await service.process_file(
        str(img_path), 'esquema.png'
    )

    assert 'Transcrição OCR' in markdown
    assert len(equations) > 0
    assert isinstance(accessible, str)


@pytest.mark.asyncio
async def test_process_scanned_pdf_page_triggers_gemini_ocr(tmp_path):
    pdf_path = tmp_path / 'digitalizado.pdf'

    # Cria PDF com página em branco (< 50 caracteres) para disparar OCR
    doc = fitz.open()
    doc.new_page()
    doc.save(str(pdf_path))
    doc.close()

    service = IngestionService()
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = 'Texto recuperado via OCR da imagem da página 1.'
    mock_client.models.generate_content.return_value = mock_response
    service.client = mock_client

    markdown, accessible, equations = await service.process_file(
        str(pdf_path), 'digitalizado.pdf'
    )

    assert '## Página 1' in markdown
    assert 'Texto recuperado via OCR' in markdown
    mock_client.models.generate_content.assert_called_once()
