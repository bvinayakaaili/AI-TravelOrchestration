from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any

# --- Auth Models ---
class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    home_city: str = "hyd"
    preferred_budget: int = 15000
    travel_style: str = "general"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    home_city: str
    preferred_budget: int
    travel_style: str
    created_at: str

# --- Plan Models ---
class PlanSaveRequest(BaseModel):
    destination: str
    query: str
    plan_json: Dict[str, Any]
    is_favorite: bool = False

class TripHistoryRequest(BaseModel):
    query: str
    response_json: Dict[str, Any]
    services_called: List[str]