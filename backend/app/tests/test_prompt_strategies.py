from types import SimpleNamespace

import pytest

from app.models import (
    AccessibilityConfig,
    AccessibilityProfileType,
    GenerationType,
)
from app.services.prompt_strategies import (
    GENERATION_TASKS,
    PROFILE_GUIDELINES,
    guidelines_for,
)


@pytest.mark.parametrize(
    ('profile', 'fragment'),
    [
        (AccessibilityProfileType.VISUAL, 'Deficiência Visual'),
        (AccessibilityProfileType.DYSLEXIA, 'Dislexia e Leitura Fluida'),
        (AccessibilityProfileType.ADHD, 'TDAH e Atenção Sustentada'),
        (AccessibilityProfileType.COGNITIVE, 'Apoio Cognitivo'),
        (AccessibilityProfileType.UNIVERSAL, 'Adaptação Universal (UDL)'),
    ],
)
def test_guidelines_for_each_profile(profile, fragment):
    config = AccessibilityConfig(profile=profile)
    assert fragment in guidelines_for(config)


def test_plain_language_overrides_profile_regardless_of_which_one():
    config = AccessibilityConfig(
        profile=AccessibilityProfileType.ADHD, plain_language=True
    )
    prompt = guidelines_for(config)
    assert 'Linguagem Simples' in prompt
    assert 'Dislexia e Leitura Fluida' in prompt
    assert 'TDAH' not in prompt


def test_glossary_added_when_plain_language_is_active():
    config = AccessibilityConfig(
        profile=AccessibilityProfileType.COGNITIVE,
        plain_language=True,
        include_glossary=True,
    )
    prompt = guidelines_for(config)
    assert 'Glossário Acessível' in prompt


def test_glossary_absent_without_plain_language_instructions():
    config = AccessibilityConfig(
        profile=AccessibilityProfileType.ADHD, include_glossary=True
    )
    prompt = guidelines_for(config)
    assert 'Glossário Acessível' not in prompt


@pytest.mark.parametrize(
    ('gen_type', 'fragment'),
    [
        (GenerationType.SUMMARY, 'Gere um resumo detalhado'),
        (GenerationType.QUIZ, 'Crie 3 questões de fixação'),
        (GenerationType.STUDY_GUIDE, 'Crie um guia de estudos'),
    ],
)
def test_generation_tasks_each_type(gen_type, fragment):
    assert GENERATION_TASKS[gen_type].startswith(fragment)


def test_registering_a_new_profile_does_not_require_editing_this_module():
    new_profile = 'perfil-de-teste-novo'
    PROFILE_GUIDELINES[new_profile] = lambda config: (
        'Instrução do perfil de teste novo.'
    )
    try:
        fake_config = SimpleNamespace(
            profile=new_profile, plain_language=False
        )
        assert (
            guidelines_for(fake_config) == 'Instrução do perfil de teste novo.'
        )
    finally:
        del PROFILE_GUIDELINES[new_profile]
