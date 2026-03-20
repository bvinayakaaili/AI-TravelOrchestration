"use client";

import React, { useState } from "react";

interface NavbarProps {
  currentSlide: number;
  totalSlides: number;
  setSlide: (idx: number) => void;
  isMobile: boolean;
}

export default function Navbar({ currentSlide, totalSlides, setSlide, isMobile }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", slide: 0 },
    { label: "Overview", slide: 1 },
    { label: "Architecture", slide: 2 },
    { label: "AI Core", slide: 3 },
    { label: "Modules", slide: 4 },
    { label: "AI Planner", slide: 5 },
  ];

  const handleNav = (slide: number) => {
    setSlide(slide);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] h-16 md:h-20 bg-primary/80 backdrop-blur-md border-b justify-between items-center border-border px-4 md:px-8 flex">
        <div
          className="font-orbitron font-bold text-xl md:text-3xl text-accent tracking-[2px] cursor-pointer"
          onClick={() => handleNav(0)}
        >
          AOHCAP
        </div>

        {/* Desktop nav links */}
        {!isMobile && (
          <div className="flex items-center gap-6 text-sm md:text-base font-bold tracking-[2px] uppercase">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => setSlide(link.slide)}
                className={`transition-colors font-Inter ${currentSlide === link.slide ? "text-accent" : "text-text-primary hover:text-accent"
                  }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}

        {/* Mobile hamburger button */}
        {isMobile && (
          <button
            className="flex flex-col justify-center items-center w-10 h-10 gap-[5px]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className={`w-5 h-0.5 bg-text-primary rounded-sm transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-[3.5px]" : ""}`} />
            <div className={`w-5 h-0.5 bg-text-primary rounded-sm transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-[3.5px]" : ""}`} />
          </button>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div className="fixed top-16 left-0 right-0 z-[99] bg-primary/95 backdrop-blur-lg border-b border-border flex flex-col py-4 px-6 gap-1">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNav(link.slide)}
              className={`text-left py-3 px-4 rounded-lg font-Inter text-lg font-bold tracking-[2px] uppercase transition-colors ${currentSlide === link.slide
                  ? "text-accent bg-accent/10"
                  : "text-text-primary active:text-accent active:bg-black/5"
                }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}

      {/* Slide Progress Dots (Right Edge) - Only visible on desktop if multiple slides */}
      {!isMobile && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-4 nav-dots">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === i ? "bg-accent scale-150 shadow-[0_0_8px_var(--accent)]" : "bg-text-muted/40 hover:bg-text-muted"
                }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

    </>
  );
}
