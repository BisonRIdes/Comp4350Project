FROM python:3.12-slim

WORKDIR /app

# Every package must match a hash in requirements.lock and be a prebuilt wheel, so nothing can be
# swapped for a different file or run its own setup code during install.
COPY requirements.lock .
RUN pip install --no-cache-dir --require-hashes --only-binary :all: -r requirements.lock

COPY . .

RUN useradd --create-home appuser
USER appuser

# Render sets PORT at runtime; 8000 is the local default.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
