FROM python:3.13-slim

RUN pip install --no-cache-dir "piper-tts[http]==1.8.0"

WORKDIR /voices
RUN python -m piper.download_voices pt_BR-faber-medium --data-dir /voices

EXPOSE 5000
CMD ["python", "-m", "piper.http_server", "-m", "pt_BR-faber-medium", "--data-dir", "/voices", "--host", "0.0.0.0", "--port", "5000"]
