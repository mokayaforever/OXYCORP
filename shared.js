// shared.js — injects nav, footer, orbs into every page

function getActivePage() {
  const path = window.location.pathname.split('/').pop();
  return path || 'index.html';
}

function injectNav() {
  const active = getActivePage();
  const pages = [
    { href: 'index.html',               label: 'Home',       file: 'index.html' },
    { href: 'advisor.html',             label: 'AI Advisor', file: 'advisor.html' },
    { href: 'opportunities.html',       label: 'Jobs',       file: 'opportunities.html' },
    { href: 'community.html',           label: 'Community',  file: 'community.html' },
    { href: 'market-intelligence.html', label: 'Market',     file: 'market-intelligence.html' },
    { href: 'coaches.html',             label: 'Coaches',    file: 'coaches.html' },
    { href: 'guidance.html',            label: 'Guidance',   file: 'guidance.html' },
    { href: 'career-analysis.html',     label: 'Analysis',   file: 'career-analysis.html' },
  ];

  const linksHtml = pages.map(p => `
    <li><a href="${p.href}" class="${active === p.file ? 'active' : ''}">${p.label}</a></li>
  `).join('');

  const nav = document.createElement('nav');
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="logo">OXY<span>CORP</span></a>
      <ul class="nav-links">${linksHtml}</ul>
      <a href="advisor.html" class="nav-badge">Start Free</a>
    </div>
  `;
  document.body.prepend(nav);

  // Mobile bottom tab bar
  injectMobileTabBar(active);
}

function injectMobileTabBar(active) {
  const tabs = [
    { href: 'index.html',               icon: '🏠', label: 'Home',    file: 'index.html' },
    { href: 'advisor.html',             icon: '🤖', label: 'Advisor', file: 'advisor.html' },
    { href: 'opportunities.html',       icon: '💼', label: 'Jobs',    file: 'opportunities.html' },
    { href: 'community.html',           icon: '🤝', label: 'Network', file: 'community.html' },
    { href: 'guidance.html',            icon: '🧭', label: 'Guidance',file: 'guidance.html' },
  ];

  const bar = document.createElement('div');
  bar.className = 'mobile-tab-bar';
  bar.innerHTML = tabs.map(t => `
    <a href="${t.href}" class="mobile-tab ${active === t.file ? 'mobile-tab--active' : ''}">
      <span class="mobile-tab__icon">${t.icon}</span>
      <span class="mobile-tab__label">${t.label}</span>
    </a>
  `).join('');
  document.body.appendChild(bar);
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
          <a href="index.html" class="logo">OXY<span>CORP</span></a>
          <p class="footer-desc">Empowering musicians to build sustainable, fulfilling careers through expert guidance, real employment, and community.</p>
          <div class="footer-social" style="display:flex;gap:0.8rem;margin-top:1.2rem;">
            <a href="#" style="color:#b3b3b3;text-decoration:none;font-size:1.1rem;transition:color 0.2s;" title="Instagram">📷</a>
            <a href="#" style="color:#b3b3b3;text-decoration:none;font-size:1.1rem;transition:color 0.2s;" title="YouTube">▶️</a>
            <a href="#" style="color:#b3b3b3;text-decoration:none;font-size:1.1rem;transition:color 0.2s;" title="TikTok">🎵</a>
            <a href="#" style="color:#b3b3b3;text-decoration:none;font-size:1.1rem;transition:color 0.2s;" title="Twitter">𝕏</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Platform</h4>
          <ul>
            <li><a href="advisor.html">AI Advisor</a></li>
            <li><a href="opportunities.html">Job Opportunities</a></li>
            <li><a href="community.html">Artist Community</a></li>
            <li><a href="market-intelligence.html">Market Intelligence</a></li>
            <li><a href="coaches.html">Meet Coaches</a></li>
            <li><a href="guidance.html">Career Guidance</a></li>
            <li><a href="career-analysis.html">Career Analysis</a></li>
            <li><a href="roadmap.html">Roadmap</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Employment</h4>
          <ul>
            <li><a href="opportunities.html">Browse Gigs</a></li>
            <li><a href="opportunities.html">Sync Placements</a></li>
            <li><a href="opportunities.html">Session Work</a></li>
            <li><a href="opportunities.html">Teaching Jobs</a></li>
            <li><a href="community.html">Find Collaborators</a></li>
            <li><a href="submit-music.html">Submit Music</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="#">About OXYCORP</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Contact Us</a></li>
            <li><a href="subscription.html">Pricing</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 OXYCORP — AI-Powered Music Career Intelligence</p>
        <div class="tech-pills">
          <span class="tech-pill">AI Advisor</span>
          <span class="tech-pill">ML Analytics</span>
          <span class="tech-pill">M-Pesa</span>
          <span class="tech-pill">PWA</span>
        </div>
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
  injectPWAMeta();
  injectOrbs();
  injectNav();
  injectFooter();
  registerServiceWorker();
  setupInstallBanner();
  setupLazyImages();
  showOfflineBanner();
  checkSubscriptionStatus();
});

// ── Subscription Check ──────────────────────────────────────────────────────
const FREE_PAGES = ['index.html', '', 'subscription.html'];

async function checkSubscriptionStatus() {
  const page = window.location.pathname.split('/').pop() || '';
  if (FREE_PAGES.includes(page)) return;

  try {
    const res = await fetch('/api/subscription/status');
    const data = await res.json();

    if (!data.authenticated) return; // not logged in, let page handle it

    if (data.has_access) {
      // Trial active — show countdown banner
      if (data.trial_active && !data.subscription?.active && data.trial_days_remaining <= 7) {
        injectTrialBanner(data.trial_days_remaining);
      }
    } else {
      // Trial expired, no subscription — show paywall
      injectPaywall();
    }
  } catch (e) {
    // Network error — allow access (graceful degradation)
    console.warn('[Subscription] Check failed:', e.message);
  }
}

function injectTrialBanner(daysLeft) {
  if (document.getElementById('trial-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'trial-banner';
  banner.className = 'trial-banner';
  banner.innerHTML = `
    <div class="trial-banner__text">
      ⏳ Free trial:
      <span class="trial-banner__days">🕐 ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left</span>
    </div>
    <a href="subscription.html" class="trial-banner__cta">Upgrade Now →</a>
    <button class="trial-banner__close" onclick="this.parentElement.remove();document.body.classList.remove('has-trial-banner');" aria-label="Close">✕</button>
  `;
  document.body.prepend(banner);
  document.body.classList.add('has-trial-banner');
}

function injectPaywall() {
  if (document.getElementById('paywall-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'paywall-overlay';
  overlay.className = 'paywall-overlay';
  overlay.innerHTML = `
    <div class="paywall-modal">
      <div class="paywall-header">
        <div class="paywall-header__icon">♪</div>
        <h2>Your Free Trial Has Ended</h2>
        <p>Subscribe to continue using OXYCORP's AI-powered music career tools.</p>
      </div>
      <div class="paywall-body">
        <div class="pricing-grid" id="paywall-pricing">
          ${buildPricingCard('starter', 'Starter', 999, ['AI Advisor (10 chats/day)', 'Career Analysis', 'Skill Assessment', 'Basic Market Data'])}
          ${buildPricingCard('pro', 'Pro', 2499, ['Unlimited AI Advisor', 'Career Analysis & Skills', 'Full Market Intelligence', 'Career Roadmap Generator', 'Coach Booking', 'Submit Music'], true)}
          ${buildPricingCard('elite', 'Elite', 4999, ['Everything in Pro', 'Priority Coach Matching', 'Export Reports', 'Direct Coach Messaging', 'Early Feature Access', 'Dedicated Support'])}
        </div>
      </div>
      <div class="paywall-footer">
        <div class="paywall-phone-row">
          <input type="tel" id="paywall-phone" placeholder="M-Pesa phone (07XXXXXXXX)" />
          <button class="btn btn-primary" id="paywall-subscribe-btn" onclick="handlePaywallSubscribe()">Subscribe via M-Pesa</button>
        </div>
        <div id="paywall-msg" style="font-size:0.82rem;margin-top:0.5rem;min-height:1.2em;"></div>
        <p class="paywall-note">Secure payment via Safaricom M-Pesa · Cancel anytime · <a href="index.html" style="color:var(--green);text-decoration:underline;">Back to Home</a></p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Pre-select Pro
  selectPaywallPlan('pro');
}

