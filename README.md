# AI-Orchestrated Smart Travel Planner

## Implementation Plan

## Recent Updates (March 2026)

- **AI Architecture — RAG**: Integrated **ChromaDB** for Retrieval-Augmented Generation, injecting destination-specific knowledge into LLM prompts.
- **AI Architecture — Memory**: Added **Conversation Memory** (per-session history) so the planner understands follow-up questions.
- **Microservices — User & Auth**: New **User Service** (Port 8006) for JWT authentication, user profiles, and saving/sharing travel plans.
- **Frontend — Advanced Features**: Real-time **WebSockets** for streaming plan generation and **Redis caching** for extreme performance.
- **Location context**: Auto geolocation fallback with explicit user overrides (e.g., “from Hyderabad” even if detected in Bengaluru), plus “to X / in X” destination extraction when LLM intent parsing fails.
- **Orchestration**: Added **Smart Budget Advisor** and **Trip Comparison** capabilities.
- **Budget tips UI**: Budget tips panel now remains visible with a helpful fallback message when LLM advice generation is unavailable.
- **Dependencies**: Regenerated `requirements.txt` via `pip freeze` and updated setup guides.

---

# 1. Project Overview

The **AI-Orchestrated Smart Travel Planner** demonstrates a system where an AI engine dynamically composes workflows across multiple microservices to generate a complete travel plan.

Instead of manually searching across multiple apps (flights, hotels, weather, attractions), the user simply asks:

> _"Plan a 2-day trip to Goa under ₹15000 with beach activities."_

The system then:

1. Understands user intent using an LLM.
2. Determines required services.
3. Calls the relevant microservices.
4. Aggregates results.
5. Returns a unified travel plan.

This demonstrates **dynamic AI service orchestration**.

---

# 2. System Architecture

```
    Frontend (Chat UI)
            │
            ▼
    FastAPI Gateway <───> Redis Cache
            │
            ▼
    AI Orchestrator (LLM + LangChain) <───> ChromaDB (RAG)
            │
     ┌──────┴───────┬────────┬────────┬────────┬────────┐
     ▼              ▼        ▼        ▼        ▼        ▼
Flights Service  Hotels   Weather  Places   Budget   User & Auth
                Service  Service  Service  Service   Service
     │              │        │        │        │        │
     └──────────────┴────────┴────┬───┴────────┴────────┘
                                  ▼
                      Final Travel Plan Response
```

---

# 3. Technology Stack

## Frontend

Modern slide-based UI with AI Travel Planner chatbot.

Technologies:

- **Next.js 14** (React framework)
- **Tailwind CSS** (Utility-first styling)
- **TypeScript**
- **Framer Motion** (Animations)

Features:

- **6 slides** with parallax, skeleton loaders, animated counters, and fade+slide transitions
- **AI Chatbot slide** (Slide 6 — AI Planner) — sends natural language queries to the backend via **WebSockets**
- Fully responsive design — mobile hamburger menu + vertical scroll, desktop keyboard/wheel navigation
- Custom cursor (hidden on touch devices), glassmorphism cards, and spotlight hover effects
- **User Dashboard**: login/register and history view (integrated with User Service)

---

## Backend API Gateway

Handles incoming requests and forwards them to the AI orchestrator.

Technology:

- **FastAPI**

Responsibilities:

- Accept user requests
- Forward request to orchestrator
- Return final response

---

## AI Orchestration Layer

Responsible for interpreting the user request and composing the workflow.

Technologies:

- **LangChain**
- **Local LLM (Recommended)**: LLaMA, Mistral, or similar
- **Alternative**: OpenAI API (optional cloud-based)
- Python

Responsibilities:

- Intent detection
- **RAG Context Injection**: Fetches local knowledge from ChromaDB
- **Conversation Memory**: Tracks previous turns in the session
- **Service Selection & Workflow Composition**
- **Parallel Async Execution**: Calls microservices concurrently
- **Itinerary Generation & Budget Advice**
- **Trip Comparison**: Can compare two destinations side-by-side

---

## Microservices

Each capability runs as an independent API.

Each service will be implemented using **FastAPI**.

Minimal services:

