# Logotam OmniSearch Core

A lightweight, zero-framework logic core for building a high-performance, stateless search aggregator.

[**Live Implementation ⚡️**](https://logotam.com/omnisearch/)

## The Challenge
Modern search interfaces are often bloated, shipping megabytes of JavaScript and multiple tracking scripts just to handle a text input. Additionally, mobile browsers (especially iOS Safari) struggle with viewport stability when the virtual keyboard is active.

## Architecture & Solutions

This repository extracts the core logic used in Logotam OmniSearch to achieve a **98-100 Desktop / 95+ Mobile Lighthouse score** with a **sub-second LCP** (0.8s).

### 1. Metadata Sanitization Node (`worker.js`)
A Cloudflare Worker that acts as a real-time sanitization proxy.
- **Stateless Routing:** Proxies autocomplete requests to 9+ global providers (Google, Bing, DuckDuckGo, Amazon, etc.).
- **Privacy by Design:** Strips persistent tracking cookies and device identifiers at the edge before hitting upstream APIs.
- **Edge Caching:** Leverages the Cloudflare Cache API for a 300s TTL, ensuring ~15-20ms response times for popular regional queries.

### 2. iOS Viewport Stability Layer (`zen-mode.js`)
- **The Problem:** The notorious "double bounce" and layout shifts in mobile Safari when focusing inputs.
- **The Fix:** A pure Vanilla JS implementation using the `visualViewport` API and `touchstart` interception to reconstruct the UI state *before* the system scroll kicks in.

## Philosophy
- **0 Frameworks.** No React, Vue, or heavy DOM runtimes.
- **0 Tracking.** No databases, no logs, no persistent states.
- **100% Native DOM APIs.**

## Feedback Welcome
I am currently looking for technical feedback on:
1. Improving the Cache API strategy for real-time upstream endpoints.
2. Any bulletproof, native CSS/JS alternatives for handling iOS virtual keyboard layouts without JS event interception.

---
Built in Kyiv, Ukraine 🇺🇦. 
Part of the broader [Logotam Ecosystem](https://logotam.com).
