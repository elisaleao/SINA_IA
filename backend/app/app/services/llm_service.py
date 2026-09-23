from typing import Optional

from app.models import (
    AccessibilityConfig,
    GenerationType,
    TeacherConfig,
)
from app.services.gemini_service import GeminiService
from app.services.math_speech_service import MathToSpeechService
from app.services.prompt_strategies import GENERATION_TASKS, guidelines_for


class LLMService:
    def __init__(self, gemini: GeminiService):
        self.gemini = gemini

    def _build_system_prompt(
        self,
        config: TeacherConfig,
        accessibility: Optional[AccessibilityConfig] = None,
    ) -> str:
        acc = accessibility or AccessibilityConfig()
        profile_guidelines = guidelines_for(acc)

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

        task_prompt = GENERATION_TASKS.get(gen_type, '')

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
