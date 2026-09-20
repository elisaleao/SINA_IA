# Regras Arquiteturais de Domínio Puro

Este documento estabelece as diretrizes para a modelagem e manutenção das regras de negócio puras no **SINA_IA**.

---

## 1. O que Constitui o Domínio Puro

No SINA_IA, o domínio engloba:
1. **Tradução Fonética de Matemática:** Regras de conversão de expressões LaTeX para linguagem falada em português (ex: frações, raízes, expoentes, somatórios, integrais).
2. **Normalização Semântica:** Limpeza e formatação de texto para leitores de tela sem caracteres ruidosos.
3. **Calibração Pedagógica:** Lógica de composição de parâmetros didáticos (níveis pedagógicos, tons e graus de detalhamento de fórmulas).
4. **Validações e Tipos de Domínio:** Invariantes de documentos, metadados de estudo e representações de erros estruturados.

---

## 2. As Três Leis do Domínio Puro

1. **Zero I/O:** Funções de domínio nunca fazem chamadas de rede, leitura/escrita em arquivos locais ou consultas a bancos de dados.
2. **Zero Frameworks de Infraestrutura:** O domínio não importa `fastapi`, `sqlalchemy`, `aiofiles`, `google.genai` ou `edge_tts`.
3. **Determinismo Total:** Dada uma mesma entrada, a saída deve ser sempre idêntica e sem efeitos colaterais.

---

## 3. Tratamento de Erros via Padrão Result

Para evitar exceções soltas que quebram o fluxo de execução, erros previsíveis de domínio (como erro de sintaxe de fórmula matemática ou violação de invariante pedagógica) devem ser expressos através de tipos de retorno explícitos em vez de `raise Exception`:

```python
# app/domain/result.py
from dataclasses import dataclass
from typing import Generic, TypeVar, Union

T = TypeVar("T")
E = TypeVar("E")

@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T
    is_ok: bool = True

@dataclass(frozen=True)
class Err(Generic[E]):
    error: E
    is_ok: bool = False

Result = Union[Ok[T], Err[E]]
```

---

## 4. Testabilidade

Testes unitários de módulos de domínio devem ser instantâneos (< 50ms) e nunca requerer mocks de banco de dados ou conexões de rede ativas. Se um teste de domínio necessitar de `conftest` de banco de dados, a fronteira arquitetural foi violada.

