from typing import List, Optional
from pydantic import BaseModel


class DiagnosisResult(BaseModel):
    root_cause: str
    explanation: str
    fix: str
    kubectl_command: Optional[str] = None
    prevention: Optional[str] = None
    confidence: int           # 0–100
    confidence_label: str     # "High" | "Medium" | "Low"
    confidence_reasoning: List[str] = []
