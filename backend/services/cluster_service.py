"""
Cluster Service — discovers local Kubernetes clusters from kubeconfig.

Provides:
- List all clusters / contexts configured in ~/.kube/config
- Detect the active current context
- Check if clusters are reachable
- Switch active context
- Friendly guidance when no clusters are detected
"""

import json
from typing import Any, Dict, List, Optional
from loguru import logger

from kubernetes.executor import execute_kubectl


class ClusterService:
    """Discovers and manages Kubernetes clusters configured on the local system."""

    DEMO_CLUSTERS = [
        {
            "name": "docker-desktop",
            "cluster": "docker-desktop",
            "user": "docker-desktop",
            "namespace": "default",
            "is_current": True,
            "status": "ready",
            "reachable": False,
            "is_mock": True,
            "info": "Docker Desktop Kubernetes (Enable in Docker Desktop settings)",
        },
        {
            "name": "minikube",
            "cluster": "minikube",
            "user": "minikube",
            "namespace": "default",
            "is_current": False,
            "status": "ready",
            "reachable": False,
            "is_mock": True,
            "info": "Minikube Local Cluster (Run 'minikube start' to launch)",
        },
        {
            "name": "kind-dev-cluster",
            "cluster": "kind-dev-cluster",
            "user": "kind-dev-cluster",
            "namespace": "default",
            "is_current": False,
            "status": "ready",
            "reachable": False,
            "is_mock": True,
            "info": "Kubernetes in Docker (Run 'kind create cluster --name dev-cluster')",
        },
    ]

    @staticmethod
    def get_clusters() -> Dict[str, Any]:
        """
        List all Kubernetes contexts configured on the machine.

        Returns:
            Dict with 'clusters' list, 'current_context', and 'has_live_clusters' flag.
        """
        logger.info("Discovering local Kubernetes clusters from kubeconfig")

        result = execute_kubectl("config view -o json", timeout=10)

        if not result.success:
            logger.warning(f"Unable to read kubeconfig: {result.stderr}")
            return {
                "clusters": ClusterService.DEMO_CLUSTERS,
                "current_context": "docker-desktop",
                "has_live_clusters": False,
                "message": "No kubeconfig found. Displaying standard local cluster presets.",
                "guide": {
                    "step1": "Start Docker Desktop and enable Kubernetes under Settings > Kubernetes",
                    "step2": "Or install Minikube and run 'minikube start'",
                    "step3": "Or run 'kind create cluster'",
                },
            }

        try:
            config_data = json.loads(result.stdout)
            raw_contexts = config_data.get("contexts") or []
            current_context = config_data.get("current-context") or ""

            if not raw_contexts:
                logger.info("kubeconfig exists but has no contexts configured")
                return {
                    "clusters": ClusterService.DEMO_CLUSTERS,
                    "current_context": "docker-desktop",
                    "has_live_clusters": False,
                    "message": "kubeconfig exists but contains 0 contexts. Showing local cluster options.",
                    "guide": {
                        "step1": "Enable Kubernetes in Docker Desktop or launch Minikube",
                        "step2": "Run 'kubectl config get-contexts' to verify detection",
                    },
                }

            clusters: List[Dict[str, Any]] = []
            for item in raw_contexts:
                ctx_name = item.get("name", "")
                ctx_info = item.get("context", {})
                is_curr = (ctx_name == current_context)

                # Test reachability with quick timeout
                ping = execute_kubectl(
                    f"cluster-info --request-timeout=2s",
                    context=ctx_name,
                    timeout=4,
                )
                reachable = ping.success

                clusters.append({
                    "name": ctx_name,
                    "cluster": ctx_info.get("cluster", ctx_name),
                    "user": ctx_info.get("user", ""),
                    "namespace": ctx_info.get("namespace", "default"),
                    "is_current": is_curr,
                    "reachable": reachable,
                    "is_mock": False,
                    "status": "connected" if reachable else "unreachable",
                    "info": f"Cluster: {ctx_info.get('cluster', ctx_name)}",
                })

            logger.info(f"Discovered {len(clusters)} Kubernetes cluster contexts")
            return {
                "clusters": clusters,
                "current_context": current_context or (clusters[0]["name"] if clusters else ""),
                "has_live_clusters": True,
                "message": f"Successfully detected {len(clusters)} cluster(s) in kubeconfig.",
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse kubectl config output: {e}")
            return {
                "clusters": ClusterService.DEMO_CLUSTERS,
                "current_context": "docker-desktop",
                "has_live_clusters": False,
                "message": "Could not parse kubeconfig. Showing demo presets.",
            }

    @staticmethod
    def switch_context(context_name: str) -> Dict[str, Any]:
        """
        Switch the active kubectl context to context_name.
        """
        logger.info(f"Switching kubectl context to: {context_name}")

        # Check if it's one of the demo/mock clusters
        for demo in ClusterService.DEMO_CLUSTERS:
            if demo["name"] == context_name:
                return {
                    "success": True,
                    "context": context_name,
                    "message": f"Selected {context_name} (demo mode)",
                    "is_mock": True,
                }

        result = execute_kubectl(f"config use-context {context_name}")
        if result.success:
            return {
                "success": True,
                "context": context_name,
                "message": f"Switched active cluster context to '{context_name}'",
                "is_mock": False,
            }
        else:
            return {
                "success": False,
                "context": context_name,
                "error": result.stderr or "Failed to switch context",
                "is_mock": False,
            }
