from typing import Any, Dict, List, Optional
from loguru import logger

from kubernetes.executor import execute_kubectl

# Warning event reasons that signal real problems
WARNING_REASONS = {
    "FailedScheduling",
    "BackOff",
    "FailedMount",
    "FailedPull",
    "ErrImagePull",
    "Unhealthy",
    "OOMKilling",
    "NodeNotReady",
    "FailedCreate",
    "FailedAttachVolume",
    "FailedDetachVolume",
    "FailedBinding",
    "ProvisioningFailed",
    "Evicted",
    "PreemptingNode",
    "NetworkNotReady",
    "Killing",
}


def analyze_events(
    namespace: str = "--all-namespaces",
    context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Read and analyze Kubernetes events, surfacing Warning events with problem reasons.

    Detects: FailedScheduling, BackOff, FailedMount, FailedPull, ErrImagePull, Unhealthy

    Returns:
        Structured dict with warning events and a summary
    """
    logger.info(f"Analyzing Kubernetes events [namespace={namespace}, context={context}]")

    flag = "-A" if namespace == "--all-namespaces" else f"-n {namespace}"
    result = execute_kubectl(
        f"get events {flag} --sort-by=.lastTimestamp --no-headers",
        context=context,
    )

    if not result.success:
        logger.warning(f"Event analysis failed: {result.stderr}")
        return {
            "error": result.stderr,
            "warning_events": [],
            "total_events": 0,
            "warning_count": 0,
        }

    all_events: List[Dict[str, Any]] = []
    warning_events: List[Dict[str, Any]] = []
    lines = [line for line in result.stdout.strip().splitlines() if line.strip()]

    for line in lines:
        parts = line.split()
        if len(parts) < 7:
            continue

        # Event format (with -A): NAMESPACE LAST SEEN COUNT FROM TYPE REASON OBJECT MESSAGE
        # Without -A:              LAST SEEN COUNT FROM TYPE REASON OBJECT MESSAGE
        if namespace == "--all-namespaces":
            if len(parts) < 8:
                continue
            ev_namespace = parts[0]
            last_seen = parts[1]
            count_raw = parts[2]
            ev_type = parts[4]    # Normal or Warning
            reason = parts[5]
            obj = parts[6]
            message = " ".join(parts[7:])
        else:
            ev_namespace = namespace
            last_seen = parts[0]
            count_raw = parts[1]
            ev_type = parts[3]
            reason = parts[4]
            obj = parts[5]
            message = " ".join(parts[6:])

        try:
            count = int(count_raw)
        except ValueError:
            count = 1

        event_entry: Dict[str, Any] = {
            "namespace": ev_namespace,
            "last_seen": last_seen,
            "count": count,
            "type": ev_type,
            "reason": reason,
            "object": obj,
            "message": message,
        }

        all_events.append(event_entry)

        if ev_type == "Warning" or reason in WARNING_REASONS:
            warning_events.append(event_entry)
            logger.warning(
                f"Warning event: [{reason}] {obj} in {ev_namespace} — {message[:80]}"
            )

    logger.info(
        f"Event analysis complete: {len(all_events)} total, {len(warning_events)} warnings"
    )

    return {
        "total_events": len(all_events),
        "warning_count": len(warning_events),
        "warning_events": warning_events,
    }
