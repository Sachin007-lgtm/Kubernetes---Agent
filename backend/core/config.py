import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App info
    PROJECT_NAME: str = "ai-kubernetes-agent"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Groq LLM (High-speed LPU inference)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    # OpenRouter LLM (Secondary/Fallback)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"

    # InsForge BaaS Backend
    INSFORGE_URL: str = "https://qc692nzg.us-east.insforge.app"
    INSFORGE_API_KEY: str = ""
    INSFORGE_ANON_KEY: str = ""
    INSFORGE_PROJECT_ID: str = "af257731-888e-4043-8839-a62a10937e9b"

    # Kubernetes Configuration
    KUBECONFIG_PATH: str = os.path.expanduser("~/.kube/config")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
