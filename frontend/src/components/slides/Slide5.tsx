//frontend/src/components/slides/Slide5.tsx
"use client";

import { useEffect } from "react";
import { SplitText, initSpotlightHover } from "@/components/Animations";

export default function Slide5({ isActive, isMobile }: { isActive: boolean, isMobile: boolean }) {

    useEffect(() => {
        if (isActive && !isMobile) {
            setTimeout(initSpotlightHover, 100);
        }
    }, [isActive, isMobile]);

    const modules = [
        {
            title: "Flights Service",
            desc: "Retrieves available flights and pricing from the flight microservice.",
            icon: "✈️"
        },
        {
            title: "Hotels Service",
            desc: "Finds accommodation options and nightly pricing.",
            icon: "🏨"
        },
        {
            title: "Weather Service",
            desc: "Provides real-time weather conditions for the destination.",
            icon: "🌤"
        },
        {
            title: "Places Service",
            desc: "Suggests attractions and activities in the destination city.",
            icon: "📍"
        },
        {
            title: "Budget Service",
            desc: "Calculates estimated trip cost from all services.",
            icon: "💰"
        }
    ];

    return (
        <div className={`slide-container bg-deep flex flex-col items-center justify-center ${isActive ? 'slide-active' : 'slide-exit'}`}>

            <div
                className="absolute inset-0 z-0 bg-cover bg-center opacity-15 sepia-[.5] hue-rotate-[-30deg] contrast-125"
                style={{ backgroundImage: "url('/images/modules-bg.jpg')" }}
            />

            <div className="z-10 text-center mb-12 animate-[fadeUp_0.8s_ease_0.2s_both] px-4">
                <h2 className="font-orbitron font-bold text-2xl sm:text-4xl md:text-5xl text-text-primary mb-3 md:mb-4">
                    <SplitText text="PICK. COMPOSE. LAUNCH." delayIndex={0} />
                </h2>
                <p className="font-space text-text-muted text-sm md:text-base max-w-2xl mx-auto">
                    Choose from 200+ pre-built modules. Compose them visually. Ship in minutes.
                </p>
            </div>

            <div className="z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto px-4 sm:px-6 auto-rows-fr">
                {modules.map((mod, i) => (
                    <div
                        key={i}
                        className="glass-card spotlight-hover p-4 sm:p-6 group transition-all duration-300 hover:-translate-y-1 hover:border-accent cursor-none flex flex-col"
                        style={{ animation: isActive ? `fadeUp 0.6s ease ${0.3 + (i * 0.05)}s both` : 'none' }}
                        onMouseEnter={(e) => {
                            if (!isMobile) {
                                const c = e.currentTarget;
                                c.style.setProperty("--mouse-x", `${e.clientX - c.getBoundingClientRect().left}px`);
                                c.style.setProperty("--mouse-y", `${e.clientY - c.getBoundingClientRect().top}px`);
                            }
                        }}
                    >
                        <div className="text-xl sm:text-2xl mb-3 md:mb-4 text-accent opacity-80 group-hover:opacity-100 transition-opacity">{mod.icon}</div>
                        <h3 className="font-orbitron font-semibold text-text-primary text-sm sm:text-base mb-1 sm:mb-2 group-hover:text-accent transition-colors">{mod.title}</h3>
                        <p className="font-space text-text-muted text-xs leading-relaxed flex-grow">{mod.desc}</p>
                    </div>
                ))}
            </div>

        </div>
    );
}
