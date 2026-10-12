# StudyPoint — UI/UX & Design System Guidelines

This document provides foundational design guidelines, layout principles, component specifications, and color palettes for building the **StudyPoint** frontend interfaces.

## 1. Core Visual Philosophy

* **Friendly & Approachable:** Avoid cold, sterile corporate aesthetics. Interfaces should feel warm, encouraging, and human.

* **Low Friction & High Focus:** Study sessions require deep concentration. Minimize visual clutter around primary study workflows (flashcards, quizzes, notes).

* **Co-Creation & Recognition:** Highlight community contributions, usernames, and shoutouts prominently across the UI.

## 2. Typography System

* **Primary Font (UI & Body):** `Inter`, `Plus Jakarta Sans`, or native system sans-serif.

* **Display Font (Headings/Banners):** `Outfit` or `Cabinet Grotesk` for a modern, friendly character.

* **Monospace (Code/Math/Cards):** `JetBrains Mono` or `Fira Code`.

### Scale Checklist

* **Hero / Display:** 2.5rem – 3.5rem (36px – 56px) | Bold

* **H1 / Page Titles:** 1.875rem – 2.25rem (30px – 36px) | SemiBold

* **H2 / Section Headers:** 1.5rem (24px) | SemiBold

* **H3 / Card Titles:** 1.25rem (20px) | Medium

* **Body / Default:** 1rem (16px) | Regular

* **Small / Captions & Credits:** 0.875rem (14px) | Medium / Light

## 3. UI Component Specifications

### A. Co-Creator Banner / Shoutout Cards

Used on the homepage and update modals to credit users for feature ideas:

* **Border:** Subtle accent glow or dashed border to feel like a "craft/handbuilt" element.

* **Avatar / Badge:** Highlight user handles (e.g., `@Malika_S`) with a distinct pill badge (`#EEF2FF` light bg with dynamic text color).

* **Copy Structure:** `[Icon] "Feature Name" — Suggested & co-created with @User`.

### B. Active Recall & Flashcard Interface

* **Aspect Ratio:** 3:2 or standard mobile ratio (4:3) with soft rounded corners (`rounded-2xl` or `16px`).

* **Flip Animation:** Smooth 3D perspective flip (`transform-style: preserve-3d`, duration \~300ms).

* **Response Controls:** Clear, large touch targets for self-assessment:

  * 🔴 *Again / Hard*

  * 🟡 *Good*

  * 🟢 *Easy / Mastered*

### C. Community Feedback & Vote Cards

* **Upvote Button:** Vertical stacked counter + arrow key.

* **Status Badges:**

  * `Under Review` (Amber/Yellow)

  * `In Progress` (Blue/Indigo)

  * `Shipped / Live` (Emerald/Green)

## 4. Curated Color Palettes (10 Combinations)

Here are 10 distinct, production-ready color schemes designed for educational and community platforms.

### Palette 1: Warm Campus (Default Theme)

*Best for: A cozy, encouraging "study lounge" atmosphere.*

* **Primary (Brand):** `#4F46E5` (Indigo 600)

* **Secondary:** `#F97316` (Warm Orange)

* **Background Light:** `#FAFAFA` / `#FFFFFF`

* **Card/Surface Light:** `#F3F4F6`

* **Text Main:** `#111827` (Charcoal)

* **Accent / Badge:** `#FEF3C7` (Soft Amber)

### Palette 2: Midnight Focus (Dark Mode)

*Best for: Late-night exam cramming with minimal eye strain.*

* **Primary:** `#6366F1` (Bright Indigo)

* **Background Dark:** `#0F172A` (Slate 900)

* **Surface Dark:** `#1E293B` (Slate 800)

* **Border Dark:** `#334155`

* **Text Main:** `#F8FAFC`

* **Accent Glow:** `#38BDF8` (Sky Blue)

### Palette 3: Emerald Growth

*Best for: Gamified progress tracking, streak rewards, and positive reinforcement.*

* **Primary:** `#059669` (Emerald 600)

* **Secondary:** `#10B981` (Mint)

* **Background:** `#F0FDF4`

* **Surface:** `#FFFFFF`

* **Text Main:** `#064E3B`

* **Accent:** `#FEF08A` (Soft Yellow)

### Palette 4: Soft Pastel Lounge

*Best for: Calming visual aesthetic to lower study anxiety.*

* **Primary:** `#7C3AED` (Soft Purple)

* **Secondary:** `#EC4899` (Rose Pink)

* **Background:** `#FAF5FF`

* **Surface:** `#FFFFFF`

* **Text Main:** `#2E1065`

* **Accent:** `#E0E7FF`

### Palette 5: Academic Navy

*Best for: A slightly more formal look that teachers and schools respond well to.*

* **Primary:** `#1E3A8A` (Deep Navy)

* **Secondary:** `#2563EB` (Royal Blue)

* **Background:** `#F8FAFC`

* **Surface:** `#FFFFFF`

* **Text Main:** `#0F172A`

* **Accent:** `#F59E0B` (Amber Gold)

### Palette 6: Sunset Productivity

*Best for: High energy, pomodoro focus timers, and active quizzes.*

* **Primary:** `#EA580C` (Warm Rust/Orange)

* **Secondary:** `#D97706` (Amber)

* **Background:** `#FFFBEB`

* **Surface:** `#FFFFFF`

* **Text Main:** `#451A03`

* **Accent:** `#FED7AA`

### Palette 7: Ocean Calm

*Best for: Clean, distraction-free reading and heavy text consumption.*

* **Primary:** `#0284C7` (Sky Teal)

* **Secondary:** `#0D9488` (Teal)

* **Background:** `#F0F9FF`

* **Surface:** `#FFFFFF`

* **Text Main:** `#0C4A6E`

* **Accent:** `#BAE6FD`

### Palette 8: Cyber Student (Vibrant Modern)

*Best for: Engaging Gen-Z students with high-contrast UI elements.*

* **Primary:** `#8B5CF6` (Electric Violet)

* **Secondary:** `#06B6D4` (Cyan)

* **Background:** `#18181B` (Zinc 900)

* **Surface:** `#27272A` (Zinc 800)

* **Text Main:** `#FAFAFA`

* **Accent:** `#F43F5E` (Neon Rose)

### Palette 9: Paper & Ink (Minimalist Editorial)

*Best for: High readability notes, Markdown view, and article summaries.*

* **Primary:** `#18181B` (Near Black)

* **Secondary:** `#71717A` (Muted Zinc)

* **Background:** `#FAF9F6` (Warm Off-White/Paper)

* **Surface:** `#FFFFFF`

* **Text Main:** `#09090B`

* **Accent:** `#E4E4E7`

### Palette 10: Mint & Coral

*Best for: Friendly, balanced, modern SaaS aesthetic.*

* **Primary:** `#0D9488` (Deep Mint)

* **Secondary:** `#F43F5E` (Warm Coral)

* **Background:** `#F0FDFA`

* **Surface:** `#FFFFFF`

* **Text Main:** `#134E4A`

* **Accent:** `#FFE4E6`

## 5. Layout Grid & Spacing Rules

* **Container Max-Widths:**

  * Dashboard / App Views: `max-w-7xl` (1280px)

  * Study / Flashcard Mode: `max-w-3xl` or `max-w-4xl` (Focus mode)

  * Modals / Dialogs: `max-w-lg` (512px)

* **Border Radius Standards:**

  * Buttons & Inputs: `rounded-xl` (12px)

  * Cards & Containers: `rounded-2xl` (16px)

  * Modals & Floating Panels: `rounded-3xl` (24px)