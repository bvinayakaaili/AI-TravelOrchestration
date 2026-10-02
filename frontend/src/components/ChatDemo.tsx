"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SplitText } from "@/components/Animations";
import ServiceFlow from "@/components/ServiceFlow";
import ReactMarkdown from "react-markdown";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ForecastDay { day: string; condition: string; temperature: string; humidity: number; }
interface Weather { temperature: string; condition: string; city: string; humidity?: number; wind_kph?: number; forecast?: ForecastDay[]; }
interface Flight { airline: string; price: number; duration_hrs: number; departure?: string; arrival?: string; }
interface Hotel { name: string; price_per_night: number; rating: number; amenities?: string[]; location?: string; }
interface TransitOption { mode: string; title: string; route_details: string; duration_hrs: number; estimated_cost: number; practicality: string; is_recommended?: boolean; }
interface BudgetEvaluation { status: "within_budget" | "over_budget"; user_budget: number; difference: number; }
interface BudgetMetrics { cost_per_day: number; hotel_share_pct: number; activity_share_pct: number; flight_share_pct: number; }
interface BudgetBreakdown { flights: number; hotels: number; activities: number; }
interface WorkflowStep { step: string; status: string; latency_ms?: number | null; error?: string | null; }
interface WorkflowExplanation { reasoning: string; trace: WorkflowStep[]; }
interface Recommended { flight: Flight | null; hotel: Hotel | null; transit?: TransitOption | null; }

interface TripPlan {
  destination: string; source: string; duration: string; preferences: string;
  distance_km?: number;
  transit_summary?: string;
  transit_options?: TransitOption[];
  services_called?: string[];
  flights: Flight[]; hotels: Hotel[];
  weather: Weather; attractions: string[];
  estimated_budget: number;
  budget_breakdown: BudgetBreakdown; budget_metrics: BudgetMetrics;
  budget_evaluation: BudgetEvaluation | null;
  budget_advice?: string;
  recommended: Recommended;
  itinerary?: string;
  rag_context_used?: boolean;
  workflow_explanation: WorkflowExplanation;
}

interface ComparisonResult {
  option_a: TripPlan;
  option_b: TripPlan;
  summary: { cheaper_destination: string; budget_diff: number; both_within_budget: boolean; };
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  tripPlan?: TripPlan;
  comparison?: ComparisonResult;
}

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/plan";

function stepIcon(step: string): string {
  const s = step.toLowerCase();
  if (s.includes("flight")) return "✈️";
  if (s.includes("hotel")) return "🏨";
  if (s.includes("weather")) return "🌤";
  if (s.includes("intent")) return "🧠";
  if (s.includes("place")) return "📍";
  if (s.includes("budget")) return "💰";
  return "⚙️";
}

function stepColor(status: string): string {
  if (status === "completed") return "bg-green-400";
  if (status === "skipped") return "bg-yellow-400";
  return "bg-red-400";
}

// Generate a stable session ID per browser session
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("travel_session_id");
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("travel_session_id", id);
  }
  return id;
}

