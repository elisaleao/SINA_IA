# Plataforma Educacional Inclusiva

Base inicial de uma plataforma educacional inclusiva com front-end em Next.js + TypeScript e back-end em Python + FastAPI.

## Estrutura

- `frontend/`: interface inicial com navegacao entre home, cadastro do aluno, explicacao da plataforma e cadastro do professor.
- `backend/`: API minima com FastAPI e endpoint de saude.

## Como rodar o frontend

```powershell
Set-Location c:\dev\Fetin2026\frontend
npm install
npm run dev
```

## Como rodar o backend

```powershell
Set-Location c:\dev\Fetin2026\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

## Endpoints iniciais do backend

- `GET /`
- `GET /api/v1/health`

## Escopo desta fase

- Landing page com nome do sistema, imagem e tres botoes principais.
- Tela de cadastro do aluno.
- Tela com apresentacao breve do sistema.
- Tela de cadastro do professor com destaque para futura criacao de sala.
- Estrutura modular pronta para expansao.
