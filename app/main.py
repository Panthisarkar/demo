from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydub import AudioSegment
import io
import base64
import logging
import wave

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def validate_wav_file(file_content: bytes) -> bool:
    try:
        with io.BytesIO(file_content) as wav_io:
            with wave.open(wav_io, 'rb') as wave_file:
                # Check basic WAV file properties
                if wave_file.getnchannels() == 0:
                    return False
                if wave_file.getsampwidth() == 0:
                    return False
                if wave_file.getframerate() == 0:
                    return False
                return True
    except Exception as e:
        logger.error(f"WAV validation error: {str(e)}")
        return False

@app.post("/process_audio/")
async def process_audio(file: UploadFile = File(...)):
    logger.info(f"Received audio file: {file.filename}")
    
    try:
        # Read the file content
        audio_data = await file.read()
        logger.info(f"Read {len(audio_data)} bytes of audio data")

        # Validate WAV format
        if not validate_wav_file(audio_data):
            logger.error("Invalid WAV file format")
            raise HTTPException(status_code=400, detail="Invalid audio file format")

        # Process the audio using pydub
        logger.info("Processing audio with pydub")
        audio = AudioSegment.from_wav(io.BytesIO(audio_data))
        
        # Ensure consistent audio format
        processed_audio = audio.set_frame_rate(16000).set_channels(1)

        # Export the processed audio
        logger.info("Exporting processed audio")
        output_buffer = io.BytesIO()
        processed_audio.export(output_buffer, format="wav")
        output_buffer.seek(0)
        
        # Encode to base64
        base64_audio = base64.b64encode(output_buffer.read()).decode('utf-8')
        logger.info("Audio processing completed successfully")

        return JSONResponse(
            content={"audio": f"data:audio/wav;base64,{base64_audio}"},
            headers={
                "Access-Control-Allow-Origin": "http://127.0.0.1:5500"
            }
        )

    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}", exc_info=True)
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

