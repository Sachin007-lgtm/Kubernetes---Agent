from fastapi import APIRouter
from api.health import router as health_router
from api.investigate import router as investigate_router
from api.clusters import router as clusters_router
from api.history import router as history_router
from api.auth import router as auth_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(investigate_router)
api_router.include_router(clusters_router)
api_router.include_router(history_router)
api_router.include_router(auth_router)
