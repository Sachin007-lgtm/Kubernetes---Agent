"""
Authentication API — lightweight user authentication & session management.

Supports:
- User login with email / password or 1-click SRE demo login
- Session validation
- Logout
"""

import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr, Field
from loguru import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory mock session store for demo & clean state
SESSIONS = {
    "default-sre-session": {
        "id": "user-sre-01",
        "name": "Alex Mercer",
        "email": "alex.mercer@cloudinfra.io",
        "role": "Senior Kubernetes SRE",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    }
}


class LoginRequest(BaseModel):
    email: str = Field(default="sre@cloudinfra.io", description="User email")
    password: str = Field(default="admin123", description="User password or InsForge token")
    role: Optional[str] = Field(default="Senior Kubernetes SRE", description="Role title")


class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: str
    token: str


@router.post("/login")
async def login(req: LoginRequest):
    """
    Authenticate user and return session token.
    Supports demo credentials: sre@cloudinfra.io / admin123 (or any valid credentials).
    """
    token = f"tok-{uuid.uuid4().hex[:12]}"
    user_name = req.email.split("@")[0].replace(".", " ").title() if "@" in req.email else "SRE Engineer"
    if not user_name:
        user_name = "Alex Mercer"

    profile = {
        "id": f"usr-{uuid.uuid4().hex[:6]}",
        "name": user_name,
        "email": req.email,
        "role": req.role or "Senior Kubernetes SRE",
        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    }
    SESSIONS[token] = profile

    logger.info(f"User logged in: {profile['email']} ({profile['name']})")
    return {
        "status": "success",
        "token": token,
        "user": profile,
    }


@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Validate session and return user profile.
    """
    if not authorization:
        # Fall back to default demo profile
        return {
            "authenticated": True,
            "user": SESSIONS["default-sre-session"],
            "token": "default-sre-session",
        }

    token = authorization.replace("Bearer ", "").strip()
    if token in SESSIONS:
        return {
            "authenticated": True,
            "user": SESSIONS[token],
            "token": token,
        }

    # For seamless dev/demo experience, return standard SRE profile
    return {
        "authenticated": True,
        "user": SESSIONS["default-sre-session"],
        "token": "default-sre-session",
    }


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Clear user session.
    """
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        SESSIONS.pop(token, None)
    return {"status": "success", "message": "Logged out successfully"}
