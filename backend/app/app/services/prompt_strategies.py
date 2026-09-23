"""Registros de instruções por perfil e por tipo de geração (#39a)."""

from typing import Callable

from app.models import (
    AccessibilityConfig,
    AccessibilityProfileType,
    GenerationType,
)


def _dyslexia_guidelines(config: AccessibilityConfig) -> str:
    text = """
        Adaptação para Dislexia e Leitura Fluida:
        - Aplique rigorosamente princípios de Linguagem Simples (Plain Language).
        - Escreva sentenças curtas na ordem direta (sujeito + verbo + objeto), com no máximo 20 palavras por frase.
        - Evite parágrafos densos e construções sintáticas complexas ou ambíguas.
        - Evite voz passiva.
        - Destaque em negrito (**termo**) conceitos nucleares para apoio visual."""
    if config.include_glossary:
        text += """
        - Ao final, inclua uma seção '### Glossário Acessível' explicando termos técnicos difíceis de forma simples e direta."""
    return text


def _adhd_guidelines(config: AccessibilityConfig) -> str:
    return """
        Adaptação para TDAH e Atenção Sustentada:
        - Divida o conteúdo em micro-blocos concisos (chunks curtos de 2 a 3 linhas).
        - Utilize bullet points objetivos em vez de parágrafos corridos.
        - Elimine redundâncias e introduções prolixas: seja direto ao ponto.
        - Destaque com clareza o objetivo prático do aprendizado."""


def _cognitive_guidelines(config: AccessibilityConfig) -> str:
    return """
        Adaptação para Apoio Cognitivo:
        - Utilize analogias concretas do dia a dia para ilustrar ideias abstratas.
        - Decomponha processos e cálculos em passos sequenciais numerados simples."""


def _universal_guidelines(config: AccessibilityConfig) -> str:
    return """
        Adaptação Universal (UDL):
        - Combine clareza textual com estrutura hierárquica equilibrada.
        - Destaque termos-chave e forneça explicações concisas."""


def _visual_guidelines(config: AccessibilityConfig) -> str:
    return """
        Adaptação para Deficiência Visual:
        - Mantenha títulos e listas estritamente hierárquicos para leitores de tela NVDA/JAWS.
        - Preserve com precisão a sintaxe LaTeX para garantir tradução fonética falada."""


PROFILE_GUIDELINES: dict[
    AccessibilityProfileType, Callable[[AccessibilityConfig], str]
] = {
    AccessibilityProfileType.VISUAL: _visual_guidelines,
    AccessibilityProfileType.DYSLEXIA: _dyslexia_guidelines,
    AccessibilityProfileType.ADHD: _adhd_guidelines,
    AccessibilityProfileType.COGNITIVE: _cognitive_guidelines,
    AccessibilityProfileType.UNIVERSAL: _universal_guidelines,
}


GENERATION_TASKS: dict[GenerationType, str] = {
    GenerationType.SUMMARY: (
        'Gere um resumo detalhado e estruturado com os pontos principais '
        'e fórmulas do seguinte conteúdo:\n\n'
    ),
    GenerationType.QUIZ: (
        'Crie 3 questões de fixação com gabarito comentado a partir do '
        'seguinte texto:\n\n'
    ),
    GenerationType.STUDY_GUIDE: (
        'Crie um guia de estudos em tópicos com passo a passo prático '
        'sobre o conteúdo:\n\n'
    ),
}


def guidelines_for(config: AccessibilityConfig) -> str:
    """Instruções de acessibilidade do prompt: Linguagem Simples sempre
    que `plain_language` for verdadeiro, senão a instrução do perfil."""
    if config.plain_language:
        return PROFILE_GUIDELINES[AccessibilityProfileType.DYSLEXIA](config)
    return PROFILE_GUIDELINES[config.profile](config)
