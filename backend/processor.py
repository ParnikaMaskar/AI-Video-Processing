import whisper
import ffmpeg
import os

_model = None

def get_whisper_model():
    global _model
    if _model is None:
        print("[Whisper] Loading model 'base' (this may take a few seconds)...")
        _model = whisper.load_model("base")
        print("[Whisper] Model loaded successfully!")
    return _model

def generate_thumbnail(video_path: str, output_path: str):
    (
        ffmpeg
        .input(video_path, ss=1)          # grab frame at 1 second
        .output(output_path, vframes=1)
        .overwrite_output()
        .run(quiet=True)
    )

def transcribe_video(video_path: str) -> str:
    model = get_whisper_model()
    result = model.transcribe(video_path)
    return result["text"]