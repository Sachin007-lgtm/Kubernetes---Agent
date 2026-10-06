from api.router import api_router
from api.health import router as health_router
from api.investigate import router as investigate_router
from api.clusters import router as clusters_router
from api.history import router as history_router
from api.auth import router as auth_router

__all__ = [
    "api_router",
    "health_router",
    "investigate_router",
    "clusters_router",
    "history_router",
    "auth_router",
]
