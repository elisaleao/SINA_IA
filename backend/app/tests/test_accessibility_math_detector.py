from app.accessibility.math_detector import detect_math_content


def test_texto_comum_nao_e_classificado_como_matematica():
    result = detect_math_content(
        'Este é um texto introdutório sobre acessibilidade e leitura de documentos.'
    )
    assert result.is_math is False


def test_expressao_matematica_ativa_regras_especializadas():
    text = """
    Considere x² + y² = 25.
    Também temos ∑ i=1 até n e a integral ∫₀¹ x dx.
    Se x ≥ 0, então √x pertence aos reais.
    """
    result = detect_math_content(text)
    assert result.is_math is True
    assert result.score >= 4
