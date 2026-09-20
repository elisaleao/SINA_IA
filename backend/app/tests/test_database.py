import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import (
    AccessibilityPreferencesRecord,
    DocumentRecord,
    UserRecord,
)


@pytest.mark.asyncio
async def test_create_user_with_preferences(test_db_session):
    """Deve persistir um usuário com preferências de acessibilidade 1:1."""
    user_id = str(uuid.uuid4())
    pref_id = str(uuid.uuid4())

    user = UserRecord(
        id=user_id,
        email='aluno@sina.edu.br',
        hashed_password='argon2_hash_mock_token',
        full_name='Aluno Teste',
        role='aluno',
    )
    prefs = AccessibilityPreferencesRecord(
        id=pref_id,
        user_id=user_id,
        profile='dyslexia',
        plain_language=True,
        include_glossary=True,
        font_family='opendyslexic',
    )
    user.accessibility_preferences = prefs

    test_db_session.add(user)
    await test_db_session.commit()

    # Consulta
    result = await test_db_session.execute(
        select(UserRecord).where(UserRecord.id == user_id)
    )
    saved_user = result.scalars().first()

    assert saved_user is not None
    assert saved_user.email == 'aluno@sina.edu.br'
    assert saved_user.role == 'aluno'
    assert saved_user.version_id == 1
    assert saved_user.accessibility_preferences is not None
    assert saved_user.accessibility_preferences.profile == 'dyslexia'
    assert saved_user.accessibility_preferences.font_family == 'opendyslexic'


@pytest.mark.asyncio
async def test_optimistic_locking_increments_version(test_db_session):
    """Atualizações no registro devem incrementar o version_id automaticamente."""
    user_id = str(uuid.uuid4())
    user = UserRecord(
        id=user_id,
        email='versao@sina.edu.br',
        hashed_password='hash',
        full_name='Teste Lock',
    )
    test_db_session.add(user)
    await test_db_session.commit()

    assert user.version_id == 1

    # Primeira atualização
    user.full_name = 'Teste Lock Atualizado'
    await test_db_session.commit()
    assert user.version_id == 2

    # Segunda atualização
    user.role = 'professor'
    await test_db_session.commit()
    assert user.version_id == 3


@pytest.mark.asyncio
async def test_cascade_delete_removes_preferences(test_db_session):
    """Deletar o usuário deve remover automaticamente suas preferências 1:1 em cascata."""
    user_id = str(uuid.uuid4())
    pref_id = str(uuid.uuid4())

    user = UserRecord(
        id=user_id,
        email='cascata@sina.edu.br',
        hashed_password='hash',
        full_name='Teste Cascata',
    )
    prefs = AccessibilityPreferencesRecord(
        id=pref_id,
        user_id=user_id,
        profile='adhd',
    )
    user.accessibility_preferences = prefs

    test_db_session.add(user)
    await test_db_session.commit()

    # Deletar o usuário
    await test_db_session.delete(user)
    await test_db_session.commit()

    # Verificar que as preferências também foram removidas
    pref_result = await test_db_session.execute(
        select(AccessibilityPreferencesRecord).where(
            AccessibilityPreferencesRecord.id == pref_id
        )
    )
    assert pref_result.scalars().first() is None


@pytest.mark.asyncio
async def test_duplicate_email_raises_integrity_error(test_db_session):
    """Tentar cadastrar o mesmo e-mail duas vezes deve lançar IntegrityError."""
    user1 = UserRecord(
        id=str(uuid.uuid4()),
        email='duplicado@sina.edu.br',
        hashed_password='hash',
        full_name='User 1',
    )
    user2 = UserRecord(
        id=str(uuid.uuid4()),
        email='duplicado@sina.edu.br',
        hashed_password='hash',
        full_name='User 2',
    )

    test_db_session.add(user1)
    await test_db_session.commit()

    test_db_session.add(user2)
    with pytest.raises(IntegrityError):
        await test_db_session.commit()

    await test_db_session.rollback()


@pytest.mark.asyncio
async def test_document_linked_to_user(test_db_session):
    """Um documento pode ser associado opcionalmente a um usuário."""
    user_id = str(uuid.uuid4())
    doc_id = str(uuid.uuid4())

    user = UserRecord(
        id=user_id,
        email='autor@sina.edu.br',
        hashed_password='hash',
        full_name='Professor Docente',
        role='professor',
    )
    doc = DocumentRecord(
        id=doc_id,
        user_id=user_id,
        filename='calculo.pdf',
        raw_markdown='# Cálculo',
        accessible_text='Texto acessível',
    )

    test_db_session.add(user)
    test_db_session.add(doc)
    await test_db_session.commit()

    result = await test_db_session.execute(
        select(DocumentRecord).where(DocumentRecord.id == doc_id)
    )
    saved_doc = result.scalars().first()
    assert saved_doc is not None
    assert saved_doc.user_id == user_id
    assert saved_doc.version_id == 1
