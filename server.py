from __future__ import annotations

import csv
import hashlib
import io
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE = Path(__file__).resolve().parent
DB_PATH = BASE / "cybersa.db"
DATABASE_URL = os.getenv("DATABASE_URL")
RESEARCHER_PASSWORD = os.getenv("CYBERSA_RESEARCHER_PASSWORD", "change-me")
if os.getenv("RENDER") and RESEARCHER_PASSWORD == "change-me":
    raise RuntimeError("Set CYBERSA_RESEARCHER_PASSWORD to a strong secret before deploying.")
if os.getenv("RENDER") and not DATABASE_URL:
    raise RuntimeError("Set DATABASE_URL to the managed production database before deploying.")

MODULES = {
    "M1": "Phishing & Social Engineering",
    "M2": "Cybercrimes Act 2021 & POPIA",
    "M3": "Password Security & Authentication",
    "M4": "Safe Internet & Social Media Use",
    "M5": "Cyber Attack Awareness",
}

app = FastAPI(title="CyberSA Research API", version="1.0.0")


class PostgresConnection:
    """Keep the existing SQLite-style query calls working with PostgreSQL."""

    def __init__(self, connection):
        self.connection = connection

    def execute(self, query, parameters=()):
        return self.connection.execute(query.replace("?", "%s"), parameters)

    def commit(self):
        self.connection.commit()

    def close(self):
        self.connection.close()


def now():
    return datetime.now(timezone.utc).isoformat()


def new_recovery_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    raw = "".join(secrets.choice(alphabet) for _ in range(20))
    return "-".join(raw[i:i + 4] for i in range(0, len(raw), 4))


def recovery_code_hash(code: str):
    normalized = "".join(code.upper().split()).replace("-", "")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def db():
    if DATABASE_URL:
        import psycopg
        from psycopg.rows import dict_row
        return PostgresConnection(psycopg.connect(DATABASE_URL, row_factory=dict_row))
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    con = db()
    id_column = "BIGSERIAL PRIMARY KEY" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT"
    learner_id_column = "BIGINT" if DATABASE_URL else "INTEGER"
    schema = f"""
        CREATE TABLE IF NOT EXISTS learners (
            id {id_column},
            participant_id TEXT UNIQUE NOT NULL,
            name TEXT,
            auth_token TEXT UNIQUE NOT NULL,
            recovery_code_hash TEXT,
            created_at TEXT NOT NULL,
            last_seen_at TEXT
        );
        CREATE TABLE IF NOT EXISTS module_activity (
            id {id_column},
            learner_id {learner_id_column} NOT NULL,
            module_id TEXT NOT NULL,
            started_at TEXT,
            last_seen_at TEXT,
            progress INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 0,
            completed_at TEXT,
            UNIQUE(learner_id, module_id),
            FOREIGN KEY(learner_id) REFERENCES learners(id)
        );
        CREATE TABLE IF NOT EXISTS attempts (
            id {id_column},
            learner_id {learner_id_column} NOT NULL,
            module_id TEXT NOT NULL,
            attempt_type TEXT NOT NULL DEFAULT 'knowledge_check',
            score INTEGER,
            total INTEGER,
            percentage INTEGER,
            answers_json TEXT,
            submitted_at TEXT NOT NULL,
            FOREIGN KEY(learner_id) REFERENCES learners(id)
        );
        CREATE TABLE IF NOT EXISTS feedback (
            id {id_column},
            learner_id {learner_id_column} NOT NULL,
            module_id TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            submitted_at TEXT NOT NULL,
            FOREIGN KEY(learner_id) REFERENCES learners(id)
        );
        """
    if DATABASE_URL:
        for statement in schema.split(";"):
            if statement.strip():
                con.execute(statement)
    else:
        con.executescript(schema)
    if DATABASE_URL:
        con.execute("ALTER TABLE learners ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT")
    else:
        columns = {row["name"] for row in con.execute("PRAGMA table_info(learners)").fetchall()}
        if "recovery_code_hash" not in columns:
            con.execute("ALTER TABLE learners ADD COLUMN recovery_code_hash TEXT")
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_learners_recovery_code_hash ON learners(recovery_code_hash)")
    con.commit()
    con.close()


init_db()


class LearnerCreate(BaseModel):
    name: str | None = None


class LearnerLogin(BaseModel):
    participant_id: str
    recovery_code: str


class ActivityIn(BaseModel):
    progress: int = 0


class AttemptIn(BaseModel):
    module_id: str
    score: int | None = None
    total: int | None = None
    percentage: int | None = None
    answers: dict = {}
    attempt_type: str = "knowledge_check"


