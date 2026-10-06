# Kubernetes Failure Scenarios for AI Testing

These manifests and scripts test real Kubernetes failures with the **AI DevOps Kubernetes Agent**.

## Scenarios

| Scenario | File | Problem | Expected AI Detection |
|---|---|---|---|
| **1. CrashLoopBackOff** | `01-crashloop-missing-env.yaml` | Application exits immediately due to missing `DATABASE_URL` | Detects `CrashLoopBackOff`, reads error logs, recommends `kubectl set env` |
| **2. ImagePullBackOff** | `02-imagepullbackoff-invalid-tag.yaml` | Deployment requests nonexistent image tag | Detects `ImagePullBackOff`, extracts warning event, recommends updating image |
| **3. OOMKilled** | `03-oomkilled-low-memory.yaml` | Process allocates 40MB inside a 16Mi memory limit | Detects container exit code 137 / OOMKill, recommends increasing memory limits |
| **4. Service Selector Mismatch** | `04-service-selector-mismatch.yaml` | Service selector `app=frontend-api` mismatches pod label `app=frontend-web` | Detects 0 endpoints on service, recommends matching labels |

## How to Run

### Windows (PowerShell):
```powershell
# Deploy Scenario 1 (CrashLoopBackOff)
.\k8s-scenarios\deploy.ps1 1

# Deploy Scenario 2 (ImagePullBackOff)
.\k8s-scenarios\deploy.ps1 2

# Deploy Scenario 3 (OOMKilled)
.\k8s-scenarios\deploy.ps1 3

# Deploy Scenario 4 (Service Selector Mismatch)
.\k8s-scenarios\deploy.ps1 4

# Deploy all scenarios
.\k8s-scenarios\deploy.ps1 all

# Clean up test pods and deployments
.\k8s-scenarios\deploy.ps1 cleanup
```

### Linux / Mac (Bash):
```bash
kubectl apply -f k8s-scenarios/01-crashloop-missing-env.yaml
# Cleanup:
kubectl delete -f k8s-scenarios/01-crashloop-missing-env.yaml
```
