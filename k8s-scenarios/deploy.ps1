# PowerShell helper to deploy or cleanup test Kubernetes failure scenarios

param (
    [Parameter(Position=0)]
    [ValidateSet("1", "2", "3", "4", "all", "cleanup", "help")]
    [string]$Scenario = "1"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

switch ($Scenario) {
    "1" {
        Write-Host "==> Deploying Scenario 1: CrashLoopBackOff (Missing DATABASE_URL)..." -ForegroundColor Yellow
        kubectl apply -f "$scriptDir\01-crashloop-missing-env.yaml"
        Write-Host "✓ Deployed payment-service. Wait 10s then click 'Investigate Cluster' in the UI." -ForegroundColor Green
    }
    "2" {
        Write-Host "==> Deploying Scenario 2: ImagePullBackOff (Invalid Image Tag)..." -ForegroundColor Yellow
        kubectl apply -f "$scriptDir\02-imagepullbackoff-invalid-tag.yaml"
        Write-Host "✓ Deployed auth-service. Wait 10s then click 'Investigate Cluster' in the UI." -ForegroundColor Green
    }
    "3" {
        Write-Host "==> Deploying Scenario 3: OOMKilled (Low Memory Limit)..." -ForegroundColor Yellow
        kubectl apply -f "$scriptDir\03-oomkilled-low-memory.yaml"
        Write-Host "✓ Deployed analytics-worker. Wait 10s then click 'Investigate Cluster' in the UI." -ForegroundColor Green
    }
    "4" {
        Write-Host "==> Deploying Scenario 4: Service Selector Mismatch..." -ForegroundColor Yellow
        kubectl apply -f "$scriptDir\04-service-selector-mismatch.yaml"
        Write-Host "✓ Deployed frontend-service. Wait 10s then click 'Investigate Cluster' in the UI." -ForegroundColor Green
    }
    "all" {
        Write-Host "==> Deploying ALL failure scenarios..." -ForegroundColor Yellow
        kubectl apply -f "$scriptDir\01-crashloop-missing-env.yaml"
        kubectl apply -f "$scriptDir\02-imagepullbackoff-invalid-tag.yaml"
        kubectl apply -f "$scriptDir\03-oomkilled-low-memory.yaml"
        kubectl apply -f "$scriptDir\04-service-selector-mismatch.yaml"
        Write-Host "✓ All test scenarios deployed." -ForegroundColor Green
    }
    "cleanup" {
        Write-Host "==> Cleaning up test resources..." -ForegroundColor Cyan
        kubectl delete -f "$scriptDir\01-crashloop-missing-env.yaml" --ignore-not-found
        kubectl delete -f "$scriptDir\02-imagepullbackoff-invalid-tag.yaml" --ignore-not-found
        kubectl delete -f "$scriptDir\03-oomkilled-low-memory.yaml" --ignore-not-found
        kubectl delete -f "$scriptDir\04-service-selector-mismatch.yaml" --ignore-not-found
        Write-Host "✓ Cleaned up test resources." -ForegroundColor Green
    }
    default {
        Write-Host "Usage: .\deploy.ps1 [1|2|3|4|all|cleanup]" -ForegroundColor Cyan
    }
}
