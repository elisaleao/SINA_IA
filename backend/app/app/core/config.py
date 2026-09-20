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

    JWT_SECRET: str = os.getenv(
        'JWT_SECRET', 'insecure-dev-secret-change-me-in-production-sina-ia'
    )
    JWT_ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7

    class Config:
        env_file = '.env'
        extra = 'ignore'


settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
