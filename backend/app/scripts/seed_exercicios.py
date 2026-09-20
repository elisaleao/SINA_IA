import asyncio
import json
import os
import uuid

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, ExerciseRecord
from app.services.math_speech_service import MathToSpeechService


async def _seed_data(session: AsyncSession) -> tuple[int, int]:
    fixture_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        'fixtures',
        'exercicios.json',
    )
    if not os.path.exists(fixture_path):
        print(f'Fixture não encontrada em {fixture_path}')
        return 0, 0

    with open(fixture_path, encoding='utf-8') as f:
        items = json.load(f)

    inserted = 0
    skipped = 0

    for item in items:
        stmt = select(ExerciseRecord).where(
            ExerciseRecord.enunciado == item['enunciado'],
            ExerciseRecord.materia_id == item['materia_id'],
        )
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            skipped += 1
            continue

        enunciado_falado = MathToSpeechService.latex_to_spoken_portuguese(
            item['enunciado']
        )

        rec = ExerciseRecord(
            id=str(uuid.uuid4()),
            materia_id=item['materia_id'],
            enunciado=item['enunciado'],
            enunciado_falado=enunciado_falado,
            codigo=item.get('codigo'),
            linguagem=item.get('linguagem'),
            resposta_correta=item['resposta_correta'],
            explicacao=item['explicacao'],
            fonte='manual',
            status='publicado',
        )
        session.add(rec)
        inserted += 1

    await session.commit()
    return inserted, skipped


async def seed(session: Optional[AsyncSession] = None) -> tuple[int, int]:
    if session is not None:
        inserted, skipped = await _seed_data(session)
    else:
        async with AsyncSessionLocal() as sess:
            inserted, skipped = await _seed_data(sess)

    print(
        f'Seed concluído com sucesso: {inserted} inseridos, {skipped} ignorados (já existentes).'
    )
    return inserted, skipped



if __name__ == '__main__':
    asyncio.run(seed())
