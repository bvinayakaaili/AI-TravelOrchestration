"""
TravelOrchestrator — Enhanced with:
  ✅ Dynamic service selection (LLM-driven)
  ✅ Conversation memory (per session)
  ✅ LangChain Agent with Tools
  ✅ RAG context injection (ChromaDB)
  ✅ Itinerary generation
  ✅ Smart budget advisor
  ✅ Trip comparison
"""
import os
import sys
import asyncio
import httpx
import json
import logging
import time
from typing import Optional
from collections import defaultdict

# Allow importing sibling modules from the orchestrator directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from rag import get_destination_context

logger = logging.getLogger("travel_orchestrator")
logging.basicConfig(level=logging.INFO)

# ─────────────────────────────────────────────
# Service URLs
# ─────────────────────────────────────────────
FLIGHTS_URL  = os.getenv("FLIGHTS_SERVICE_URL",  "http://localhost:8001")
HOTELS_URL   = os.getenv("HOTELS_SERVICE_URL",   "http://localhost:8002")
WEATHER_URL  = os.getenv("WEATHER_SERVICE_URL",  "http://localhost:8003")
PLACES_URL   = os.getenv("PLACES_SERVICE_URL",   "http://localhost:8004")
BUDGET_URL   = os.getenv("BUDGET_SERVICE_URL",   "http://localhost:8005")
ALL_SERVICES = ["flights", "hotels", "weather", "places"]


