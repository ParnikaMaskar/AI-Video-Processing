from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import uuid
import boto3

from botocore.config import Config
from dotenv import load_dotenv

from database import engine, get_db, SessionLocal
from models import Base, Video
from tasks import process_video

# ==========================================
# Load Environment Variables
# ==========================================

load_dotenv()

# ==========================================
# Amazon S3 Client Configuration
# ==========================================

region = os.getenv("AWS_REGION", "ap-south-1")

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=region,
    endpoint_url=f"https://s3.{region}.amazonaws.com",
    config=Config(signature_version="s3v4")
)

# ==========================================
# FastAPI App Initialization
# ==========================================

app = FastAPI()

# ==========================================
# CORS Configuration
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Database Initialization
# ==========================================

Base.metadata.create_all(bind=engine)

# ==========================================
# Pydantic Request Models
# ==========================================

class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str


class ConfirmRequest(BaseModel):
    filename: str
    s3_key: str


# ==========================================
# Startup Cleanup
# Marks abandoned "processing" jobs as error
# ==========================================

def cleanup_stuck_videos():
    db = SessionLocal()

    try:
        stuck_count = (
            db.query(Video)
            .filter(Video.status.in_(["processing", "uploaded"]))
            .update({"status": "error"})
        )

        if stuck_count > 0:
            db.commit()
            print(
                f"[Startup] Cleaned up {stuck_count} stuck video jobs."
            )

    except Exception as e:
        print(f"[Startup Warning] Could not clean up videos: {e}")

    finally:
        db.close()


cleanup_stuck_videos()

# ==========================================
# Generate Pre-Signed Upload URL
# Frontend uploads directly to S3
# ==========================================


@app.post("/videos/presigned-url")
def get_presigned_url(request: PresignedUrlRequest):

    bucket = os.getenv("S3_BUCKET_NAME")

    if not bucket:
        raise HTTPException(
            status_code=500,
            detail="S3_BUCKET_NAME not configured"
        )

    unique_key = f"uploads/{uuid.uuid4()}-{request.filename}"

    try:
        url = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket,
                "Key": unique_key,
                "ContentType": request.content_type
            },
            ExpiresIn=900
        )

        return {
            "url": url,
            "key": unique_key
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# Confirm Upload
# Stores DB metadata + queues Celery task
# ==========================================

@app.post("/videos/confirm")
def confirm_upload(
    body: ConfirmRequest,
    db: Session = Depends(get_db)
):

    bucket = os.getenv("S3_BUCKET_NAME")
    region = os.getenv("AWS_REGION", "ap-south-1")

    s3_url = (
        f"https://{bucket}.s3.{region}.amazonaws.com/{body.s3_key}"
    )

    video = Video(
        filename=body.filename,
        s3_key=body.s3_key,
        filepath=s3_url,
        status="uploaded"
    )

    db.add(video)
    db.commit()
    db.refresh(video)

    # Queue Celery background task
    print("[DEBUG] Sending celery task")

    process_video.delay(video.id, body.s3_key)

    print("[DEBUG] Celery task sent")

    return {
        "id": video.id,
        "status": video.status
    }


# ==========================================
# List Videos
# Dynamically generates secure S3 GET URLs
# ==========================================

@app.get("/videos")
def list_videos(db: Session = Depends(get_db)):

    videos = (
        db.query(Video)
        .order_by(Video.created_at.desc())
        .all()
    )

    bucket = os.getenv("S3_BUCKET_NAME")

    results = []

    for video in videos:

        video_data = {
            "id": video.id,
            "filename": video.filename,
            "filepath": video.filepath,
            "s3_key": video.s3_key,
            "status": video.status,
            "thumbnail_path": video.thumbnail_path,
            "transcript": video.transcript,
            "created_at": video.created_at
        }

        # Generate temporary secure GET URL for video
        if video.s3_key and bucket:

            try:
                presigned_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": bucket,
                        "Key": video.s3_key
                    },
                    ExpiresIn=3600
                )

                video_data["filepath"] = presigned_url

            except Exception as e:
                print(
                    f"Error generating video URL "
                    f"for video {video.id}: {e}"
                )

        # Generate temporary secure GET URL for thumbnail
        if (
            video.thumbnail_path
            and video.thumbnail_path.startswith("thumbnails/")
            and bucket
        ):

            try:
                presigned_thumb_url = (
                    s3_client.generate_presigned_url(
                        "get_object",
                        Params={
                            "Bucket": bucket,
                            "Key": video.thumbnail_path
                        },
                        ExpiresIn=3600
                    )
                )

                video_data["thumbnail_path"] = presigned_thumb_url

            except Exception as e:
                print(
                    f"Error generating thumbnail URL "
                    f"for video {video.id}: {e}"
                )

        results.append(video_data)

    return results


