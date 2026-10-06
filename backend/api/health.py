from fastapi import APIRouter
from models.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint.
    
    Returns service health status.
    """
    return HealthResponse(
        status="healthy",
        service="ai-kubernetes-agent"
    )
