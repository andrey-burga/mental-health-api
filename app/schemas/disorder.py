from typing import List
from pydantic import BaseModel

# --- SYMPTOM SCHEMAS ---
class SymptomBase(BaseModel):
    text: str

class SymptomCreate(SymptomBase):
    disorder_id: str

class SymptomResponse(SymptomBase):
    id: str
    disorder_id: str

    class Config:
        from_attributes = True


# --- DISORDER SCHEMAS ---
class DisorderBase(BaseModel):
    slug: str
    title: str
    description: str

class DisorderCreate(DisorderBase):
    pass

class DisorderResponse(DisorderBase):
    id: str
    # Incluimos la lista de síntomas relacionados de forma automática
    symptoms: List[SymptomResponse] = []

    class Config:
        from_attributes = True