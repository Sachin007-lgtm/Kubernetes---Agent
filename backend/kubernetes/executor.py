import subprocess
from dataclasses import dataclass, field
from typing import List, Optional
from loguru import logger


@dataclass
class KubectlResult:
    """Structured result of a kubectl command execution."""
    command: str
    success: bool
    stdout: str = ""
    stderr: str = ""
    return_code: int = 0


def execute_kubectl(
    command: str,
    timeout: int = 30,
    context: Optional[str] = None,
) -> KubectlResult:
    """
    Safely execute a kubectl command using Python subprocess.

    Args:
        command: The kubectl command to run (e.g. "get pods -A")
        timeout: Maximum seconds to wait for the command to complete
        context: Optional cluster context name to target (passes --context <name>)

    Returns:
        KubectlResult with structured output and success flag
    """
    cmd_parts = command.split()
    if cmd_parts and cmd_parts[0] == "kubectl":
        cmd_parts = cmd_parts[1:]

    full_command: List[str] = ["kubectl"]
    if context and not context.startswith("demo-"):
        full_command.extend(["--context", context])
    full_command.extend(cmd_parts)

    logger.info(f"Executing kubectl: {' '.join(full_command)}")

    try:
        result = subprocess.run(
            full_command,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        success = result.returncode == 0

        if not success:
            logger.warning(
                f"kubectl command failed (code {result.returncode}): {result.stderr.strip()}"
            )
        else:
            logger.debug(f"kubectl command succeeded: {command}")

        return KubectlResult(
            command=command,
            success=success,
            stdout=result.stdout,
            stderr=result.stderr,
            return_code=result.returncode,
        )

    except subprocess.TimeoutExpired:
        logger.error(f"kubectl command timed out after {timeout}s: {command}")
        return KubectlResult(
            command=command,
            success=False,
            stderr=f"Command timed out after {timeout} seconds",
            return_code=-1,
        )
    except FileNotFoundError:
        logger.error("kubectl binary not found. Is kubectl installed and in PATH?")
        return KubectlResult(
            command=command,
            success=False,
            stderr="kubectl binary not found. Please install kubectl.",
            return_code=-2,
        )
    except Exception as e:
        logger.error(f"Unexpected error running kubectl: {e}")
        return KubectlResult(
            command=command,
            success=False,
            stderr=str(e),
            return_code=-3,
        )