# ==========================================
# Get Single Video
# ==========================================

@app.get("/videos/{video_id}")
def get_video(
    video_id: int,
    db: Session = Depends(get_db)
):

    video = (
        db.query(Video)
        .filter(Video.id == video_id)
        .first()
    )

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found"
        )

    video_data = {
        "id": video.id,
        "filename": video.filename,
        "filepath": video.filepath,
        "s3_key": video.s3_key,
        "status": video.status,
        "thumbnail_path": video.thumbnail_path,
        "transcript": video.transcript,
        "created_at": video.created_at
    }

    bucket = os.getenv("S3_BUCKET_NAME")

    # Generate temporary secure GET URL for video
    if video.s3_key and bucket:

        try:
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": bucket,
                    "Key": video.s3_key
                },
                ExpiresIn=3600
            )

            video_data["filepath"] = presigned_url

        except Exception as e:
            print(
                f"Error generating video URL "
                f"for video {video.id}: {e}"
            )

    # Generate temporary secure GET URL for thumbnail
    if (
        video.thumbnail_path
        and video.thumbnail_path.startswith("thumbnails/")
        and bucket
    ):

        try:
            presigned_thumb_url = (
                s3_client.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": bucket,
                        "Key": video.thumbnail_path
                    },
                    ExpiresIn=3600
                )
            )

            video_data["thumbnail_path"] = presigned_thumb_url

        except Exception as e:
            print(
                f"Error generating thumbnail URL "
                f"for video {video.id}: {e}"
            )

    return video_data


# ==========================================
# Delete Video
# Cleans DB + S3 video + S3 thumbnail
# ==========================================

@app.delete("/videos/{video_id}")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db)
):

    video = (
        db.query(Video)
        .filter(Video.id == video_id)
        .first()
    )

    if not video:
        raise HTTPException(
            status_code=404,
            detail="Video not found"
        )

    bucket = os.getenv("S3_BUCKET_NAME")

    # Delete original video from S3
    if video.s3_key and bucket:

        try:
            s3_client.delete_object(
                Bucket=bucket,
                Key=video.s3_key
            )

            print(
                f"[Cleanup] Deleted S3 video "
                f"'{video.s3_key}'"
            )

        except Exception as e:
            print(f"[Cleanup Error] {e}")

    # Delete thumbnail from S3
    if (
        video.thumbnail_path
        and video.thumbnail_path.startswith("thumbnails/")
        and bucket
    ):

        try:
            s3_client.delete_object(
                Bucket=bucket,
                Key=video.thumbnail_path
            )

            print(
                f"[Cleanup] Deleted S3 thumbnail "
                f"'{video.thumbnail_path}'"
            )

        except Exception as e:
            print(f"[Cleanup Error] {e}")

    # Delete DB record
    db.delete(video)
    db.commit()

    return {
        "message": "Video successfully deleted"
    }


# ==========================================
# Health Check Endpoint
# ==========================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# ==========================================
# Redis Health Check Endpoint
# Useful for debugging ElastiCache connection
# ==========================================

@app.get("/redis-health")
def redis_health():
    import redis
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    print(f"[DEBUG FastAPI] Testing Redis connection to: {redis_url}")
    try:
        r = redis.from_url(redis_url, socket_timeout=3)
        pong = r.ping()
        print(f"[DEBUG FastAPI] Redis PING successful: {pong}")
        return {
            "status": "healthy",
            "redis_url": redis_url,
            "ping": pong
        }
    except Exception as e:
        print(f"[ERROR FastAPI] Redis connection failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Redis connection failed: {e}"
        )
