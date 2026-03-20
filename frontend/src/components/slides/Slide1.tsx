//frontend/src/components/slides/Slide1.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { SplitText } from "@/components/Animations";

// Infinite Marquee strip for bottom of slide 1
export function Marquee() {
    return (
        <div className="h-14 md:h-20 w-full border-t border-b border-border bg-deep overflow-hidden flex flex-col justify-center">
            <div className="w-[100vw] overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
                <div className="flex w-max marquee-left hover:[animation-play-state:paused] font-orbitron text-[9px] md:text-[11px] tracking-[3px] md:tracking-[4px] text-text-muted uppercase py-2">
                    {Array(4).fill("AI ORCHESTRATION • HEADLESS CMS • COMPOSABLE APIS • EDGE DEPLOY • REAL-TIME SYNC • MODULAR ARCHITECTURE • ZERO LOCK-IN • AUTONOMOUS AGENTS • SCHEMA-FIRST • EVENT DRIVEN • ").map((text, i) => (
                        <span key={i} className="px-4">
                            {text.split('•').map((item: string, j: number) => (
                                <span key={j}>{item}<span className="text-accent mx-4">•</span></span>
                            ))}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Slide1({ isActive, nextSlide, isMobile }: { isActive: boolean, nextSlide: () => void, isMobile: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollY, setScrollY] = useState(0);
    const [maxScroll, setMaxScroll] = useState(1);

    // Parallax + trigger next slide at bottom
    useEffect(() => {
        if (!isActive && !isMobile) return;

        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const currentScroll = container.scrollTop;
            setScrollY(currentScroll);

            const max = container.scrollHeight - container.clientHeight;
            setMaxScroll(max || 1);

            // Auto-advance to Slide 2 when hitting bottom, desktop only
            if (!isMobile && currentScroll >= max - 5 && max > 50) {
                nextSlide();
                // Pop back scroll so we don't spam trigger
                container.scrollTop = max - 50;
            }
        };

        container.addEventListener("scroll", handleScroll, { passive: true });
        // Trigger once to capture correct max scroll
        setTimeout(handleScroll, 100);

        return () => container.removeEventListener("scroll", handleScroll);
    }, [isActive, nextSlide, isMobile]);

    const progress = Math.min((scrollY / maxScroll) * 100, 100);

    return (
        <div
            ref={containerRef}
            className={`slide-container overflow-y-auto block ${isActive ? 'slide-active' : 'slide-exit'}`}
            style={{ height: "100vh" }}
        >
            {!isMobile && isActive && (
                <div id="scroll-progress" style={{ width: `${progress}%` }} />
            )}

            {/* Hero Section */}
            <section className="relative w-full h-[100vh] flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_#FFFFFF,_#F2E8CF)]">
                {/* Parallax Layers */}
                <div
                    className="absolute inset-0 z-0"
                />

                {/* Floating Particles/Nodes */}
                {!isMobile && (
                    <div
                        className="absolute inset-0 will-change-transform z-[2]"
                        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
                    >
                        {/* 20 Nodes Network */}
                        <svg className="w-full h-full opacity-10">
                            {Array(20).fill(0).map((_, i) => {
                                // deterministic pseudo-random placement so SSR and client match
                                const cx = 10 + ((i * 37) % 80); // multiply by a prime to spread
                                const cy = 10 + ((i * 53) % 80);
                                return (
                                    <circle
                                        key={`node-${i}`}
                                        cx={`${cx}%`}
                                        cy={`${cy}%`}
                                        r="3"
                                        fill="#C2410C"
                                    />
                                );
                            })}
                        </svg>
                    </div>
                )}

                <div
                    className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-5xl mx-auto mt-16 will-change-transform"
                    style={{ transform: isMobile ? "none" : `translateY(${scrollY * 1.0}px)` }}
                >
                    <h1 className="font-orbitron font-black text-2xl sm:text-4xl md:text-7xl text-text-primary leading-[1.1] mb-4 md:mb-6">
                        <SplitText text="ORCHESTRATE. COMPOSE. DEPLOY." />
                    </h1>
                    <h2 className="font-space text-sm sm:text-base md:text-lg text-text-muted max-w-2xl mb-8 md:mb-12 px-2">
                        The AI-native platform assembling applications from intelligent, headless, composable modules.
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-8 md:mb-12 cursor-none w-full sm:w-auto px-4 sm:px-0">
                        <button
                            className="btn-primary"
                            onClick={() => { if (!isMobile) nextSlide(); }}
                        >
                            [GET STARTED]
                        </button>
                        <button className="btn-secondary group flex items-center justify-center gap-2">
                            [WATCH DEMO] <span className="text-[12px] opacity-70 group-hover:text-accent">▶</span>
                        </button>
                    </div>


                </div>
            </section>

            <Marquee />

            {/* Features Overview */}
            <section className="w-full py-12 md:py-24 px-4 sm:px-6 md:px-12 lg:px-24 bg-primary relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto">
                    {[
                        { title: "AI Orchestration", icon: "🧠" },
                        { title: "Headless Architecture", icon: "🧊" },
                        { title: "Composable APIs", icon: "🔗" },
                        { title: "Edge Deployment", icon: "🌍" },
                        { title: "Real-time Sync", icon: "⚡" },
                        { title: "Zero Lock-in", icon: "🔓" },
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="glass-card spotlight-hover p-5 md:p-8 cursor-pointer group"
                            onMouseEnter={(e) => {
                                if (!isMobile) {
                                    const c = e.currentTarget;
                                    c.style.setProperty("--mouse-x", `${e.clientX - c.getBoundingClientRect().left}px`);
                                    c.style.setProperty("--mouse-y", `${e.clientY - c.getBoundingClientRect().top}px`);
                                }
                            }}
                        >
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-accent/10 flex items-center justify-center text-xl md:text-2xl mb-4 md:mb-6 text-accent">
                                {feature.icon}
                            </div>
                            <h3 className="font-orbitron font-bold text-base md:text-lg mb-2 md:mb-3 tracking-[1px] text-text-primary">{feature.title}</h3>
                            <p className="font-space text-xs md:text-sm text-text-muted leading-relaxed">
                                Seamlessly intelligent core empowering absolute control and flexibility over the application stack without constraints.
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats Bar */}
            <section className="w-full bg-deep border-t border-border py-10 md:py-16 px-4 sm:px-6 relative z-10">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:flex md:flex-row justify-around gap-8 md:gap-12 text-center">
                    {[
                        { val: "10M+", label: "API Calls/sec" },
                        { val: "200+", label: "Composable Modules" },
                        { val: "99.99%", label: "Uptime SLA" },
                        { val: "500+", label: "Enterprise Clients" },
                    ].map((stat, i) => (
                        <div key={i}>
                            <div className="font-orbitron font-bold text-2xl sm:text-3xl md:text-4xl mb-2 md:mb-4 text-text-primary hover:text-accent transition-colors cursor-pointer">{stat.val}</div>
                            <div className="font-space text-[10px] md:text-xs text-text-muted uppercase tracking-[1px] md:tracking-[2px]">{stat.label}</div>
                        </div>
                    ))}
                </div>
                {/* Invisible div to force scroll max reach trigger area */}
                <div className="h-16 w-full" />
            </section>
        </div>
    );
}
