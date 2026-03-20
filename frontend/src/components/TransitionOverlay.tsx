"use client";

import { useEffect, useState } from "react";

export default function TransitionOverlay({ isTransitioning, slideOut }: { isTransitioning: boolean, slideOut: boolean }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (isTransitioning && !slideOut) {
            setProgress(0);
            // Fills progress over the period the overlay is fully covering the screen
            setTimeout(() => setProgress(100), 100);
        }
    }, [isTransitioning, slideOut]);

    return (
        <div
            id="transition-overlay"
            className="fixed inset-0 z-[9999] pointer-events-none flex flex-col bg-bg-deep"
            style={{
                transform: slideOut ? "translateY(-100%)" : (isTransitioning ? "translateY(0)" : "translateY(100%)"),
                transition: "transform 300ms ease-in-out",
                backgroundImage: "repeating-linear-gradient(0deg, rgba(167,218,220,0.03) 0px, transparent 1px, transparent 3px)"
            }}
        >
            <div
                className="h-[2px] bg-opal"
                style={{
                    width: `${progress}%`,
                    transition: "width 80ms linear"
                }}
            />
        </div>
    );
}
