"""Authentication endpoints: identity, credentials login, and OAuth upsert.

Auth.js (NextAuth v5) on the Next.js side calls these endpoints from its
`authorize()` (Credentials provider) and `signIn()` callback (OAuth providers)
to obtain a FastAPI-issued JWT, which the frontend then forwards as
`Authorization: Bearer ...` on every API call.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.auth import (
    authenticate_password,
    create_access_token,
    get_current_user,
    upsert_oauth_user,
)
from app.core.database import get_db


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class OAuthUpsertRequest(BaseModel):
    provider: str = Field(..., description="e.g. 'google', 'microsoft-entra-id'")
    subject: str = Field(..., description="Stable provider user id")
    email: str
    name: Optional[str] = None
    image: Optional[str] = None


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)) -> dict:
    """Return the JWT-derived user identity. Used by Next.js to seed the
    session display."""
    return current_user


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db=Depends(get_db)) -> TokenResponse:
    """Email/password login for the bootstrapped seed user."""
    user = await authenticate_password(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        name=user.get("name"),
        role=user.get("role", "user"),
    )
    return TokenResponse(
        access_token=token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "role": user.get("role", "user"),
        },
    )


@router.post("/oauth-upsert", response_model=TokenResponse)
async def oauth_upsert(
    payload: OAuthUpsertRequest, db=Depends(get_db)
) -> TokenResponse:
    """Called by Auth.js on a successful OAuth sign-in. Ensures the User
    node exists in Neo4j and mints a FastAPI JWT keyed to that user."""
    user = await upsert_oauth_user(
        db,
        provider=payload.provider,
        subject=payload.subject,
        email=payload.email,
        name=payload.name,
        image=payload.image,
    )
    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        name=user.get("name"),
        role=user.get("role", "user"),
    )
    return TokenResponse(
        access_token=token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "image_url": user.get("image_url"),
            "role": user.get("role", "user"),
        },
    )
