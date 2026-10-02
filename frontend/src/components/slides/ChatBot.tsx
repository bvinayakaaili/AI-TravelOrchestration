"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SplitText } from "@/components/Animations";
import ServiceFlow from "@/components/ServiceFlow";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import SwipeCardStack from "@/components/ui/SwipeCardStack";
import { WeatherOverlay } from "@/components/ui/WeatherOverlay";
import { DraggableItinerary } from "@/components/ui/DraggableItinerary";
import dynamic from 'next/dynamic';
import confetti from "canvas-confetti";

const VisualMap = dynamic(() => import("@/components/ui/VisualMap").then(m => m.VisualMap), { ssr: false });

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
    raw_data?: any;
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
    const s = step?.toLowerCase() || "";
    if (s.includes("flight") || s.includes("transit") || s.includes("route")) return "🧭";
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

function modeIcon(mode: string): string {
    const m = mode?.toLowerCase() || "";
    if (m.includes("train") || m.includes("rail")) return "🚆";
    if (m.includes("road") || m.includes("drive") || m.includes("taxi") || m.includes("car")) return "🚗";
    if (m.includes("bus")) return "🚌";
    if (m.includes("flight") || m.includes("air")) return "✈️";
    return "🚀";
}

function getOrCreateSessionId(): string {
    if (typeof window === "undefined") return "";
    let id = sessionStorage.getItem("travel_session_id");
    if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem("travel_session_id", id);
    }
    return id;
}

// ✨ THE SANITIZER: This prevents React from crashing if the AI forgets a field!
function sanitizeTripPlan(data: any): TripPlan {
    let tp = data?.trip_plan || data || {};
    if (typeof tp === 'string') {
        try { tp = JSON.parse(tp); } catch (e) { tp = {}; }
    }

    const safeNumber = (val: any) => isNaN(Number(val)) ? 0 : Number(val);

    return {
        destination: tp.destination || "Destination",
        source: tp.source || "Origin",
        duration: tp.duration || "N/A",
        preferences: tp.preferences || "",
        distance_km: tp.distance_km,
        transit_summary: tp.transit_summary,
        transit_options: Array.isArray(tp.transit_options) ? tp.transit_options : [],
        flights: Array.isArray(tp.flights) ? tp.flights : (tp.flight ? [tp.flight] : []),
        hotels: Array.isArray(tp.hotels) ? tp.hotels : (tp.hotel ? [tp.hotel] : []),
        weather: tp.weather || {},
        attractions: Array.isArray(tp.attractions) ? tp.attractions : (Array.isArray(tp.places) ? tp.places : []),
        estimated_budget: safeNumber(tp.estimated_budget || tp.budget?.total),
        budget_breakdown: tp.budget_breakdown || null,
        budget_metrics: tp.budget_metrics || null,
        budget_evaluation: tp.budget_evaluation || null,
        budget_advice: tp.budget_advice || "No specific budget advice generated.",
        recommended: tp.recommended || null,
        itinerary: tp.itinerary || "",
        workflow_explanation: tp.workflow_explanation || data?.workflow_explanation || { trace: [] },
        rag_context_used: !!tp.rag_context_used,
        raw_data: data
    } as TripPlan;
}

