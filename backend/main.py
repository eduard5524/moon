import os
import json
import time
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from jose import jwt, JWTError
import httpx

# Configuration
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
DEEPSEEK_API_URL = os.environ.get("DEEPSEEK_API_URL", "http://localhost:11434/v1")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
DB_PATH = os.environ.get("DB_PATH", "/data/moon.db")

# Password hashing using hashlib + salt
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${h.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, h = stored_hash.split('$', 1)
        check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return check.hex() == h
    except (ValueError, AttributeError):
        return False


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    conn.commit()
    conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Moon API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== Models =====

class UserRegister(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class ChatMessage(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


# ===== Auth Helpers =====

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(authorization: str = Header(None), x_auth_token: str = Header(None)) -> dict:
    # Check X-Auth-Token first (used when tunnel basic auth occupies Authorization)
    auth_value = x_auth_token or authorization
    if not auth_value or not auth_value.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_value.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ===== Auth Routes =====

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    conn = get_db()
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            (user.username, user.email)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Username or email already exists")

        password_hash = hash_password(user.password)
        cursor = conn.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (user.username, user.email, password_hash)
        )
        conn.commit()
        user_id = cursor.lastrowid

        token = create_access_token({"sub": str(user_id), "username": user.username})
        return TokenResponse(access_token=token, username=user.username)
    finally:
        conn.close()


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    conn = get_db()
    try:
        db_user = conn.execute(
            "SELECT * FROM users WHERE username = ?", (user.username,)
        ).fetchone()
        if not db_user or not verify_password(user.password, db_user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_access_token({"sub": str(db_user["id"]), "username": db_user["username"]})
        return TokenResponse(access_token=token, username=db_user["username"])
    finally:
        conn.close()


@app.get("/api/auth/me")
async def get_me(payload: dict = Depends(verify_token)):
    return {"user_id": payload["sub"], "username": payload["username"]}


# ===== Chat Routes =====

@app.post("/api/chat")
async def chat(msg: ChatMessage, payload: dict = Depends(verify_token)):
    user_id = int(payload["sub"])
    conn = get_db()

    # Save user message
    conn.execute(
        "INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)",
        (user_id, "user", msg.message)
    )
    conn.commit()

    # Get recent chat history for context
    history = conn.execute(
        "SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT 20",
        (user_id,)
    ).fetchall()
    conn.close()

    # Build messages for DeepSeek
    messages = [
        {
            "role": "system",
            "content": "You are Moon, an autonomous AI software engineer. You help users with coding, debugging, architecture, deployment, and any software engineering task. Be helpful, concise, and technically precise."
        }
    ]
    for row in reversed(history):
        messages.append({"role": row["role"], "content": row["content"]})

    # Stream response from DeepSeek
    async def generate():
        full_response = ""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                headers = {"Content-Type": "application/json"}
                if DEEPSEEK_API_KEY:
                    headers["Authorization"] = f"Bearer {DEEPSEEK_API_KEY}"

                async with client.stream(
                    "POST",
                    f"{DEEPSEEK_API_URL}/chat/completions",
                    headers=headers,
                    json={
                        "model": DEEPSEEK_MODEL,
                        "messages": messages,
                        "stream": True,
                        "temperature": 0.7,
                        "max_tokens": 2048,
                    },
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        yield f"data: {json.dumps({'error': f'DeepSeek API error: {response.status_code}'})}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                yield "data: [DONE]\n\n"
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_response += content
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                            except json.JSONDecodeError:
                                continue
        except httpx.ConnectError:
            yield f"data: {json.dumps({'error': 'Cannot connect to DeepSeek API. Make sure the model is running.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # Save assistant response
        if full_response:
            conn2 = get_db()
            conn2.execute(
                "INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)",
                (user_id, "assistant", full_response)
            )
            conn2.commit()
            conn2.close()

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/chat/history")
async def get_chat_history(payload: dict = Depends(verify_token)):
    user_id = int(payload["sub"])
    conn = get_db()
    history = conn.execute(
        "SELECT role, content, created_at FROM chat_history WHERE user_id = ? ORDER BY id ASC LIMIT 100",
        (user_id,)
    ).fetchall()
    conn.close()
    return [{"role": row["role"], "content": row["content"], "created_at": row["created_at"]} for row in history]


@app.delete("/api/chat/history")
async def clear_chat_history(payload: dict = Depends(verify_token)):
    user_id = int(payload["sub"])
    conn = get_db()
    conn.execute("DELETE FROM chat_history WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"status": "cleared"}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "moon-api"}
