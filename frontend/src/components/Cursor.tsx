"use client";

import { useEffect, useState } from "react";

export default function Cursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        let animationFrameId: number;
        let lastEvent: MouseEvent | null = null;

        const onMouseMove = (e: MouseEvent) => {
            lastEvent = e;
        };

        const updatePosition = () => {
            if (lastEvent) {
                setPosition({ x: lastEvent.clientX, y: lastEvent.clientY });
            }
            animationFrameId = requestAnimationFrame(updatePosition);
        };

        const onMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isClickable =
                target.tagName === "A" ||
                target.tagName === "BUTTON" ||
                target.closest("a") ||
                target.closest("button") ||
                target.closest(".nav-dots");

            if (isClickable) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseover", onMouseOver);
        animationFrameId = requestAnimationFrame(updatePosition);

        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseover", onMouseOver);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Hide on small devices since rule says "< 768px mobile: Custom cursor disabled"
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (isMobile) return null;

    return (
        <>
            <div
                id="custom-cursor"
                className={isHovering ? "cursor-hover" : ""}
                style={{ left: position.x, top: position.y }}
            />
            <div
                id="custom-cursor-ring"
                className={isHovering ? "cursor-hover" : ""}
                style={{ left: position.x, top: position.y }}
            />
        </>
    );
}
