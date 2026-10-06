"""
Clusters API — endpoints for discovering and managing Kubernetes cluster contexts.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from loguru import logger

from services.cluster_service import ClusterService

router = APIRouter(prefix="/clusters", tags=["Clusters"])


class SwitchContextRequest(BaseModel):
    context: str = Field(..., description="Target cluster context name to switch to")


@router.get("")
async def list_clusters():
    """
    List all Kubernetes clusters / contexts configured on the machine via kubeconfig.
    Includes active context and connection reachability.
    """
    try:
        return ClusterService.get_clusters()
    except Exception as e:
        logger.error(f"Failed to list clusters: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/switch")
async def switch_cluster_context(req: SwitchContextRequest):
    """
    Switch the active kubectl context.
    """
    result = ClusterService.switch_context(req.context)
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Failed to switch cluster context"),
        )
    return result
