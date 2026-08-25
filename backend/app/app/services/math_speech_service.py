import re

class MathToSpeechService:
    @staticmethod
    def latex_to_spoken_portuguese(text: str) -> str:
        """
        Converte notações LaTeX inline ($...$) e display ($$...$$) 
        para português semântico acessível por áudio.
        """
        def replace_math(match):
            latex = match.group(1) or match.group(2)
            spoken = latex
            
            # Operações e símbolos fundamentais
            spoken = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r' fração com numerador \1 e denominador \2 ', spoken)
            spoken = re.sub(r'\\sqrt\{([^}]+)\}', r' raiz quadrada de \1 ', spoken)
            spoken = re.sub(r'\\sqrt\[([^\]]+)\]\{([^}]+)\}', r' raiz de índice \1 de \2 ', spoken)
            spoken = re.sub(r'\^\{([^}]+)\}', r' elevado a \1 ', spoken)
            spoken = re.sub(r'\^([0-9a-zA-Z])', r' elevado a \1 ', spoken)
            spoken = re.sub(r'_\{([^}]+)\}', r' de índice \1 ', spoken)
            spoken = re.sub(r'_([0-9a-zA-Z])', r' de índice \1 ', spoken)
            
            # Símbolos matemáticos
            spoken = spoken.replace('\\int', ' integral de ')
            spoken = spoken.replace('\\sum', ' somatório ')
            spoken = spoken.replace('\\infty', ' infinito ')
            spoken = spoken.replace('\\times', ' vezes ')
            spoken = spoken.replace('\\cdot', ' vezes ')
            spoken = spoken.replace('\\pm', ' mais ou menos ')
            spoken = spoken.replace('\\leq', ' menor ou igual a ')
            spoken = spoken.replace('\\geq', ' maior ou igual a ')
            spoken = spoken.replace('\\neq', ' diferente de ')
            spoken = spoken.replace('\\approx', ' aproximadamente ')
            spoken = spoken.replace('\\pi', ' pi ')
            spoken = spoken.replace('=', ' igual a ')
            spoken = spoken.replace('+', ' mais ')
            spoken = spoken.replace('-', ' menos ')
            spoken = spoken.replace('/', ' dividido por ')
            
            # Limpeza de chaves restantes
            spoken = spoken.replace('{', '').replace('}', '').strip()
            return f" [Equação: {spoken}] "

        # Regex para blocos de display ($$...$$) e inline ($...$)
        processed = re.sub(r'\$\$(.*?)\$\$|\$(.*?)\$', replace_math, text, flags=re.DOTALL)
        return re.sub(r'\s+', ' ', processed).strip()