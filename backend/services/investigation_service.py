from typing import Any, Dict, Optional
from loguru import logger

from kubernetes.pod_inspector import inspect_pods
from kubernetes.log_collector import collect_logs_for_pods
from kubernetes.event_analyzer import analyze_events
from kubernetes.deployment_inspector import inspect_deployments
from kubernetes.network_inspector import inspect_network


class InvestigationService:
    """
    Orchestrates the full Kubernetes investigation workflow.

    Flow:
        1. Check Pods
        2. Collect Logs (for problematic pods)
        3. Analyze Events
        4. Inspect Deployments
        5. Check Networking

    Returns a single structured investigation payload.
    """

    def __init__(
        self,
        namespace: str = "--all-namespaces",
        context: Optional[str] = None,
    ):
        self.namespace = namespace
        self.context = context

    async def run_investigation(self) -> Dict[str, Any]:
        """
        Run the end-to-end Kubernetes investigation.

        Returns:
            Structured investigation payload with pods, logs, events, deployments, network
        """
        logger.info(
            f"Starting Kubernetes investigation [namespace={self.namespace}, context={self.context}]"
        )

        # ── Step 1: Inspect Pods ──────────────────────────────────────────────
        logger.info("Step 1/5 — Inspecting pods")
        pod_findings = inspect_pods(self.namespace, context=self.context)

        # ── Step 2: Collect Logs for problematic pods ─────────────────────────
        logger.info("Step 2/5 — Collecting logs for problematic pods")
        problematic_pods = pod_findings.get("problematic_pods", [])
        if problematic_pods:
            log_findings = collect_logs_for_pods(problematic_pods, context=self.context)
        else:
            log_findings = {"message": "No problematic pods found — skipping log collection"}

        # ── Step 3: Analyze Events ─────────────────────────────────────────────
        logger.info("Step 3/5 — Analyzing Kubernetes events")
        event_findings = analyze_events(self.namespace, context=self.context)

        # ── Step 4: Inspect Deployments ───────────────────────────────────────
        logger.info("Step 4/5 — Inspecting deployments")
        deployment_findings = inspect_deployments(self.namespace, context=self.context)

        # ── Step 5: Check Networking ──────────────────────────────────────────
        logger.info("Step 5/5 — Inspecting network and services")
        network_findings = inspect_network(self.namespace, context=self.context)

        logger.info("Kubernetes investigation complete")

        return {
            "pods": pod_findings,
            "logs": log_findings,
            "events": event_findings,
            "deployments": deployment_findings,
            "network": network_findings,
        }
