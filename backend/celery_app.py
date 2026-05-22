import os
import ssl
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

print(f"[DEBUG Celery] Initializing Celery with broker: {redis_url}")

# Create Celery instance
celery_app = Celery(
    "tasks",
    broker=redis_url,
    backend=redis_url,
    include=["tasks"]
)

celery_app.conf.update(
    task_track_started=True,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

if redis_url.startswith("rediss://"):
    print("[DEBUG Celery] Detected rediss:// scheme. Enabling SSL verification.")
    celery_app.conf.update(
        broker_use_ssl={
            'ssl_cert_reqs': ssl.CERT_REQUIRED
        },
        redis_backend_use_ssl={
            'ssl_cert_reqs': ssl.CERT_REQUIRED
        }
    )
