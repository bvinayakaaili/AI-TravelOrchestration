// Configuration
const WS_BASE = "ws://localhost:8000";
const API_BASE = "http://localhost:8000";
const USER_API_BASE = "http://localhost:8006";

// DOM Elements
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

// State
let isProcessing = false;
let sessionId = crypto.randomUUID();
let currentActiveTypingId = null;
window.lastGeneratedPlan = null;
let userCity = null;

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                userCity = data.address.city || data.address.town || data.address.state || null;
            } catch (e) {
                console.error("Geocoding failed", e);
            }
        },
        (err) => console.error("Geolocation error", err),
        { timeout: 5000 }
    );
}

// --- 1. Initialization ---
async function checkHealth() {
    try {
        const res = await fetch(`${API_BASE}/status`);
        if (res.ok) {
            statusDot.className = "w-3 h-3 rounded-full bg-emerald-500 animate-pulse";
            statusText.innerText = "Backend Connected";
        } else throw new Error("Bad status");
    } catch (err) {
        statusDot.className = "w-3 h-3 rounded-full bg-red-500";
        statusText.innerText = "Backend Offline";
    }
}
checkHealth();

// --- 2. UI Rendering Helpers ---
function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingIndicator() {
    if (currentActiveTypingId) {
        const el = document.getElementById(currentActiveTypingId);
        if (el) el.remove();
        currentActiveTypingId = null;
    }
}

function appendMessage(role, content) {
    const div = document.createElement("div");
    div.className = `flex ${role === "user" ? "justify-end" : "justify-start"} message-anim mt-4`;

    if (role === "user") {
        div.innerHTML = `<div class="bg-blue-600 text-white max-w-[85%] rounded-2xl p-4 shadow-lg">${content}</div>`;
    } else if (role === "status") {
        const id = `status-${Date.now()}`;
        currentActiveTypingId = id;
        div.id = id;
        div.innerHTML = `
            <div class="flex items-center gap-3 bg-transparent text-slate-400 text-sm italic py-2">
                <span class="animate-spin text-lg">⚙️</span> ${content}
            </div>`;
    } else if (role === "error") {
        div.innerHTML = `<div class="bg-red-950/50 border border-red-900/50 text-red-400 max-w-[85%] rounded-2xl p-4 shadow-lg">⚠️ ${content}</div>`;
    } else {
        div.innerHTML = `<div class="bg-slate-800 border border-slate-700 max-w-[85%] rounded-2xl p-4 shadow-lg w-full">${content}</div>`;
    }

    chatBox.appendChild(div);
    scrollToBottom();
}