| Service         | Endpoint   | Purpose                    | Port |
| --------------- | ---------- | -------------------------- | ---- |
| Flight Service  | `/flights` | Return flight options      | 8001 |
| Hotel Service   | `/hotels`  | Return hotel options       | 8002 |
| Weather Service | `/weather` | Get weather information    | 8003 |
| Places Service  | `/places`  | Return tourist attractions | 8004 |
| Budget Service  | `/budget`  | Estimate trip budget       | 8005 |
| User Service    | `/auth`    | JWT Auth & Saved Plans     | 8006 |

---

# 4. Microservice APIs

## Flight Service

Example endpoint:

```
GET /flights?source=hyd&destination=goa
```

Response:

```json
{
  "flights": [
    { "airline": "IndiGo", "price": 4500 },
    { "airline": "Air India", "price": 4800 }
  ]
}
```

---

## Hotel Service

```
GET /hotels?city=goa
```

Example response:

```json
{
  "hotels": [
    { "name": "Beach Resort", "price_per_night": 3500 },
    { "name": "Sea View Hotel", "price_per_night": 2800 }
  ]
}
```

---

## Weather Service

Uses real API:

- **OpenWeather API**

Endpoint:

```
GET /weather?city=goa
```

Example response:

```json
{
  "temperature": "30°C",
  "condition": "Sunny"
}
```

---

## Places Service

```
GET /places?city=goa
```

Example response:

```json
{
  "places": ["Baga Beach", "Calangute Beach", "Fort Aguada"]
}
```

---

## Budget Service

Calculates estimated trip cost.

Example logic:

```
budget = flight_cost + hotel_cost + activities
```

---

# 5. AI Orchestration Logic

Workflow process:

```
User Query
     ↓
LLM extracts intent
     ↓
Determine required services
     ↓
Call services via APIs
     ↓
Aggregate results
     ↓
Generate travel plan
```

---

# 6. Example Workflow

User input:

```
Plan a 2-day trip to Goa
```

AI selects services:

```
Flight Service
Hotel Service
Weather Service
Places Service
Budget Service
```

Execution flow:

```
1. Fetch flights
2. Fetch hotels
3. Fetch weather
4. Fetch attractions
5. Calculate budget
6. Combine results
```

---

# 7. Example Output

```
Trip Plan: Goa (2 Days)

Flights
HYD → GOA ₹4500

Hotel
Beach Resort ₹3500/night

Weather
Sunny 30°C

Places to Visit
- Baga Beach
- Calangute Beach
- Fort Aguada

Estimated Budget
₹11,500
```

---

# 8. Project Folder Structure

```
ai-platform/

frontend/                    # Next.js 14 + Tailwind CSS
   src/
     app/
       page.tsx              # Main slide controller (6 slides, fade+slide transitions)
       layout.tsx            # Root layout with fonts
       globals.css           # Design system tokens + responsive utilities
     components/
       Navbar.tsx            # Responsive navbar: desktop links + mobile hamburger
       Cursor.tsx            # Custom cursor (hidden on touch devices)
       Animations.tsx        # SplitText + spotlight hover
       slides/
         Slide1.tsx          # Hero + parallax + marquee (Get Started → AI Planner)
         Slide2.tsx          # Platform overview (split panel)
         Slide3.tsx          # System architecture (animated step cards)
         Slide4.tsx          # AI Core + neural network bg + animated counters
         Slide5.tsx          # Composable modules grid
         ChatBot.tsx         # AI Travel Planner chatbot UI (Slide 6)
   public/
     images/                 # Optimized images for each slide
   next.config.mjs
   tailwind.config.ts
   package.json

gateway/
   main.py                   # FastAPI gateway (POST /plan, GET /health)
   Dockerfile

orchestrator/
   planner.py                # LangChain + ChatOllama AI orchestrator
   rag.py                    # RAG Engine (ChromaDB + Sentence Transformers)

data/
   knowledge/                # Markdown files for RAG (e.g., goa.md, mumbai.md)
   chroma_db/                # Persistent vector database
   flights.json              # Mock flight data
   hotels.json               # Mock hotel data

services/
   flight_service/main.py    # Flight search API (port 8001)
   hotel_service/main.py     # Hotel search API (port 8002)
   weather_service/main.py   # Weather API (port 8003)
   places_service/main.py    # Tourist attractions API (port 8004)
   budget_service/main.py    # Budget calculator API (port 8005)
   user_service/main.py      # User & Auth API (port 8006)

start_backend.py             # Launches all 7 backend services (Gateway + 6 microservices)
requirements.txt             # Frozen Python dependencies (pip freeze)
docker-compose.yml
.env.example
```

