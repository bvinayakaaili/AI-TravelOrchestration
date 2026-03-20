// frontend/src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Cursor from "@/components/Cursor";
import Slide1 from "@/components/slides/Slide1";
import Slide2 from "@/components/slides/Slide2";
import Slide3 from "@/components/slides/Slide3";
import Slide4 from "@/components/slides/Slide4";
import Slide5 from "@/components/slides/Slide5";
import ChatBot from "@/components/slides/ChatBot"; // Make sure your ChatDemo is exported as ChatBot here if needed!

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isMobile, setIsMobile] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type SlideComponent = React.ComponentType<any>;
  const SLIDES: SlideComponent[] = [Slide1, Slide2, Slide3, Slide4, Slide5, ChatBot];
  // Responsive check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update hash on slide change
  useEffect(() => {
    if (currentSlide > 0) {
      window.location.hash = `#slide-${currentSlide + 1}`;
    } else {
      window.history.pushState(null, "", window.location.pathname);
    }
  }, [currentSlide]);

  // Initial load from hash
  useEffect(() => {
    const hash = window.location.hash;
    const slideMatch = hash.match(/#slide-(\d+)/);
    if (slideMatch) {
      const idx = parseInt(slideMatch[1]) - 1;
      if (idx >= 0 && idx < SLIDES.length) {
        setCurrentSlide(idx);
      }
    }
  }, []);

  const changeSlide = (newIndex: number) => {
    if (isTransitioning || newIndex === currentSlide || newIndex < 0 || newIndex >= SLIDES.length) return;

    // If mobile, smooth scroll to the section instead of transition
    if (isMobile) {
      const section = document.getElementById(`slide-${newIndex + 1}`);
      if (section) section.scrollIntoView({ behavior: "smooth" });
      setCurrentSlide(newIndex);
      return;
    }

    setDirection(newIndex > currentSlide ? "next" : "prev");
    setPrevSlide(currentSlide);
    setIsTransitioning(true);
    setCurrentSlide(newIndex);

    // Wait for the transition to finish
    setTimeout(() => {
      setIsTransitioning(false);
      setPrevSlide(null);
    }, 600);
  };

  // Keyboard and wheel navigation
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        changeSlide(currentSlide + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        changeSlide(currentSlide - 1);
      }
    };

    // Note: Slide 1 has native scroll, SlideController triggers change globally
    let wheelTimer: NodeJS.Timeout;
    const handleWheel = (e: WheelEvent) => {
      if (currentSlide === 0) return; // Slide 1 handles its own wheel

      if (isTransitioning) return;

      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (e.deltaY > 50) changeSlide(currentSlide + 1);
        else if (e.deltaY < -50) changeSlide(currentSlide - 1);
      }, 50);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (currentSlide === 0) return;
      const touchEndY = e.changedTouches[0].clientY;
      const delta = touchStartY - touchEndY;
      if (delta > 50) changeSlide(currentSlide + 1);
      else if (delta < -50) changeSlide(currentSlide - 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide, isTransitioning, isMobile]);

  // Compute styles for fade + slide transition
  const getSlideStyle = (idx: number): React.CSSProperties => {
    const isActive = idx === currentSlide;
    const isPrev = idx === prevSlide;

    if (isActive) {
      // Incoming slide: animate in with fade + slide using CSS keyframe
      const animName = direction === "next" ? "fadeSlideInFromRight" : "fadeSlideInFromLeft";
      return {
        zIndex: 20,
        opacity: 1,
        transform: "translateX(0)",
        animation: isTransitioning ? `${animName} 500ms ease-out both` : "none",
        pointerEvents: "auto",
      };
    }

    if (isPrev && isTransitioning) {
      // Outgoing slide: fades out and slides away
      const exitX = direction === "next" ? "-60px" : "60px";
      return {
        zIndex: 10,
        opacity: 0,
        transform: `translateX(${exitX})`,
        transition: "opacity 500ms ease-out, transform 500ms ease-out",
        pointerEvents: "none",
      };
    }

    // Hidden slides
    return {
      zIndex: 1,
      opacity: 0,
      pointerEvents: "none",
    };
  };

  return (
    <main className="w-full text-text-primary">
      <Cursor />
      <Navbar
        currentSlide={currentSlide}
        totalSlides={SLIDES.length}
        setSlide={changeSlide}
        isMobile={isMobile}
      />

      {isMobile ? (
        // Mobile view: Stack all slides vertically
        <div className="flex flex-col">
          {SLIDES.map((SlideComp, idx) => (
            <div key={idx} id={`slide-${idx + 1}`} className="w-full min-h-screen relative overflow-hidden shrink-0">
              <SlideComp
                isActive={true}
                nextSlide={() => setCurrentSlide(idx === 0 ? 5 : Math.min(SLIDES.length - 1, idx + 1))}
                isMobile={isMobile}
              />
            </div>
          ))}
        </div>
      ) : (
        // Desktop view: Fade + Slide transition between slides
        <div className="relative w-full h-screen overflow-hidden">
          {SLIDES.map((SlideComp, idx) => {
            const isActive = idx === currentSlide;
            const isPrev = idx === prevSlide;
            // Only render active slide, previous slide (during transition), or initial slide
            if (!isActive && !(isPrev && isTransitioning)) return null;
            return (
              <div
                key={idx}
                className="absolute inset-0 w-full h-screen"
                style={getSlideStyle(idx)}
              >
                <SlideComp
                  isActive={isActive}
                  nextSlide={() => changeSlide(idx === 0 ? 5 : idx + 1)}
                  isMobile={isMobile}
                />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}