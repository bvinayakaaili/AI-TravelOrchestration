from fastapi import FastAPI, Query
from pydantic import BaseModel, Field
from typing import List, Dict
import random
import logging
from datetime import datetime

app = FastAPI(
    title="Weather Service",
    description="Provides weather information for travel planning",
    version="1.1"
)

logger = logging.getLogger("weather_service")
logging.basicConfig(level=logging.INFO)


# -----------------------------
# Schema
# -----------------------------

class ForecastDay(BaseModel):
    day: str
    condition: str
    temperature: str
    humidity: int


class WeatherResponse(BaseModel):
    temperature: str
    condition: str
    city: str
    humidity: int
    wind_kph: float
    forecast: List[ForecastDay]
    metadata: Dict[str, str]


# -----------------------------
# Weather Data Pools
# -----------------------------

# City-specific temperature ranges (min, max °C)
CITY_TEMP_RANGES: Dict[str, tuple] = {
    "goa": (26, 34),
    "delhi": (18, 38),
    "del": (18, 38),
    "bangalore": (20, 28),
    "blr": (20, 28),
    "hyd": (22, 36),
    "mumbai": (24, 33),
    "mum": (24, 33),
}

CONDITIONS = ["Sunny", "Cloudy", "Rainy", "Partly Cloudy", "Clear", "Hazy"]
FORECAST_CONDITIONS = ["Sunny", "Cloudy", "Rain", "Clear", "Thunderstorms", "Partly Cloudy"]


# -----------------------------
# Helper: city temp range
# -----------------------------

def get_temp(city: str) -> int:
    low, high = CITY_TEMP_RANGES.get(city.lower(), (22, 32))
    return random.randint(low, high)


# -----------------------------
# Forecast Generator
# -----------------------------

def generate_forecast(city: str) -> List[dict]:
    forecast = []
    for day in range(1, 4):
        forecast.append({
            "day": f"Day {day}",
            "condition": random.choice(FORECAST_CONDITIONS),
            "temperature": f"{get_temp(city)}°C",
            "humidity": random.randint(45, 90)
        })
    return forecast


# -----------------------------
# Weather Endpoint
# -----------------------------

@app.get("/weather", response_model=WeatherResponse)
async def get_weather(
    city: str = Query(..., description="City to get weather for")
):
    logger.info(f"Weather request for city: {city}")

    temperature = get_temp(city)
    condition = random.choice(CONDITIONS)
    humidity = random.randint(50, 90)
    wind_kph = round(random.uniform(5.0, 25.0), 1)
    forecast = generate_forecast(city)

    return WeatherResponse(
        temperature=f"{temperature}°C",
        condition=condition,
        city=city,
        humidity=humidity,
        wind_kph=wind_kph,
        forecast=forecast,
        metadata={
            "service": "weather",
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
        "service": "weather",
        "timestamp": datetime.utcnow().isoformat()
    }