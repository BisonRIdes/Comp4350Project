FROM python:3.12-slim

WORKDIR /app

# Every package must match a hash in requirements.lock and be a prebuilt wheel, so nothing can be
# swapped for a different file or run its own setup code during install.
COPY requirements.lock .
RUN pip install --no-cache-dir --require-hashes --only-binary :all: -r requirements.lock

# Only the app itself, so tests, local settings and caches can't end up in the image.
# A new top-level module must be added here; CI's docker job imports the app to catch a missing one.
COPY main.py database.py models.py schemas.py ./
COPY routers/ routers/
COPY util/ util/

# The app user can create files in /app (e.g. a local SQLite database) but not change the code.
RUN useradd --create-home appuser && chown appuser /app
USER appuser

# Render sets PORT at runtime; 8000 is the local default.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
