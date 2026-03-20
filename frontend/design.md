# Frontend Design Spec

## Status

This document describes the current implemented frontend for the AI-Orchestrated Smart Travel Planner.

It replaces the older prompt-style website brief that described an 8-slide enterprise SaaS landing page for AOHCAP. The codebase now ships a 6-slide travel-planning experience built in Next.js and connected to the FastAPI gateway and orchestration layer.

## Product Intent

The frontend should communicate two things at the same time:

1. This is a visually polished AI-native product demo.
2. This is a working travel planner that can orchestrate multiple backend services from one natural-language request.

The UI should feel cinematic and technical, but the task flow must stay clear and usable. The visual language is futuristic. The interaction model is practical.

## Experience Summary

The application is a slide-based presentation on desktop and a vertically stacked experience on mobile.

Desktop behavior:

1. Users move between full-screen slides with nav links, nav dots, keyboard arrows, or wheel input.
2. Slide 1 is scrollable and auto-advances when the user reaches the bottom.
3. Slides 2 to 6 behave like full-screen panels with fade-and-slide transitions.
4. The URL hash is updated for deep linking to slides.

Mobile behavior:

1. Slides are stacked vertically.
2. Navigation buttons smooth-scroll to the relevant section.
3. The hamburger menu replaces the desktop nav row.
4. The custom cursor is disabled on coarse pointers.

## Slide Map

### Slide 1: Landing

Purpose:
Introduce the product and establish the visual identity.

Key content:

1. Large split-text hero heading: ORCHESTRATE. COMPOSE. DEPLOY.
2. Product subheading describing intelligent, headless, composable modules.
3. Primary CTA and secondary demo CTA.
4. Trust strip with product stats.
5. Marquee strip.
6. Feature-card grid.
7. Stats bar.

Behavior:

1. Parallax background and foreground layers.
2. Scroll progress bar on desktop.
3. Auto-advance to the next slide when the landing section reaches the bottom.

### Slide 2: Overview

Purpose:
Explain the platform proposition in one screen.

Key content:

1. Split layout with image on the left and content on the right.
2. Heading: ONE PLATFORM. INFINITE COMPOSITIONS.
3. Four feature rows in glass cards.

Behavior:

1. Skeleton shimmer on first visit only.
2. Spotlight hover on feature rows.

### Slide 3: Architecture

Purpose:
Show the orchestration chain at a glance.

Key content:

1. Heading: SYSTEM ARCHITECTURE.
2. Animated step cards from user request to unified response.
3. Short supporting copy describing orchestration behavior.

Behavior:

1. Active step cycles automatically while the slide is visible.

### Slide 4: AI Core

Purpose:
Position orchestration as the differentiator.

Key content:

1. Eyebrow: CORE ENGINE.
2. Heading: AI AT THE CORE OF EVERYTHING.
3. Explanation of dynamic workflow composition.
4. Three animated counters.
5. AI visualization image.

Behavior:

1. Animated neural-network background.
2. Count-up metrics triggered on slide activation.

### Slide 5: Modules

Purpose:
Make the service model concrete.

Key content:

1. Heading: PICK. COMPOSE. LAUNCH.
2. Grid of travel-service cards.
3. Service descriptions for flights, hotels, weather, places, and budget.

Behavior:

1. Spotlight hover and lift-on-hover interaction.
2. Staggered entrance animation while the slide becomes active.

### Slide 6: AI Planner

Purpose:
Provide the working product interaction.

Key content:

1. Chat-style interface for natural-language planning.
2. Suggested starter prompts.
3. Assistant responses rendered as rich trip cards.
4. Workflow trace and budget summaries.

Behavior:

1. Connects to the backend via WebSocket.
2. Displays orchestration status updates during plan generation.
3. Persists a client-side session id in sessionStorage.
4. Renders markdown in assistant messages.
5. Supports copying trip summaries.

## Visual System

### Color Palette

Defined in globals.css:

1. Background primary: Sapphire Night `#1D2D44`
2. Background deep: `#111820`
3. Surface: `#243450`
4. Accent: Opal `#A7DADC`
5. Primary text: `#E8F4F5`
6. Muted text: `#5A7D8A`
7. Border: `rgba(167, 218, 220, 0.18)`

