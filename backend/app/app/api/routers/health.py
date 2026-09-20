"""Router para verificação de saúde e prontidão da API."""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=['Saúde'])


@router.get('/health')
@router.get('/api/health')
async def health_check():
    """Retorna o estado operacional e a versão da API."""
    return {
        'status': 'ok',
        'service': settings.PROJECT_NAME,
        'version': settings.VERSION,
    }