// ─────────────────────────────────────────────
// TripCard — Ultra-safe rendering logic
// ─────────────────────────────────────────────
function TripCard({ plan, msgIdx, showTrace, setShowTrace, showItinerary, setShowItinerary, onCopy }:
    { plan: TripPlan; msgIdx: number; showTrace: number | null; setShowTrace: (v: number | null) => void; showItinerary: number | null; setShowItinerary: (v: number | null) => void; onCopy: (text: string) => void }) {

    return (
        <div className="mt-3 space-y-3">

            {/* Trip Overview Banner */}
            <div className="glass-card p-4 border-accent/20 bg-accent/5">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-orbitron text-sm text-accent tracking-[2px] uppercase">Trip Overview</h3>
                    <div className="flex items-center gap-2 text-xs font-space text-text-muted">
                        <span>📍 {plan.source || 'Origin'} → {plan.destination}</span>
                        {plan.distance_km && <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full">~{plan.distance_km} km</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm font-space text-text-primary">
                    <span><strong>Duration:</strong> {plan.duration}</span>
                    <span><strong>Budget:</strong> ₹{plan.estimated_budget?.toLocaleString() || 'N/A'}</span>
                    {plan.preferences && <span><strong>Style:</strong> {plan.preferences}</span>}
                </div>
                {plan.transit_summary && (
                    <p className="font-space text-xs text-accent/80 mt-2 italic">🛣️ {plan.transit_summary}</p>
                )}
            </div>

            {/* Execution Pipeline */}
            {plan.workflow_explanation?.trace && plan.workflow_explanation.trace.length > 0 && (
                <div className="glass-card p-4 border-accent/10">
                    <h4 className="font-orbitron text-xs text-accent tracking-[3px] uppercase mb-3">⚙️ Execution Pipeline</h4>
                    <div className="flex flex-wrap gap-2">
                        {plan.workflow_explanation.trace.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-accent/20 bg-surface/60" title={step.error ?? undefined}>
                                <span className={`w-2 h-2 rounded-full ${stepColor(step.status)}`} />
                                <span className="text-xs font-space text-text-primary">{stepIcon(step.step)} {step.step || "Process"}</span>
                                {step.latency_ms != null && <span className="text-xs text-text-muted">{step.latency_ms}ms</span>}
                                {step.status === "skipped" && <span className="text-xs text-yellow-400">skip</span>}
                            </div>
                        ))}
                    </div>
                    {plan.rag_context_used && (
                        <p className="text-xs text-accent/70 mt-2 font-space">📚 RAG knowledge base used for enriched context</p>
                    )}
                </div>
            )}

            {/* How to Travel / Transit Routes */}
            {plan.transit_options && plan.transit_options.length > 0 && (
                <div className="glass-card p-4 border-accent/10">
                    <h4 className="font-orbitron text-xs text-accent tracking-[3px] uppercase mb-3">🧭 How to Travel ({plan.source || 'Origin'} → {plan.destination})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {plan.transit_options.map((t, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${t.is_recommended ? 'border-accent/40 bg-accent/10' : 'border-accent/10 bg-surface/60'} font-space text-xs space-y-1`}>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-text-primary flex items-center gap-1.5">{modeIcon(t.mode)} {t.title}</span>
                                    {t.is_recommended && <span className="bg-green-500/20 text-green-300 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Recommended</span>}
                                </div>
                                <p className="text-text-muted text-[11px] leading-relaxed">{t.route_details}</p>
                                <div className="flex justify-between items-center pt-1 border-t border-accent/10 text-text-primary">
                                    <span className="text-text-muted">⏱️ {t.duration_hrs}h</span>
                                    <span className="text-accent font-bold">₹{t.estimated_cost?.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Best Budget Pick */}
            {(plan.recommended?.flight || plan.recommended?.transit) && plan.recommended?.hotel && (
                <div className="glass-card p-4 border-accent/20 bg-accent/5">
                    <h4 className="font-orbitron text-xs text-accent tracking-[3px] uppercase mb-3">⭐ Best Budget Pick</h4>
                    <div className="flex flex-col sm:flex-row gap-3 font-space text-sm text-text-primary">
                        <div className="flex-1">
                            <span className="text-text-muted text-xs">Primary Transit / Route</span>
                            <p>
                                {plan.recommended.transit ? (
                                    <><span>{modeIcon(plan.recommended.transit.mode)} {plan.recommended.transit.title}</span> <span className="text-accent font-bold">₹{plan.recommended.transit.estimated_cost?.toLocaleString()}</span> <span className="text-text-muted text-xs">({plan.recommended.transit.duration_hrs}h)</span></>
                                ) : plan.recommended.flight ? (
                                    <><span>✈️ {plan.recommended.flight.airline || "Airline"}</span> <span className="text-accent font-bold">₹{plan.recommended.flight.price?.toLocaleString() || "N/A"}</span> <span className="text-text-muted text-xs">({plan.recommended.flight.duration_hrs || "?"}h)</span></>
                                ) : null}
                            </p>
                        </div>
                        <div className="flex-1">
                            <span className="text-text-muted text-xs">Hotel</span>
                            <p>{plan.recommended.hotel.name || "Hotel"} <span className="text-accent font-bold">₹{plan.recommended.hotel.price_per_night?.toLocaleString() || (plan.recommended.hotel as any).price?.toLocaleString() || "N/A"}/night</span></p>
                        </div>
                    </div>
                </div>
            )}

            {/* Flights (Swipeable) */}
            {plan.flights.length > 0 && (
                <div className="mb-3">
                    <SwipeCardStack 
                        title="Flight Options" 
                        icon="✈️"
                        items={plan.flights}
                        renderItem={(f: Flight) => (
                            <div className="flex flex-col h-full justify-center text-center">
                                <h5 className="font-orbitron font-bold text-lg text-accent">{f.airline || "Airline"}</h5>
                                <p className="font-space font-bold text-2xl text-text-primary mt-1">₹{f.price?.toLocaleString() || "N/A"}</p>
                                <p className="font-space text-sm text-text-muted mt-2">{f.departure ? `${f.departure} · ` : ""}{f.duration_hrs || "?"} hrs</p>
                            </div>
                        )}
                    />
                </div>
            )}

            {/* Hotels (Swipeable) */}
            {plan.hotels.length > 0 && (
                <div className="mb-3">
                    <SwipeCardStack 
                        title="Hotel Options" 
                        icon="🏨"
                        items={plan.hotels}
                        renderItem={(h: Hotel) => (
                            <div className="flex flex-col h-full justify-center items-center text-center px-2">
                                <h5 className="font-orbitron font-bold text-md text-text-primary leading-tight">{h.name || "Hotel"}</h5>
                                <p className="font-space text-xs text-text-muted mt-1">⭐ {h.rating || "?"} · {h.location?.replace("_", " ")}</p>
                                <p className="font-space font-bold text-xl text-accent mt-2">₹{h.price_per_night?.toLocaleString() || (h as any).price?.toLocaleString() || "N/A"}<span className="text-sm font-normal text-text-muted">/night</span></p>
                            </div>
                        )}
                    />
                </div>
            )}

            {/* Weather + Attractions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan.weather?.temperature && (
                    <div className="glass-card p-4 border-accent/10">
                        <h4 className="font-orbitron text-xs text-accent tracking-[3px] uppercase mb-2">🌤️ Weather {plan.weather.city ? `in ${plan.weather.city}` : ''}</h4>
                        <p className="font-space text-sm text-text-primary">{plan.weather.temperature} — {plan.weather.condition}</p>
                        {plan.weather.humidity != null && <p className="font-space text-xs text-text-muted mt-1">Humidity: {plan.weather.humidity}% · Wind: {plan.weather.wind_kph} kph</p>}
                    </div>
                )}
                {plan.attractions.length > 0 && (
                    <div className="glass-card p-4 border-accent/10">
                        <h4 className="font-orbitron text-xs text-accent tracking-[3px] uppercase mb-2">📍 Top Attractions</h4>
                        <ul className="font-space text-sm text-text-primary space-y-1">
                            {plan.attractions.slice(0, 5).map((a, j) => <li key={j}>• {a}</li>)}
                        </ul>
                    </div>
                )}
            </div>

            {/* Drag & Drop Itinerary Timeline */}
            {plan.itinerary && (
                <DraggableItinerary itineraryText={plan.itinerary} />
            )}

            {/* Budget Summary */}
            {plan.estimated_budget > 0 && (
                <div className="glass-card p-4 border-accent/20 bg-accent/5">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-orbitron text-xs text-accent tracking-[3px] uppercase">💰 Estimated Budget</span>
                        <span className="font-orbitron font-bold text-xl text-text-primary">₹{plan.estimated_budget.toLocaleString()}</span>
                    </div>
                    <div className="mt-3 p-3 rounded-lg bg-surface border border-accent/10">
                        <p className="font-orbitron text-xs text-accent tracking-[2px] uppercase mb-1">💡 Budget Tips</p>
                        <p className="font-space text-sm text-text-primary leading-relaxed">{plan.budget_advice || 'No budget tips generated yet. If you did mention specific constraints, I will adapt them in the next run.'}</p>
                    </div>
                </div>
            )}

            {/* Copy Plan */}
            <button onClick={() => onCopy(
                `Trip to ${plan.destination} (${plan.duration})\nBudget: ₹${plan.estimated_budget?.toLocaleString()}`
            )} className="mt-2 text-xs font-space text-accent/60 hover:text-accent transition-colors">
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
        content: "Welcome! I'm your AI Travel Planner.\n\nTry:\n- **\"Plan a 2-day trip to Goa under ₹15000\"**\n- **\"Compare Goa vs Delhi for 3 days\"**\n- **\"What's the weather in Mumbai?\"**",
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [userLocation, setUserLocation] = useState<string | null>(null);
    const [locationRequested, setLocationRequested] = useState(false);

    const sessionId = useCallback(() => getOrCreateSessionId(), [])();

    useEffect(() => {
        if (typeof window !== "undefined" && navigator.geolocation && !locationRequested) {
            setLocationRequested(true);
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await res.json();
                        const city = data.address.city || data.address.town || data.address.state || null;
                        setUserLocation(city);
                    } catch (e) {
                        console.error("Geocoding failed", e);
                    }
                },
                (err) => console.error("Geolocation error", err),
                { timeout: 5000 }
            );
        }
    }, [locationRequested]);

    const latestWeather = [...messages].reverse().find(m => m.tripPlan?.weather?.condition)?.tripPlan?.weather?.condition || "";
    const latestDestination = [...messages].reverse().find(m => m.tripPlan?.destination)?.tripPlan?.destination || "";

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
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
                    destination: explicitDestination || undefined,
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
                        // Apply the powerful new sanitizer
                        const safePlan = sanitizeTripPlan(payload.data);

                        setMessages(prev => [...prev, {
                            role: "assistant",
                            content: `Here's your travel plan for **${safePlan.destination}** (${safePlan.duration}):`,
                            tripPlan: safePlan,
                        }]);
                        setLoading(false);
                        ws.close();
                        
                        // Fire confetti on complete trip generation!
                        confetti({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 },
                            colors: ['#FF5A5F', '#00A699', '#FC642D', '#484848']
                        });
                    }
                    else if (payload.event === "error") {
                        setMessages(prev => [...prev, {
                            role: "assistant",
                            content: `⚠️ **Error:** ${payload.message || "An unknown error occurred."}`,
                        }]);
                        setLoading(false);
                        ws.close();
                    }
                } catch (err) {
                    console.error("Payload processing error:", err);
                    setMessages(prev => [...prev, {
                        role: "assistant",
                        content: `⚠️ Error processing response: ${err instanceof Error ? err.message : String(err)}. Check the browser console for details.`,
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

    const sendCompare = async () => {
        if (!destA.trim() || !destB.trim() || loading) return;
        setMessages(prev => [...prev, { role: "user", content: `Compare ${destA} vs ${destB} for ${compareDays} days under ₹${compareBudget}` }]);
        setCompareMode(false);
        setLoading(true);
        setStatusText("Analyzing comparison...");
        sendQuery(`Compare ${destA} vs ${destB} for ${compareDays} days under ₹${compareBudget}`);
    };

    const clearSession = async () => {
        if (!sessionId) return;
        try { await fetch(`${GATEWAY_URL}/session/${sessionId}`, { method: "DELETE" }); } catch (e) { }
        sessionStorage.removeItem("travel_session_id");
        setMessages([{ role: "system", content: "Session cleared! Start a new conversation." }]);
    };

    return (
        <div className={`slide-container bg-deep flex flex-col items-center justify-start pt-20 md:pt-24 pb-4 md:pb-8 relative overflow-hidden ${isActive ? "slide-active" : "slide-exit"}`}>
            
            <VisualMap destination={latestDestination} />
            <WeatherOverlay condition={latestWeather} />

            {/* Header */}
            <div className="z-10 text-center mb-3 md:mb-6 px-4">
                <h2 className="font-orbitron font-bold text-xl sm:text-3xl md:text-5xl text-text-primary mb-2 md:mb-3">
                    <SplitText text="AI TRAVEL PLANNER" delayIndex={0} />
                </h2>
                <p className="font-space text-text-muted text-sm max-w-xl mx-auto">
                    Powered by <span className="text-accent">LangChain</span> + <span className="text-accent">Ollama</span> + <span className="text-accent">ChromaDB RAG</span> — dynamic orchestration with memory
                </p>
            </div>

            {/* Chat Container */}
            <div className="z-10 w-full max-w-3xl flex-1 flex flex-col mx-auto px-2 sm:px-4 overflow-hidden">
                <div className="glass-card flex-1 flex flex-col overflow-hidden border-accent/20">

                    {loading && <ServiceFlow active={loading} />}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin overflow-x-hidden">
                        <AnimatePresence>
                            {messages.map((msg, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                    className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`flex flex-col max-w-[90%] md:max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                        <div className={`px-5 py-3.5 rounded-2xl text-[13px] md:text-[14px] font-space leading-[1.6] shadow-sm ${
                                            msg.role === "user" 
                                                ? "bg-accent text-white font-medium rounded-br-sm"
                                                : msg.role === "system" 
                                                    ? "bg-surface/80 text-text-muted border border-border/50 rounded-bl-sm"
                                                    : "bg-white text-text-primary border border-border/30 rounded-bl-sm shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]"
                                        }`}>
                                            <div className="prose prose-sm prose-p:leading-relaxed prose-a:text-accent max-w-none">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        </div>

                                        {/* Trip Plan Card */}
                                        {msg.tripPlan && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                transition={{ delay: 0.2 }}
                                                className="mt-3 w-full"
                                            >
                                                <TripCard
                                                    plan={msg.tripPlan} msgIdx={i}
                                                    showTrace={showTrace} setShowTrace={setShowTrace}
                                                    showItinerary={showItinerary} setShowItinerary={setShowItinerary}
                                                    onCopy={handleCopy}
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Real-Time WebSocket Loader */}
                        <AnimatePresence>
                            {loading && (
                                <motion.div 
                                    key="loader"
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                    className="flex justify-start w-full"
                                >
                                    <div className="bg-white border border-border/30 shadow-sm rounded-2xl rounded-bl-sm px-5 py-4 max-w-[80%] overflow-hidden relative">
                                        <motion.div 
                                            animate={{ x: ["-10%", "110%"] }}
                                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                            className="absolute top-0 left-0 w-1/3 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent"
                                        />
                                        <div className="flex items-center gap-3">
                                            <motion.div 
                                                animate={{ y: [0, -5, 0], rotate: [0, -10, 10, 0] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="text-accent text-lg"
                                            >
                                                ✈️
                                            </motion.div>
                                            <span className="font-space text-[13px] text-text-muted">{statusText}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Compare Mode Modal (Floating) */}
                    {compareMode && (
                        <div className="px-4 pb-0 pt-2 z-20">
                            <div className="bg-white border border-border/40 shadow-lg rounded-xl p-4 animate-fadeUp">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="font-orbitron font-bold text-[11px] text-accent tracking-[2px] uppercase">🔀 Compare Destinations</p>
                                    <button onClick={() => setCompareMode(false)} className="text-text-muted hover:text-red-500 transition-colors">✕</button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input value={destA} onChange={e => setDestA(e.target.value)} placeholder="Dest A (e.g. Goa)"
                                        className="bg-surface/30 border border-border/50 rounded-lg px-3 py-2.5 text-[13px] font-space focus:outline-none focus:border-accent/80 focus:ring-1 focus:ring-accent/30 transition-all placeholder-text-muted/40" />
                                    <input value={destB} onChange={e => setDestB(e.target.value)} placeholder="Dest B (e.g. Delhi)"
                                        className="bg-surface/30 border border-border/50 rounded-lg px-3 py-2.5 text-[13px] font-space focus:outline-none focus:border-accent/80 focus:ring-1 focus:ring-accent/30 transition-all placeholder-text-muted/40" />
                                </div>
                                <div className="flex gap-3 mb-4">
                                    <div className="flex-none w-24 relative">
                                        <span className="absolute text-[10px] text-text-muted/60 top-1 right-2">Days</span>
                                        <input type="number" value={compareDays} onChange={e => setCompareDays(Number(e.target.value))} min={1} max={14}
                                            className="w-full bg-surface/30 border border-border/50 rounded-lg pl-3 pr-2 py-2.5 text-[13px] font-space focus:outline-none focus:border-accent/80 transition-all" />
                                    </div>
                                    <div className="flex-1 relative">
                                        <span className="absolute text-[10px] text-text-muted/60 top-1 right-2">Max Budget (₹)</span>
                                        <input type="number" value={compareBudget} onChange={e => setCompareBudget(Number(e.target.value))}
                                            className="w-full bg-surface/30 border border-border/50 rounded-lg pl-3 pr-2 py-2.5 text-[13px] font-space focus:outline-none focus:border-accent/80 transition-all" />
                                    </div>
                                </div>
                                <button onClick={sendCompare} disabled={loading || !destA || !destB}
                                    className="w-full bg-accent hover:bg-accent/90 text-white font-orbitron tracking-widest text-[12px] uppercase py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20">
                                    Run Comparison
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sleek Input Area */}
                    <div className="p-3 md:p-5 bg-white/50 backdrop-blur-md border-t border-border/30">
                        
                        {/* Action Pills */}
                        <div className="flex justify-between items-center mb-3 px-1">
                            <div className="flex gap-2">
                                <button onClick={() => setCompareMode(v => !v)}
                                    className={`flex items-center gap-1.5 text-[11px] font-space font-medium px-3 py-1.5 rounded-full transition-all ${
                                        compareMode 
                                        ? "bg-accent/10 border border-accent/40 text-accent shadow-sm" 
                                        : "bg-white border border-border/50 text-text-muted hover:bg-surface/50 hover:text-accent"
                                    }`}>
                                    <span>🔀</span> Compare
                                </button>
                                <button onClick={clearSession}
                                    className="flex items-center gap-1.5 text-[11px] font-space font-medium px-3 py-1.5 rounded-full bg-white border border-border/50 text-text-muted hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm">
                                    <span>🗑️</span> Reset
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {copied && <span className="text-[11px] font-space font-bold text-green-500 animate-pulse">✓ Copied</span>}
                                <div className="flex items-center gap-1.5 text-text-muted/50 text-[10px] font-orbitron uppercase tracking-wider tooltip-trigger">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                    Memory Active
                                </div>
                            </div>
                        </div>

                        {/* Location Status */}
                        {userLocation && (
                            <div className="mb-3 px-1">
                                <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-lg px-3 py-2">
                                    <span className="text-accent text-sm">📍</span>
                                    <span className="font-space text-sm text-text-primary">Booking from: <span className="font-bold text-accent">{userLocation}</span></span>
                                </div>
                            </div>
                        )}

                        {/* Input Field */}
                        <div className="relative flex items-center shadow-sm">
                            <input type="text" value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && sendQuery()}
                                placeholder='e.g. "Plan a 2-day trip to Goa under ₹15000..."'
                                className="w-full bg-white border-2 border-border/40 rounded-2xl pl-5 pr-14 py-3.5 text-[14px] font-space text-text-primary placeholder-text-muted/40 focus:outline-none focus:border-accent/60 focus:ring-4 focus:ring-accent/10 transition-all"
                                disabled={loading} 
                            />
                            <button onClick={() => sendQuery()} disabled={loading || !input.trim()}
                                className="absolute right-2 w-10 h-10 flex items-center justify-center bg-accent text-white rounded-xl disabled:opacity-40 disabled:bg-surface disabled:text-text-muted hover:bg-accent/90 transition-all shadow-md shadow-accent/20">
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}