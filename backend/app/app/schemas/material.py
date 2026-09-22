import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel

MaterialStatus = Literal['enviado', 'processando', 'pronto', 'erro']


class MaterialSummary(BaseModel):
    id: str
    nome_original: str
    mime: Optional[str] = None
    tamanho_bytes: Optional[int] = None
    status: MaterialStatus
    erro_mensagem: Optional[str] = None
    nivel: Optional[int] = None
    ambiente_id: Optional[str] = None
    reaproveitado: bool = False
    criado_em: datetime.datetime


class MaterialDetail(MaterialSummary):
    atualizado_em: datetime.datetime
    texto_original: Optional[str] = None
    texto_acessivel: Optional[str] = None
    resultado: Optional[dict[str, Any]] = None
    audio_url: Optional[str] = None


class MaterialUploadResponse(BaseModel):
    materiais: list[MaterialSummary]


class MaterialFileError(BaseModel):
    arquivo: str
    erro: str
