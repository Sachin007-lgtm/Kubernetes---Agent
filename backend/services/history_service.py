"""
Investigation History Service — persists and retrieves cluster troubleshooting history.

Stores investigations in backend/data/investigations.json.
Provides realistic starter incidents for immediate demonstration out of the box.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from loguru import logger

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
HISTORY_FILE = os.path.join(DATA_DIR, "investigations.json")

# Starter incidents matching Prompt 04 and Prompt 05 requirements
STARTER_INCIDENTS = [
    {
        "id": "inc-001-crashloop",
        "timestamp": "2026-10-06T05:45:12Z",
        "cluster": "docker-desktop",
        "namespace": "production",
        "status": "success",
        "root_cause": "CrashLoopBackOff — Application startup failed due to missing DATABASE_URL environment variable",
        "confidence": 94,
        "confidence_label": "High",
        "diagnosis": {
            "root_cause": "CrashLoopBackOff: DATABASE_URL missing",
            "explanation": "The payment-service container crashed during bootstrap because the DATABASE_URL connection string is not defined in the pod environment or ConfigMap.",
            "fix": "Add the DATABASE_URL environment variable to the payment-service deployment spec.",
            "kubectl_command": "kubectl set env deployment/payment-service DATABASE_URL=postgresql://postgres:password@postgres-db:5432/payments -n production",
            "prevention": "Define envFrom ConfigMap references and add pre-flight environment checks to the container entrypoint.",
            "confidence": 94,
            "confidence_label": "High",
            "confidence_reasoning": [
                "Pod status is CrashLoopBackOff with 8 restarts",
                "Container logs explicitly report 'KeyError: DATABASE_URL not set'",
                "No previous pods survived more than 4 seconds",
            ],
        },
        "investigation": {
            "pods": {
                "healthy": False,
                "total_pods": 12,
                "problematic_pods": [
                    {
                        "name": "payment-service-7d8b5c469-xk9m2",
                        "namespace": "production",
                        "status": "CrashLoopBackOff",
                        "ready": "0/1",
                        "restart_count": 8,
                    }
                ],
            },
            "logs": {
                "production/payment-service-7d8b5c469-xk9m2": {
                    "pod": "payment-service-7d8b5c469-xk9m2",
                    "namespace": "production",
                    "relevant_lines": [
                        "FATAL: Database connection string missing",
                        "KeyError: DATABASE_URL",
                        "Process terminated with exit code 1",
                    ],
                }
            },
            "events": {
                "warning_count": 3,
                "warning_events": [
                    {
                        "reason": "BackOff",
                        "object": "pod/payment-service-7d8b5c469-xk9m2",
                        "message": "Back-off restarting failed container",
                    }
                ],
            },
            "deployments": {
                "unhealthy_count": 1,
                "unhealthy_deployments": [
                    {"name": "payment-service", "namespace": "production", "ready": 0, "desired": 1}
                ],
            },
            "network": {"issue_count": 0, "issues": []},
        },
    },
    {
        "id": "inc-002-imagepull",
        "timestamp": "2026-10-06T05:30:00Z",
        "cluster": "docker-desktop",
        "namespace": "auth",
        "status": "success",
        "root_cause": "ImagePullBackOff — Container image registry tag 'auth-service:v2.4.9-nonexistent' not found",
        "confidence": 96,
        "confidence_label": "High",
        "diagnosis": {
            "root_cause": "ImagePullBackOff: Invalid container image tag",
            "explanation": "Kubernetes kubelet cannot pull the specified image tag from the container registry. The tag does not exist or requires imagePullSecrets.",
            "fix": "Update the deployment image tag to a valid published version or verify registry credentials.",
            "kubectl_command": "kubectl set image deployment/auth-service auth-service=myorg/auth-service:v2.4.8 -n auth",
            "prevention": "Enforce semantic version validation in CI/CD before updating Kubernetes manifests.",
            "confidence": 96,
            "confidence_label": "High",
            "confidence_reasoning": [
                "Pod status is ErrImagePull and ImagePullBackOff",
                "K8s event: 'manifest unknown: manifest tagged by v2.4.9-nonexistent was not found'",
                "Zero restarts because container never initialized",
            ],
        },
        "investigation": {
            "pods": {
                "healthy": False,
                "total_pods": 6,
                "problematic_pods": [
                    {
                        "name": "auth-service-5c879d749b-7pq8z",
                        "namespace": "auth",
                        "status": "ImagePullBackOff",
                        "ready": "0/1",
                        "restart_count": 0,
                    }
                ],
            },
            "logs": {},
            "events": {
                "warning_count": 2,
                "warning_events": [
                    {
                        "reason": "FailedPull",
                        "object": "pod/auth-service-5c879d749b-7pq8z",
                        "message": "Failed to pull image: manifest unknown",
                    }
                ],
            },
            "deployments": {"unhealthy_count": 1, "unhealthy_deployments": []},
            "network": {"issue_count": 0, "issues": []},
        },
    },
    {
        "id": "inc-003-oomkilled",
        "timestamp": "2026-10-06T05:00:15Z",
        "cluster": "docker-desktop",
        "namespace": "analytics",
        "status": "success",
        "root_cause": "OOMKilled — Container exceeded allocated memory limit of 128Mi during batch aggregation",
        "confidence": 92,
        "confidence_label": "High",
        "diagnosis": {
            "root_cause": "OOMKilled: Memory limit exceeded",
            "explanation": "The Linux cgroup kernel killed the analytics worker process with signal 9 (SIGKILL) because resident memory exceeded the 128Mi threshold.",
            "fix": "Increase memory limits in the deployment resources specification.",
            "kubectl_command": "kubectl set resources deployment analytics-worker --limits=memory=512Mi,cpu=500m --requests=memory=256Mi,cpu=250m -n analytics",
            "prevention": "Implement streaming data processing or configure vertical pod autoscaling (VPA).",
            "confidence": 92,
            "confidence_label": "High",
            "confidence_reasoning": [
                "Pod termination reason shows OOMKilled with exit code 137",
                "Warning event OOMKilling logged on the node",
                "Deployments show 0/2 available replicas",
            ],
        },
        "investigation": {
            "pods": {
                "healthy": False,
                "total_pods": 8,
                "problematic_pods": [
                    {
                        "name": "analytics-worker-84d9f67db4-r8x9c",
                        "namespace": "analytics",
                        "status": "OOMKilled",
                        "ready": "0/1",
                        "restart_count": 4,
                    }
                ],
            },
            "logs": {},
            "events": {"warning_count": 1, "warning_events": []},
            "deployments": {"unhealthy_count": 1, "unhealthy_deployments": []},
            "network": {"issue_count": 0, "issues": []},
        },
    },
]


class HistoryService:
    """Manages persistent investigation history."""

    @staticmethod
    def _ensure_data_file() -> None:
        """Create data dir and file with starter incidents if not present."""
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                    json.dump(STARTER_INCIDENTS, f, indent=2)
                logger.info("Initialized history file with starter incidents")
            except Exception as e:
                logger.error(f"Failed to create history file: {e}")

    @staticmethod
    def get_all(limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve recent investigations."""
        HistoryService._ensure_data_file()
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Sort newest first
            sorted_data = sorted(
                data,
                key=lambda x: x.get("timestamp", ""),
                reverse=True,
            )
            return sorted_data[:limit]
        except Exception as e:
            logger.error(f"Failed to read history file: {e}")
            return STARTER_INCIDENTS[:limit]

    @staticmethod
    def get_by_id(investigation_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific investigation by ID."""
        all_items = HistoryService.get_all(limit=100)
        for item in all_items:
            if item.get("id") == investigation_id:
                return item
        return None

    @staticmethod
    def save(
        cluster: str,
        namespace: str,
        investigation: Dict[str, Any],
        diagnosis: Optional[Dict[str, Any]] = None,
        status: str = "success",
        ai_error: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Save a new investigation record."""
        HistoryService._ensure_data_file()

        root_cause = "No critical issues detected (Cluster healthy)"
        confidence = 100
        confidence_label = "High"

        if diagnosis:
            root_cause = diagnosis.get("root_cause", root_cause)
            confidence = diagnosis.get("confidence", 85)
            confidence_label = diagnosis.get("confidence_label", "High")
        elif ai_error:
            root_cause = f"Investigation evidence collected (AI: {ai_error})"
            confidence = 50
            confidence_label = "Medium"

        record = {
            "id": f"inv-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cluster": cluster or "current-cluster",
            "namespace": namespace,
            "status": status,
            "root_cause": root_cause,
            "confidence": confidence,
            "confidence_label": confidence_label,
            "diagnosis": diagnosis,
            "investigation": investigation,
            "ai_error": ai_error,
        }

        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            data.insert(0, record)
            # Keep max 50 records
            data = data[:50]
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved investigation {record['id']} to history")
        except Exception as e:
            logger.error(f"Failed to save investigation: {e}")

        return record

    @staticmethod
    def clear() -> bool:
        """Reset history back to starter incidents."""
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(STARTER_INCIDENTS, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to clear history: {e}")
            return False
