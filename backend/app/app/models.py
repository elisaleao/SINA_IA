from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class GenerationType(str, Enum):
    SUMMARY = 'summary'
    QUIZ = 'quiz'
    STUDY_GUIDE = 'study_guide'


class AccessibilityProfileType(str, Enum):
    VISUAL = 'visual'
    DYSLEXIA = 'dyslexia'
    ADHD = 'adhd'
    COGNITIVE = 'cognitive'
    UNIVERSAL = 'universal'


class AccessibilityConfig(BaseModel):
    profile: AccessibilityProfileType = Field(
        default=AccessibilityProfileType.VISUAL,
        description='Perfil prioritário de acessibilidade',
    )
    plain_language: bool = Field(
        default=False,
        description='Se True, simplifica frases e vocabulário (Linguagem Simples)',
    )
    include_glossary: bool = Field(
        default=False,
        description='Gera glossário explicativo de termos técnicos complexos',
    )
    highlight_key_points: bool = Field(
        default=True,
        description='Destaca ideias centrais e termos-chave para foco visual',
    )


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
    accessibility_config: Optional[AccessibilityConfig] = Field(
        default_factory=AccessibilityConfig
    )
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
    accessibility_profile: Optional[str] = None