---

# 9. 15-Day Execution Plan

| Day | Task                            |
| --- | ------------------------------- |
| 1   | Project design                  |
| 2–3 | Build microservices             |
| 4   | Implement FastAPI gateway       |
| 5–6 | Integrate LangChain             |
| 7–8 | Implement orchestration logic   |
| 9   | Connect services                |
| 10  | Build frontend chat UI          |
| 11  | Testing                         |
| 12  | Add logs + workflow explanation |
| 13  | Optimize orchestration          |
| 14  | Prepare demo                    |
| 15  | Documentation                   |

---

# 10. Explainable AI Workflow (Optional Feature)

To make the system more research-grade, show how the AI decided the workflow.

Example output:

```
AI Workflow Explanation

Detected Intent:
Travel Planning

Selected Services:
1. Flight Service
2. Hotel Service
3. Weather Service
4. Places Service
5. User Service (Auth check)

Reason:
These services are required to generate a complete travel plan.
```

---

# 11. Expected Outcomes

The prototype demonstrates:

- AI-driven workflow orchestration
- Headless architecture
- Composable microservices
- Intelligent service selection

This architecture closely resembles **modern AI agent systems** used in industry.

---

# 12. Prerequisites & System Requirements

### Hardware Requirements

- **Minimum**: 4GB RAM, 2 CPU cores
- **Recommended**: 8GB RAM, 4 CPU cores for concurrent service execution
- **Storage**: 2GB for application files and dependencies

### Software Requirements

- **Python**: 3.8+
- **Node.js**: 14+ (for frontend development)
- **Docker**: 20.10+ (optional, for containerization)
- **pip**: Latest version for package management
- **git**: For version control

### API Keys & External Services

- **Local LLM Setup**: LLaMA 2, Mistral, or Ollama (recommended - no API key needed)
- **OpenWeather API Key** (optional, for real weather data)
- **Note**: All services can run locally without any cloud API keys

---

# 13. Installation & Setup Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/abhimaiya3175/AI-Orchestrated-Headless-Composable-Application-Platform.git
cd AI-Orchestrated-Headless-Composable-Application-Platform
```

### Step 2: Create Python Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 3: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Required Python Packages

All dependencies have been frozen to ensure reproducible builds. Simply run the `pip install -r requirements.txt` command mentioned above. Key dependencies include `FastAPI`, `LangChain`, `Uvicorn`, and `Ollama`.

**Optional packages for cloud LLM support:**

```
openai==1.3.0
anthropic==0.7.0
```

### Step 4: Install Frontend Dependencies (Optional)

```bash
cd ../frontend
npm install
```

### Step 5: Configure Environment Variables

Create a `.env` file in the backend directory:

```
# LLM Configuration (Local - recommended)
LLM_PROVIDER=local
LLM_MODEL=llama2
OLLAMA_BASE_URL=http://localhost:11434

# Alternative: Cloud-based LLM (optional)
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_api_key_here

# External Services
OPENWEATHER_API_KEY=optional_weather_api_key
ORCHESTRATOR_PORT=8000
FLIGHTS_SERVICE_URL=http://localhost:8001
HOTELS_SERVICE_URL=http://localhost:8002
WEATHER_SERVICE_URL=http://localhost:8003
PLACES_SERVICE_URL=http://localhost:8004
BUDGET_SERVICE_URL=http://localhost:8005
USER_SERVICE_URL=http://localhost:8006

# Auth & Cache
JWT_SECRET_KEY=ai-travel-planner-secret-change-in-prod
JWT_TTL_HOURS=24
REDIS_URL=redis://localhost:6379

LOG_LEVEL=INFO
```

---

# 14. Local LLM Setup (Recommended)

### Using Ollama (Easiest Option)

Ollama provides an easy way to run local LLMs without any cloud dependencies.

#### Installation

Download from [ollama.ai](https://ollama.ai):

- **macOS**: Download `.dmg` and install
- **Linux**: Run `curl https://ollama.ai/install.sh | sh`
- **Windows**: Download executable and install

#### Pull a Model

```bash
# Pull LLaMA 2 (7B - recommended for most systems)
ollama pull llama2

# Alternative smaller model (3B)
ollama pull mistral

# Alternative larger model (13B - requires 16GB+ RAM)
ollama pull llama2:13b
```

