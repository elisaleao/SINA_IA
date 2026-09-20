from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import deps, routers
from app.core.config import settings
from app.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    try:
        yield
    finally:
        await close_db()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(routers.health_router)
app.include_router(routers.documents_router)
app.include_router(routers.content_router)
app.include_router(routers.audio_router)

ingestion_service = deps.get_ingestion_service()
llm_service = deps.get_llm_client()
AudioService = deps.get_tts_client()
get_db = deps.get_db
__all__ = ['AudioService', 'app', 'get_db', 'ingestion_service', 'llm_service']
