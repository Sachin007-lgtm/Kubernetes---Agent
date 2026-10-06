from fastapi import APIRouter, HTTPException
from loguru import logger

from models.investigation import InvestigateRequest, InvestigateResponse, InvestigationResult
from services.investigation_service import InvestigationService
from services.history_service import HistoryService
from ai.agent import AIKubernetesAgent
from ai.llm_client import LLMClientError

router = APIRouter(tags=["Investigation"])

# Singleton AI agent — shared across requests
_ai_agent = AIKubernetesAgent()


@router.post("/investigate", response_model=InvestigateResponse)
async def investigate(request: InvestigateRequest = InvestigateRequest()):
    """
    Run a full Kubernetes cluster investigation with AI-powered diagnosis.

    Flow:
    1. Inspect pods for unhealthy states (CrashLoopBackOff, ImagePullBackOff, etc.)
    2. Collect logs from failing pods
    3. Analyze Kubernetes events for warnings
    4. Inspect deployment rollout health
    5. Check services and networking
    6. Send all evidence to AI agent (Senior Kubernetes SRE persona)
    7. Return root cause, fix, kubectl command, and confidence score
    8. Persist run to Investigation History

    Set skip_ai=true to run evidence collection only (useful for testing without an API key).
    """
    logger.info(
        f"POST /investigate — namespace={request.namespace}, context={request.context}, skip_ai={request.skip_ai}"
    )

    # ── Step 1-5: Kubernetes Evidence Collection ──────────────────────────────
    try:
        service = InvestigationService(
            namespace=request.namespace,
            context=request.context,
        )
        raw_result = await service.run_investigation()
    except Exception as e:
        logger.error(f"Kubernetes investigation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Kubernetes investigation failed: {str(e)}",
        )

    investigation = InvestigationResult(
        pods=raw_result.get("pods", {}),
        logs=raw_result.get("logs", {}),
        events=raw_result.get("events", {}),
        deployments=raw_result.get("deployments", {}),
        network=raw_result.get("network", {}),
    )

    cluster_name = request.context or "default-cluster"

    # ── Step 6-7: AI Reasoning ────────────────────────────────────────────────
    if request.skip_ai:
        logger.info("AI reasoning skipped (skip_ai=true)")
        HistoryService.save(
            cluster=cluster_name,
            namespace=request.namespace,
            investigation=investigation.model_dump(),
            diagnosis=None,
            status="success",
        )
        return InvestigateResponse(
            status="success",
            investigation=investigation,
            diagnosis=None,
        )

    try:
        diagnosis = await _ai_agent.diagnose(raw_result)
        logger.info(f"Diagnosis complete — root_cause: {diagnosis.get('root_cause', '')[:60]}")
        HistoryService.save(
            cluster=cluster_name,
            namespace=request.namespace,
            investigation=investigation.model_dump(),
            diagnosis=diagnosis,
            status="success",
        )
        return InvestigateResponse(
            status="success",
            investigation=investigation,
            diagnosis=diagnosis,
        )

    except LLMClientError as e:
        # AI failed — return evidence without diagnosis rather than a 500 error
        logger.warning(f"AI reasoning failed (returning evidence only): {e}")
        HistoryService.save(
            cluster=cluster_name,
            namespace=request.namespace,
            investigation=investigation.model_dump(),
            diagnosis=None,
            status="partial",
            ai_error=str(e),
        )
        return InvestigateResponse(
            status="partial",
            investigation=investigation,
            diagnosis=None,
            ai_error=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected AI error: {e}")
        HistoryService.save(
            cluster=cluster_name,
            namespace=request.namespace,
            investigation=investigation.model_dump(),
            diagnosis=None,
            status="partial",
            ai_error=str(e),
        )
        return InvestigateResponse(
            status="partial",
            investigation=investigation,
            diagnosis=None,
            ai_error=f"AI reasoning failed unexpectedly: {str(e)}",
        )
