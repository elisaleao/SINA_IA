import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = 'Accessible NotebookLM API'
    PROJECT_DESCRIPTION: str = 'Plataforma educacional adaptativa e universalmente acessível (SINA_IA)'
    VERSION: str = '1.0.0'
    API_V1_STR: str = '/api'
    ENVIRONMENT: str = 'development'

    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    UPLOAD_DIR: str = 'uploads'
    OUTPUT_DIR: str = 'outputs'
    DATABASE_URL: str = os.getenv(
        'DATABASE_URL',
        'postgresql+asyncpg://sina:sina_secret@localhost:5432/sina_ia',
    )
    CORS_ORIGINS: list[str] = ['*']

    # IA generativa: Gemini com a chave do usuário e Groq como fallback (ADR-0003)
    GEMINI_MODEL: str = 'gemini-3.5-flash'
    GROQ_API_KEY: str = ''
    GROQ_MODEL: str = 'qwen/qwen3.8-27b'

    # Síntese de voz (um único serviço em app/services/tts_service.py)
    EDGE_TTS_VOICE: str = 'pt-BR-FranciscaNeural'
    EDGE_TTS_RATE: str = '+0%'
    EDGE_TTS_VOLUME: str = '+0%'
    EDGE_TTS_PITCH: str = '+0Hz'

    # Arquivos temporários do /api/accessibility/process-stream
    ACCESSIBILITY_OUTPUT_DIR: str = ''
    ACCESSIBILITY_FILE_TTL_SECONDS: int = 24 * 60 * 60
    ACCESSIBILITY_MAX_UPLOAD_MB: int = 20

    # Envio de materiais (#15)
    MATERIAL_MAX_FILE_MB: int = 20
    MATERIAL_MAX_FILES: int = 10
    DOCX_MAX_UNCOMPRESSED_MB: int = 100

    JWT_SECRET: str = os.getenv(
        'JWT_SECRET', 'insecure-dev-secret-change-me-in-production-sina-ia'
    )
    JWT_ALGORITHM: str = 'HS256'
    LLM_KEY_ENCRYPTION_SECRET: str = (
        'insecure-dev-llm-key-secret-change-me-in-production'
    )
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7

    @property
    def materials_dir(self) -> str:
        """Originais e resultados dos materiais; nunca servido como estático."""
        return os.path.join(self.UPLOAD_DIR, 'materiais')

    class Config:
        env_file = '.env'
        extra = 'ignore'


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
