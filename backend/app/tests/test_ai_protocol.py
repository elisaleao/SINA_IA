from types import SimpleNamespace

from app.core.protocols import AccessibilityAIProtocol
from app.services.fakes import FakeAccessibilityAI
from app.services.gemini_service import GeminiService


def test_gemini_service_conforms_to_the_protocol():
    assert isinstance(GeminiService(api_key=''), AccessibilityAIProtocol)


def test_fake_used_in_tests_conforms_to_the_protocol():
    assert isinstance(FakeAccessibilityAI(), AccessibilityAIProtocol)


def test_object_missing_a_method_does_not_conform():
    async def generate_text(**_):
        return ''

    partial = SimpleNamespace(
        is_configured=True,
        generate_text=generate_text,
        analyze_chart=generate_text,
        audit=generate_text,
        correct=generate_text,
    )

    assert not isinstance(partial, AccessibilityAIProtocol)
