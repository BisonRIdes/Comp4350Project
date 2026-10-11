# Setting Up the FastAPI Dev Environment

> For Linux (bash or any similar shell, e.g. zsh).

## Prerequisites
`Python3` with `venv` and `pip`. On Debian/Ubuntu, install it with:
```bash
sudo apt install python3 python3-venv python3-pip
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