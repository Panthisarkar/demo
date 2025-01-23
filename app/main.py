from typing import Union
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydub import AudioSegment
import io

app = FastAPI()

# CORS settings to allow communication with your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],  # Add your frontend URL here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None]= None):
    return {"item_id": item_id, "q": q}

@app.post("/process_audio/")
async def process_audio(file: UploadFile = File(...)):
    try:
        # Read uploaded audio file
        audio_data = await file.read()

        # Validate file type
        if not file.filename.lower().endswith('.wav'):
            return {"error": "Only WAV files are supported"}

        # Process audio with pydub
        audio = AudioSegment.from_file(io.BytesIO(audio_data), format="wav")
        
        # Ensure audio is in a standard format
        processed_audio = audio.set_frame_rate(16000)
        processed_audio = processed_audio.set_channels(1)  # Mono
        processed_audio = processed_audio.set_sample_width(2)  # 16-bit

        # Export to buffer
        output_buffer = io.BytesIO()
        processed_audio.export(output_buffer, format="wav")
        output_buffer.seek(0)

        return output_buffer.getvalue(), 200, {
    "Content-Disposition": f"attachment; filename=processed_audio.wav",
    "Content-Type": "audio/wav"
    }
    except Exception as e:
        print(f"Processing error: {e}")  # Server-side logging
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)