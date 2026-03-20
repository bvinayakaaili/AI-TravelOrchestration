//frontend/src/components/slides/Slide2.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SplitText, initSpotlightHover } from "@/components/Animations";

// Track first visits globally for skeleton loaders
const visitedSlides = new Set<number>();

export default function Slide2({ isActive }: { isActive: boolean }) {
    const [showSkeleton, setShowSkeleton] = useState(false);

    useEffect(() => {
        if (isActive) {
            if (!visitedSlides.has(2)) {
                setShowSkeleton(true);
                visitedSlides.add(2);
                setTimeout(() => setShowSkeleton(false), 1500);
            }
            initSpotlightHover();
        }
    }, [isActive]);

    return (
        <div className={`slide-container bg-deep ${isActive ? 'slide-active' : 'slide-exit'}`}>
            <div className="slide-content flex flex-col md:flex-row h-full w-full">
                {/* Left Panel */}
                <div className="w-full md:w-1/2 h-[35vh] md:h-full overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary/40 z-[1]" />
                    <Image
                        src="/images/platform-overview.jpg"
                        alt="Platform Overview"
                        fill
                        className={`object-cover transition-opacity duration-500 delay-300 sepia-[.5] hue-rotate-[-30deg] contrast-125 ${isActive ? 'opacity-90 scale-100' : 'opacity-0 scale-105'}`}
                        loading="lazy"
                    />
                </div>

                {/* Right Panel */}
                <div className="w-full md:w-1/2 flex-1 md:h-full flex flex-col justify-center pt-20 md:pt-24 p-5 sm:p-8 md:p-16 lg:p-24 relative overflow-y-auto">

                    {/* Skeleton Overlay */}
                    <div
                        className={`absolute inset-0 bg-deep z-[50] flex flex-col justify-center p-5 sm:p-8 md:p-16 lg:p-24 transition-opacity duration-500 pointer-events-none ${showSkeleton ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <div className="skeleton w-3/4 h-10 mb-8" />
                        <div className="skeleton w-full h-4 mb-3" />
                        <div className="skeleton w-5/6 h-4 mb-12" />
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} className="skeleton w-full h-20 mb-4 rounded-xl" />
                        ))}
                    </div>

                    <h2 className="font-orbitron font-bold text-xl sm:text-3xl md:text-5xl mb-4 md:mb-6">
                        <SplitText text="ONE PLATFORM." delayIndex={0} />
                        <br />
                        <SplitText text="INFINITE COMPOSITIONS." delayIndex={2} />
                    </h2>

                    <p className="font-space text-xs sm:text-[15px] text-text-muted mb-6 md:mb-12 leading-relaxed max-w-xl">
                        AOHCAP provides the foundational architecture to compose, deploy, and scale intelligent microservices instantly without managing underlying infrastructure logic.
                    </p>

                    <div className="flex flex-col gap-3 md:gap-4 max-w-xl">
                        {[
                            { icon: "🧩", title: "Plug-and-play module registry" },
                            { icon: "🧠", title: "AI-driven composition engine" },
                            { icon: "📄", title: "Schema-first API layer" },
                            { icon: "🚀", title: "Universal deployment target" },
                        ].map((feature, i) => (
                            <div key={i} className="glass-card spotlight-hover p-3 sm:p-5 flex items-center gap-3 sm:gap-4 cursor-pointer group">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-accent/10 text-accent flex items-center justify-center shrink-0 text-sm sm:text-base">
                                    {feature.icon}
                                </div>
                                <div className="font-orbitron font-semibold text-xs sm:text-sm md:text-base text-text-primary tracking-[1px] group-hover:text-accent transition-colors">
                                    {feature.title}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
}