class FeedbackIn(BaseModel):
    module_id: str
    rating: int
    comment: str = ""


def next_participant(con):
    row = con.execute(
        "SELECT participant_id FROM learners WHERE participant_id LIKE 'CS-%' ORDER BY id DESC LIMIT 1"
    ).fetchone()
    n = 1
    if row:
        try:
            n = int(row["participant_id"].split("-")[-1]) + 1
        except ValueError:
            pass
    while con.execute("SELECT 1 FROM learners WHERE participant_id=?", (f"CS-{n:04d}",)).fetchone():
        n += 1
    return f"CS-{n:04d}"


def learner_from_token(token: str | None):
    if not token:
        raise HTTPException(status_code=401, detail="Learner login required")
    con = db()
    row = con.execute("SELECT * FROM learners WHERE auth_token=?", (token,)).fetchone()
    con.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid learner session")
    return row


def researcher_guard(password: str | None):
    if not password or not secrets.compare_digest(password, RESEARCHER_PASSWORD):
        raise HTTPException(status_code=401, detail="Researcher authentication required")


@app.post("/api/learners")
def create_learner(payload: LearnerCreate):
    con = db()
    pid = next_participant(con)
    token = secrets.token_urlsafe(32)
    recovery_code = new_recovery_code()
    stamp = now()
    con.execute(
        "INSERT INTO learners(participant_id,name,auth_token,recovery_code_hash,created_at,last_seen_at) VALUES(?,?,?,?,?,?)",
        (pid, (payload.name or "").strip() or None, token, recovery_code_hash(recovery_code), stamp, stamp),
    )
    con.commit()
    con.close()
    return {"participant_id": pid, "name": payload.name or "", "token": token, "recovery_code": recovery_code}


@app.post("/api/learners/session")
def login_learner(payload: LearnerLogin):
    con = db()
    learner = con.execute(
        "SELECT * FROM learners WHERE participant_id=?",
        (payload.participant_id.strip().upper(),),
    ).fetchone()
    supplied_hash = recovery_code_hash(payload.recovery_code)
    if not learner or not learner["recovery_code_hash"] or not secrets.compare_digest(learner["recovery_code_hash"], supplied_hash):
        con.close()
        raise HTTPException(status_code=401, detail="Participant ID or recovery code is incorrect")
    token = secrets.token_urlsafe(32)
    stamp = now()
    con.execute("UPDATE learners SET auth_token=?, last_seen_at=? WHERE id=?", (token, stamp, learner["id"]))
    con.commit()
    con.close()
    return {"participant_id": learner["participant_id"], "name": learner["name"] or "", "token": token}


@app.get("/api/recovery-code")
def recovery_code_status(authorization: str | None = Header(default=None)):
    learner = learner_from_token(authorization.removeprefix("Bearer ") if authorization else None)
    return {"has_recovery_code": bool(learner["recovery_code_hash"])}


@app.post("/api/recovery-code")
def issue_recovery_code(authorization: str | None = Header(default=None)):
    learner = learner_from_token(authorization.removeprefix("Bearer ") if authorization else None)
    if learner["recovery_code_hash"]:
        return {"recovery_code": None}
    code = new_recovery_code()
    con = db()
    result = con.execute(
        "UPDATE learners SET recovery_code_hash=? WHERE id=? AND recovery_code_hash IS NULL",
        (recovery_code_hash(code), learner["id"]),
    )
    con.commit()
    con.close()
    return {"recovery_code": code if result.rowcount else None}


@app.post("/api/recovery-code/rotate")
def rotate_recovery_code(authorization: str | None = Header(default=None)):
    learner = learner_from_token(authorization.removeprefix("Bearer ") if authorization else None)
    code = new_recovery_code()
    con = db()
    con.execute("UPDATE learners SET recovery_code_hash=? WHERE id=?", (recovery_code_hash(code), learner["id"]))
    con.commit()
    con.close()
    return {"recovery_code": code}


@app.post("/api/logout")
def logout_learner(authorization: str | None = Header(default=None)):
    token = authorization.removeprefix("Bearer ") if authorization else None
    learner = learner_from_token(token)
    con = db()
    con.execute("UPDATE learners SET auth_token=? WHERE id=?", (secrets.token_urlsafe(32), learner["id"]))
    con.commit()
    con.close()
    return {"ok": True}


@app.get("/api/me")
def me(authorization: str | None = Header(default=None)):
    token = authorization.removeprefix("Bearer ") if authorization else None
    row = learner_from_token(token)
    return {"participant_id": row["participant_id"], "name": row["name"] or ""}


