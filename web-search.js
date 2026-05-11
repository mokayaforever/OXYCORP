/**
 * OXYCORP AI — Web Search & Knowledge Extraction Module
 * Searches the internet for music industry information using free APIs.
 * Sources: DuckDuckGo, Wikipedia, Music RSS feeds, MusicBrainz
 */

const SEARCH_CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

// ── Music-only search filter ──
const MUSIC_DOMAINS = [
  'billboard.com', 'musicbusinessworldwide.com', 'hypebot.com',
  'rollingstone.com', 'pitchfork.com', 'nme.com', 'djmag.com',
  'complex.com', 'genius.com', 'stereogum.com', 'consequence.net',
  'musicradar.com', 'soundonsound.com', 'mixmag.net',
  'wikipedia.org', 'musicindustryblog.wordpress.com',
  'aristake.com', 'dittomusic.com', 'landr.com', 'splice.com',
  'tunecore.com', 'cdbaby.com', 'distrokid.com', 'ari.com',
  'musicgateway.com', 'symphonic.com', 'bfrnd.com',
];

function getCached(key) {
  const entry = SEARCH_CACHE.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  SEARCH_CACHE.set(key, { data, time: Date.now() });
  // Prune old entries
  if (SEARCH_CACHE.size > 100) {
    const oldest = [...SEARCH_CACHE.entries()].sort((a, b) => a[1].time - b[1].time);
    for (let i = 0; i < 20; i++) SEARCH_CACHE.delete(oldest[i][0]);
  }
}

// ── DuckDuckGo Instant Answer API (free, no key) ──
async function searchDuckDuckGo(query) {
  const cacheKey = `ddg:${query}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' music industry')}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();

    const results = [];

    // Abstract (main answer)
    if (data.Abstract) {
      results.push({
        source: data.AbstractSource || 'DuckDuckGo',
        url: data.AbstractURL || '',
        title: data.Heading || query,
        snippet: data.Abstract,
        type: 'abstract'
      });
    }

    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text) {
          results.push({
            source: 'DuckDuckGo',
            url: topic.FirstURL || '',
            title: topic.Text.substring(0, 80),
            snippet: topic.Text,
            type: 'related'
          });
        }
        // Subtopics
        if (topic.Topics) {
          for (const sub of topic.Topics.slice(0, 3)) {
            if (sub.Text) {
              results.push({
                source: 'DuckDuckGo',
                url: sub.FirstURL || '',
                title: sub.Text.substring(0, 80),
                snippet: sub.Text,
                type: 'related'
              });
            }
          }
        }
      }
    }

    // Answer box
    if (data.Answer) {
      results.unshift({
        source: 'DuckDuckGo',
        url: '',
        title: 'Quick Answer',
        snippet: data.Answer,
        type: 'answer'
      });
    }

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('[WebSearch] DuckDuckGo error:', err.message);
    return [];
  }
}

// ── Wikipedia API (free, detailed articles) ──
async function searchWikipedia(query) {
  const cacheKey = `wiki:${query}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Search for pages
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' music')}&srlimit=3&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
    const searchData = await searchRes.json();
    const pages = searchData?.query?.search || [];

    const results = [];
    for (const page of pages.slice(0, 2)) {
      try {
        // Get page summary
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`;
        const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(5000) });
        const summary = await summaryRes.json();

        if (summary.extract) {
          results.push({
            source: 'Wikipedia',
            url: summary.content_urls?.desktop?.page || '',
            title: summary.title || page.title,
            snippet: summary.extract,
            type: 'encyclopedia'
          });
        }
      } catch { /* skip failed page */ }
    }

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('[WebSearch] Wikipedia error:', err.message);
    return [];
  }
}

// ── Music Industry News via RSS feeds ──
async function fetchMusicNews() {
  const cacheKey = 'music-news-rss';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const feeds = [
    { url: 'https://www.billboard.com/feed/', name: 'Billboard' },
    { url: 'https://www.hypebot.com/feed', name: 'Hypebot' },
    { url: 'https://www.musicbusinessworldwide.com/feed/', name: 'Music Business Worldwide' },
  ];

  const results = [];
  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'OXYCORP-MusicBot/1.0' }
      });
      const xml = await res.text();

      // Simple XML parsing for RSS items
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      for (const item of items.slice(0, 5)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const desc = item.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/)?.[1] || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

        if (title) {
          results.push({
            source: feed.name,
            url: link.trim(),
            title: title.replace(/<[^>]+>/g, '').trim(),
            snippet: desc.replace(/<[^>]+>/g, '').trim().substring(0, 300),
            date: pubDate,
            type: 'news'
          });
        }
      }
    } catch (err) {
      console.warn(`[WebSearch] RSS ${feed.name} error:`, err.message);
    }
  }

  setCache(cacheKey, results);
  return results;
}

// ── MusicBrainz Artist Lookup (free, no key) ──
async function lookupArtist(artistName) {
  const cacheKey = `mb:${artistName}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=3`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'OXYCORP-MusicBot/1.0 (contact@oxycorp.com)' }
    });
    const data = await res.json();

    const results = (data.artists || []).slice(0, 2).map(a => ({
      source: 'MusicBrainz',
      title: a.name,
      snippet: `${a.name}${a.disambiguation ? ` (${a.disambiguation})` : ''} — ${a.type || 'Artist'}. ${a.country ? `Country: ${a.country}.` : ''} ${a['life-span']?.begin ? `Active since ${a['life-span'].begin}.` : ''} Genres/Tags: ${(a.tags || []).slice(0, 5).map(t => t.name).join(', ') || 'N/A'}`,
      type: 'artist-data'
    }));

    setCache(cacheKey, results);
    return results;
  } catch (err) {
    console.warn('[WebSearch] MusicBrainz error:', err.message);
    return [];
  }
}

// ── Main Search Orchestrator ──
async function searchMusicWeb(query) {
  console.log(`[WebSearch] Searching for: "${query}"`);

  // Detect if asking about a specific artist
  const artistMatch = query.match(/(?:about|who is|tell me about|how did)\s+(.+?)(?:\s+(?:make|get|become|do|grow|start)|[?.]|$)/i);
  const isArtistQuery = artistMatch && artistMatch[1].length > 2;

  // Run searches in parallel
  const searches = [
    searchDuckDuckGo(query),
    searchWikipedia(query),
  ];

  if (isArtistQuery) {
    searches.push(lookupArtist(artistMatch[1]));
  }

  // Optionally include news for trend/current questions
  if (/trend|news|current|latest|today|2025|2026|new|recent/i.test(query)) {
    searches.push(fetchMusicNews());
  }

  const results = await Promise.allSettled(searches);
  const allResults = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(r => r && r.snippet);

  console.log(`[WebSearch] Found ${allResults.length} results`);
  return allResults;
}

// ── Format search results as context for AI ──
function formatSearchContext(results) {
  if (!results || results.length === 0) return '';

  let context = '\n\n--- LIVE WEB RESEARCH RESULTS ---\n';
  context += 'Use the following real-world information to enrich your answer:\n\n';

  for (const r of results.slice(0, 8)) {
    context += `[${r.source}] ${r.title}\n`;
    context += `${r.snippet.substring(0, 400)}\n`;
    if (r.url) context += `Source: ${r.url}\n`;
    context += '\n';
  }

  context += '--- END WEB RESEARCH ---\n';
  context += 'Incorporate relevant facts from the above research into your response. Cite sources when possible.\n';
  return context;
}

module.exports = { searchMusicWeb, formatSearchContext, fetchMusicNews, searchDuckDuckGo, searchWikipedia, lookupArtist };
