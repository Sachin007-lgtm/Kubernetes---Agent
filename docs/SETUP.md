# Setup & Running Guide

## Prerequisites

- Python 3.12+
- Node.js 20+ & npm
- Docker & Docker Compose (optional for containerized run)
- `kubectl` configured with cluster access (for Phase 02+)

## Quick Start with Docker Compose

Run both the backend and frontend simultaneously:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Health Check: http://localhost:8000/health
- Swagger Docs: http://localhost:8000/docs

## Running Locally Without Docker

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend:
```bash
curl http://localhost:8000/health
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit: http://localhost:3000
