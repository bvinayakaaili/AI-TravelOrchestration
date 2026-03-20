# AI-Orchestrated Smart Travel Planner

## Implementation Plan

## Recent Updates (March 2026)

- **AI Architecture — RAG**: Integrated **ChromaDB** for Retrieval-Augmented Generation, injecting destination-specific knowledge into LLM prompts.
- **AI Architecture — Memory**: Added **Conversation Memory** (per-session history) so the planner understands follow-up questions.
- **Microservices — User & Auth**: New **User Service** (Port 8006) for JWT authentication, user profiles, and saving/sharing travel plans.
- **Frontend — Advanced Features**: Real-time **WebSockets** for streaming plan generation and **Redis caching** for extreme performance.
- **Location context**: Auto geolocation fallback with explicit user overrides (e.g., "from Hyderabad" even if detected in Bengaluru), plus "to X / in X" destination extraction when LLM intent parsing fails.
- **Orchestration**: Added **Smart Budget Advisor** and **Trip Comparison** capabilities.
- **Budget tips UI**: Budget tips panel now remains visible with a helpful fallback message when LLM advice generation is unavailable.
- **Telegram Bot — Enhanced**: Full conversation flow with guided `/plan` wizard, inline keyboard buttons (Plan / Weather / Compare / History), session-based trip history, Markdown-formatted output, and `/weather`, `/compare`, `/history`, `/menu`, `/help` commands.
- **Mobile App — React Native**: New Expo-based Android/iOS app with 5 screens (Home, Plan Trip, Result, Weather, History) hitting the same backend gateway — zero backend changes required.
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

This demonstrates **dynamic AI service orchestration** across **three client surfaces**: Browser, Telegram Bot, and Mobile App — all powered by the same headless backend.

---

# 2. System Architecture

```
    Browser Frontend        Telegram Bot        React Native App
    (Next.js 14)            (bot_enhanced.py)   (App.js / Expo)
            │                       │                   │
            └───────────────────────┼───────────────────┘
                                    ▼
                        FastAPI Gateway <───> Redis Cache
                                    │
                                    ▼
                    AI Orchestrator (LLM + LangChain) <───> ChromaDB (RAG)
                                    │
             ┌──────────────────────┼────────┬────────┬────────┬────────┐
             ▼              ▼        ▼        ▼        ▼        ▼        ▼
        Flights Service  Hotels   Weather  Places   Budget   User & Auth
                        Service  Service  Service  Service   Service
             │              │        │        │        │        │
             └──────────────┴────────┴────────┴────────┴────────┘
                                    ▼
                        Final Travel Plan Response
```

---

# 3. Technology Stack

## Browser Frontend

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

## Telegram Bot

Headless client surface for the travel planner, accessible via any Telegram-connected device.

File: `bot_enhanced.py`

Technologies:

- **python-telegram-bot** v20+
- **httpx** (async HTTP)
- **PyYAML** (config)

### Commands

| Command | Description |
|---|---|
| `/start` | Welcome message + main menu |
| `/plan` | Guided step-by-step trip planner wizard |
| `/weather <city>` | Instant weather for any city |
| `/compare` | Compare two destinations |
| `/history` | View trips planned this session |
| `/menu` | Show main menu inline keyboard |
| `/help` | Full help text |
| `/cancel` | Cancel an in-progress wizard |

### Features

- **Guided `/plan` wizard** — ConversationHandler walks the user through source → destination → duration → budget one step at a time
- **Inline keyboards** — main menu with emoji action buttons; trip result shows ✅ Confirm / 🔄 Retry / 🏠 Menu
- **Session history** — trips are tracked per chat via `context.user_data`
- **Natural language fallback** — any free-text message is routed to the gateway, same as before
- **Markdown formatting** — bold route headers, bullet itineraries, clean budget/weather display
- **4096-char safety** — long responses are automatically truncated to Telegram's limit

### Configuration

`config.yml`:

```yaml
telegram_token: "YOUR_BOT_TOKEN"
gateway_url: "http://localhost:8000"
```

### Running the Bot

```bash
pip install python-telegram-bot httpx pyyaml
python bot_enhanced.py
```

---

## React Native Mobile App

Full Android/iOS app hitting the same backend gateway — no backend changes needed.

File: `mobileApp/TravelPlanner/App.js`

Technologies:

- **React Native** (Expo managed workflow)
- **React Navigation** (native stack)
- **Fetch API** (REST calls to gateway)

### Screens

| Screen | Route | Description |
|---|---|---|
| Home | `Home` | Dashboard with action cards and quick tips |
| Plan Trip | `PlanTrip` | Form with source, destination, duration, budget + quick-select chips |
| Result | `Result` | Full itinerary with weather, budget tips, day-by-day plan, save/retry |
| Weather | `Weather` | City weather lookup with popular city chips |
| History | `History` | Session trip history (AsyncStorage-ready) |

### Setup

```bash
npx create-expo-app TravelPlanner --template blank
cd TravelPlanner
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
# Replace App.js with the provided file
# Update GATEWAY_URL at the top of App.js
```

### Running

```bash
# Web browser preview
npm run web

# Android/iOS via Expo Go
npx expo start
# Scan QR code with Expo Go app
# Press t in terminal to switch to tunnel mode if QR scan doesn't connect
```

### Configuration

Update `GATEWAY_URL` at line 27 of `App.js`:

```javascript
const GATEWAY_URL = 'http://YOUR_BACKEND_IP:8000';
```

> **Note**: On a physical device, use your machine's local network IP (e.g. `192.168.0.100`), not `localhost`. Use tunnel mode (`t` in Expo terminal) if the device and PC are on different subnets or behind a firewall.

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

Each capability runs as an independent API implemented using **FastAPI**.

| Service | Endpoint | Purpose | Port |
|---|---|---|---|
| Flight Service | `/flights` | Return flight options | 8001 |
| Hotel Service | `/hotels` | Return hotel options | 8002 |
| Weather Service | `/weather` | Get weather information | 8003 |
| Places Service | `/places` | Return tourist attractions | 8004 |
| Budget Service | `/budget` | Estimate trip budget | 8005 |
| User Service | `/auth` | JWT Auth & Saved Plans | 8006 |

---

# 4. Microservice APIs

## Flight Service

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

Response:

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

Uses real API — **OpenWeather API**

```
GET /weather?city=goa
```

Response:

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

Response:

```json
{
  "places": ["Baga Beach", "Calangute Beach", "Fort Aguada"]
}
```

---

## Budget Service

Calculates estimated trip cost.

```
budget = flight_cost + hotel_cost + activities
```

---

# 5. AI Orchestration Logic

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

telegram/
   bot_enhanced.py           # Enhanced Telegram bot (guided wizard, inline buttons, commands)
   config.yml                # telegram_token + gateway_url

mobileApp/
   TravelPlanner/
     App.js                  # React Native app (Expo) — 5 screens, dark theme
     package.json

gateway/
   main.py                   # FastAPI gateway (POST /plans/generate, GET /health, WS /ws/plan)
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

| Day | Task |
|---|---|
| 1 | Project design |
| 2–3 | Build microservices |
| 4 | Implement FastAPI gateway |
| 5–6 | Integrate LangChain |
| 7–8 | Implement orchestration logic |
| 9 | Connect services |
| 10 | Build browser frontend chat UI |
| 11 | Build & test Telegram Bot (enhanced) |
| 12 | Build React Native mobile app |
| 13 | Cross-client testing (browser + bot + mobile) |
| 14 | Prepare demo |
| 15 | Documentation |

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
- Headless architecture with **three independent client surfaces** (Browser, Telegram, Mobile)
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
- **Node.js**: 14+ (for frontend and mobile development)
- **Docker**: 20.10+ (optional, for containerization)
- **pip**: Latest version for package management
- **git**: For version control

### API Keys & External Services

