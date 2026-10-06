import re
from typing import Any, Dict, List, Optional
from loguru import logger

from kubernetes.executor import execute_kubectl

# Keywords that indicate interesting log lines worth surfacing
ERROR_PATTERNS = [
    r"exception",
    r"error",
    r"fatal",
    r"panic",
    r"traceback",
    r"connection refused",
    r"connection reset",
    r"timeout",
    r"no such file",
    r"permission denied",
    r"env.*not.*set",
    r"missing.*env",
    r"undefined.*variable",
    r"image.*pull",
    r"oomkilled",
    r"out of memory",
    r"cannot find",
    r"failed to",
    r"dial tcp",
    r"certificate",
]

_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in ERROR_PATTERNS]

MAX_RELEVANT_LINES = 30
TAIL_LINES = 100


def _is_relevant_line(line: str) -> bool:
    """Return True if a log line matches any error/warning pattern."""
    return any(pattern.search(line) for pattern in _COMPILED_PATTERNS)


def collect_logs(
    pod_name: str,
    namespace: str = "default",
    tail_lines: int = TAIL_LINES,
    previous: bool = False,
    context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch and filter logs for a specific pod, capturing only relevant failure lines.

    Focus areas: Exceptions, connection failures, missing env vars, image failures, startup errors.

    Args:
        pod_name: Name of the pod to collect logs from
        namespace: Kubernetes namespace
        tail_lines: Number of trailing lines to fetch
        previous: Whether to fetch logs from the previous (crashed) container
        context: Optional Kubernetes cluster context

    Returns:
        Structured dict with filtered log lines and summary
    """
    logger.info(f"Collecting logs for pod {namespace}/{pod_name} (previous={previous}, context={context})")

    prev_flag = "--previous" if previous else ""
    cmd = f"logs {pod_name} -n {namespace} --tail={tail_lines} {prev_flag}".strip()
    result = execute_kubectl(cmd, context=context)

    if not result.success:
        # If fetching previous logs fails (pod may not have crashed yet), try current
        if previous:
            logger.debug(f"No previous logs for {pod_name}, falling back to current logs")
            result = execute_kubectl(f"logs {pod_name} -n {namespace} --tail={tail_lines}", context=context)

        if not result.success:
            return {
                "pod": pod_name,
                "namespace": namespace,
                "error": result.stderr,
                "relevant_lines": [],
                "raw_tail": "",
            }

    all_lines = result.stdout.splitlines()
    relevant_lines = [line for line in all_lines if _is_relevant_line(line)]

    # Cap at MAX_RELEVANT_LINES to avoid huge payloads
    if len(relevant_lines) > MAX_RELEVANT_LINES:
        relevant_lines = relevant_lines[-MAX_RELEVANT_LINES:]

    logger.info(
        f"Log collection for {pod_name}: {len(all_lines)} total lines, "
        f"{len(relevant_lines)} relevant lines captured"
    )

    return {
        "pod": pod_name,
        "namespace": namespace,
        "relevant_lines": relevant_lines,
        "total_lines_fetched": len(all_lines),
        "raw_tail": "\n".join(all_lines[-20:]),  # Last 20 lines always included for context
    }


def collect_logs_for_pods(
    problematic_pods: List[Dict[str, Any]],
    context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Collect logs for a list of problematic pod dicts (each with 'name' and 'namespace').

    Returns a dict keyed by "<namespace>/<pod_name>" with their log data.
    """
    results: Dict[str, Any] = {}

    for pod in problematic_pods:
        pod_name = pod.get("name", "")
        namespace = pod.get("namespace", "default")
        key = f"{namespace}/{pod_name}"

        # First try to get previous (crashed container) logs, then fall back to current
        log_data = collect_logs(pod_name, namespace, previous=True, context=context)
        if not log_data.get("relevant_lines") and not log_data.get("error"):
            log_data = collect_logs(pod_name, namespace, previous=False, context=context)

        results[key] = log_data

    return results

