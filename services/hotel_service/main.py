from fastapi import FastAPI, Query
from pydantic import BaseModel, Field
from typing import List, Dict
import random
import logging
from datetime import datetime

app = FastAPI(
    title="Hotel Service",
    description="Provides hotel listings for destinations",
    version="1.1"
)

logger = logging.getLogger("hotel_service")
logging.basicConfig(level=logging.INFO)


# ----------------------------
# Schema
# ----------------------------

class Hotel(BaseModel):
    name: str
    price_per_night: int = Field(..., ge=0)
    rating: float = Field(..., ge=0, le=5)
    amenities: List[str] = []
    location: str


class HotelResponse(BaseModel):
    hotels: List[Hotel]
    metadata: Dict[str, str]


# ----------------------------
# Data Pools
# ----------------------------

HOTEL_NAMES = [
    "Beach Resort",
    "Sea View Hotel",
    "Luxury Inn",
    "Palm Paradise",
    "Ocean Breeze Suites",
    "Sunset Retreat"
]

AMENITIES = ["wifi", "pool", "breakfast", "parking", "gym", "spa"]

LOCATIONS = ["city_center", "beachfront", "downtown", "quiet_area"]

CITY_BASE_PRICE = {
    "goa": 3000,
    "delhi": 4500,
    "del": 4500,
    "bangalore": 3800,
    "blr": 3800,
    "hyd": 3500,
    "mumbai": 4200,
    "mum": 4200,
    "chennai": 3600,
    "che": 3600,
}


# ----------------------------
# Hotel Generator
# ----------------------------

def generate_hotels(city: str) -> List[dict]:

    base_price = CITY_BASE_PRICE.get(city.lower(), 3200)

    hotels = []

    for name in HOTEL_NAMES:
        price_variation = random.randint(-800, 1200)
        rating = round(random.uniform(3.5, 4.9), 1)
        amenities = random.sample(AMENITIES, k=random.randint(2, 4))
        location = random.choice(LOCATIONS)

        hotels.append({
            "name": name,
            "price_per_night": max(1200, base_price + price_variation),
            "rating": rating,
            "amenities": amenities,
            "location": location
        })

    return hotels


# ----------------------------
# Hotels Endpoint
# ----------------------------

@app.get("/hotels", response_model=HotelResponse)
async def get_hotels(
    city: str = Query(..., description="City to search hotels in"),
    sort_by: str = Query("price", description="Sort by: price | rating"),
    limit: int = Query(5, ge=1, le=10)
):
    logger.info(f"Hotel search request for city: {city}")

    hotels = generate_hotels(city)

    if sort_by == "rating":
        hotels.sort(key=lambda x: x["rating"], reverse=True)
    else:
        hotels.sort(key=lambda x: x["price_per_night"])

    hotels = hotels[:limit]

    return HotelResponse(
        hotels=hotels,
        metadata={
            "city": city,
            "sort_by": sort_by,
            "generated_at": datetime.utcnow().isoformat()
        }
    )


# ----------------------------
# Health Endpoint
# ----------------------------

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "hotels",
        "timestamp": datetime.utcnow().isoformat()
    }