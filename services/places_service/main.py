from fastapi import FastAPI, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import random
import logging
from datetime import datetime

app = FastAPI(
    title="Places Service",
    description="Provides attractions and activities for a destination city",
    version="1.1"
)

logger = logging.getLogger("places_service")
logging.basicConfig(level=logging.INFO)


# -----------------------------
# Schema
# -----------------------------

class Place(BaseModel):
    name: str
    category: str
    estimated_visit_hrs: float = Field(..., gt=0)
    popularity: int = Field(..., ge=1, le=100)


class PlacesResponse(BaseModel):
    places: List[str]           # list of attraction name strings (orchestrator-compatible)
    places_detail: List[Place]  # full detail for richer UIs
    metadata: Dict[str, str]


# -----------------------------
# Attraction Database
# -----------------------------

CITY_ATTRACTIONS: Dict[str, List[tuple]] = {
    "goa": [
        ("Baga Beach", "beach"),
        ("Calangute Beach", "beach"),
        ("Fort Aguada", "historic"),
        ("Dudhsagar Falls", "nature"),
        ("Basilica of Bom Jesus", "historic"),
        ("Anjuna Beach", "beach"),
        ("Chapora Fort", "historic"),
    ],
    "delhi": [
        ("Red Fort", "historic"),
        ("Qutub Minar", "historic"),
        ("India Gate", "landmark"),
        ("Lotus Temple", "temple"),
        ("Humayun's Tomb", "historic"),
    ],
    "del": [
        ("Red Fort", "historic"),
        ("Qutub Minar", "historic"),
        ("India Gate", "landmark"),
        ("Lotus Temple", "temple"),
        ("Humayun's Tomb", "historic"),
    ],
    "bangalore": [
        ("Lalbagh Botanical Garden", "nature"),
        ("Cubbon Park", "nature"),
        ("Bangalore Palace", "historic"),
        ("ISKCON Temple", "temple"),
        ("Vidhana Soudha", "landmark"),
    ],
    "blr": [
        ("Lalbagh Botanical Garden", "nature"),
        ("Cubbon Park", "nature"),
        ("Bangalore Palace", "historic"),
        ("ISKCON Temple", "temple"),
        ("Vidhana Soudha", "landmark"),
    ],
    "hyd": [
        ("Charminar", "historic"),
        ("Golconda Fort", "historic"),
        ("Ramoji Film City", "entertainment"),
        ("Hussain Sagar", "lake"),
        ("Birla Temple", "temple"),
    ],
    "mumbai": [
        ("Gateway of India", "landmark"),
        ("Marine Drive", "scenic"),
        ("Elephanta Caves", "historic"),
        ("Juhu Beach", "beach"),
        ("Siddhivinayak Temple", "temple"),
    ],
    "mum": [
        ("Gateway of India", "landmark"),
        ("Marine Drive", "scenic"),
        ("Elephanta Caves", "historic"),
        ("Juhu Beach", "beach"),
        ("Siddhivinayak Temple", "temple"),
    ],
}


# -----------------------------
# Place Generator
# -----------------------------

def generate_places(city: str, category_filter: Optional[str] = None) -> List[dict]:

    city_lower = city.lower()
    attractions = CITY_ATTRACTIONS.get(city_lower)

    if not attractions:
        # Generic fallback attractions
        attractions = [
            (f"Central Park {city}", "park"),
            (f"City Museum {city}", "museum"),
            (f"Historic Square {city}", "historic"),
            (f"Local Market {city}", "market"),
            (f"Scenic Viewpoint {city}", "scenic"),
        ]

    places = []

    for name, category in attractions:
        if category_filter and category != category_filter:
            continue

        places.append({
            "name": name,
            "category": category,
            "estimated_visit_hrs": round(random.uniform(1.0, 3.5), 1),
            "popularity": random.randint(60, 100)
        })

    return places


# -----------------------------
# Places Endpoint
# -----------------------------

@app.get("/places", response_model=PlacesResponse)
async def get_places(
    city: str = Query(..., description="City to discover places in"),
    limit: int = Query(4, ge=1, le=10),
    category: Optional[str] = Query(None, description="Filter by category (beach, historic, nature, etc.)")
):
    logger.info(f"Place discovery request for city: {city}, category: {category}")

    places = generate_places(city, category_filter=category)

    # Sort by popularity descending
    places.sort(key=lambda x: x["popularity"], reverse=True)

    places = places[:limit]

    return PlacesResponse(
        places=[p["name"] for p in places],       # name-only list for orchestrator
        places_detail=places,                       # full detail for UI
        metadata={
            "city": city,
            "category_filter": category or "all",
            "generated_at": datetime.utcnow().isoformat()
        }
    )


# -----------------------------
# Health Endpoint
# -----------------------------

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "places",
        "timestamp": datetime.utcnow().isoformat()
    }