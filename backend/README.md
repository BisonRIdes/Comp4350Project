# Setting Up the FastAPI Dev Environment

> For Linux and macOS (bash or any similar shell, e.g. zsh).

## Prerequisites
`Python 3` with `venv` and `pip`.

**Debian/Ubuntu**
```bash
sudo apt install python3 python3-venv python3-pip
```

**macOS** using Homebrew
```bash
brew install python@3.12
```

FastAPI requires Python 3.10 or newer. Because 3.10 is nearing end-of-life, use Python 3.11 or newer for development. Check your version with:
```bash
python3 --version
```

## Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run the app
```bash
uvicorn main:app --reload
```
The ``reload`` flag makes the server restart whenever you save changes.
The API is available at `http://127.0.0.1:8000`. You can test it manually with `Postman`.


## Run the tests
From the `backend` folder:
```bash
pytest
```

To also get a coverage report:
```bash
pytest --cov --cov-report=term-missing --cov-report=html
```
This measures all backend code except `tests/` (configured in `.coveragerc`), prints a summary in the terminal and writes a detailed HTML report. Open `htmlcov/index.html` in a browser to view it.

## Run with Docker
This is the same image that Render deploys. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) to be running.

From the `backend` folder:
```bash
docker build -t bisonrides-api .
docker run --rm -p 8000:8000 --env-file .env bisonrides-api
```
The API is available at `http://127.0.0.1:8000`. Check `http://127.0.0.1:8000/test`.

The container listens on the port in the `PORT` environment variable (default `8000`). Render sets `PORT` automatically. The app also needs the database variables below, which `--env-file .env` passes in (`.env` is not copied into the image).

## Deployment
The backend runs on Render at https://bisonrides-api.onrender.com. Every push to `dev` deploys automatically once the `backend` and `security` CI checks pass (the `deploy-backend` job in `.github/workflows/ci.yml`). Deploy logs are in the Render dashboard.

Render has `DATABASE_URL` set to the Supabase **Session pooler** connection string, in the form `postgresql+asyncpg://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres`. The direct `db.<project-ref>.supabase.co` host only works over IPv6, which Render doesn't support. Write any `@` in the password as `%40`.

Render also has `API_KEY` set to its own random key, not the placeholder from `.env.example`, which is public. Every endpoint except `/docs` needs that key in the `x-key` header, so Render's health check path is `/docs`. To try endpoints on the live API, open `/docs`, click **Authorize** and paste the key.

## Setting up Environment Variables
For the database setup, either provide a connection string directly through the `DATABASE_URL` environment variable, or set up environment variables for `user`, `password`, `host`, `port`, and `dbname`. `DATABASE_URL` will let you insert either a SQLite or PostgreSQL connection string, while the latter setup is fixed to PostgreSQL with the `asyncpg` drivers.

Set the `API_KEY` header to assign what key all requests to the backend should include.