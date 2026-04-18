/**
 * Logotam OmniSearch - Stateless Proxy Node
 * 
 * This Cloudflare Worker acts as a privacy shield, sanitizing metadata 
 * and caching autocomplete suggestions at the edge.
 * 
 * Part of the Logotam Ecosystem: https://logotam.com
 */
export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get("Origin") || "";
        const isAllowedOrigin = origin === "https://logotam.com" || origin.endsWith(".logotam.com");
        const allowedOrigin = isAllowedOrigin ? origin : "https://logotam.com";

        const corsHeaders = {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "X-Robots-Tag": "noindex, nofollow",
            "Vary": "Origin"
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const query = url.searchParams.get("q")?.trim();
        const isOpenSearch = url.searchParams.get("os") === "1";
        let engine = url.searchParams.get("engine") || "google";

        if (!query) {
            return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        if (["chatgpt", "claude", "perplexity"].includes(engine)) {
            engine = "google";
        }

        const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Real-IP") || "1.1.1.1";
        const country = (request.cf && request.cf.country) ? request.cf.country : "US";
        const acceptLang = request.headers.get("Accept-Language") || "en-US";
        const lang = acceptLang.split(',')[0].split('-')[0] || "en";
        const userAgent = request.headers.get("User-Agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        const cacheUrl = new URL(request.url);
        cacheUrl.searchParams.set("loc", `${country}-${lang}-v8`);
        cacheUrl.searchParams.set("routed_engine", engine);
        const cacheKey = new Request(cacheUrl.toString(), request);
        const cache = caches.default;

        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) return cachedResponse;

        const fetchSuggestions = async (targetEngine, currentQuery) => {
            let api = "";
            const encodedQ = encodeURIComponent(currentQuery);

            if (targetEngine === "duckduckgo") {
                api = `https://duckduckgo.com/ac/?q=${encodedQ}&kl=${country.toLowerCase()}-${lang.toLowerCase()}`;
            } else if (targetEngine === "bing") {
                api = `https://api.bing.com/osjson.aspx?query=${encodedQ}&market=${lang}-${country}`;
            } else if (targetEngine === "amazon") {
                api = `https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=aps&prefix=${encodedQ}`;
            } else if (targetEngine === "reddit") {
                api = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(currentQuery + " reddit")}&gl=${country}&hl=${lang}`;
            } else if (targetEngine === "youtube") {
                api = `https://suggestqueries.google.com/complete/search?client=chrome&ds=yt&q=${encodedQ}&gl=${country}&hl=${lang}`;
            } else {
                api = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodedQ}&gl=${country}&hl=${lang}`;
            }

            const res = await fetch(api, {
                headers: {
                    "User-Agent": userAgent,
                    "Accept": "*/*",
                    "Accept-Language": acceptLang,
                    "X-Forwarded-For": clientIP,
                    "X-Client-IP": clientIP
                }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();

            let suggestions = [];
            try {
                const json = JSON.parse(text);
                if (targetEngine === "duckduckgo") {
                    suggestions = json.map(i => i.phrase);
                } else if (targetEngine === "amazon") {
                    suggestions = json.suggestions?.map(i => i.value) || [];
                } else if (Array.isArray(json) && json[1]) {
                    suggestions = json[1].map(item => Array.isArray(item) ? item[0] : item);

                    if (targetEngine === "reddit") {
                        suggestions = suggestions.map(s => s.toLowerCase().replace(" reddit", "").trim());
                    }
                }
            } catch (e) { }
            return suggestions.map(String);
        };

        try {
            let suggestions = await fetchSuggestions(engine, query);

            // Глобальний Fallback
            if (suggestions.length === 0) {
                suggestions = await fetchSuggestions("duckduckgo", query);
            }

            const result = suggestions.slice(0, 6);
            const responseData = isOpenSearch ? [query, result] : result;

            const finalRes = new Response(JSON.stringify(responseData), {
                headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "public, max-age=300, s-maxage=300",
                    "X-Omni-Source": engine,
                    ...corsHeaders
                }
            });

            if (suggestions.length > 0) {
                ctx.waitUntil(cache.put(cacheKey, finalRes.clone()));
            }

            return finalRes;

        } catch (e) {
            return new Response(JSON.stringify([]), {
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders }
            });
        }
    }
};
