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

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
