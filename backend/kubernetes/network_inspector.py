from typing import Any, Dict, List, Optional
from loguru import logger

from kubernetes.executor import execute_kubectl


def inspect_network(
    namespace: str = "--all-namespaces",
    context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Inspect Kubernetes services and networking to detect misconfigurations.

    Checks: Service existence, Selector mismatch, Missing endpoints, DNS-related issues.

    Returns:
        Structured dict with network findings
    """
    logger.info(f"Inspecting network/services [namespace={namespace}, context={context}]")

    flag = "-A" if namespace == "--all-namespaces" else f"-n {namespace}"

    # --- 1. Get all services ---
    svc_result = execute_kubectl(f"get svc {flag} --no-headers", context=context)
    if not svc_result.success:
        logger.warning(f"Service inspection failed: {svc_result.stderr}")
        return {
            "error": svc_result.stderr,
            "services": [],
            "issues": [],
        }

    services: List[Dict[str, Any]] = []
    issues: List[Dict[str, str]] = []

    svc_lines = [line for line in svc_result.stdout.strip().splitlines() if line.strip()]
    for line in svc_lines:
        parts = line.split()

        # With -A: NAMESPACE NAME TYPE CLUSTER-IP EXTERNAL-IP PORT(S) AGE
        # Without -A: NAME TYPE CLUSTER-IP EXTERNAL-IP PORT(S) AGE
        if namespace == "--all-namespaces":
            if len(parts) < 7:
                continue
            svc_namespace = parts[0]
            svc_name = parts[1]
            svc_type = parts[2]
            cluster_ip = parts[3]
            external_ip = parts[4]
            ports = parts[5]
        else:
            if len(parts) < 6:
                continue
            svc_namespace = namespace
            svc_name = parts[0]
            svc_type = parts[1]
            cluster_ip = parts[2]
            external_ip = parts[3]
            ports = parts[4]

        # Skip kubernetes default service
        if svc_name == "kubernetes":
            continue

        service_entry: Dict[str, Any] = {
            "name": svc_name,
            "namespace": svc_namespace,
            "type": svc_type,
            "cluster_ip": cluster_ip,
            "external_ip": external_ip,
            "ports": ports,
        }

        # --- 2. Check endpoints for each service ---
        ep_result = execute_kubectl(
            f"get endpoints {svc_name} -n {svc_namespace} --no-headers",
            context=context,
        )
        if ep_result.success:
            ep_output = ep_result.stdout.strip()
            has_endpoints = bool(ep_output) and "<none>" not in ep_output and "not found" not in ep_output

            # If endpoints line shows "<none>" or is empty, the selector may be wrong
            ep_parts = ep_output.split()
            endpoint_addresses = ep_parts[1] if len(ep_parts) > 1 else "<none>"
            service_entry["endpoints"] = endpoint_addresses

            if not has_endpoints or endpoint_addresses == "<none>":
                logger.warning(
                    f"Service {svc_namespace}/{svc_name} has no endpoints — possible selector mismatch"
                )
                issues.append(
                    {
                        "service": svc_name,
                        "namespace": svc_namespace,
                        "issue": "No endpoints found — possible label selector mismatch or no running pods",
                        "severity": "warning",
                    }
                )
        else:
            service_entry["endpoints"] = "error"

        services.append(service_entry)

    # --- 3. Check CoreDNS pods as a proxy for DNS health ---
    dns_result = execute_kubectl(
        "get pods -n kube-system -l k8s-app=kube-dns --no-headers",
        context=context,
    )
    dns_healthy = True
    dns_status = "ok"
    if dns_result.success:
        dns_lines = [l for l in dns_result.stdout.strip().splitlines() if l.strip()]
        for dns_line in dns_lines:
            dns_parts = dns_line.split()
            if len(dns_parts) >= 3 and dns_parts[2] not in ("Running",):
                dns_healthy = False
                dns_status = f"CoreDNS pod not Running: {dns_parts[2]}"
                issues.append(
                    {
                        "service": "coredns",
                        "namespace": "kube-system",
                        "issue": dns_status,
                        "severity": "critical",
                    }
                )
                logger.error(f"DNS health issue: {dns_status}")
    else:
        dns_status = "unable to check CoreDNS"

    logger.info(
        f"Network inspection complete: {len(services)} services, {len(issues)} issues found"
    )

    return {
        "total_services": len(services),
        "services": services,
        "issues": issues,
        "issue_count": len(issues),
        "dns_healthy": dns_healthy,
        "dns_status": dns_status,
    }
