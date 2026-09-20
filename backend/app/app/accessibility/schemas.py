from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


AdaptationLevel = Literal[1, 2, 3, 4]
StageName = Literal["upload", "extract", "detect", "convert", "audit", "correct", "tts"]
StageStatus = Literal["active", "done", "error"]


class MathDetection(BaseModel):
    is_math: bool
    score: int
    density: float


class AuditItem(BaseModel):
    problema: str = Field(min_length=1)


class AuditReport(BaseModel):
    status: Literal["ok", "problemas_encontrados"]
    itens: list[AuditItem] = Field(default_factory=list)


class ChartVisionResult(BaseModel):
    is_chart: bool = False
    title: str | None = None
    description: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ChartDescription(BaseModel):
    source_label: str
    title: str | None = None
    description: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ProcessResult(BaseModel):
    filename: str
    level: AdaptationLevel
    raw_text: str
    accessible_text: str
    math_detection: MathDetection
    charts: list[ChartDescription]
    audit: AuditReport
    text_download_url: str
    audio_url: str


class PipelineEvent(BaseModel):
    type: Literal["stage", "result", "error"]
    stage: StageName | None = None
    status: StageStatus | None = None
    message: str | None = None
    result: ProcessResult | None = None