The palette should remain dark, cool, and high-contrast. Opal is the only strong highlight color and should be reserved for active states, glows, progress, and key emphasis.

### Typography

1. Orbitron for headings, navigation, labels, counters, and CTA text.
2. Space Mono for body copy, chat content, and supporting descriptions.

Typography should keep a strong editorial contrast: rigid display type for structure, monospaced text for explanation and system detail.

### Surface Language

Core visual patterns:

1. Glassmorphism cards with subtle blur and thin illuminated borders.
2. Noise texture across the app shell.
3. Soft opal glows rather than bright neon blocks.
4. Large-image panels with dark overlays to preserve contrast.

## Motion System

The app relies on motion to make the slide format feel deliberate rather than static.

Primary motion patterns:

1. Fade-and-slide panel transitions for desktop slide changes.
2. Split-text word reveals for major headings.
3. Spotlight hover gradient for interactive cards.
4. Parallax motion in the landing hero.
5. Count-up metrics in the AI Core slide.
6. Skeleton shimmer for first-view loading states.
7. Cycling architecture emphasis in Slide 3.

Motion should reinforce orientation and hierarchy. It should not slow down core actions in the planner.

## Navigation Model

### Desktop

1. Fixed top nav with brand, slide links, and active-state highlighting.
2. Right-edge dot navigation for direct slide jumps.
3. Arrow-key support.
4. Wheel-based slide movement for slides after the landing screen.
5. Hash routing in the form `#slide-n`.

### Mobile

1. Fixed header with brand and hamburger menu.
2. Dropdown navigation with large touch targets.
3. Vertical page flow rather than presentation-style slide replacement.

## Chat Experience Requirements

The planner must feel like a real orchestration console, not a generic chatbot.

Required traits:

1. Users can ask for trip planning, budget checks, destination comparison, or weather-oriented prompts in natural language.
2. While a request is running, the UI surfaces system status rather than freezing.
3. Responses should decompose into readable sections such as flights, hotels, weather, attractions, and budget.
4. The execution trace should remain visible enough to prove the multi-service workflow.
5. The result card should emphasize the recommended budget-friendly option when available.

## Component Responsibilities

### App Shell

The top-level page component manages:

1. Current slide index.
2. Previous slide for transition staging.
3. Transition direction.
4. Desktop versus mobile behavior.
5. URL hash synchronization.

### Navbar

The navbar is responsible for:

1. Desktop nav links.
2. Mobile hamburger menu.
3. Right-side nav dots.
4. Active slide indication.

### Animations Helpers

Animation helpers currently provide:

1. Split text rendering with per-word delays.
2. Spotlight hover pointer tracking.

### Slide Components

Each slide owns its own local presentation logic, including animation timing, counters, skeleton state, and background media.

### Chat Planner

The chat planner is responsible for:

1. Message state.
2. WebSocket lifecycle.
3. Status handling.
4. Trip-plan sanitization before rendering.
5. Rich response cards and trace visualization.

## Content Principles

The copy should stay grounded in the actual product demo.

Do:

1. Emphasize AI orchestration, modular services, and travel-planning outcomes.
2. Keep feature language specific to the implemented system.
3. Use short, high-signal copy in the hero and slides.

Do not:

1. Revert to the previous 8-slide AOHCAP marketing story.
2. Introduce enterprise claims that are not supported by the demo.
3. Add extra slide sections unless the codebase is updated to support them.

## Current Implementation Notes

1. The frontend currently has 6 slides, not 8.
2. The slide counter described in older notes is intentionally removed.
3. Desktop uses controlled slide transitions; mobile uses stacked sections.
4. The chatbot is the main product interaction and should be treated as the payoff screen.
5. The visual identity from the earlier AOHCAP concept still informs the palette and typography, but the product framing is now travel-planning oriented.

## Future Updates

If the frontend changes, this document should be updated alongside:

1. Slide count or slide order changes.
2. Navigation model changes.
3. Palette and typography changes.
4. Chat planner capability changes.
5. Major animation or interaction changes.