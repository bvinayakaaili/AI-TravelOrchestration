from fastapi import FastAPI, Query
from pydantic import BaseModel, Field
from typing import List, Dict
import random
import logging
from datetime import datetime

app = FastAPI(
    title="Flight Service",
    description="Provides flight options between cities",
    version="1.1"
)

logger = logging.getLogger("flight_service")
logging.basicConfig(level=logging.INFO)


# -------------------------------
# Schema
# -------------------------------

class Flight(BaseModel):
    airline: str
    price: int = Field(..., ge=0)
    duration_hrs: float = Field(..., gt=0)
    departure: str
    arrival: str


class FlightResponse(BaseModel):
    flights: List[Flight]
    metadata: Dict[str, str]


# -------------------------------
# Airline Database
# -------------------------------

AIRLINES = [
    "IndiGo",
    "Air India",
    "SpiceJet",
    "Vistara",
    "Akasa Air"
]

# Departure/arrival time pools
DEPARTURE_TIMES = ["06:00", "08:30", "10:15", "13:45", "17:00", "20:30"]
ARRIVAL_OFFSET_HRS = [1.5, 2.0, 2.5]

# Base price table per route
ROUTE_BASE_PRICES = {
    ("hyd", "goa"): 4200,
    ("hyd", "del"): 5200,
    ("hyd", "blr"): 2800,
    ("blr", "goa"): 3000,
    ("del", "goa"): 6000,
    ("mum", "goa"): 3500,
    ("che", "goa"): 3800,
}


# -------------------------------
# Flight Generator
# -------------------------------

def generate_flights(source: str, destination: str) -> List[dict]:

    route = (source.lower(), destination.lower())
    base_price = ROUTE_BASE_PRICES.get(route, random.randint(3500, 6000))

    flights = []

    for airline in AIRLINES:
        price_variation = random.randint(-500, 700)
        duration = round(random.uniform(1.2, 2.5), 1)
        departure = random.choice(DEPARTURE_TIMES)

        flights.append({
            "airline": airline,
            "price": max(2000, base_price + price_variation),
            "duration_hrs": duration,
            "departure": departure,
            "arrival": f"{departure[:2]}:{int(departure[3:]) + int(duration * 60):02d}"
        })

    return flights


# -------------------------------
# Flights Endpoint
# -------------------------------

@app.get("/flights", response_model=FlightResponse)
async def get_flights(
    source: str = Query(..., description="Source city code (e.g., hyd)"),
    destination: str = Query(..., description="Destination city code (e.g., goa)"),
    sort_by: str = Query("price", description="Sort by: price | duration"),
    limit: int = Query(5, ge=1, le=10)
):
    logger.info(f"Flight search: {source} -> {destination}")

    flights = generate_flights(source, destination)

    if sort_by == "duration":
        flights.sort(key=lambda x: x["duration_hrs"])
    else:
        flights.sort(key=lambda x: x["price"])

    flights = flights[:limit]

    return FlightResponse(
        flights=flights,
        metadata={
            "source": source,
            "destination": destination,
            "sort_by": sort_by,
            "generated_at": datetime.utcnow().isoformat()
        }
    )


# -------------------------------
# Health Endpoint
# -------------------------------

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "flights",
        "timestamp": datetime.utcnow().isoformat()
    }