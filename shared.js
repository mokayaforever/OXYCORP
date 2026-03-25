// shared.js — injects nav, footer, orbs into every page

function getActivePage() {
  const path = window.location.pathname.split('/').pop();
  return path || 'index 1.0.html';
}

function injectNav() {
  const active = getActivePage();
  const pages = [
    { href: 'index 1.0.html',            label: 'Home',      file: 'index.html' },
    { href: 'advisor.html',             label: 'AI Advisor',file: 'advisor.html' },
    { href: 'career-analysis.html',     label: 'Analysis',  file: 'career-analysis.html' },
    { href: 'skill-assessment.html',    label: 'Skills',    file: 'skill-assessment.html' },
    { href: 'market-intelligence.html', label: 'Market',    file: 'market-intelligence.html' },
    { href: 'roadmap.html',             label: 'Roadmap',   file: 'roadmap.html' },
  ];

  const linksHtml = pages.map(p => `
    <li><a href="${p.href}" class="${active === p.file ? 'active' : ''}">${p.label}</a></li>
  `).join('');

  const nav = document.createElement('nav');
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="../index.html" class="logo">SOUND<span>PATH</span></a>
      <ul class="nav-links">${linksHtml}</ul>
      <a href="advisor.html" class="nav-badge">Start Free</a>
    </div>
  `;
  document.body.prepend(nav);
}

function injectOrbs() {
  const orbs = document.createElement('div');
  orbs.innerHTML = `
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  `;
  document.body.prepend(orbs);
}

function injectFooter() {
  const footer = document.createElement('footer');
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="../index.html" class="logo">OXY<span>CORP</span></a>
          <p class="footer-desc">Empowering musicians to build sustainable, fulfilling careers through expert guidance and community.</p>
        </div>
        <div class="footer-col">
          <h4>Platform</h4>
          <ul>
            <li><a href="advisor.html">AI Advisor</a></li>
            <li><a href="career-analysis.html">Career Analysis</a></li>
            <li><a href="skill-assessment.html">Skill Assessment</a></li>
            <li><a href="market-intelligence.html">Market Intel</a></li>
            <li><a href="roadmap.html">Roadmap</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Resources</h4>
          <ul>
            <li><a href="#">Documentation</a></li>
            <li><a href="#">API Reference</a></li>
            <li><a href="#">Case Studies</a></li>
            <li><a href="#">Blog</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About</a></li>
            <li><a href="#">Privacy</a></li>
            <li><a href="#">Terms</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 OXYCORP</p>
        
      </div>
    </div>
  `;
  document.body.appendChild(footer);
}

// LLM API helper (calls backend /api/chat which proxies to LLM)
async function askLLM(messages, systemPrompt) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system: systemPrompt })
  });
  if (!res.ok) throw new Error('API error');
  const data = await res.json();
  return data.reply;
}

// ML scoring helper (calls Python FastAPI backend)
async function mlScore(payload, endpoint = '/ml/predict') {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('ML API error');
  return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
  injectOrbs();
  injectNav();
  injectFooter();
});