class TravelOrchestrator:

    def __init__(self):
        provider = os.getenv("LLM_PROVIDER", "local").lower()

        if provider == "local":
            model    = os.getenv("LLM_MODEL", "llama3")
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            self.llm = ChatOllama(model=model, base_url=base_url, format="json")
            # Non-json variant for free-text generation (itinerary, advisor)
            self.llm_text = ChatOllama(model=model, base_url=base_url)
        else:
            from langchain_openai import ChatOpenAI
            self.llm      = ChatOpenAI(model_name="gpt-3.5-turbo", response_format={"type": "json_object"})
            self.llm_text = ChatOpenAI(model_name="gpt-3.5-turbo")

        # Per-session conversation history: session_id → list of messages
        self._sessions: dict[str, list] = defaultdict(list)
        self._session_max_turns = 10   # keep last 10 messages

    # ─────────────────────────────────────────────
    # Session / Memory helpers
    # ─────────────────────────────────────────────
    def get_history(self, session_id: str) -> list:
        return self._sessions[session_id][-self._session_max_turns:]

    def append_message(self, session_id: str, role: str, content: str):
        self._sessions[session_id].append({"role": role, "content": content})

    def clear_session(self, session_id: str):
        self._sessions.pop(session_id, None)

    def _build_history_text(self, session_id: str) -> str:
        history = self.get_history(session_id)
        if not history:
            return ""
        lines = []
        for m in history:
            prefix = "User" if m["role"] == "user" else "AI"
            lines.append(f"{prefix}: {m['content']}")
        return "\n".join(lines)

    @staticmethod
    def _extract_source_from_query(query: str) -> Optional[str]:
        import re
        if not query:
            return None

        patterns = [
            r"\bfrom\s+([A-Za-z\s]+?)(?=\s+to\b|\s+for\b|\s+on\b|\s+with\b|$)",
            r"\borigin\s+([A-Za-z\s]+?)(?=\s+to\b|\s+for\b|\s+on\b|\s+with\b|$)",
        ]

        for pat in patterns:
            match = re.search(pat, query, re.IGNORECASE)
            if match:
                city = match.group(1).strip()
                if city:
                    return city.title()

        return None

    @staticmethod
    def _extract_destination_from_query(query: str) -> Optional[str]:
        import re
        if not query:
            return None

        patterns = [
            r"\b(?:to|in|within|around)\s+([A-Za-z\s]+?)(?=\s+from\b|\s+for\b|\s+on\b|\s+with\b|$)",
            r"\b(?:to|in|within|around)\s+([A-Za-z\s]+?)\b",
        ]

        for pat in patterns:
            match = re.search(pat, query, re.IGNORECASE)
            if match:
                city = match.group(1).strip()
                if city:
                    return city.title()

        # Fallback by explicit city name known tokens
        known_cities = ["Bengaluru", "Bangalore", "Goa", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Kolkata", "Pune"]
        for city in known_cities:
            if re.search(rf"\b{re.escape(city)}\b", query, re.IGNORECASE):
                return city

        return None

    # ─────────────────────────────────────────────
    # HTTP helpers
    # ─────────────────────────────────────────────
    async def _fetch_data(self, url: str, params: dict = None) -> dict:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return {"data": response.json(), "latency_ms": round((time.time()-start)*1000, 2), "error": None}
        except Exception as e:
            logger.error(f"GET failed: {url} | {e}")
            return {"data": {}, "latency_ms": None, "error": str(e)}

    async def _post_data(self, url: str, payload: dict) -> dict:
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return {"data": response.json(), "latency_ms": round((time.time()-start)*1000, 2), "error": None}
        except Exception as e:
            logger.error(f"POST failed: {url} | {e}")
            return {"data": {}, "latency_ms": None, "error": str(e)}

    # ─────────────────────────────────────────────
    # Intent Detection (supports conversation history)
    # ─────────────────────────────────────────────
    async def detect_intent_and_services(self, query: str, session_id: str = "") -> dict:
        history_text = self._build_history_text(session_id) if session_id else ""
        history_section = (
            f"\n\nPrevious conversation context:\n{history_text}\n"
            if history_text else ""
        )

        prompt = PromptTemplate.from_template(
            """You are an AI Travel Planning Orchestrator.{history}

Available services:
- "flights"  → user wants to TRAVEL (needs transport)
- "hotels"   → user needs ACCOMMODATION (overnight stay)
- "weather"  → user wants WEATHER or CLIMATE information
- "places"   → user wants ATTRACTIONS, SIGHTSEEING, ACTIVITIES

Rules:
1. "Plan a trip" / "travel to" → include ALL relevant services
2. Weather-only query → ONLY "weather"
3. Places/attractions-only → ONLY "places"
4. Flights-only → ONLY "flights"
5. Hotels-only → ONLY "hotels"
6. If a previous query established context (destination, duration, budget),
   carry it forward when answering follow-ups

Return ONLY valid JSON:
{{
  "destination": "city name",
  "source": "origin city",
  "num_days": 2,
  "budget": 15000,
  "preferences": "general",
  "services": ["flights","hotels","weather","places"]
}}

User query: {query}"""
        )

        chain = prompt | self.llm | StrOutputParser()
        try:
            # 45-second timeout for intent detection
            result = await asyncio.wait_for(
                chain.ainvoke({"query": query, "history": history_section}),
                timeout=45.0
            )
            parsed = json.loads(result)
            parsed.setdefault("destination", "Goa")
            parsed.setdefault("source", "")
            parsed.setdefault("num_days", 2)
            parsed.setdefault("budget", 15000)
            parsed.setdefault("preferences", "general")
            parsed.setdefault("services", ALL_SERVICES)
            svcs = parsed.get("services", [])
            parsed["services"] = [s.lower().strip() for s in svcs if isinstance(s, str)]
            return parsed
        except asyncio.TimeoutError:
            logger.warning("Intent detection timed out, using defaults")
            fallback_dest = self._extract_destination_from_query(query) or "Goa"
            fallback_source = self._extract_source_from_query(query) or ""
            if fallback_dest:
                logger.info(f"Using destination from query fallback: {fallback_dest}")
            return {
                "destination": fallback_dest, "source": fallback_source,
                "num_days": 2, "budget": 15000, "preferences": "general", "services": ALL_SERVICES
            }
        except Exception:
            logger.warning("LLM JSON parse failed, using defaults")
            fallback_dest = self._extract_destination_from_query(query) or "Goa"
            fallback_source = self._extract_source_from_query(query) or ""
            if fallback_dest:
                logger.info(f"Using destination from query fallback: {fallback_dest}")
            return {
                "destination": fallback_dest, "source": fallback_source,
                "num_days": 2, "budget": 15000, "preferences": "general", "services": ALL_SERVICES
            }

    # ─────────────────────────────────────────────
    # Budget optimization
    # ─────────────────────────────────────────────
    def optimize_for_budget(self, flights, hotels, days, user_budget):
        if not flights or not hotels:
            return (flights[0] if flights else None), (hotels[0] if hotels else None)
        for flight in flights:
            for hotel in hotels:
                total = flight.get("price", 0) + hotel.get("price_per_night", 0)*days + 1500*days
                if total <= user_budget:
                    return flight, hotel
        return flights[0], hotels[0]

    # ─────────────────────────────────────────────
    # Smart Budget Advisor
    # ─────────────────────────────────────────────
    async def generate_budget_advice(self, dest: str, budget: int, estimated: int,
                                     days: int, preferences: str) -> str:
        over_by = estimated - budget
        prompt = PromptTemplate.from_template(
            """You are a travel budget advisor.
Dest: {dest}
Max Budget: ₹{budget}
Cost: ₹{estimated} (Diff: ₹{diff})
Days: {days}

Give 2 concise tips to save money here. Max 40 words total."""
        )
        chain = prompt | self.llm_text | StrOutputParser()
        try:
            # 60 second timeout for resiliency (increased for llama3)
            return await asyncio.wait_for(
                chain.ainvoke({
                    "dest": dest, "budget": budget, "estimated": estimated,
                    "days": days, "diff": abs(over_by)
                }),
                timeout=60.0
            )
        except asyncio.TimeoutError:
            logger.warning("Budget advisor timed out.")
            return "Budget tips unavailable right now."
        except Exception as e:
            logger.warning(f"Budget advisor failed: {e}")
            return "Budget tips unavailable right now."

    # ─────────────────────────────────────────────
    # Itinerary Generation
    # ─────────────────────────────────────────────
    async def generate_itinerary(self, dest: str, days: int, preferences: str,
                                  attractions: list, rag_context: str) -> str:
        attractions_str = ", ".join(attractions[:6]) if attractions else "popular local spots"
        context_section = f"\n\nLocal knowledge:\n{rag_context}" if rag_context else ""

        prompt = PromptTemplate.from_template(
            """Create a brief itinerary for {dest} ({days} days).
Attractions: {attractions}{context}

Format:
## Day X
- Morning: [Activity]
- Afternoon: [Activity]
Keep it extremely short."""
        )
        chain = prompt | self.llm_text | StrOutputParser()
        try:
            # 90 second timeout for resiliency (increased for llama3)
            return await asyncio.wait_for(
                chain.ainvoke({
                    "dest": dest, "days": days, "attractions": attractions_str, "context": context_section
                }),
                timeout=90.0
            )
        except asyncio.TimeoutError:
            logger.warning("Itinerary generation timed out.")
            return "Detailed itinerary taking too long to generate."
        except Exception as e:
            logger.warning(f"Itinerary generation failed: {e}")
            return "Detailed itinerary unavailable."

    # ─────────────────────────────────────────────
    # Single-destination orchestration
    # ─────────────────────────────────────────────
    async def _orchestrate_single(self, dest: str, src: str, days: int, budget: int,
                                   preferences: str, selected_services: list,
                                   query: str = "") -> dict:
        """Core orchestration for one destination — used by both orchestrate() and compare()."""

        # Fetch RAG context
        rag_context = get_destination_context(dest, query or preferences)

        # Build and run parallel service calls
        service_registry = {
            "flights": lambda: self._fetch_data(f"{FLIGHTS_URL}/flights", {"source": src, "destination": dest}),
            "hotels":  lambda: self._fetch_data(f"{HOTELS_URL}/hotels",  {"city": dest}),
            "weather": lambda: self._fetch_data(f"{WEATHER_URL}/weather", {"city": dest}),
            "places":  lambda: self._fetch_data(f"{PLACES_URL}/places",  {"city": dest}),
        }

        task_keys = [s for s in ALL_SERVICES if s in selected_services]
        tasks     = [service_registry[s]() for s in task_keys]

        results = await asyncio.gather(*tasks, return_exceptions=True) if tasks else []

        service_results = {}
        for idx, key in enumerate(task_keys):
            r = results[idx]
            service_results[key] = (
                {"data": {}, "latency_ms": None, "error": str(r)} if isinstance(r, Exception) else r
            )

        # Workflow trace
        workflow_trace = [{"step": "Intent Detection", "status": "completed", "latency_ms": None}]
        for svc in ALL_SERVICES:
            if svc in service_results:
                res = service_results[svc]
                workflow_trace.append({
                    "step": f"{svc.title()} Service",
                    "status": "completed" if res.get("data") else "failed",
                    "latency_ms": res.get("latency_ms"), "error": res.get("error")
                })
            else:
                workflow_trace.append({"step": f"{svc.title()} Service", "status": "skipped", "latency_ms": None, "error": None})

        # Extract data
        flights  = service_results.get("flights", {}).get("data", {}).get("flights", [])
        hotels   = service_results.get("hotels",  {}).get("data", {}).get("hotels",  [])
        weather  = service_results.get("weather", {}).get("data", {})
        places_raw = service_results.get("places", {}).get("data", {}).get("places", [])

        attractions = [
            p if isinstance(p, str) else p.get("name", "") for p in places_raw
        ]

        flights.sort(key=lambda x: x.get("price", 0))
        hotels.sort(key=lambda x: x.get("price_per_night", 0))

        # Budget optimization
        best_flight = best_hotel = None
        estimated_budget = 0
        budget_breakdown = budget_metrics = budget_evaluation = {}
        budget_advice = ""

        if "flights" in selected_services and "hotels" in selected_services:
            best_flight, best_hotel = self.optimize_for_budget(flights, hotels, days, budget)
            flight_cost = best_flight.get("price", 0) if best_flight else 0
            hotel_cost_per_night = best_hotel.get("price_per_night", 0) if best_hotel else 0

            budget_res = await self._post_data(f"{BUDGET_URL}/budget", {
                "flights_cost": flight_cost,
                "hotels_cost_per_night": hotel_cost_per_night,
                "num_days": days, "daily_activities_cost": 1500, "max_budget": budget
            })
            workflow_trace.append({
                "step": "Budget Service",
                "status": "completed" if budget_res.get("data") else "failed",
                "latency_ms": budget_res.get("latency_ms"), "error": budget_res.get("error")
            })
            bdata = budget_res.get("data", {})
            estimated_budget = bdata.get("estimated_budget", 0)
            budget_breakdown = bdata.get("breakdown", {})
            budget_metrics   = bdata.get("metrics", {})
            budget_evaluation = bdata.get("evaluation")

            # Extract base budget advice inputs to run concurrently below
            budget_advice_inputs = (dest, budget, estimated_budget, days, preferences)
        else:
            budget_advice_inputs = None
            workflow_trace.append({"step": "Budget Service", "status": "skipped", "latency_ms": None, "error": None})

        # 🚀 Parallel Execution of Heavy LLM Tasks (Itinerary & Budget Advice)
        advice_task = self.generate_budget_advice(*budget_advice_inputs) if budget_advice_inputs else asyncio.sleep(0)
        
        # Only generate a day-by-day itinerary if the user is planning a broader trip, not just asking for a list of places.
        generate_itinerary_flag = ("places" in selected_services) and (len(selected_services) > 1)
        itinerary_task = self.generate_itinerary(dest, days, preferences, attractions, rag_context) if generate_itinerary_flag else asyncio.sleep(0)

        logger.info(f"Starting parallel LLM generations for {dest}")
        start_llms = time.time()
        
        # Run them at the same time and wait for both
        budget_advice_result, itinerary = await asyncio.gather(advice_task, itinerary_task, return_exceptions=True)
        
        # Handle returns safely
        budget_advice = budget_advice_result if isinstance(budget_advice_result, str) else ""
        itinerary = itinerary if (generate_itinerary_flag and isinstance(itinerary, str)) else ""
        
        logger.info(f"Parallel LLM generations completed in {round(time.time() - start_llms, 2)}s")

        # Reasoning string
        called_names  = [s.title() for s in selected_services]
        skipped_names = [s.title() for s in ALL_SERVICES if s not in selected_services]
        reasoning = (
            f"AI detected intent for '{dest}' from '{src}'. "
            f"Services selected: {', '.join(called_names)}. "
        )
        if skipped_names:
            reasoning += f"Skipped: {', '.join(skipped_names)}. "
        if rag_context:
            reasoning += "Local knowledge from RAG knowledge base injected. "

        return {
            "destination": dest, "source": src,
            "duration": f"{days} days", "preferences": preferences,
            "services_called": selected_services,
            "flights": flights[:3], "hotels": hotels[:3],
            "weather": {
                "temperature": weather.get("temperature", ""),
                "condition":   weather.get("condition", ""),
                "city":        weather.get("city", dest),
                "humidity":    weather.get("humidity"),
                "wind_kph":    weather.get("wind_kph"),
                "forecast":    weather.get("forecast", [])
            },
            "attractions": attractions[:5],
            "estimated_budget": estimated_budget,
            "budget_breakdown": budget_breakdown,
            "budget_metrics":   budget_metrics,
            "budget_evaluation": budget_evaluation,
            "budget_advice": budget_advice,
            "recommended": {"flight": best_flight, "hotel": best_hotel},
            "itinerary": itinerary,
            "rag_context_used": bool(rag_context),
            "workflow_explanation": {"reasoning": reasoning, "trace": workflow_trace}
        }

    # ─────────────────────────────────────────────
    # Public: Main orchestrate (with memory)
    # ─────────────────────────────────────────────
    async def orchestrate(self, request_data: dict) -> dict:
        query          = request_data.get("query", "")
        session_id     = request_data.get("session_id", "")
        fallback_src   = request_data.get("source") or "hyd"
        fallback_days  = request_data.get("num_days", 2)
        fallback_budget = request_data.get("budget", 15000)

        # Save user message to conversation memory
        if session_id:
            self.append_message(session_id, "user", query)

        intent = await self.detect_intent_and_services(query, session_id)

        explicit_dest = request_data.get("destination") or self._extract_destination_from_query(query)
        dest = explicit_dest or intent.get("destination") or "Goa"

        explicit_src = request_data.get("source") or self._extract_source_from_query(query)
        src = explicit_src or intent.get("source") or fallback_src
        if not src or src.lower() == "unknown":
            src = fallback_src

        # Keep the source normalized
        src = src.strip().title() if isinstance(src, str) else fallback_src

        # Keep destination normalized
        dest = dest.strip().title() if isinstance(dest, str) else "Goa"

        days     = int(intent.get("num_days")  or fallback_days)
        budget   = int(intent.get("budget")    or fallback_budget)
        prefs    = intent.get("preferences", "general")
        services = intent.get("services", ALL_SERVICES)

        logger.info(f"[session:{session_id}] services={services} dest={dest}")

        trip_plan = await self._orchestrate_single(dest, src, days, budget, prefs, services, query)

        # Save AI response summary to conversation memory
        if session_id:
            ai_summary = (
                f"I planned a {days}-day trip to {dest} from {src} "
                f"with ₹{budget} budget. Services used: {', '.join(services)}."
            )
            self.append_message(session_id, "assistant", ai_summary)

        return {"status": "success", "trip_plan": trip_plan}

    # ─────────────────────────────────────────────
    # Public: Trip Comparison
    # ─────────────────────────────────────────────
    async def compare_trips(self, dest1: str, dest2: str, src: str, days: int,
                             budget: int, preferences: str = "general") -> dict:
        """Compare two destinations in parallel."""
        logger.info(f"Comparing: {dest1} vs {dest2}")

        plan1, plan2 = await asyncio.gather(
            self._orchestrate_single(dest1, src, days, budget, preferences, ALL_SERVICES, f"trip to {dest1}"),
            self._orchestrate_single(dest2, src, days, budget, preferences, ALL_SERVICES, f"trip to {dest2}"),
        )

        return {
            "status": "success",
            "comparison": {
                "option_a": plan1,
                "option_b": plan2,
                "summary": {
                    "cheaper_destination":   dest1 if plan1["estimated_budget"] <= plan2["estimated_budget"] else dest2,
                    "budget_diff":           abs(plan1["estimated_budget"] - plan2["estimated_budget"]),
                    "both_within_budget":    (
                        plan1.get("budget_evaluation", {}) and
                        plan2.get("budget_evaluation", {}) and
                        plan1["budget_evaluation"].get("status") == "within_budget" and
                        plan2["budget_evaluation"].get("status") == "within_budget"
                    )
                }
            }
        }