- **Local LLM Setup**: LLaMA 2, Mistral, or Ollama (recommended — no API key needed)
- **OpenWeather API Key** (optional, for real weather data)
- **Telegram Bot Token**: Create via [@BotFather](https://t.me/botfather) on Telegram
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

Required packages include `FastAPI`, `LangChain`, `Uvicorn`, `Ollama`, `python-telegram-bot`, and `httpx`.

**Optional packages for cloud LLM support:**

```
openai==1.3.0
anthropic==0.7.0
```

### Step 4: Install Browser Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Step 5: Install Mobile App Dependencies

```bash
cd ../mobileApp/TravelPlanner
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

### Step 6: Configure Environment Variables

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

Create `telegram/config.yml`:

```yaml
telegram_token: "YOUR_BOT_TOKEN_FROM_BOTFATHER"
gateway_url: "http://localhost:8000"
```

---

# 14. Local LLM Setup (Recommended)

### Using Ollama (Easiest Option)

Download from [ollama.ai](https://ollama.ai):

- **macOS**: Download `.dmg` and install
- **Linux**: Run `curl https://ollama.ai/install.sh | sh`
- **Windows**: Download executable and install

```bash
# Pull LLaMA 2 (7B - recommended for most systems)
ollama pull llama2

# Alternative smaller model (faster)
ollama pull mistral

# Run Ollama server
ollama serve
```

### Alternative Local LLM Options

| LLM | Setup | Memory | Speed |
|---|---|---|---|
| LLaMA 2 (7B) | Ollama | 8GB | Fast |
| Mistral 7B | Ollama | 8GB | Very Fast |
| LLaMA 2 (13B) | Ollama | 16GB | Slower |
| Phi-2 | Ollama | 4GB | Very Fast |

---

# 15. Running the Application

### Quick Start (All Backend Services)

```bash
# From the project root directory
python start_backend.py
# Starts all 6 microservices + gateway on ports 8000–8006
```

### Start Individual Microservices (Alternative)

```bash
# Terminal 1–6: each microservice
uvicorn main:app --port 8001   # flights
uvicorn main:app --port 8002   # hotels
uvicorn main:app --port 8003   # weather
uvicorn main:app --port 8004   # places
uvicorn main:app --port 8005   # budget
uvicorn main:app --port 8006   # user/auth

# Terminal 7: gateway
cd gateway && uvicorn main:app --port 8000
```

### Start Browser Frontend

```bash
cd frontend
npm run dev
# http://localhost:3000 → navigate to Slide 6 (AI Planner)
```

### Start Telegram Bot

```bash
cd telegram
python bot_enhanced.py
# Bot is now live — open Telegram, search your bot, send /start
```

### Start Mobile App

```bash
cd mobileApp/TravelPlanner
npx expo start

# Options:
#   Press w — open in browser
#   Press a — open Android emulator
#   Scan QR — open in Expo Go on physical device
#   Press t — switch to tunnel mode (fixes QR scan issues on physical devices)
```

> **Physical device tip**: Make sure phone and PC are on the same WiFi. If the QR scan opens but doesn't load, press `t` in the terminal to enable tunnel mode, then rescan.

### Docker Deployment

```bash
docker-compose up -d
# Gateway: http://localhost:8000
# Frontend: http://localhost:3000
# Microservices: http://localhost:8001–8006
```

---

# 16. API Reference

### Gateway Endpoints

#### POST /plans/generate

Generate a complete travel plan.

Request:

```json
{
  "query": "Plan a 2-day trip to Goa under ₹15000",
  "session_id": "optional-uuid",
  "source": "Hyderabad",
  "destination": "Goa"
}
```

Response:

```json
{
  "status": "success",
  "trip_plan": {
    "destination": "Goa",
    "duration": "2 days",
    "estimated_budget": 11500,
    "weather": { "city": "Goa", "temperature": "30°C", "condition": "Sunny" },
    "itinerary": ["Day 1: Baga Beach...", "Day 2: Fort Aguada..."],
    "budget_advice": "Book flights 2 weeks in advance for best prices."
  }
}
```

#### WS /ws/plan

Real-time WebSocket for streaming plan generation.

#### GET /status

System health dashboard (Gateway + all microservices).

### User Service Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Get JWT access token |
| POST | `/plans/save` | Save a generated plan |
| GET | `/plans/saved` | Retrieve saved plans |

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

---

# 18. Performance Optimization

### Caching Strategy

```python
@cache()
def get_flights(source, destination):
    return flight_service.search(source, destination)
```

### Parallel Service Execution

```python
async def orchestrate_workflow(query):
    results = await asyncio.gather(
        get_flights(...),
        get_hotels(...),
        get_weather(...)
    )
```

### Expected Performance Metrics

- Average response time: **2–4 seconds**
- P99 latency: **< 6 seconds**
- Throughput: **100+ requests/minute** (single instance)

---

# 19. Security & Best Practices

- Rate limiting via `slowapi`
- Input validation with Pydantic models
- JWT authentication for User Service
- API keys stored in `.env`, never in code
- HTTPS for all external API calls

---

# 20. Monitoring & Logging

### Structured Logging

```python
logger.info("Trip planning started", extra={"query": query, "user_id": user_id})
```

### Health Checks

```python
@app.get("/health")
async def health():
    return { "status": "healthy", "uptime": get_uptime(), "timestamp": datetime.now() }
```

---

# 21. Troubleshooting Guide

| Issue | Cause | Solution |
|---|---|---|
| Services not responding | Port conflicts | Check ports 8000–8006 are free |
| LLM not responding | Ollama not running | Run `ollama serve` |
| Out of memory | Model too large | Use Phi-2 or Mistral 7B |
| Slow response | Sequential execution | Ensure async/concurrent calls |
| Telegram bot silent | Wrong token | Check `config.yml` token |
| Telegram QR doesn't open | Network/firewall | Press `t` for tunnel mode in Expo |
| Mobile app `localhost` fails | Wrong IP on device | Use machine's LAN IP, not localhost |
| React Navigation not found | Packages not installed | Run `npm install @react-navigation/native @react-navigation/native-stack` |

---

# 22. Deployment Strategies

### Local Development

```bash
docker-compose -f docker-compose.dev.yml up
```

### Production — Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: travel-planner
spec:
  replicas: 3
  ...
```

### Production — AWS (gunicorn + nginx)

```bash
gunicorn -w 4 -b 0.0.0.0:8000 gateway.main:app
```

### Production — Azure Container Instances

```bash
az container create --resource-group myRG --name travel-planner --image travel-planner:latest --ports 8000
```

---

# 23. Advanced Features

### Real-time Notifications (WebSocket)

```python
@app.websocket("/ws/trip-updates")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    data = await orchestrate_workflow(...)
    await websocket.send_json(data)
```

### ML-Based Preference Prediction

```python
def predict_user_preferences(user_history):
    llm = Ollama(model="llama2", base_url="http://localhost:11434")
    prompt = f"Based on this travel history: {user_history} — what might this user prefer next?"
    return llm(prompt)
```

---

# 24. Future Enhancements

- **Multi-destination trips**: Plan across multiple cities
- **Voice interface**: Voice-based query processing
- **Booking integration**: Direct hotel/flight bookings
- **Push notifications**: Mobile trip reminders via Expo Notifications
- **Telegram payments**: In-bot booking checkout
- **AsyncStorage**: Persist mobile trip history across sessions
- **Collaborative planning**: Multiple users planning together
- **AR/VR preview**: Virtual tour of destinations
- **Carbon footprint**: Sustainability metrics per trip
- **GraphQL**: Replace REST for complex frontend queries

---

# 25. Resources & Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [Ollama — Local LLM](https://ollama.ai)
- [python-telegram-bot](https://python-telegram-bot.org/)
- [React Navigation](https://reactnavigation.org/)
- [Expo Documentation](https://docs.expo.dev/)

---

# 26. Contributing Guidelines

### Branch Naming

```
feature/add-new-service
bugfix/fix-orchestration-logic
docs/update-readme
```

### Code Style

```bash
black .       # format
flake8 .      # lint
mypy .        # type check
```

---

# 27. FAQ

**Q: Can I deploy this on shared hosting?**
A: Yes, but for optimal performance use Docker or cloud platforms.

**Q: Can I replace OpenAI with a local LLM?**
A: Yes — use Ollama with LLaMA 2 or Mistral. Runs fully offline, no API keys needed.

**Q: Does the mobile app need any backend changes?**
A: No. It hits the same `/plans/generate` and `/weather` endpoints as the browser frontend.

**Q: How do I get a Telegram bot token?**
A: Open Telegram, search for [@BotFather](https://t.me/botfather), send `/newbot`, follow the steps.

**Q: The Expo QR code doesn't connect on my phone — what do I do?**
A: Press `t` in the Expo terminal to switch to tunnel mode, then rescan. Ensure phone and PC are on the same WiFi, or open port 8081 in Windows Firewall.

**Q: What's the cost of running this?**
A: With local LLM (Ollama), cost is minimal — just server/hosting. No API charges.

---

# 28. License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Last Updated**: March 2026
**Version**: 1.2.0
**Status**: Active Development
**Client Surfaces**: Browser (Next.js) · Telegram Bot · React Native Mobile App
