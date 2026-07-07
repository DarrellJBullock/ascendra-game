# Pinned to 3.13, NOT 3.14 — pydantic-core does not have prebuilt wheels for
# 3.14 yet and building from source fails; 3.13 matches the version the
# backend was developed/tested against.
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# No persistent volumes, no data store — this service is fully stateless.
EXPOSE 8000

# Bind to $PORT when the platform injects one (e.g. Render), else 8000 for
# local/docker-compose (where PORT is unset). Shell form so ${PORT:-8000}
# expands at runtime.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
