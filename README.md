# Stateless Search Proxy (Cloudflare Worker)

A lightweight Edge proxy designed to sanitize search requests, strip tracking metadata, and cache autocomplete suggestions for sub-second performance globally.[**Live Implementation ⚡️**](https://logotam.com/omnisearch/)

## Why this exists
When building[Logotam OmniSearch](https://logotam.com/omnisearch/), I realized that hitting provider APIs (Google, Bing, DuckDuckGo) directly from the client leaks IP addresses, user agents, and localized metadata. 

This Cloudflare Worker acts as a privacy shield and an accelerator.

## How it works
1. **Metadata Sanitization:** Strips out persistent tracking identifiers before routing the query to the upstream provider.
2. **Edge Caching:** Leverages the Cache API (`caches.default`) with a 300s TTL. If a user in London searches for "React", the first query takes ~150ms. The next user in London gets the cached response in ~15ms.
3. **Smart Fallback:** If the primary engine fails or times out, it gracefully falls back to a privacy-first alternative.

## Seeking Feedback
I'm a solo developer trying to squeeze maximum performance out of the Cloudflare free tier (50ms CPU limit). 
- Is there a more efficient way to structure the Cache API keys for highly fragmented regional queries?
- Any advice on handling upstream rate-limiting when the proxy scales?

---
Built in Kyiv, Ukraine 🇺🇦. Code is MIT Licensed.
