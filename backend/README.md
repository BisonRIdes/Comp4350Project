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
pytest --cov=main --cov=routers --cov-report=term-missing --cov-report=html
```
This prints a summary in the terminal and writes a detailed HTML report. Open `htmlcov/index.html` in a browser to view it.

## Run with Docker
This is the same image that Render deploys. Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) to be running.

From the `backend` folder:
```bash
docker build -t bisonrides-api .
docker run --rm -p 8000:8000 bisonrides-api
```
The API is available at `http://127.0.0.1:8000`. Check `http://127.0.0.1:8000/test`.

The container listens on the port in the `PORT` environment variable (default `8000`). Render sets `PORT` automatically. No other environment variables are required yet.