#### Run Ollama Server

```bash
ollama serve
# Runs on http://localhost:11434
```

#### Test the Local LLM

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "What is Goa known for?"
}'
```

### Using LangChain with Local LLM

```python
from langchain.llms import Ollama

llm = Ollama(
    model="llama2",
    base_url="http://localhost:11434"
)

response = llm("Plan a trip to Goa")
print(response)
```

### Alternative Local LLM Options

| LLM           | Setup  | Memory | Speed     |
| ------------- | ------ | ------ | --------- |
| LLaMA 2 (7B)  | Ollama | 8GB    | Fast      |
| Mistral 7B    | Ollama | 8GB    | Very Fast |
| LLaMA 2 (13B) | Ollama | 16GB   | Slower    |
| Phi-2         | Ollama | 4GB    | Very Fast |
| LLaMA CPP     | Direct | 4GB+   | Variable  |
| GPT4All       | Local  | 4GB    | Fast      |

### System Requirements for Local LLMs

| Model | RAM  | VRAM | Disk  |
| ----- | ---- | ---- | ----- |
| 7B    | 8GB  | 4GB  | 15GB  |
| 13B   | 16GB | 8GB  | 30GB  |
| 70B   | 64GB | 40GB | 150GB |

---

# 15. Running the Application

### Quick Start (All Services)

The easiest way to start all backend services at once:

```bash
# From the project root directory
python start_backend.py
# This starts all 6 microservices + gateway on ports 8000-8006
```

### Start Individual Microservices (Alternative)

Open separate terminals for each service:

```bash
# Terminal 1: Flight Service
cd services/flight_service
uvicorn main:app --port 8001

# Terminal 2: Hotel Service
cd services/hotel_service
uvicorn main:app --port 8002

# Terminal 3: Weather Service
cd services/weather_service
uvicorn main:app --port 8003

# Terminal 4: Places Service
cd services/places_service
uvicorn main:app --port 8004

# Terminal 5: Budget Service
cd services/budget_service
uvicorn main:app --port 8005

# Terminal 6: User Service
cd services/user_service
uvicorn main:app --port 8006

# Terminal 7: API Gateway
cd gateway
uvicorn main:app --port 8000
```

### Start Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Using the AI Chatbot

1. Make sure Ollama is running: `ollama serve`
2. Start the backend: `python start_backend.py`
3. Start the frontend: `cd frontend && npm run dev`
4. Navigate to **Slide 6 (AI Planner)** — click **[AI PLANNER]** in the navbar, or click **[GET STARTED]** on the hero
5. Type a travel query like: _"Plan a 2-day trip to Goa under ₹15000"_
6. The AI orchestrator will call all relevant services and return a complete travel plan.

### Docker Deployment

Build and run using Docker Compose:

```bash
docker-compose up -d
```

Expected services:

- Gateway: `http://localhost:8000`
- Frontend: `http://localhost:3000`
- All microservices: `http://localhost:8001-8006`

---

### Gateway Endpoints

#### POST /plans/generate

**Description**: Generate a complete travel plan based on user query (with Redis caching).

**Request**:

```json
{
  "query": "Plan a 2-day trip to Goa under ₹15000",
  "session_id": "optional-uuid",
  "budget": 15000
}
```

**Response**:

```json
{
  "status": "success",
  "trip_plan": {
    "destination": "Goa",
    "duration": "2 days",
    "flights": [],
    "hotels": [],
    "itinerary": "Day 1...",
    "budget_advice": "Tip: ..."
  }
}
```

#### WS /ws/plan

**Description**: Real-time WebSocket for streaming intent detection and plan generation.

#### GET /status

**Description**: System health dashboard (Gateway + All Microservices).

---

### User Service Endpoints

#### POST /auth/register

Register a new user with preferences.

#### POST /auth/login

Get JWT access token.

#### POST /plans/save

Save a generated plan to user profile.

#### GET /plans/saved

Retrieve all saved plans.

---

# 17. Testing & Validation

### Unit Testing

```bash
cd backend
pytest tests/unit/ -v
```

### Integration Testing

```bash
pytest tests/integration/ -v
```

### Load Testing

```bash
locust -f locustfile.py --host=http://localhost:8000
```

### Sample Test Cases

