from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class GenerationType(str, Enum):
    SUMMARY = 'summary'
    QUIZ = 'quiz'
    STUDY_GUIDE = 'study_guide'


class TeacherConfig(BaseModel):
    pedagogical_level: str = Field(
        default='basico', description='basico, intermediario, avancado'
    )
    math_detail_level: str = Field(
        default='direto',
        description='direto, passo_a_passo, explicativo',
    )
    tone: str = Field(
        default='formal', description='formal, socrático, encorajador'
    )


class GenerateRequest(BaseModel):
    document_id: str
    generation_type: GenerationType = GenerationType.SUMMARY
    teacher_config: Optional[TeacherConfig] = TeacherConfig()
    generate_audio: bool = True
    voice: str = 'pt-BR-AntonioNeural'  # Voz otimizada em PT-BR


class DocumentProcessResponse(BaseModel):
    document_id: str
    filename: str
    extracted_markdown: str
    accessible_text: str
    equations_found: list[str]


class GenerationResponse(BaseModel):
    document_id: str
    generation_type: str
    text_content: str
    spoken_content: str
    audio_url: Optional[str] = None
