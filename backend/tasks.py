import os
import boto3
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
from celery_app import celery_app
from database import SessionLocal
from models import Video




load_dotenv()

# S3 Client Configuration
region = os.getenv('AWS_REGION', 'ap-south-1')
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=region,
    endpoint_url=f"https://s3.{region}.amazonaws.com"
)

def setup_ffmpeg_in_worker():
    import glob
    winget_packages = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages')
    if os.path.exists(winget_packages):
        matches = glob.glob(os.path.join(winget_packages, '**', 'ffmpeg.exe'), recursive=True)
        if matches:
            ffmpeg_dir = os.path.dirname(matches[0])
            print(f"[FFmpeg Task Setup] Dynamically located FFmpeg in PATH: {ffmpeg_dir}")
            os.environ["PATH"] += os.pathsep + ffmpeg_dir

@celery_app.task(name="tasks.process_video")
def process_video(video_id: int, s3_key: str):
    import processor
    setup_ffmpeg_in_worker()
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            print(f"[Celery] Video {video_id} not found in DB.")
            return
        
        # 1. Update status to "processing"
        video.status = "processing"
        db.commit()
        db.refresh(video)
        print(f"[Celery] Processing Video {video_id} ('{video.filename}')...")
        
        # 2. Download video from S3 to temporary local file
        bucket = os.getenv("S3_BUCKET_NAME")
        os.makedirs("uploads", exist_ok=True)
        os.makedirs("thumbnails", exist_ok=True)
        
        local_video_path = f"uploads/{video_id}_{video.filename}"
        print(f"[Celery] Downloading from S3 bucket '{bucket}' key '{s3_key}' to '{local_video_path}'...")
        s3_client.download_file(bucket, s3_key, local_video_path)
        
        # 3. Generate thumbnail using ffmpeg
        thumb_path = f"thumbnails/{video_id}.jpg"
        print(f"[Celery] Generating thumbnail at '{thumb_path}'...")
        processor.generate_thumbnail(local_video_path, thumb_path)
        
        # Upload thumbnail to Amazon S3
        thumb_s3_key = f"thumbnails/{video_id}.jpg"
        print(f"[Celery] Uploading thumbnail to S3 bucket '{bucket}' key '{thumb_s3_key}'...")
        s3_client.upload_file(thumb_path, bucket, thumb_s3_key)
        
        # Clean up local thumbnail file
        try:
            os.remove(thumb_path)
            print(f"[Celery] Deleted local temporary thumbnail '{thumb_path}'")
        except Exception as e:
            print(f"[Celery] Warning: could not delete local temporary thumbnail: {e}")
        
        # 4. Transcribe using Whisper
        print(f"[Celery] Transcribing video using Whisper...")
        transcript = processor.transcribe_video(local_video_path)
        
        # 5. Clean up downloaded video file to save local storage
        try:
            os.remove(local_video_path)
            print(f"[Celery] Deleted temporary video download '{local_video_path}'")
        except Exception as e:
            print(f"[Celery] Warning: could not delete temporary video download: {e}")
        
        # 6. Save results to database
        video.thumbnail_path = thumb_s3_key
        video.transcript = transcript
        video.status = "done"
        db.commit()
        print(f"[Celery] Successfully processed Video {video_id}!")
    except Exception as e:
        print(f"[Celery] Error processing Video {video_id}: {e}")
        import traceback
        traceback.print_exc()
        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if video:
                video.status = "error"
                db.commit()
        except Exception as db_err:
            print(f"[Celery] Database error while marking video as error: {db_err}")
    finally:
        db.close()