```python
# Test orchestrator service selection
def test_service_selection_for_travel_query():
    query = "Plan a trip to Paris"
    services = orchestrator.determine_services(query)
    assert "flights" in services
    assert "hotels" in services

# Test workflow execution
def test_complete_workflow():
    result = gateway.plan_trip({
        "query": "2-day Goa trip",
        "budget": 15000
    })
    assert result["status"] == "success"
    assert "flights" in result["trip_plan"]
```

---

# 18. Performance Optimization

### Caching Strategy

```python
# Implement Redis caching for frequently queried destinations
@cache()
def get_flights(source, destination):
    return flight_service.search(source, destination)
```

### Parallel Service Execution

Services are called concurrently using asyncio:

```python
async def orchestrate_workflow(query):
    flight_task = get_flights(...)
    hotel_task = get_hotels(...)
    weather_task = get_weather(...)

    results = await asyncio.gather(
        flight_task,
        hotel_task,
        weather_task
    )
```

### Expected Performance Metrics

- Average response time: **2-4 seconds**
- P99 latency: **< 6 seconds**
- Throughput: **100+ requests/minute** (single instance)

---

# 19. Security & Best Practices

### API Security

```python
# Implement rate limiting
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/plan")
@limiter.limit("10/minute")
async def plan_trip(request: PlanRequest):
    pass
```

### Data Protection

- Validate all inputs using Pydantic models
- Sanitize user queries to prevent injection attacks
- Use HTTPS for all external API calls
- Store API keys securely in environment variables, never in code

### Authentication (Optional)

```python
# JWT-based authentication for production
from fastapi.security import HTTPBearer
security = HTTPBearer()

@app.post("/plan")
async def plan_trip(request: PlanRequest, credentials: HTTPAuthenticationCredentials = Depends(security)):
    # Verify JWT token
    pass
```

---

# 20. Monitoring & Logging

### Structured Logging

```python
import logging
from pythonjsonlogger import jsonlogger

logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
handler.setFormatter(formatter)
logger.addHandler(handler)

logger.info("Trip planning started", extra={"query": query, "user_id": user_id})
```

### Metrics Collection

Using Prometheus for monitoring:

```python
from prometheus_client import Counter, Histogram

request_count = Counter('requests_total', 'Total requests')
request_duration = Histogram('request_duration_seconds', 'Request duration')
```

### Health Checks

Implement health endpoints for each service:

```python
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "uptime": get_uptime(),
        "timestamp": datetime.now()
    }
```

---

# 21. Troubleshooting Guide

### Common Issues & Solutions

| Issue                   | Cause                         | Solution                                                   |
| ----------------------- | ----------------------------- | ---------------------------------------------------------- |
| Services not responding | Port conflicts                | Check if ports 8000-8005 are available                     |
| LLM not responding      | Ollama not running            | Run `ollama serve` in a separate terminal                  |
| Out of memory           | Model too large for system    | Use smaller model (Phi-2, Mistral 7B instead of LLaMA 13B) |
| Slow response           | Services running sequentially | Ensure async/concurrent execution                          |
| Memory issues           | Large data aggregation        | Implement pagination and streaming                         |
| Ollama errors           | Port 11434 already in use     | Change Ollama port or stop conflicting process             |

### Debug Mode

Enable verbose logging:

```bash
export LOG_LEVEL=DEBUG
python gateway/main.py
```

Check individual service logs:

```bash
curl http://localhost:8001/logs
curl http://localhost:8002/logs
```

---

# 22. Deployment Strategies

### Local Development

```bash
docker-compose -f docker-compose.dev.yml up
```

### Staging Environment

```bash
docker-compose -f docker-compose.staging.yml up
```

### Production Deployment

#### Option 1: Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: travel-planner
spec:
  replicas: 3
  selector:
    matchLabels:
      app: travel-planner
  template:
    metadata:
      labels:
        app: travel-planner
    spec:
      containers:
        - name: gateway
          image: travel-planner:latest
          ports:
            - containerPort: 8000
```

#### Option 2: AWS using gunicorn + nginx

```bash
gunicorn -w 4 -b 0.0.0.0:8000 gateway.main:app
```

#### Option 3: Azure Container Instances

```bash
az container create \
  --resource-group myResourceGroup \
  --name travel-planner \
  --image travel-planner:latest \
  --ports 8000
