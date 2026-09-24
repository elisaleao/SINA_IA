from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import deps, routers
from app.core.config import settings
from app.database import close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # O schema é responsabilidade exclusiva do Alembic (alembic upgrade head).
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
app.include_router(routers.auth_router)
app.include_router(routers.documents_router)
app.include_router(routers.materials_router)
app.include_router(routers.content_router)
app.include_router(routers.audio_router)
app.include_router(routers.exercises_router)
app.include_router(routers.accessibility_router)

AudioService = deps.get_tts_client(None)
get_db = deps.get_db
__all__ = ['AudioService', 'app', 'get_db']
