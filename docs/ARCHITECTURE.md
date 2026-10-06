# AI Kubernetes Troubleshooting Agent - Documentation

Welcome to the **AI Kubernetes Troubleshooting Agent** documentation.

## Architecture Overview

```text
Frontend (Next.js Dashboard)
    ↓
FastAPI Backend (Orchestration Engine)
    ↓
Kubernetes Investigation Layer (kubectl inspection)
    ↓
AI Kubernetes Agent (OpenRouter LLM reasoning)
    ↓
Root Cause Diagnosis & Suggested Fix
```

## Monorepo Layout

- `backend/`: FastAPI application, API routes, K8s investigation engine, and AI reasoning client.
- `frontend/`: Next.js 16 app with React Query, Tailwind CSS, and diagnostic UI.
- `prompts/`: Implementation guide prompts for each development phase.
- `docs/`: System documentation, architecture diagrams, and runbooks.
- `docker-compose.yml`: Multi-container orchestration for local development and deployment.
