from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ProblematicPod(BaseModel):
    name: str
    namespace: str
    status: str
    restart_count: int = 0
    message: Optional[str] = None


class PodsInvestigation(BaseModel):
    healthy: bool = True
    problematic_pods: List[ProblematicPod] = []


class InvestigationResult(BaseModel):
    pods: Dict[str, Any] = Field(default_factory=dict)
    logs: Dict[str, Any] = Field(default_factory=dict)
    events: Dict[str, Any] = Field(default_factory=dict)
    deployments: Dict[str, Any] = Field(default_factory=dict)
    network: Dict[str, Any] = Field(default_factory=dict)


class InvestigateRequest(BaseModel):
    namespace: str = Field(
        default="--all-namespaces",
        description="Kubernetes namespace to investigate. Use '--all-namespaces' for cluster-wide investigation.",
    )
    context: Optional[str] = Field(
        default=None,
        description="Kubernetes cluster context to target. If None, uses current active context.",
    )
    skip_ai: bool = Field(
        default=False,
        description="If true, run evidence collection only — skip AI reasoning (useful for testing).",
    )


class InvestigateResponse(BaseModel):
    status: str = "success"
    investigation: InvestigationResult
    diagnosis: Optional[Dict[str, Any]] = None  # Populated in Prompt 03 onwards
    ai_error: Optional[str] = None              # Populated if AI reasoning fails gracefully