@app.get("/api/progress")
def learner_progress(authorization: str | None = Header(default=None)):
    learner = learner_from_token(authorization.removeprefix("Bearer ") if authorization else None)
    con = db()
    rows = con.execute(
        "SELECT module_id, completed, progress FROM module_activity WHERE learner_id=?",
        (learner["id"],),
    ).fetchall()
    attempts = con.execute(
        """SELECT module_id, percentage FROM attempts
           WHERE learner_id=? AND attempt_type='knowledge_check' AND percentage IS NOT NULL
           ORDER BY submitted_at, id""",
        (learner["id"],),
    ).fetchall()
    con.close()
    return {
        "completed_modules": [row["module_id"] for row in rows if row["completed"]],
        "module_progress": {row["module_id"]: row["progress"] for row in rows},
        "assessment_scores": {row["module_id"]: row["percentage"] for row in attempts},
    }


@app.post("/api/activity")
def activity(payload: ActivityIn, authorization: str | None = Header(default=None), x_module_id: str | None = Header(default=None)):
    if x_module_id not in MODULES:
        raise HTTPException(400, "Unknown module")
    learner = learner_from_token(authorization.removeprefix("Bearer ") if authorization else None)
    progress = max(0, min(100, payload.progress))
    stamp = now()
    con = db()
    max_progress = "GREATEST" if DATABASE_URL else "MAX"
    con.execute(
        f"""INSERT INTO module_activity(learner_id,module_id,started_at,last_seen_at,progress)
           VALUES(?,?,?,?,?)
           ON CONFLICT(learner_id,module_id) DO UPDATE SET
             last_seen_at=excluded.last_seen_at,
             progress={max_progress}(module_activity.progress, excluded.progress)""",
        (learner["id"], x_module_id, stamp, stamp, progress),
    )
    con.execute("UPDATE learners SET last_seen_at=? WHERE id=?", (stamp, learner["id"]))
    con.commit(); con.close()
    return {"ok": True}


@app.post("/api/attempts")
def attempt(payload: AttemptIn, authorization: str | None = Header(default=None)):
    if payload.module_id not in MODULES and payload.module_id != "POST":
        raise HTTPException(400, "Unknown module")
    learner = learner_from_token(authorization.removeprefix("Bearer ") if authorization else None)
    pct = payload.percentage
    if pct is None and payload.score is not None and payload.total:
        pct = round(payload.score / payload.total * 100)
    stamp = now()
    import json
    con = db()
    con.execute(
        "INSERT INTO attempts(learner_id,module_id,attempt_type,score,total,percentage,answers_json,submitted_at) VALUES(?,?,?,?,?,?,?,?)",
        (learner["id"], payload.module_id, payload.attempt_type, payload.score, payload.total, pct, json.dumps(payload.answers), stamp),
    )
    if payload.module_id in MODULES and payload.attempt_type != "post_assessment" and pct is not None and pct >= 70:
        con.execute(
            """INSERT INTO module_activity(learner_id,module_id,started_at,last_seen_at,progress,completed,completed_at)
               VALUES(?,?,?,?,100,1,?)
               ON CONFLICT(learner_id,module_id) DO UPDATE SET progress=100, completed=1, completed_at=excluded.completed_at, last_seen_at=excluded.last_seen_at""",
            (learner["id"], payload.module_id, stamp, stamp, stamp),
        )
    con.execute("UPDATE learners SET last_seen_at=? WHERE id=?", (stamp, learner["id"]))
    con.commit(); con.close()
    return {"ok": True, "percentage": pct, "passed": pct is not None and pct >= 70}


@app.post("/api/feedback")
def feedback(payload: FeedbackIn, authorization: str | None = Header(default=None)):
    if payload.module_id not in MODULES and payload.module_id != "POST":
        raise HTTPException(400, "Unknown module")
    if not 1 <= payload.rating <= 5:
        raise HTTPException(400, "Rating must be between 1 and 5")
    learner = learner_from_token(authorization.removeprefix("Bearer ") if authorization else None)
    con = db()
    con.execute("INSERT INTO feedback(learner_id,module_id,rating,comment,submitted_at) VALUES(?,?,?,?,?)", (learner["id"], payload.module_id, payload.rating, payload.comment.strip(), now()))
    con.commit(); con.close()
    return {"ok": True}


def research_data():
    con = db()
    learners = [dict(r) for r in con.execute("SELECT id,participant_id,name,created_at,last_seen_at FROM learners ORDER BY id").fetchall()]
    activities = [dict(r) for r in con.execute("SELECT * FROM module_activity").fetchall()]
    attempts = [dict(r) for r in con.execute("SELECT * FROM attempts ORDER BY submitted_at").fetchall()]
    feedback_rows = [dict(r) for r in con.execute("SELECT * FROM feedback ORDER BY submitted_at").fetchall()]
    con.close()
    return {"learners": learners, "activities": activities, "attempts": attempts, "feedback": feedback_rows}


