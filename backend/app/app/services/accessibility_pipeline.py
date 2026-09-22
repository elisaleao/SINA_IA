from __future__ import annotations

from collections.abc import AsyncIterator

from app.schemas.accessibility import (
    ChartDescription,
    PipelineEvent,
    ProcessResult,
)
from app.services.accessibility_prompts import (
    LEVEL_LABELS,
    MASTER_PROMPT,
    MATH_PROMPT,
)
from app.services.document_extractor import DocumentExtractor
from app.services.file_store import GeneratedFileStore
from app.services.gemini_service import GeminiService
from app.services.math_detector import detect_math_content
from app.services.tts_service import TTSService


class AccessibilityPipeline:
    def __init__(
        self,
        ai: GeminiService | None = None,
        tts: TTSService | None = None,
        store: GeneratedFileStore | None = None,
        extractor: DocumentExtractor | None = None,
    ) -> None:
        self.ai = ai or GeminiService()
        self.extractor = extractor or DocumentExtractor(
            self.ai, max_visual_candidates=4
        )
        self.tts = tts or TTSService()
        self.store = store or GeneratedFileStore()

    async def run(
        self,
        *,
        filename: str,
        data: bytes,
        level: int,
    ) -> AsyncIterator[PipelineEvent]:
        try:
            if level not in LEVEL_LABELS:
                raise ValueError('Nível inválido. Use 1, 2, 3 ou 4.')

            yield self._stage('upload', 'done', 'Arquivo recebido e validado.')
            yield self._stage(
                'extract', 'active', 'Extraindo texto e conteúdo visual.'
            )
            extraction = await self.extractor.extract(filename, data)
            raw_text = extraction.text.strip()
            if not raw_text:
                # Um documento pode ter um gráfico sem texto. Mantemos uma marca explícita
                # para o módulo de visão, em vez de tratá-lo como arquivo vazio.
                if extraction.visual_candidates:
                    raw_text = '[Documento sem texto legível; conteúdo visual disponível.]'
                else:
                    raise ValueError(
                        'Não foi possível extrair conteúdo do arquivo.'
                    )
            yield self._stage(
                'extract',
                'done',
                f'Extração concluída: {len(raw_text)} caracteres.',
            )

            yield self._stage(
                'detect',
                'active',
                'Classificando matemática e analisando gráficos candidatos.',
            )
            math_detection = detect_math_content(raw_text)
            charts = await self._analyze_charts(extraction.visual_candidates)

            source_for_conversion = raw_text
            if charts:
                chart_block = '\n\n'.join(
                    f'{chart.source_label}'
                    + (f' — {chart.title}' if chart.title else '')
                    + f':\n{chart.description}'
                    for chart in charts
                )
                source_for_conversion += (
                    '\n\n--- DESCRIÇÕES DE GRÁFICOS DETECTADOS ---\n\n'
                    + chart_block
                )

            detected_message = (
                'Conteúdo matemático detectado; regras especializadas ativadas.'
                if math_detection.is_math
                else 'Sem matemática relevante pela heurística local.'
            )
            if charts:
                detected_message += f' {len(charts)} gráfico(s) descrito(s).'
            yield self._stage('detect', 'done', detected_message)

            yield self._stage(
                'convert',
                'active',
                f'Gerando versão acessível — {LEVEL_LABELS[level]}.',
            )
            system_prompt = MASTER_PROMPT.format(level=LEVEL_LABELS[level])
            if math_detection.is_math:
                system_prompt += '\n\n---\n\n' + MATH_PROMPT

            accessible_text = await self.ai.generate_text(
                system_instruction=system_prompt,
                user_text=source_for_conversion,
            )
            yield self._stage('convert', 'done', 'Texto acessível gerado.')

            yield self._stage(
                'audit',
                'active',
                'Auditando fidelidade entre original e versão acessível.',
            )
            audit = await self.ai.audit(source_for_conversion, accessible_text)
            yield self._stage(
                'audit',
                'done',
                (
                    'Auditoria concluída sem perdas relevantes.'
                    if audit.status == 'ok'
                    else f'Auditoria encontrou {len(audit.itens)} ponto(s).'
                ),
            )

            yield self._stage(
                'correct',
                'active',
                (
                    'Aplicando correções apontadas pela auditoria.'
                    if audit.itens
                    else 'Nenhuma correção necessária.'
                ),
            )
            if audit.status == 'problemas_encontrados' and audit.itens:
                accessible_text = await self.ai.correct(
                    accessible_text,
                    [item.problema for item in audit.itens],
                )
                yield self._stage('correct', 'done', 'Correções aplicadas.')
            else:
                yield self._stage(
                    'correct', 'done', 'Etapa de correção dispensada.'
                )

            text_path = self.store.new_path('.txt')
            text_path.write_text(accessible_text, encoding='utf-8')

            yield self._stage('tts', 'active', 'Gerando MP3 com Edge TTS.')
            audio_path = self.store.new_path('.mp3')
            await self.tts.synthesize(accessible_text, audio_path)
            yield self._stage('tts', 'done', 'Áudio MP3 gerado.')

            result = ProcessResult(
                filename=filename,
                level=level,
                raw_text=raw_text,
                accessible_text=accessible_text,
                math_detection=math_detection,
                charts=charts,
                audit=audit,
                text_download_url=f'/api/accessibility/files/{text_path.name}',
                audio_url=f'/api/accessibility/files/{audio_path.name}',
            )
            yield PipelineEvent(type='result', result=result)

        except Exception as exc:
            yield PipelineEvent(type='error', message=str(exc))

    async def _analyze_charts(self, candidates) -> list[ChartDescription]:
        charts: list[ChartDescription] = []
        for candidate in candidates[:4]:
            analysis = await self.ai.analyze_chart(
                image_bytes=candidate.image_bytes,
                mime_type=candidate.mime_type,
                context_text=candidate.context_text,
            )
            if analysis.is_chart and analysis.description.strip():
                charts.append(
                    ChartDescription(
                        source_label=candidate.label,
                        title=analysis.title,
                        description=analysis.description.strip(),
                        confidence=analysis.confidence,
                    )
                )
        return charts

    @staticmethod
    def _stage(stage: str, status: str, message: str) -> PipelineEvent:
        return PipelineEvent(
            type='stage',
            stage=stage,
            status=status,
            message=message,
        )
