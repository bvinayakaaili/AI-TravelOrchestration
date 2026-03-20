"use client";

import { useEffect, useState } from "react";

const nodes = [
  { id: "user", label: "User", icon: "👤" },
  { id: "ai", label: "AI Engine", icon: "🧠" },
  { id: "gateway", label: "Gateway", icon: "🌐" },
  { id: "services", label: "Microservices", icon: "🧩" },
  { id: "response", label: "Response", icon: "📦" },
];

export default function ServiceFlow({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }

    const interval = setInterval(() => {
      setStep((s) => (s + 1) % nodes.length);
    }, 700);

    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="glass-card p-4 border-opal/10 mb-4">
      <h4 className="font-orbitron text-xs text-opal tracking-[3px] uppercase mb-4">
        🚀 Service Network Flow
      </h4>

      <div className="flex items-center justify-between gap-2">
        {nodes.map((node, i) => (
          <div
            key={node.id}
            className={`flex flex-col items-center transition-all duration-500 ${
              i === step ? "scale-110 text-opal" : "opacity-60"
            }`}
          >
            <div className="text-2xl">{node.icon}</div>

            <span className="text-[10px] font-space mt-1">
              {node.label}
            </span>

            {i < nodes.length - 1 && (
              <div className="w-10 h-[2px] bg-opal/40 mt-2 relative overflow-hidden">
                {i === step && (
                  <div className="absolute inset-0 bg-opal animate-pulse" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}