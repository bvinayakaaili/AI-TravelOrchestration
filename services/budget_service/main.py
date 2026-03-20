from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Optional
import logging
from datetime import datetime

app = FastAPI(
    title="Budget Service",
    description="Calculates estimated travel budget from multiple service costs.",
    version="1.1"
)

logger = logging.getLogger("budget_service")
logging.basicConfig(level=logging.INFO)


# -------------------------------
# Request Schema
# -------------------------------

class BudgetRequest(BaseModel):
    flights_cost: int = Field(0, ge=0, description="Total cost of flights (one-way or round trip)")
    hotels_cost_per_night: int = Field(0, ge=0, description="Hotel price per night")
    num_days: int = Field(1, ge=1, description="Trip duration in days")
    daily_activities_cost: int = Field(1500, ge=0, description="Average daily activities + food cost")
    max_budget: Optional[int] = Field(None, ge=0, description="Optional user budget constraint")


# -------------------------------
# Response Schema
# -------------------------------

class BudgetEvaluation(BaseModel):
    status: str           # "within_budget" | "over_budget"
    user_budget: int
    difference: int       # positive = savings, negative = overage

class BudgetResponse(BaseModel):
    estimated_budget: int
    breakdown: Dict[str, int]
    metrics: Dict[str, float]
    evaluation: Optional[BudgetEvaluation] = None
    metadata: Dict[str, str]


# -------------------------------
# Core Budget Logic
# -------------------------------

def compute_budget(data: BudgetRequest):

    flights_cost = data.flights_cost
    hotel_total = data.hotels_cost_per_night * data.num_days
    activities_total = data.daily_activities_cost * data.num_days

    grand_total = flights_cost + hotel_total + activities_total

    per_day_cost = round(grand_total / data.num_days, 2) if data.num_days else grand_total

    breakdown = {
        "flights": flights_cost,
        "hotels": hotel_total,
        "activities": activities_total
    }

    metrics = {
        "cost_per_day": per_day_cost,
        "hotel_share_pct": round((hotel_total / grand_total) * 100, 2) if grand_total else 0.0,
        "activity_share_pct": round((activities_total / grand_total) * 100, 2) if grand_total else 0.0,
        "flight_share_pct": round((flights_cost / grand_total) * 100, 2) if grand_total else 0.0,
    }

    evaluation = None

    if data.max_budget is not None:
        difference = data.max_budget - grand_total
        evaluation = BudgetEvaluation(
            status="within_budget" if grand_total <= data.max_budget else "over_budget",
            user_budget=data.max_budget,
            difference=difference
        )

    return grand_total, breakdown, metrics, evaluation


# -------------------------------
# Budget Endpoint
# -------------------------------

@app.post("/budget", response_model=BudgetResponse)
async def estimate_budget(request: BudgetRequest):

    try:
        logger.info(f"Budget calculation request: {request.model_dump()}")

        grand_total, breakdown, metrics, evaluation = compute_budget(request)

        return BudgetResponse(
            estimated_budget=grand_total,
            breakdown=breakdown,
            metrics=metrics,
            evaluation=evaluation,
            metadata={
                "service": "budget",
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Budget calculation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Budget calculation error")


# -------------------------------
# Health Endpoint
# -------------------------------

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "budget",
        "timestamp": datetime.utcnow().isoformat()
    }