```

---

# 23. Advanced Features

### Multi-Language Support

```python
# Add i18n support
from babel import Locale
def translate_results(results, language="en"):
    # Translate destination names, hotel descriptions, etc.
    pass
```

### Real-time Notifications

```python
from fastapi import WebSocket

@app.websocket("/ws/trip-updates")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await orchestrate_workflow(...)
        await websocket.send_json(data)
```

### Machine Learning Integration

```python
# Use local LLM for preference prediction
from langchain.llms import Ollama

def predict_user_preferences(user_history):
    llm = Ollama(model="llama2", base_url="http://localhost:11434")

    prompt = f"""Based on this travel history: {user_history}
    What might this user prefer for their next trip?"""

    return llm(prompt)
```

### Analytics & Insights

```python
# Track which services are used most frequently
@app.get("/analytics")
async def get_analytics():
    return {
        "most_popular_destinations": [...],
        "average_budget": 12500,
        "peak_hours": [19, 20, 21],
        "user_satisfaction_score": 4.6
    }
```

---

# 24. Contributing Guidelines

We welcome contributions! Please follow these guidelines:

### Branch Naming Convention

```
feature/add-new-service
bugfix/fix-orchestration-logic
docs/update-readme
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make changes with clear commit messages
4. Write/update tests
5. Submit PR with detailed description

### Code Style

```bash
# Format code with Black
black .

# Lint with Flake8
flake8 .

# Type checking with mypy
mypy .
```

---

# 25. Future Enhancements

### Planned Features

- **Multi-destination trips**: Plan trips across multiple cities
- **Collaborative planning**: Multiple users planning together
- **Cost optimization**: ML-based cost prediction
- **Sustainability metrics**: Carbon footprint calculations
- **AR/VR preview**: Virtual tour of destinations
- **Mobile app**: React Native implementation
- **Voice interface**: Voice-based query processing
- **Booking integration**: Direct hotel/flight bookings
- **Payment gateway**: Integrated checkout system
- **Social features**: Share trip plans, recommendations

### Technology Upgrades

- Transition to GraphQL for complex queries
- Implement CQRS pattern for scalability
- Adopt event-driven architecture
- Implement machine learning for personalization
- Add blockchain for secure transaction records

---

# 26. Resource & Documentation

### External Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [Ollama - Local LLM](https://ollama.ai)
- [LLaMA 2 Model](https://llama.meta.com/)
- [Mistral AI](https://www.mistral.ai/)
- [Microservices Architecture Best Practices](https://microservices.io/)
- [Python Async Programming](https://realpython.com/async-io-python/)

### Key Concepts

- **API Gateway Pattern**: Centralized entry point for all requests
- **Service Orchestration**: Dynamic composition of services based on intent
- **Headless Architecture**: Separation of backend logic from frontend UI
- **Microservices**: Independent, loosely coupled services
- **Composable Services**: Services designed to be combined flexibly

### Related Projects

- OpenAI's Function Calling
- LangChain Agent Framework
- Apache Airflow (Workflow Orchestration)
- Apache Kafka (Event Streaming)
- Kubernetes (Container Orchestration)

---

# 27. FAQ & Common Questions

**Q: Can I deploy this on shared hosting?**
A: Yes, but for optimal performance, use Docker containers or cloud platforms.

**Q: How do I scale this for more users?**
A: Implement load balancing, use database caching, and deploy multiple instances using Kubernetes.

**Q: Can I replace OpenAI with local LLM?**
A: Yes, and it's recommended! Use Ollama with LLaMA 2, Mistral, or other open-source models. No API keys needed, runs entirely offline.

**Q: What LLM should I use?**
A: For most systems, LLaMA 2 (7B) via Ollama is ideal. For slower systems, try Phi-2 or Mistral 7B.

**Q: How do I handle service failures?**
A: Implement circuit breakers, retry logic, and fallback services.

**Q: What's the cost of running this?**
A: With local LLM (Ollama), cost is minimal - just server/hosting expenses. No API charges. Optional external services (weather API) may have small costs depending on usage.

---

# 28. Support & Contact

- **Documentation**: See this README and `/docs` folder
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join GitHub Discussions for feature requests
- **Email**: support@example.com
- **Community**: Join our Discord/Slack community

---

# 29. License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

**Last Updated**: March 2026
**Version**: 1.1.0
**Status**: Active Development
