"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function WeatherOverlay({ condition }: { condition: string }) {
    if (!condition) return null;
    const cond = condition.toLowerCase();

    const isRain = cond.includes("rain") || cond.includes("drizzle");
    const isSnow = cond.includes("snow");
    const isClear = cond.includes("clear") || cond.includes("sun");
    const isCloudy = cond.includes("cloud") || cond.includes("overcast");

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen transition-opacity duration-1000">
            <AnimatePresence>
                {isRain && (
                    <motion.div 
                        key="rain"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.3 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-[rain_0.3s_linear_infinite]"
                    />
                )}
                {isSnow && (
                    <motion.div 
                        key="snow"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.4 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex justify-around"
                    >
                        {Array.from({ length: 20 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: -20, x: Math.random() * 100 - 50 }}
                                animate={{ y: "100vh", x: Math.random() * 200 - 100 }}
                                transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, ease: "linear" }}
                                className="w-2 h-2 rounded-full bg-white opacity-80"
                            />
                        ))}
                    </motion.div>
                )}
                {isClear && (
                    <motion.div 
                        key="clear"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.15 }} 
                        exit={{ opacity: 0 }}
                        className="absolute top-0 right-0 w-[800px] h-[800px] bg-yellow-400 rounded-full blur-[150px] mix-blend-overlay pointer-events-none transform translate-x-1/4 -translate-y-1/4"
                    />
                )}
                {isCloudy && (
                    <motion.div 
                        key="cloudy"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-b from-gray-400 to-transparent blur-3xl pointer-events-none"
                    />
                )}
            </AnimatePresence>
            
            {/* Inject custom keyframes for rain */}
            <style jsx>{`
                @keyframes rain {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 20% 100%; }
                }
            `}</style>
        </div>
    );
}
