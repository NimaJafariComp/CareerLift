"""Application configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    app_name: str = "CareerLift"
    app_version: str = "0.1.0"
    debug: bool = False

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # Neo4j
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = ""
    neo4j_password: str = ""

    # Ollama
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "gemma4:31b-cloud"

    # Kokoro TTS
    kokoro_url: str = "http://localhost:8880"
    kokoro_voice: str = "af_heart"

    # Auth (shared HS256 JWT between Next.js Auth.js and FastAPI)
    auth_jwt_secret: str = ""
    auth_jwt_issuer: str = "careerlift"
    auth_jwt_ttl_hours: int = 720

    # Bootstrapped seed user — auto-created on first startup so existing
    # data has an owner and there's an account that can sign in without OAuth.
    bootstrap_user_email: str = "user@careerlift.local"
    bootstrap_user_password: str = ""
    bootstrap_user_name: str = "user"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
    ]

    # Job Finder API Keys
    usajobs_api_key: str = ""
    usajobs_email: str = ""
    adzuna_app_id: str = ""
    adzuna_app_key: str = ""


settings = Settings()
