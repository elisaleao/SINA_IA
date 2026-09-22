from typing import Optional

from app.models import (
    AccessibilityConfig,
    AccessibilityProfileType,
    GenerationType,
    TeacherConfig,
)
from app.services.gemini_service import GeminiService
from app.services.math_speech_service import MathToSpeechService


class LLMService:
    def __init__(self, gemini: Optional[GeminiService] = None):
        self.gemini = gemini or GeminiService()

    def _build_system_prompt(
        self,
        config: TeacherConfig,
        accessibility: Optional[AccessibilityConfig] = None,
    ) -> str:
        acc = accessibility or AccessibilityConfig()
        profile_guidelines = ''

        if (
            acc.profile == AccessibilityProfileType.DYSLEXIA
            or acc.plain_language
        ):
            profile_guidelines = """
        Adaptação para Dislexia e Leitura Fluida:
        - Aplique rigorosamente princípios de Linguagem Simples (Plain Language).
        - Escreva sentenças curtas na ordem direta (sujeito + verbo + objeto), com no máximo 20 palavras por frase.
        - Evite parágrafos densos e construções sintáticas complexas ou ambíguas.
        - Evite voz passiva.
        - Destaque em negrito (**termo**) conceitos nucleares para apoio visual."""
            if acc.include_glossary:
                profile_guidelines += """
        - Ao final, inclua uma seção '### Glossário Acessível' explicando termos técnicos difíceis de forma simples e direta."""

        elif acc.profile == AccessibilityProfileType.ADHD:
            profile_guidelines = """
        Adaptação para TDAH e Atenção Sustentada:
        - Divida o conteúdo em micro-blocos concisos (chunks curtos de 2 a 3 linhas).
        - Utilize bullet points objetivos em vez de parágrafos corridos.
        - Elimine redundâncias e introduções prolixas: seja direto ao ponto.
        - Destaque com clareza o objetivo prático do aprendizado."""

        elif acc.profile == AccessibilityProfileType.COGNITIVE:
            profile_guidelines = """
        Adaptação para Apoio Cognitivo:
        - Utilize analogias concretas do dia a dia para ilustrar ideias abstratas.
        - Decomponha processos e cálculos em passos sequenciais numerados simples."""

        elif acc.profile == AccessibilityProfileType.UNIVERSAL:
            profile_guidelines = """
        Adaptação Universal (UDL):
        - Combine clareza textual com estrutura hierárquica equilibrada.
        - Destaque termos-chave e forneça explicações concisas."""

        else:
            profile_guidelines = """
        Adaptação para Deficiência Visual:
        - Mantenha títulos e listas estritamente hierárquicos para leitores de tela NVDA/JAWS.
        - Preserve com precisão a sintaxe LaTeX para garantir tradução fonética falada."""

        return f"""
        Você é um tutor acadêmico especializado em gerar materiais didáticos inclusivos e acessíveis.

        Parâmetros do Professor:
        - Nível Pedagógico: {config.pedagogical_level}
        - Detalhamento de Cálculos: {config.math_detail_level}
        - Tom: {config.tone}

        Diretrizes de Acessibilidade ({acc.profile.value}):
        {profile_guidelines}

        Diretrizes Gerais de Resposta:
        1. Formate todas as expressões matemáticas em LaTeX ($...$ para inline ou $$...$$ para display).
        2. Estruture em Markdown semântico (# para títulos principais, ## para subseções).
        3. Para questões (quizzes), inclua feedback explicativo passo a passo após a pergunta.
        """

    async def generate_content(
        self,
        text: str,
        gen_type: GenerationType,
        config: TeacherConfig,
        accessibility: Optional[AccessibilityConfig] = None,
    ) -> tuple[str, str]:
        if not self.gemini.is_configured:
            raise ValueError('GEMINI_API_KEY não configurada.')

        prompt_system = self._build_system_prompt(config, accessibility)

        task_prompt = ''
        if gen_type == GenerationType.SUMMARY:
            task_prompt = 'Gere um resumo detalhado e estruturado com os pontos principais e fórmulas do seguinte conteúdo:\n\n'
        elif gen_type == GenerationType.QUIZ:
            task_prompt = 'Crie 3 questões de fixação com gabarito comentado a partir do seguinte texto:\n\n'
        elif gen_type == GenerationType.STUDY_GUIDE:
            task_prompt = 'Crie um guia de estudos em tópicos com passo a passo prático sobre o conteúdo:\n\n'

        output_markdown = await self.gemini.generate_text(
            system_instruction=prompt_system,
            user_text=task_prompt + text[:15000],  # Limita tokens de entrada
        )
        spoken_output = MathToSpeechService.latex_to_spoken_portuguese(
            output_markdown
        )

        return output_markdown, spoken_output

    async def generate_text(self, prompt: str) -> str:
        if not self.gemini.is_configured:
            raise ValueError('GEMINI_API_KEY não configurada.')

        try:
            return await self.gemini.generate_text(
                system_instruction=None, user_text=prompt
            )
        except RuntimeError:
            # Resposta vazia: quem chama trata texto vazio (ex.: fallback do quiz)
            return ''
