"use client";


export function initSpotlightHover() {
    const cards = document.querySelectorAll(".spotlight-hover");
    cards.forEach((card) => {
        const handleMouseMove = (e: Event) => {
            const mouseEvent = e as MouseEvent;
            const target = card as HTMLElement;
            const rect = target.getBoundingClientRect();
            const x = mouseEvent.clientX - rect.left;
            const y = mouseEvent.clientY - rect.top;
            target.style.setProperty("--mouse-x", `${x}px`);
            target.style.setProperty("--mouse-y", `${y}px`);
        };

        card.addEventListener("mousemove", handleMouseMove);
    });
}

export function SplitText({ text, className = "", delayIndex = 0 }: { text: string; className?: string; delayIndex?: number }) {
    const words = text.split(" ");

    return (
        <span className={`inline-block ${className}`} data-split-text="true">
            {words.map((word, i) => (
                <span key={i} className="word-outer">
                    <span
                        className="word-inner block"
                        style={{ "--word-index": i + delayIndex } as React.CSSProperties}
                    >
                        {word}
                    </span>
                    {i < words.length - 1 && "\u00A0"}
                </span>
            ))}
        </span>
    );
}
