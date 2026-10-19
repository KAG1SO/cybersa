# CyberSA Learn

Cybersecurity learning modules and a FastAPI research dashboard for participant progress, assessment attempts, and course feedback.

## Run locally on Windows

1. Install Python 3.13.
2. Run `run.bat` from PowerShell or File Explorer.
3. Open <http://127.0.0.1:8000>.

New learners receive a participant ID and one-time recovery code. Save the code privately; use the participant ID and code from **Sign in** to return to the same learner record. A signed-in learner can create a replacement code from the account menu.

Local development uses `cybersa.db` (SQLite). The local database is intentionally excluded from Git because it can contain participant records.

To create a source ZIP for sharing, run `python package_release.py`. It excludes Git metadata, virtual environments, local databases, and environment files.

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
- The `/health` endpoint checks database connectivity and reports whether the service is using PostgreSQL or local SQLite.
- Learner session tokens are stored as SHA-256 hashes. Existing plaintext tokens are hashed during startup migration, while existing browser sessions remain valid.
- Sign-in failures are rate-limited per researcher IP (5 failures), learner/IP pair (5 failures), and learner IP (60 failures) in a 15-minute window. Limits are stored in the configured database so they survive restarts.
- Authentication failures and active rate limits are logged without recording passwords, recovery codes, or participant IDs.
- Research CSV exports prefix potentially dangerous spreadsheet formulas in text cells.