// ─────────────────────────────────────────────
// TripCard — renders a single trip plan
// ─────────────────────────────────────────────
function TripCard({ plan, msgIdx, showTrace, setShowTrace, showItinerary, setShowItinerary, onCopy }:
  { plan: TripPlan; msgIdx: number; showTrace: number | null; setShowTrace: (v: number | null) => void; showItinerary: number | null; setShowItinerary: (v: number | null) => void; onCopy: (text: string) => void }) {

  // Defensive fallbacks for local LLMs
  const flights = plan.flights || [];
  const hotels = plan.hotels || [];
  const attractions = plan.attractions || [];
  const transitOptions = plan.transit_options || [];
  const workflow = plan.workflow_explanation || { trace: [] };

  const modeIcon = (mode: string) => {
    const m = mode.toLowerCase();
    if (m.includes("train") || m.includes("rail")) return "🚆";
    if (m.includes("road") || m.includes("drive") || m.includes("taxi") || m.includes("car")) return "🚗";
    if (m.includes("bus")) return "🚌";
    if (m.includes("flight") || m.includes("air")) return "✈️";
    return "🚀";
  };

  return (
    <div className="mt-3 space-y-3">

      {/* Trip Overview with Location */}
      <div className="glass-card p-4 border-opal/20 bg-opal/5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-orbitron text-sm text-opal tracking-[2px] uppercase">Trip Overview</h3>
          <div className="flex items-center gap-2 text-xs font-space text-text-muted">
            <span>📍 {plan.source || 'Origin'} → {plan.destination}</span>
            {plan.distance_km && <span className="bg-opal/10 text-opal px-2 py-0.5 rounded-full">~{plan.distance_km} km</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-space text-white">
          <span><strong>Duration:</strong> {plan.duration}</span>
          <span><strong>Budget:</strong> ₹{plan.estimated_budget?.toLocaleString() || 'N/A'}</span>
          {plan.preferences && <span><strong>Style:</strong> {plan.preferences}</span>}
        </div>
        {plan.transit_summary && (
          <p className="font-space text-xs text-opal/80 mt-2 italic">🛣️ {plan.transit_summary}</p>
        )}
      </div>

      {/* Execution Pipeline */}
      {workflow.trace && workflow.trace.length > 0 && (
        <div className="glass-card p-4 border-opal/10">
          <h4 className="font-orbitron text-xs text-opal tracking-[3px] uppercase mb-3">⚙️ Execution Pipeline</h4>
          <div className="flex flex-wrap gap-2">
            {workflow.trace.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-opal/20 bg-sapphire-night/60" title={step.error ?? undefined}>
                <span className={`w-2 h-2 rounded-full ${stepColor(step.status)}`} />
                <span className="text-xs font-space text-white">{stepIcon(step.step)} {step.step}</span>
                {step.latency_ms != null && <span className="text-xs text-text-muted">{step.latency_ms}ms</span>}
                {step.status === "skipped" && <span className="text-xs text-yellow-400">skip</span>}
              </div>
            ))}
          </div>
          {plan.rag_context_used && (
            <p className="text-xs text-opal/70 mt-2 font-space">📚 RAG knowledge base used for enriched context</p>
          )}
        </div>
      )}

      {/* How to Reach / Transit Routes */}
      {transitOptions.length > 0 && (
        <div className="glass-card p-4 border-opal/10">
          <h4 className="font-orbitron text-xs text-opal tracking-[3px] uppercase mb-3">🧭 How to Travel ({plan.source || 'Origin'} → {plan.destination})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {transitOptions.map((t, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${t.is_recommended ? 'border-opal/40 bg-opal/10' : 'border-opal/10 bg-sapphire-night/40'} font-space text-xs space-y-1`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white flex items-center gap-1.5">{modeIcon(t.mode)} {t.title}</span>
                  {t.is_recommended && <span className="bg-green-500/20 text-green-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Recommended</span>}
                </div>
                <p className="text-text-muted text-[11px] leading-relaxed">{t.route_details}</p>
                <div className="flex justify-between items-center pt-1 border-t border-opal/10 text-white">
                  <span className="text-text-muted">⏱️ {t.duration_hrs}h</span>
                  <span className="text-opal font-bold">₹{t.estimated_cost?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Budget Pick */}
      {(plan.recommended?.flight || plan.recommended?.transit) && plan.recommended?.hotel && (
        <div className="glass-card p-4 border-opal/20 bg-opal/5">
          <h4 className="font-orbitron text-xs text-opal tracking-[3px] uppercase mb-3">⭐ Best Budget Pick</h4>
          <div className="flex flex-col sm:flex-row gap-3 font-space text-sm text-white">
            <div className="flex-1">
              <span className="text-text-muted text-xs">Primary Transit / Route</span>
              <p>
                {plan.recommended.transit ? (
                  <><span>{modeIcon(plan.recommended.transit.mode)} {plan.recommended.transit.title}</span> <span className="text-opal font-bold">₹{plan.recommended.transit.estimated_cost?.toLocaleString()}</span> <span className="text-text-muted text-xs">({plan.recommended.transit.duration_hrs}h)</span></>
                ) : plan.recommended.flight ? (
                  <><span>✈️ {plan.recommended.flight.airline}</span> <span className="text-opal font-bold">₹{plan.recommended.flight.price?.toLocaleString()}</span> <span className="text-text-muted text-xs">({plan.recommended.flight.duration_hrs}h)</span></>
                ) : null}
              </p>
            </div>
            <div className="flex-1">
              <span className="text-text-muted text-xs">Hotel</span>
              <p>{plan.recommended.hotel.name} <span className="text-opal font-bold">₹{plan.recommended.hotel.price_per_night?.toLocaleString() || "N/A"}/night</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Flights */}
      {flights.length > 0 && (
        <div className="glass-card p-4 border-opal/10">
          <h4 className="font-orbitron text-xs text-opal tracking-[3px] uppercase mb-3">✈️ Flights</h4>
          <div className="space-y-2">
            {flights.map((f, j) => (
              <div key={j} className="flex flex-col sm:flex-row sm:justify-between sm:items-center font-space text-xs sm:text-sm text-white gap-1">
                <div><span>{f.airline || "Unknown Airline"}</span>{f.departure && <span className="text-text-muted text-xs ml-2">{f.departure} · {f.duration_hrs}h</span>}</div>
                <span className="text-opal font-bold">₹{f.price?.toLocaleString() || "N/A"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hotels */}
      {hotels.length > 0 && (
        <div className="glass-card p-4 border-opal/10">
          <h4 className="font-orbitron text-xs text-opal tracking-[3px] uppercase mb-3">🏨 Hotels</h4>
          <div className="space-y-2">
            {hotels.map((h, j) => (
              <div key={j}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center font-space text-xs sm:text-sm text-white gap-1">
                  <div><span>{h.name || "Unknown Hotel"}</span><span className="text-text-muted text-xs ml-2">⭐ {h.rating || "N/A"}</span>{h.location && <span className="text-text-muted text-xs ml-1">· {h.location.replace("_", " ")}</span>}</div>
                  <span className="text-opal font-bold">₹{h.price_per_night?.toLocaleString() || "N/A"}/night</span>
                </div>
                {h.amenities && h.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {h.amenities.map((a, k) => <span key={k} className="text-xs bg-opal/10 text-opal px-2 py-0.5 rounded-full">{a}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather + Attractions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plan.weather?.temperature && (
          <div className="glass-card p-4 border-opal/10">
            <h4 className="font-orbitron text-xs text-opal tracking-[3px] uppercase mb-2">🌤️ Weather {plan.weather.city ? `in ${plan.weather.city}` : ''}</h4>
            <p className="font-space text-sm text-white">{plan.weather.temperature} — {plan.weather.condition}</p>
            {plan.weather.humidity != null && <p className="font-space text-xs text-text-muted mt-1">Humidity: {plan.weather.humidity}% · Wind: {plan.weather.wind_kph} kph</p>}
          </div>
        )}
        {attractions.length > 0 && (
          <div className="glass-card p-4 border-opal/10">
            <h4 className="font-orbitron text-xs text-opal tracking-[3px] uppercase mb-2">📍 Top Attractions</h4>
            <ul className="font-space text-sm text-white space-y-1">
              {attractions.slice(0, 5).map((a, j) => <li key={j}>• {a}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Budget Summary */}
      {plan.estimated_budget > 0 && (
        <div className="glass-card p-4 border-opal/20 bg-opal/5">
          <div className="flex justify-between items-center mb-3">
            <span className="font-orbitron text-xs text-opal tracking-[3px] uppercase">💰 Estimated Budget</span>
            <span className="font-orbitron font-bold text-xl text-white">₹{plan.estimated_budget.toLocaleString()}</span>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-sapphire-night/60 border border-opal/10">
            <p className="font-orbitron text-xs text-opal tracking-[2px] uppercase mb-1">💡 Budget Tips</p>
            <p className="font-space text-sm text-white leading-relaxed">{plan.budget_advice || 'No budget advice was generated. Try rephrasing your request with your exact preferences.'}</p>
          </div>
        </div>
      )}

      {/* Copy Plan */}
      <button onClick={() => onCopy(
        `Trip to ${plan.destination} (${plan.duration})\nBudget: ₹${plan.estimated_budget?.toLocaleString()}`
      )} className="mt-2 text-xs font-space text-opal/60 hover:text-opal transition-colors">
        📋 Copy plan summary
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main ChatBot Component
// ─────────────────────────────────────────────
export default function ChatBot({ isActive }: { isActive: boolean }) {
  const [messages, setMessages] = useState<Message[]>([{
    role: "system",
    content: "Welcome! I'm your AI Travel Planner.\n\n**Location Feature**: I'll automatically detect your location for trip planning, or you can set it manually.\n\nTry:\n- **\"Plan a 2-day trip to Goa under ₹15000\"**\n- **\"Compare Goa vs Delhi for 3 days\"**\n- **\"What's the weather in Mumbai?\"**",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("AI is orchestrating services...");
  const [compareMode, setCompareMode] = useState(false);
  const [destA, setDestA] = useState("");
  const [destB, setDestB] = useState("");
  const [compareDays, setCompareDays] = useState(3);
  const [compareBudget, setCompareBudget] = useState(20000);
  const [showTrace, setShowTrace] = useState<number | null>(null);
  const [showItinerary, setShowItinerary] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionId = useCallback(() => getOrCreateSessionId(), [])();
  // Auto-request location on mount
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation && !userLocation) {
      getCurrentLocation();
    }
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Geolocation functions
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use OpenStreetMap Nominatim for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.state || 
                      `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          setUserLocation(city);
          setLocationLoading(false);
        } catch (error) {
          console.error("Error getting location name:", error);
          setUserLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        let errorMessage = "Unable to get your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        alert(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const clearLocation = () => {
    setUserLocation(null);
  };

  const extractSourceFromQuery = (query: string): string | null => {
    const fromMatch = query.match(/\bfrom\s+([A-Za-z\s]+?)(?=\s+to\b|\s+for\b|\s+on\b|\s+with\b|$)/i);
    if (fromMatch && fromMatch[1]) return fromMatch[1].trim();
    const originMatch = query.match(/\borigin\s+([A-Za-z\s]+?)(?=\s+to\b|\s+for\b|\s+on\b|\s+with\b|$)/i);
    if (originMatch && originMatch[1]) return originMatch[1].trim();
    return null;
  };

  const extractDestinationFromQuery = (query: string): string | null => {
    const toMatch = query.match(/\bto\s+([A-Za-z\s]+?)(?=\s+from\b|\s+for\b|\s+on\b|\s+with\b|$)/i);
    if (toMatch && toMatch[1]) return toMatch[1].trim();
    const inMatch = query.match(/\bin\s+([A-Za-z\s]+?)(?=\s+for\b|\s+on\b|\s+with\b|$)/i);
    if (inMatch && inMatch[1]) return inMatch[1].trim();
    return null;
  };

  // WebSocket Integration
  const sendQuery = async (overrideQuery?: string) => {
    const query = (overrideQuery || input).trim();
    if (!query || loading) return;

    // Include location context in the displayed message
    const locationContext = userLocation ? `\n\n📍 *Booking from: ${userLocation}*` : '';
    const displayContent = query + locationContext;

    setMessages(prev => [...prev, { role: "user", content: displayContent }]);
    setInput("");
    setLoading(true);
    setStatusText("Connecting to AI Orchestrator...");

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        const explicitSource = extractSourceFromQuery(query);
        const explicitDestination = extractDestinationFromQuery(query);
        const sendSource = explicitSource || userLocation;
        ws.send(JSON.stringify({ 
          query, 
          session_id: sessionId,
          source: sendSource || undefined,
          destination: explicitDestination || undefined
        }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.event === "status") {
            setStatusText(payload.message);
          }
          else if (payload.event === "intent_detected") {
            const intent = payload.data;
            setStatusText(`Routing: ${intent.destination || 'Unknown'} for ${intent.num_days || 1} days...`);
          }
          else if (payload.event === "plan_complete") {
            // Defensive Parsing
            let tp = payload.data.trip_plan || payload.data;
            if (typeof tp === 'string') {
              try { tp = JSON.parse(tp); } catch (e) { console.warn("Parse err"); }
            }

            setMessages(prev => [...prev, {
              role: "assistant",
              content: `Here's your travel plan for **${tp.destination || "your destination"}** (${tp.duration || "N/A"}):`,
              tripPlan: tp,
            }]);
            setLoading(false);
            ws.close();
          }
          else if (payload.event === "error") {
            throw new Error(payload.message);
          }
        } catch (err) {
          console.error("Payload processing error:", err);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "⚠️ The AI generated the plan, but there was an error formatting the data. Check console.",
          }]);
          setLoading(false);
          ws.close();
        }
      };

      ws.onerror = () => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `⚠️ Could not reach the AI backend via WebSocket. Ensure Gateway is running on port 8000.`,
        }]);
        setLoading(false);
      };

    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Error: ${err instanceof Error ? err.message : String(err)}`,
      }]);
      setLoading(false);
    }
  };

  // REST Fallback for Comparison (If implemented in Backend)
  const sendCompare = async () => {
    if (!destA.trim() || !destB.trim() || loading) return;
    setMessages(prev => [...prev, { role: "user", content: `Compare ${destA} vs ${destB} for ${compareDays} days under ₹${compareBudget}` }]);
    setCompareMode(false);
    setLoading(true);
    setStatusText("Analyzing comparison via REST...");
    try {
      const res = await fetch(`${GATEWAY_URL}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_a: destA, destination_b: destB, num_days: compareDays, budget: compareBudget }),
      });
      if (!res.ok) throw new Error(`Endpoint /compare not found or failed.`);
      const data = await res.json();
      if (data.status !== "success") throw new Error("Unexpected response.");
      const cmp: ComparisonResult = data.comparison;
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `**Comparison: ${destA} vs ${destB}** (${compareDays} days, ₹${compareBudget.toLocaleString()} budget)\n\n💰 Cheaper: **${cmp.summary.cheaper_destination}**`,
        comparison: cmp,
      }]);
    } catch (err) {
      // Fallback: Send it through the normal WebSocket Orchestrator if REST fails
      sendQuery(`Compare ${destA} vs ${destB} for ${compareDays} days under ₹${compareBudget}`);
    } finally {
      if (statusText.includes("REST")) setLoading(false);
    }
  };

  const clearSession = async () => {
    if (!sessionId) return;
    try { await fetch(`${GATEWAY_URL}/session/${sessionId}`, { method: "DELETE" }); } catch (e) { }
    sessionStorage.removeItem("travel_session_id");
    setMessages([{ role: "system", content: "Session cleared! Start a new conversation." }]);
  };

  return (
    <div className={`slide-container bg-bg-deep flex flex-col items-center justify-start pt-20 md:pt-24 pb-4 md:pb-8 ${isActive ? "slide-active" : "slide-exit"}`}>
      {/* Header */}
      <div className="z-10 text-center mb-3 md:mb-6 px-4">
        <h2 className="font-orbitron font-bold text-xl sm:text-3xl md:text-5xl text-white mb-2 md:mb-3">
          <SplitText text="AI TRAVEL PLANNER" delayIndex={0} />
        </h2>
        <p className="font-space text-text-muted text-sm max-w-xl mx-auto">
          Powered by <span className="text-opal">LangChain</span> + <span className="text-opal">Ollama</span> + <span className="text-opal">ChromaDB RAG</span> — dynamic orchestration with memory
        </p>
      </div>

      {/* Chat Container */}
      <div className="z-10 w-full max-w-3xl flex-1 flex flex-col mx-auto px-2 sm:px-4 overflow-hidden">
        <div className="glass-card flex-1 flex flex-col overflow-hidden border-opal/20">

          {loading && <ServiceFlow active={loading} />}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 scrollbar-thin">
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-space leading-relaxed ${msg.role === "user" ? "bg-opal/20 text-white border border-opal/30"
                      : msg.role === "system" ? "bg-sapphire-night text-text-muted border border-border"
                        : "bg-sapphire-night/80 text-white border border-opal/10"
                    }`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>

                {/* Trip Plan */}
                {msg.tripPlan && (
                  <TripCard
                    plan={msg.tripPlan} msgIdx={i}
                    showTrace={showTrace} setShowTrace={setShowTrace}
                    showItinerary={showItinerary} setShowItinerary={setShowItinerary}
                    onCopy={handleCopy}
                  />
                )}
              </div>
            ))}

            {/* Real-Time WebSocket Loader */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-sapphire-night border border-opal/20 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(delay => (
                        <div key={delay} className="w-2 h-2 rounded-full bg-opal animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                    <span className="font-space text-xs text-text-muted italic">{statusText}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Compare Mode Modal */}
          {compareMode && (
            <div className="p-3 border-t border-border bg-sapphire-night/80">
              <p className="font-orbitron text-xs text-opal tracking-[2px] uppercase mb-2">🔀 Compare Two Destinations</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={destA} onChange={e => setDestA(e.target.value)} placeholder="Destination A (e.g. Goa)"
                  className="bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs font-space text-white focus:outline-none focus:border-opal/50" />
                <input value={destB} onChange={e => setDestB(e.target.value)} placeholder="Destination B (e.g. Delhi)"
                  className="bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs font-space text-white focus:outline-none focus:border-opal/50" />
              </div>
              <div className="flex gap-2 mb-2">
                <input type="number" value={compareDays} onChange={e => setCompareDays(Number(e.target.value))} min={1} max={14}
                  className="w-20 bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs font-space text-white focus:outline-none focus:border-opal/50" placeholder="Days" />
                <input type="number" value={compareBudget} onChange={e => setCompareBudget(Number(e.target.value))}
                  className="flex-1 bg-bg-deep border border-border rounded-lg px-3 py-2 text-xs font-space text-white focus:outline-none focus:border-opal/50" placeholder="Budget (₹)" />
              </div>
              <div className="flex gap-2">
                <button onClick={sendCompare} disabled={loading || !destA || !destB}
                  className="btn-primary px-4 py-2 text-xs disabled:opacity-40">Compare</button>
                <button onClick={() => setCompareMode(false)}
                  className="px-4 py-2 text-xs font-space text-text-muted hover:text-white transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 sm:p-4 border-t border-border">
            {/* Location Status - More Prominent */}
            {userLocation && (
              <div className="mb-3 p-2 bg-opal/10 border border-opal/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-space text-opal">📍 Booking from: <strong>{userLocation}</strong></span>
                  </div>
                  <button onClick={clearLocation} className="text-xs text-red-400 hover:text-red-300 font-bold">×</button>
                </div>
                <p className="text-xs text-text-muted mt-1">Your location will be used as the trip origin</p>
              </div>
            )}
            <div className="flex gap-2 sm:gap-3 mb-2">
              <input type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendQuery()}
                placeholder={userLocation ? `e.g. Plan a 2-day trip to Goa...` : 'e.g. Plan a 2-day trip to Goa under ₹15000...'}
                className="flex-1 bg-bg-deep border border-border rounded-xl px-3 sm:px-4 py-3 text-xs sm:text-sm font-space text-white placeholder-text-muted/60 focus:outline-none focus:border-opal/50 transition-colors min-h-[44px]"
                disabled={loading} />
              <button onClick={getCurrentLocation} 
                disabled={locationLoading}
                title={userLocation ? `Current location: ${userLocation}` : "Get current location"}
                className={`btn-secondary px-3 sm:px-4 disabled:opacity-40 disabled:cursor-not-allowed ${userLocation ? 'bg-opal/20 border-opal/50' : ''}`}>
                {locationLoading ? "..." : "📍"}
              </button>
              <button onClick={() => sendQuery()} disabled={loading || !input.trim()}
                className="btn-primary px-4 sm:px-6 disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm">
                {loading ? "..." : "Send"}
              </button>
            </div>
            <div className="flex gap-3 justify-between items-center">
              <div className="flex gap-2">
                <button onClick={() => setCompareMode(v => !v)}
                  className={`text-xs font-space px-3 py-1.5 rounded-lg border transition-colors ${compareMode ? "border-opal text-opal" : "border-border text-text-muted hover:border-opal/50 hover:text-opal/70"}`}>
                  🔀 Compare
                </button>
                <button onClick={clearSession}
                  className="text-xs font-space px-3 py-1.5 rounded-lg border border-border text-text-muted hover:border-red-400/50 hover:text-red-400/70 transition-colors">
                  🗑️ Clear Session
                </button>
              </div>
              {copied && <span className="text-xs font-space text-green-400">✅ Copied!</span>}
              <span className="text-xs font-space text-text-muted/60">Session active · memory enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}