// --- 3. Rendering the AI Trip Card (Now Bulletproof) ---
function renderTripCard(data) {
    // Defensive check: Try to find the plan wherever the LLM hid it
    let tp = data.trip_plan || data || {};

    // Sometimes the LLM returns the plan as a stringified JSON block inside the object
    if (typeof tp === 'string') {
        try { tp = JSON.parse(tp); } catch (e) { console.warn("Failed to parse stringified plan"); }
    }

    const flights = tp.flights?.[0];
    const hotels = tp.hotels?.[0];
    const weather = tp.weather || {};
    const places = tp.attractions || [];
    const trace = data.workflow_explanation?.trace || [];

    window.lastGeneratedPlan = { title: tp.destination || "Trip", raw_data: data };

    const badgesHtml = trace.filter(t => t.step !== "Intent Detection").map(t => {
        const name = t.step.replace(" Service", "");
        if (t.status === "completed") return `<span class="text-[10px] px-2 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">✓ ${name}</span>`;
        if (t.status === "skipped") return `<span class="text-[10px] px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-400">⏭ ${name}</span>`;
        return `<span class="text-[10px] px-2 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-400">✗ ${name}</span>`;
    }).join('');

    const flightHtml = flights ? `<div class="font-medium">${flights.airline || 'Unknown Airline'}</div><div class="text-xs text-slate-400">₹${flights.price?.toLocaleString() || 'N/A'} • ${flights.duration_hrs || '?'}h</div>` : `<div class="text-slate-500 italic">Skipped / Unavailable</div>`;
    const hotelHtml = hotels ? `<div class="font-medium">${hotels.hotel || hotels.name || 'Unknown Hotel'}</div><div class="text-xs text-slate-400">₹${(hotels.price_per_night || hotels.price || 0)?.toLocaleString()}/night</div>` : `<div class="text-slate-500 italic">Skipped / Unavailable</div>`;
    const placesHtml = places.length > 0 ? `<div class="text-sm truncate">${places.slice(0, 3).join(", ")}</div>` : `<div class="text-slate-500 italic">Skipped / Unavailable</div>`;
    const weatherHtml = weather.condition ? `<div class="text-sm">${weather.condition} • ${weather.temperature || ''}</div>` : `<div class="text-slate-500 italic">Skipped / Unavailable</div>`;

    const cardHtml = `
        <div class="w-full">
            <div class="flex flex-wrap gap-2 mb-3">${badgesHtml}</div>
            <div class="bg-[#0b1120] rounded-xl p-5 border border-slate-700 shadow-xl">
                <div class="flex justify-between items-end border-b border-slate-800 pb-3 mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-white">📍 ${tp.destination || "Destination"}</h3>
                        <p class="text-slate-400 text-sm mt-1">Duration: ${tp.duration || "N/A"}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-slate-400 text-xs uppercase tracking-wide">Est. Budget</p>
                        <p class="text-lg font-bold text-emerald-400">₹${tp.estimated_budget?.toLocaleString() || "—"}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800"><div class="text-[10px] text-slate-500 uppercase mb-1">✈️ Flight</div>${flightHtml}</div>
                    <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800"><div class="text-[10px] text-slate-500 uppercase mb-1">🏨 Hotel</div>${hotelHtml}</div>
                    <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800"><div class="text-[10px] text-slate-500 uppercase mb-1">🗺️ Places</div>${placesHtml}</div>
                    <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800"><div class="text-[10px] text-slate-500 uppercase mb-1">🌤️ Weather</div>${weatherHtml}</div>
                </div>
                ${tp.budget_advice ? `<div class="p-3 rounded bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm italic">💡 ${tp.budget_advice}</div>` : ''}
                <div class="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                    <button onclick="handleSave()" class="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition border border-slate-700">💾 Save</button>
                    <button onclick="handleCompare()" class="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition border border-slate-700">⚖️ Compare</button>
                    <button onclick="handleShare()" class="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition border border-slate-700">🔗 Share</button>
                </div>
            </div>
        </div>
    `;
    appendMessage("ai", cardHtml);
}

// --- 4. Core WebSocket Logic ---
function handleSend(overrideQuery = null) {
    const query = overrideQuery || userInput.value.trim();
    if (!query || isProcessing) return;

    userInput.value = "";
    isProcessing = true;
    sendBtn.disabled = true;

    appendMessage("user", query);

    const ws = new WebSocket(`${WS_BASE}/ws/plan`);

    ws.onopen = () => { ws.send(JSON.stringify({ query, session_id: sessionId, source: userCity })); };

    ws.onmessage = (event) => {
        try {
            const payload = JSON.parse(event.data);

            if (payload.event === "status") {
                removeTypingIndicator();
                appendMessage("status", payload.message);
            }
            else if (payload.event === "intent_detected") {
                removeTypingIndicator();
                const intent = payload.data;
                appendMessage("status", `Routing: ${intent.destination || 'Unknown'} for ${intent.num_days || 1} days...`);
            }
            else if (payload.event === "plan_complete") {
                removeTypingIndicator();

                // --- CRITICAL DEBUG LOGGING ---
                console.log("=== RAW AI DATA ===");
                console.log(payload.data);
                console.log("===================");

                try {
                    renderTripCard(payload.data);
                } catch (err) {
                    console.error("UI Formatting Error:", err);
                    appendMessage("error", "The AI generated the plan, but the data format was unexpected. Press F12 to check the Console!");
                }

                isProcessing = false;
                sendBtn.disabled = false;
                ws.close();
            }
            else if (payload.event === "error") {
                removeTypingIndicator();
                appendMessage("error", payload.message);
                isProcessing = false;
                sendBtn.disabled = false;
                ws.close();
            }
        } catch (err) {
            console.error("WebSocket Message Parse Error:", err);
        }
    };

    ws.onerror = () => {
        removeTypingIndicator();
        appendMessage("error", "WebSocket connection failed. Ensure backend is running.");
        isProcessing = false;
        sendBtn.disabled = false;
    };
}

// --- 5. Action Handlers ---
async function handleSave() { /* ... unchanged ... */ }
function handleShare() { /* ... unchanged ... */ }
function handleCompare() { /* ... unchanged ... */ }

// --- 6. Event Listeners ---
sendBtn.addEventListener("click", () => handleSend());
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });
document.querySelectorAll('.quick-chip').forEach(btn => {
    btn.addEventListener('click', (e) => { handleSend(e.target.getAttribute('data-query')); });
});