let selectedPaywallPlan = 'pro';

function buildPricingCard(key, name, price, features, featured = false) {
  return `
    <div class="pricing-card ${featured ? 'pricing-card--featured' : ''} ${key === 'pro' ? 'pricing-card--selected' : ''}"
         id="plan-${key}" onclick="selectPaywallPlan('${key}')">
      ${featured ? '<div class="plan-badge">Most Popular</div>' : ''}
      <div class="pricing-card__name">${name}</div>
      <div class="pricing-card__price">KES ${price.toLocaleString()} <small>/mo</small></div>
      <div class="pricing-card__period">Billed monthly</div>
      <ul class="pricing-card__features">
        ${features.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
  `;
}

function selectPaywallPlan(plan) {
  selectedPaywallPlan = plan;
  document.querySelectorAll('.pricing-card').forEach(card => {
    card.classList.toggle('pricing-card--selected', card.id === `plan-${plan}`);
  });
}

async function handlePaywallSubscribe() {
  const phone = document.getElementById('paywall-phone')?.value?.trim();
  const msgEl = document.getElementById('paywall-msg');
  const btn = document.getElementById('paywall-subscribe-btn');

  if (!phone) {
    if (msgEl) { msgEl.style.color = '#ef4444'; msgEl.textContent = 'Please enter your M-Pesa phone number.'; }
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Processing...';
  if (msgEl) { msgEl.style.color = 'var(--green)'; msgEl.textContent = 'Sending M-Pesa prompt...'; }

  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPaywallPlan, phone }),
    });
    const data = await res.json();

    if (data.success) {
      if (msgEl) { msgEl.style.color = '#16a34a'; msgEl.textContent = '✅ ' + data.message; }
      if (data.demo || data.subscription?.active) {
        // Demo mode — instant activation, reload after 2s
        setTimeout(() => window.location.reload(), 2000);
      } else if (data.CheckoutRequestID) {
        // Real M-Pesa — poll for payment confirmation
        pollMpesaStatus(data.CheckoutRequestID, msgEl, btn);
      }
    } else {
      if (msgEl) { msgEl.style.color = '#ef4444'; msgEl.textContent = data.message || 'Subscription failed.'; }
      btn.disabled = false;
      btn.textContent = 'Subscribe via M-Pesa';
    }
  } catch (e) {
    if (msgEl) { msgEl.style.color = '#ef4444'; msgEl.textContent = 'Network error. Please try again.'; }
    btn.disabled = false;
    btn.textContent = 'Subscribe via M-Pesa';
  }
}

