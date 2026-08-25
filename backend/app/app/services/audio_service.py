import edge_tts
import os
import uuid
from config import settings

class AudioService:
    @staticmethod
    async def text_to_speech(text: str, voice: str = "pt-BR-AntonioNeural") -> str:
        """
        Sintetiza texto foneticamente acessível em arquivo MP3.
        """
        audio_filename = f"{uuid.uuid4()}.mp3"
        audio_path = os.path.join(settings.OUTPUT_DIR, audio_filename)
        
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(audio_path)
        
        return audio_filename