@app.get("/api/research/summary")
def research_summary(x_researcher_password: str | None = Header(default=None)):
    researcher_guard(x_researcher_password)
    return research_data()


@app.get("/api/research/export.csv")
def research_export(x_researcher_password: str | None = Header(default=None)):
    researcher_guard(x_researcher_password)
    data = research_data()
    names = {x["id"]: x for x in data["learners"]}
    activities = {(x["learner_id"], x["module_id"]): x for x in data["activities"]}
    attempts = {}
    for a in data["attempts"]:
        attempts[(a["learner_id"], a["module_id"])] = a
    feedbacks = {}
    for f in data["feedback"]:
        feedbacks[(f["learner_id"], f["module_id"])] = f
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["Participant","Name","Module","Progress","Completed","Attempts","Latest Score %","Latest Attempt","Feedback Rating","Feedback Comment"])
    for l in data["learners"]:
        for mid, title in [*MODULES.items(), ("POST", "Post-assessment")]:
            ac = activities.get((l["id"], mid), {})
            aa = [a for a in data["attempts"] if a["learner_id"] == l["id"] and a["module_id"] == mid]
            a = aa[-1] if aa else {}
            f = feedbacks.get((l["id"], mid), {})
            writer.writerow([l["participant_id"], l["name"] or "", title, ac.get("progress",0), "Yes" if ac.get("completed") else "No", len(aa), a.get("percentage", ""), a.get("submitted_at", ""), f.get("rating", ""), f.get("comment", "")])
    return StreamingResponse(iter([out.getvalue()]), media_type="text/csv", headers={"Content-Disposition":"attachment; filename=cybersa-research-results.csv"})


@app.post("/api/research/clear-prototype")
def clear_prototype_data(x_researcher_password: str | None = Header(default=None)):
    researcher_guard(x_researcher_password)
    if DATABASE_URL:
        raise HTTPException(403, "Prototype data can only be cleared from the local SQLite database.")
    con = db()
    con.execute("DELETE FROM feedback")
    con.execute("DELETE FROM attempts")
    con.execute("DELETE FROM module_activity")
    con.execute("DELETE FROM learners")
    con.commit()
    con.close()
    return {"ok": True}


@app.delete("/api/research/learners/{participant_id}")
def delete_research_learner(participant_id: str, x_researcher_password: str | None = Header(default=None)):
    researcher_guard(x_researcher_password)
    con = db()
    learner = con.execute("SELECT id FROM learners WHERE participant_id=?", (participant_id.upper(),)).fetchone()
    if not learner:
        con.close()
        raise HTTPException(404, "Participant not found")
    learner_id = learner["id"]
    con.execute("DELETE FROM feedback WHERE learner_id=?", (learner_id,))
    con.execute("DELETE FROM attempts WHERE learner_id=?", (learner_id,))
    con.execute("DELETE FROM module_activity WHERE learner_id=?", (learner_id,))
    con.execute("DELETE FROM learners WHERE id=?", (learner_id,))
    con.commit()
    con.close()
    return {"ok": True, "participant_id": participant_id.upper()}


@app.delete("/api/research/learners")
def delete_all_research_learners(x_researcher_password: str | None = Header(default=None)):
    researcher_guard(x_researcher_password)
    con = db()
    con.execute("DELETE FROM feedback")
    con.execute("DELETE FROM attempts")
    con.execute("DELETE FROM module_activity")
    con.execute("DELETE FROM learners")
    con.commit()
    con.close()
    return {"ok": True}


@app.post("/api/research/learners/{participant_id}/recovery-code")
def reset_research_learner_recovery_code(participant_id: str, x_researcher_password: str | None = Header(default=None)):
    researcher_guard(x_researcher_password)
    con = db()
    learner = con.execute(
        "SELECT id, participant_id FROM learners WHERE participant_id=?",
        (participant_id.strip().upper(),),
    ).fetchone()
    if not learner:
        con.close()
        raise HTTPException(404, "Participant not found")
    code = new_recovery_code()
    con.execute(
        "UPDATE learners SET recovery_code_hash=? WHERE id=?",
        (recovery_code_hash(code), learner["id"]),
    )
    con.commit()
    con.close()
    return {"participant_id": learner["participant_id"], "recovery_code": code}


@app.get("/")
def root():
    return FileResponse(BASE / "index.html")


@app.get("/health")
def health():
    con = db()
    con.execute("SELECT 1")
    con.close()
    return {"ok": True}

app.mount("/", StaticFiles(directory=BASE, html=True), name="static")
