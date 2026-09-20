FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=2.4.1 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_CREATE=false \
    PATH="/opt/poetry/bin:$PATH"

WORKDIR /app

# Instala dependências de sistema necessárias para OpenCV e PyMuPDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Instala o Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# Copia os manifestos de dependência
COPY pyproject.toml poetry.lock* ./

# Instala as dependências de produção diretamente no ambiente Python do container
RUN poetry install --no-root --without dev

# Copia o código da aplicação
COPY . .

# Cria diretórios para volumes
RUN mkdir -p uploads outputs data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

