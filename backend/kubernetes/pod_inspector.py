from typing import Any, Dict, List, Optional
from loguru import logger

from kubernetes.executor import execute_kubectl

# Pod states that indicate a problem
UNHEALTHY_STATES = {
    "CrashLoopBackOff",
    "ImagePullBackOff",
    "ErrImagePull",
    "Pending",
    "Error",
    "OOMKilled",
    "ContainerCreating",
    "CreateContainerConfigError",
    "InvalidImageName",
    "RunContainerError",
}


def inspect_pods(
    namespace: str = "--all-namespaces",
    context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Inspect all pods and detect unhealthy states.

    Detects: CrashLoopBackOff, ImagePullBackOff, Pending, Error, OOMKilled, ContainerCreating (stuck)

    Returns:
        Structured dict with healthy flag and list of problematic pods
    """
    logger.info(f"Inspecting pods [namespace={namespace}, context={context}]")

    flag = "-A" if namespace == "--all-namespaces" else f"-n {namespace}"
    result = execute_kubectl(f"get pods {flag} --no-headers -o wide", context=context)

    if not result.success:
        logger.warning(f"Pod inspection failed: {result.stderr}")
        return {
            "healthy": None,
            "error": result.stderr,
            "problematic_pods": [],
            "total_pods": 0,
        }

    problematic_pods: List[Dict[str, Any]] = []
    total_pods = 0
    lines = [line for line in result.stdout.strip().splitlines() if line.strip()]

    for line in lines:
        parts = line.split()
        if len(parts) < 4:
            continue

        total_pods += 1

        # When -A is used: NAMESPACE NAME READY STATUS RESTARTS AGE ...
        # When -n <ns> is used: NAME READY STATUS RESTARTS AGE ...
        if namespace == "--all-namespaces":
            pod_namespace = parts[0]
            pod_name = parts[1]
            ready = parts[2]        # e.g. "1/2"
            status = parts[3]
            restarts_raw = parts[4] if len(parts) > 4 else "0"
        else:
            pod_namespace = namespace
            pod_name = parts[0]
            ready = parts[1]
            status = parts[2]
            restarts_raw = parts[3] if len(parts) > 3 else "0"

        # Parse restart count (can be "5 (2h ago)" format)
        try:
            restart_count = int(restarts_raw.split()[0])
        except (ValueError, IndexError):
            restart_count = 0

        # Check if the pod is in an unhealthy state
        is_unhealthy = (
            any(state in status for state in UNHEALTHY_STATES)
            or status not in ("Running", "Completed", "Succeeded")
            or restart_count >= 5
        )

        if is_unhealthy:
            logger.warning(
                f"Unhealthy pod detected: {pod_namespace}/{pod_name} [{status}] restarts={restart_count}"
            )
            problematic_pods.append(
                {
                    "name": pod_name,
                    "namespace": pod_namespace,
                    "status": status,
                    "ready": ready,
                    "restart_count": restart_count,
                }
            )

    healthy = len(problematic_pods) == 0
    logger.info(
        f"Pod inspection complete: {total_pods} pods, {len(problematic_pods)} problematic, healthy={healthy}"
    )

    return {
        "healthy": healthy,
        "total_pods": total_pods,
        "problematic_pods": problematic_pods,
    }