async function pollMpesaStatus(checkoutId, msgEl, btn) {
  let attempts = 0;
  const maxAttempts = 30;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`/api/mpesa/status/${checkoutId}`);
      const data = await res.json();

      if (data.status === 'success') {
        clearInterval(interval);
        if (msgEl) { msgEl.style.color = '#16a34a'; msgEl.textContent = '✅ Payment confirmed! Activating your plan...'; }
        setTimeout(() => window.location.reload(), 1500);
      } else if (data.status === 'failed') {
        clearInterval(interval);
        if (msgEl) { msgEl.style.color = '#ef4444'; msgEl.textContent = '❌ Payment failed: ' + (data.message || 'Try again.'); }
        btn.disabled = false;
        btn.textContent = 'Subscribe via M-Pesa';
      }
    } catch (e) { /* keep polling */ }

    if (attempts >= maxAttempts) {
      clearInterval(interval);
      if (msgEl) { msgEl.style.color = '#f59e0b'; msgEl.textContent = 'Payment timeout. Check your M-Pesa and refresh the page.'; }
      btn.disabled = false;
      btn.textContent = 'Subscribe via M-Pesa';
    }
  }, 3000);
}

// ── Network Quality ──────────────────────────────────────────────────────────
function is3G() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return false;
  return conn.effectiveType === '2g' || conn.effectiveType === '3g' || conn.saveData;
}

