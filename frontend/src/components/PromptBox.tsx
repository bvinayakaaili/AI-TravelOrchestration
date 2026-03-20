"use client";

import { useState } from "react";

const PROMPT_CONTENT = `# AI Travel Orchestrator — System Prompt

ROLE: "You are an AI Travel Planning Orchestrator."

TASK:
  Parse the user's natural language travel query and extract:
    - destination  // where they want to go
    - duration     // how many days
    - budget       // total budget in INR
    - preferences  // adventure, relaxation, etc.

SERVICES AVAILABLE:
  [
    "flight_service"   → search flights by route
    "hotel_service"    → find hotels by destination & budget
    "weather_service"  → get weather forecast
    "places_service"   → recommend attractions
    "budget_service"   → analyze total cost
  ]

EXECUTION:
  1. Parse user intent into structured parameters
  2. Call ALL services in parallel (async)
  3. Aggregate results into a cohesive travel plan
  4. Return a JSON response with the complete itinerary

OUTPUT FORMAT:
  {
    "destination": "...",
    "flights":     {...},
    "hotels":      {...},
    "weather":     {...},
    "places":      [...],
    "budget":      {...}
  }

RULES:
  - Always call all 5 services, even if user omits details
  - Use sensible defaults for missing parameters
  - Prioritize budget constraints when selecting options
  - Return JSON only, no extra commentary`;

export default function PromptBox() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PROMPT_CONTENT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="prompt-section reveal" id="prompt">
      <span className="section-tag">AI Prompt</span>
      <h2 className="section-title font-syne">The Orchestrator Prompt</h2>
      <p className="section-desc">
        The system prompt that powers the AI&apos;s decision-making and service orchestration.
      </p>

      <div className="prompt-window">
        <div className="prompt-titlebar">
          <div className="prompt-dots">
            <span className="dot-red" />
            <span className="dot-yellow" />
            <span className="dot-green" />
          </div>
          <button className="prompt-copy" onClick={handleCopy}>
            {copied ? "✅ Copied!" : "Copy Prompt"}
          </button>
        </div>
        <div className="prompt-code">
          <span className="cmt"># AI Travel Orchestrator — System Prompt</span>
          {"\n\n"}
          <span className="kw">ROLE:</span>{" "}
          <span className="str">&quot;You are an AI Travel Planning Orchestrator.&quot;</span>
          {"\n\n"}
          <span className="kw">TASK:</span>
          {"\n"}
          {"  Parse the user's natural language travel query and extract:\n"}
          {"    - "}
          <span className="br">destination</span>
          {"  "}
          <span className="cmt">{"// where they want to go"}</span>
          {"\n    - "}
          <span className="br">duration</span>
          {"     "}
          <span className="cmt">{"// how many days"}</span>
          {"\n    - "}
          <span className="br">budget</span>
          {"       "}
          <span className="cmt">{"// total budget in INR"}</span>
          {"\n    - "}
          <span className="br">preferences</span>
          {"  "}
          <span className="cmt">{"// adventure, relaxation, etc."}</span>
          {"\n\n"}
          <span className="kw">SERVICES AVAILABLE:</span>
          {"\n  "}
          <span className="br">[</span>
          {"\n    "}
          <span className="str">&quot;flight_service&quot;</span>
          {"   → search flights by route\n    "}
          <span className="str">&quot;hotel_service&quot;</span>
          {"    → find hotels by destination & budget\n    "}
          <span className="str">&quot;weather_service&quot;</span>
          {"  → get weather forecast\n    "}
          <span className="str">&quot;places_service&quot;</span>
          {"   → recommend attractions\n    "}
          <span className="str">&quot;budget_service&quot;</span>
          {"   → analyze total cost\n  "}
          <span className="br">]</span>
          {"\n\n"}
          <span className="kw">EXECUTION:</span>
          {"\n"}
          {"  1. Parse user intent into structured parameters\n"}
          {"  2. Call ALL services in "}
          <span className="str">parallel</span>
          {" (async)\n"}
          {"  3. Aggregate results into a cohesive travel plan\n"}
          {"  4. Return a JSON response with the complete itinerary\n\n"}
          <span className="kw">OUTPUT FORMAT:</span>
          {"\n  "}
          <span className="br">{"{"}</span>
          {"\n    "}
          <span className="str">&quot;destination&quot;</span>
          {": "}
          <span className="str">&quot;...&quot;</span>
          {",\n    "}
          <span className="str">&quot;flights&quot;</span>
          {":     "}
          <span className="br">{"{...}"}</span>
          {",\n    "}
          <span className="str">&quot;hotels&quot;</span>
          {":      "}
          <span className="br">{"{...}"}</span>
          {",\n    "}
          <span className="str">&quot;weather&quot;</span>
          {":     "}
          <span className="br">{"{...}"}</span>
          {",\n    "}
          <span className="str">&quot;places&quot;</span>
          {":      "}
          <span className="br">{"[...]"}</span>
          {",\n    "}
          <span className="str">&quot;budget&quot;</span>
          {":      "}
          <span className="br">{"{...}"}</span>
          {"\n  "}
          <span className="br">{"}"}</span>
          {"\n\n"}
          <span className="kw">RULES:</span>
          {"\n"}
          {"  - Always call all 5 services, even if user omits details\n"}
          {"  - Use "}
          <span className="str">sensible defaults</span>
          {" for missing parameters\n"}
          {"  - Prioritize "}
          <span className="str">budget constraints</span>
          {" when selecting options\n"}
          {"  - Return "}
          <span className="str">JSON only</span>
          {", no extra commentary"}
        </div>
      </div>
    </section>
  );
}
