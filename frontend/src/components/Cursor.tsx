"use client";

import { useEffect, useRef, useState } from "react";

export default function Cursor() {
    const dotRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (isMobile) return;

        const dot = dotRef.current;
        if (!dot) return;

        const onMouseMove = (e: MouseEvent) => {
            dot.style.left = e.clientX + "px";
            dot.style.top = e.clientY + "px";
        };

        const onMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isClickable =
                target.tagName === "A" ||
                target.tagName === "BUTTON" ||
                target.closest("a") ||
                target.closest("button") ||
                target.closest(".nav-dots");

            dot.classList.toggle("cursor-hover", !!isClickable);
        };

        document.addEventListener("mousemove", onMouseMove, { passive: true });
        document.addEventListener("mouseover", onMouseOver, { passive: true });

        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseover", onMouseOver);
        };
    }, [isMobile]);

    if (isMobile) return null;

    return <div ref={dotRef} id="custom-cursor" />;
}