// ── Lazy Image Loading with low-res placeholder on slow connections ──────────
function setupLazyImages() {
  // Add loading="lazy" to all images missing it
  document.querySelectorAll('img:not([loading])').forEach(img => {
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });

  // On 3G: replace high-res src with data-src, show placeholder until in-view
  if (is3G()) {
    document.querySelectorAll('img[src]:not([data-lazy-done])').forEach(img => {
      const src = img.getAttribute('src');
      if (!src || src.startsWith('data:')) return;
      img.setAttribute('data-src', src);
      img.setAttribute('src', 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3C/svg%3E');
      img.style.background = 'var(--surface2, #1e1e2e)';
      img.setAttribute('data-lazy-done', '1');
    });

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.getAttribute('data-src');
        if (src) img.src = src;
        obs.unobserve(img);
      });
    }, { rootMargin: '200px' });

    document.querySelectorAll('img[data-src]').forEach(img => io.observe(img));
  }
}

// ── Offline Banner ───────────────────────────────────────────────────────────
function showOfflineBanner() {
  if (navigator.onLine) return;
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;padding:0.6rem 1rem;background:#1e293b;border-bottom:1px solid rgba(200,168,75,0.3);text-align:center;font-size:0.78rem;color:rgba(255,255,255,0.8);font-family:Inter,sans-serif;';
  banner.innerHTML = '📡 You\'re offline — showing cached content. <a href="offline.html" style="color:#c8a84b;text-decoration:underline;">View available pages</a>';
  document.body.prepend(banner);

  window.addEventListener('online', () => banner.remove(), { once: true });
}

// ── PWA Meta Tags ──
function injectPWAMeta() {
  const head = document.head;
  const metas = [
    { name: 'link', attrs: { rel: 'manifest', href: '/manifest.json' } },
    { name: 'meta', attrs: { name: 'theme-color', content: '#191414' } },
    { name: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' } },
    { name: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' } },
    { name: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'OXYCORP' } },
    { name: 'link', attrs: { rel: 'apple-touch-icon', href: '/icon-512.png' } },
    { name: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' } },
  ];
  metas.forEach(m => {
    const el = document.createElement(m.name);
    Object.entries(m.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    head.appendChild(el);
  });
}

// ── Service Worker ──
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] SW registration failed:', err));
  }
}

// ── Install Banner ──
let deferredPrompt = null;
function setupInstallBanner() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });
}

function showInstallBanner() {
  if (document.getElementById('pwa-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-banner';
  banner.innerHTML = `
    <div style="position:fixed;bottom:0;left:0;right:0;z-index:9999;padding:1rem 1.2rem;background:linear-gradient(135deg,#191414,#1a1a2e);border-top:1px solid rgba(200,168,75,0.3);display:flex;align-items:center;gap:1rem;font-family:Inter,sans-serif;">
      <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,#c8a84b,#e5c878);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">♪</div>
      <div style="flex:1;min-width:0;">
        <div style="color:#fff;font-size:0.88rem;font-weight:600;">Install OXYCORP</div>
        <div style="color:rgba(255,255,255,0.6);font-size:0.72rem;">Add to home screen for the full app experience</div>
      </div>
      <button onclick="installPWA()" style="background:linear-gradient(135deg,#c8a84b,#e5c878);color:#191414;border:none;padding:0.5rem 1.2rem;border-radius:50px;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;">Install</button>
      <button onclick="dismissBanner()" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.1rem;cursor:pointer;padding:0.3rem;">✕</button>
    </div>
  `;
  document.body.appendChild(banner);
}

function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(result => {
    console.log('[PWA] Install:', result.outcome);
    deferredPrompt = null;
    dismissBanner();
  });
}

function dismissBanner() {
  const b = document.getElementById('pwa-banner');
  if (b) b.remove();
}
