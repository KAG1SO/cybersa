# CyberSA Learn

Cybersecurity learning modules and a FastAPI research dashboard for participant progress, assessment attempts, and course feedback.

## Run locally on Windows

1. Install Python 3.13.
2. Run `run.bat` from PowerShell or File Explorer.
3. Open <http://127.0.0.1:8000>.

New learners receive a participant ID and one-time recovery code. Save the code privately; use the participant ID and code from **Sign in** to return to the same learner record. A signed-in learner can create a replacement code from the account menu.

Local development uses `cybersa.db` (SQLite). The local database is intentionally excluded from Git because it can contain participant records.

## Deploy on Render

The `render.yaml` Blueprint creates a Frankfurt web service. Create a PostgreSQL database with your chosen provider, then set its connection string as `DATABASE_URL` in the Render service environment. Set a strong `CYBERSA_RESEARCHER_PASSWORD` there as well. Local development continues to use SQLite.

Build command: `pip install -r requirements.txt`

Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

Health check: `/health`

The first cloud deployment creates a clean database. Existing local test records are not uploaded.

## Data handling

- Keep `.env`, database files, access tokens, and provider credentials out of Git.
- Set deployment secrets in Render's environment settings.
- The researcher dashboard is protected by `CYBERSA_RESEARCHER_PASSWORD`.
- Treat participant data as sensitive and use the cloud database's backup and access controls before collecting research data.
