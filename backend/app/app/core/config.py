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
        'DATABASE_URL', 'sqlite+aiosqlite:///./study_platform.db'
    )
    CORS_ORIGINS: list[str] = ['*']

    class Config:
        env_file = '.env'
        extra = 'ignore'


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
