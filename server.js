/**
 * OXYCORP — Node.js Express Backend
 * Handles: LLM proxy, API routing, session management,
 *          and communication with Python ML FastAPI service.
 *
 * Run:  node server.js
 * Deps: npm install express cors dotenv node-fetch
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;
const ML_SERVICE_URL = process.env.ML_URL || 'http://localhost:8000';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

// ────────────────────────────────────────────
// HEALTH CHECK
// ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OXYCORP Node.js Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: { llm: 'Anthropic API', ml: ML_SERVICE_URL }
  });
});

// ────────────────────────────────────────────
// LLM CHAT PROXY (Anthropic Claude)
// ────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const SYSTEM = system || `You are OXYCORP AI, an expert music career advisor.
You have deep knowledge of music industry business models, streaming platforms,
music marketing, sync licensing, tour management, record deals, music publishing,
social media strategy, artist development, and music entrepreneurship.
Give specific, actionable advice with industry data when relevant.
Keep responses concise (3–5 paragraphs). End with 1–2 follow-up questions.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM,
        messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'LLM service error', detail: err });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || '';
    res.json({ reply, usage: data.usage });

  } catch (err) {
    console.error('Chat proxy error:', err.message);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// ────────────────────────────────────────────
// ML PROXY — Career Score (Python FastAPI)
// ────────────────────────────────────────────
app.post('/ml/predict', async (req, res) => {
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await mlRes.json();
    res.json(data);
  } catch (err) {
    console.error('ML proxy error:', err.message);
    // Return a fallback ML response for demo
    const { spotify_listeners = 0, monthly_streams = 0, instagram_followers = 0, engagement_rate = 3 } = req.body;
    const score = Math.min(98, Math.max(10, Math.round(
      (spotify_listeners / 10000) * 25 +
      (monthly_streams / 50000) * 25 +
      (instagram_followers / 10000) * 20 +
      engagement_rate * 6
    )));
    res.json({
      career_score: score,
      reach_score: Math.round(score * 0.9 + Math.random() * 10),
      engagement_score: Math.round(engagement_rate * 10),
      revenue_score: Math.round(score * 0.7),
      growth_trajectory: (score * 0.3 + 5).toFixed(1) + '%',
      model: 'fallback-v1',
      warning: 'ML service unavailable — using fallback model'
    });
  }
});

// ────────────────────────────────────────────
// ML PROXY — Skill Analysis (Python)
// ────────────────────────────────────────────
app.post('/ml/skill-analysis', async (req, res) => {
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/skill-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await mlRes.json();
    res.json(data);
  } catch (err) {
    const { answers = [] } = req.body;
    const scores = {
      musical_ability: Math.round(((answers[0] || 1) + (answers[1] || 1)) / 6 * 100),
      production: Math.round(((answers[2] || 1) + (answers[3] || 1)) / 6 * 100),
      business: Math.round(((answers[4] || 1) + (answers[5] || 1)) / 6 * 100),
      marketing: Math.round(((answers[6] || 1) + (answers[7] || 1)) / 6 * 100),
      live_performance: Math.round(((answers[8] || 1) + (answers[9] || 1)) / 6 * 100),
      networking: Math.round(((answers[10] || 1) + (answers[11] || 1)) / 6 * 100),
    };
    res.json({ scores, model: 'fallback-v1' });
  }
});

// ────────────────────────────────────────────
// ML PROXY — Market Trends (Python)
// ────────────────────────────────────────────
app.get('/ml/market-trends', async (req, res) => {
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/market-trends`);
    const data = await mlRes.json();
    res.json(data);
  } catch {
    res.json({
      genres: [
        { name:'Hip-Hop/Rap', market_share:24.1, growth:2.1 },
        { name:'Pop', market_share:21.8, growth:-0.5 },
        { name:'R&B', market_share:14.7, growth:1.2 },
        { name:'Afrobeats', market_share:11.3, growth:18.4 },
        { name:'Electronic', market_share:9.2, growth:3.7 },
      ],
      top_trend: 'Afrobeats × Electronic fusion',
      trend_growth: '+340% YoY on TikTok',
      sync_opportunities: 47,
      timestamp: new Date().toISOString()
    });
  }
});

// ────────────────────────────────────────────
// LLM ROADMAP GENERATOR
// ────────────────────────────────────────────
app.post('/api/generate-roadmap', async (req, res) => {
  const { genre, goal, career_stage, career_score } = req.body;
  const prompt = `Generate a concise 24-month music career roadmap for an artist with these details:
- Genre: ${genre}
- Career Goal: ${goal}
- Career Stage: ${career_stage}
- Current Career Score: ${career_score}/100

Format as 3 phases (Foundation, Growth, Breakthrough), each with:
1. 3 key milestones with specific KPIs
2. 5 action items
3. A realistic revenue target

Be specific, data-driven, and actionable.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    res.json({ roadmap: data.content?.[0]?.text || '' });
  } catch (err) {
    res.status(500).json({ error: 'Roadmap generation failed', detail: err.message });
  }
});

// ────────────────────────────────────────────
// SERVE PAGES
// ────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/advisor', (req, res) => res.sendFile(path.join(__dirname, 'advisor.html')));
app.get('/analysis', (req, res) => res.sendFile(path.join(__dirname, 'career-analysis.html')));
app.get('/skills', (req, res) => res.sendFile(path.join(__dirname, 'skill-assessment.html')));
app.get('/market', (req, res) => res.sendFile(path.join(__dirname, 'market-intelligence.html')));
app.get('/roadmap', (req, res) => res.sendFile(path.join(__dirname, 'roadmap.html')));

// ────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎵 SOUNDPATH Server running on http://localhost:${PORT}`);
  console.log(`   LLM: Anthropic API  |  ML: ${ML_SERVICE_URL}`);
  console.log(`   API key: ${ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing — add to .env'}\n`);
});

module.exports = app;
