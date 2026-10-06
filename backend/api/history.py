"""
History API — endpoints for querying and managing investigation history.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from services.history_service import HistoryService

router = APIRouter(prefix="/history", tags=["History"])


@router.get("")
async def get_history(limit: int = Query(default=20, ge=1, le=100)):
    """
    Get recent Kubernetes cluster investigations with diagnosis and root cause summaries.
    """
    try:
        items = HistoryService.get_all(limit=limit)
        return {
            "status": "success",
            "total": len(items),
            "investigations": items,
        }
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{investigation_id}")
async def get_investigation_detail(investigation_id: str):
    """
    Retrieve full investigation details including evidence payload and AI diagnosis.
    """
    item = HistoryService.get_by_id(investigation_id)
    if not item:
        raise HTTPException(
            status_code=404,
            detail=f"Investigation with ID '{investigation_id}' not found",
        )
    return {
        "status": "success",
        "investigation": item,
    }


@router.delete("")
async def clear_history():
    """
    Reset investigation history back to starter default state.
    """
    success = HistoryService.clear()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to reset history")
    return {"status": "success", "message": "History reset to default starter incidents"}
