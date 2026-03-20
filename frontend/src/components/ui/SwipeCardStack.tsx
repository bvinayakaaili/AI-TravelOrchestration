"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SwipeableCardProps {
    items: any[];
    renderItem: (item: any, index: number) => React.ReactNode;
    title: string;
    icon: string;
}

export default function SwipeCardStack({ items, renderItem, title, icon }: SwipeableCardProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState<"left" | "right" | null>(null);

    if (!items || items.length === 0) return null;
    if (currentIndex >= items.length) {
        return (
            <div className="glass-card p-4 border-accent/10 opacity-60">
                <h4 className="font-orbitron text-xs text-accent tracking-[3px] uppercase mb-2">{icon} {title}</h4>
                <p className="font-space text-xs text-text-primary text-center py-4">All options reviewed.</p>
            </div>
        );
    }

    const handleDragEnd = (event: any, info: any) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            setDirection("right");
            setCurrentIndex(prev => prev + 1);
        } else if (info.offset.x < -threshold) {
            setDirection("left");
            setCurrentIndex(prev => prev + 1);
        }
    };

    return (
        <div className="glass-card p-4 border-accent/10 relative overflow-hidden">
            <h4 className="font-orbitron text-xs text-accent tracking-[3px] uppercase mb-4 flex justify-between">
                <span>{icon} {title}</span>
                <span className="text-[10px] text-text-muted normal-case tracking-normal">Swipe to decide ({currentIndex + 1}/{items.length})</span>
            </h4>
            
            <div className="relative h-28 w-full flex justify-center items-center perspective-1000">
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={currentIndex}
                        className="absolute w-full h-full bg-surface border border-accent/20 rounded-xl p-3 shadow-sm flex flex-col justify-center cursor-grab active:cursor-grabbing"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.7}
                        onDragEnd={handleDragEnd}
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                        exit={{ 
                            x: direction === "left" ? -200 : 200, 
                            opacity: 0, 
                            rotate: direction === "left" ? -15 : 15,
                            transition: { duration: 0.3 }
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        {renderItem(items[currentIndex], currentIndex)}
                    </motion.div>
                </AnimatePresence>
            </div>
            
            <div className="flex justify-between items-center mt-4 px-2">
                <button 
                    onClick={() => { setDirection("left"); setCurrentIndex(c => c + 1); }}
                    className="w-10 h-10 rounded-full bg-red-50 text-red-500 border border-red-100 flex justify-center items-center hover:bg-red-100 transition-colors shadow-sm"
                >
                    ✕
                </button>
                <span className="text-[10px] font-space text-text-muted uppercase tracking-wider">Drag Card</span>
                <button 
                    onClick={() => { setDirection("right"); setCurrentIndex(c => c + 1); }}
                    className="w-10 h-10 rounded-full bg-green-50 text-green-500 border border-green-100 flex justify-center items-center hover:bg-green-100 transition-colors shadow-sm"
                >
                    ♥
                </button>
            </div>
        </div>
    );
}
