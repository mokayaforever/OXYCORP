// ═══════════════════════════════════════════════ STATE
const state = {
  user: null,
  selectedGenre: null,
  selectedGoal: null,
  currentBookingCoachId: null,
};

// ═══════════════════════════════════════════════ INIT
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  loadCoaches();
  initNav();
  initJourneyTabs();
  initRecommendation();
  setMinBookingDate();
});

// ═══════════════════════════════════════════════ NAV
function initNav() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('nav');
    nav.classList.toggle('scrolled', window.scrollY > 50);
    updateActiveNavLink();
  });
}

function updateActiveNavLink() {
  const sections = ['home', 'musicians', 'coaches', 'recommend', 'about'];
  const scrollY = window.scrollY + 100;

  sections.forEach(id => {
    const el = document.getElementById(id);
    const link = document.querySelector(`[data-section="${id}"]`);
    if (!el || !link) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    link.classList.toggle('active', scrollY >= top && scrollY < bottom);
  });
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobile() {
  document.getElementById('mobile-menu').classList.toggle('open');
}

function closeMobile() {
  document.getElementById('mobile-menu').classList.remove('open');
}

// ═══════════════════════════════════════════════ AUTH
async function checkSession() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (data.user) setUser(data.user);
  } catch (e) {}
}

function setUser(user) {
  state.user = user;
  document.getElementById('nav-auth-guest').classList.add('hidden');
  document.getElementById('nav-auth-user').classList.remove('hidden');
  document.getElementById('nav-username').textContent = `♪ ${user.name.split(' ')[0]}`;
}

function clearUser() {
  state.user = null;
  document.getElementById('nav-auth-guest').classList.remove('hidden');
  document.getElementById('nav-auth-user').classList.add('hidden');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  if (!email || !password) {
    showFormError(errEl, 'Please fill in all fields.');
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      setUser(data.user);
      closeModal('login');
      showToast(`Welcome back, ${data.user.name.split(' ')[0]}! 🎵`, 'success');
      document.getElementById('login-email').value = '';
      document.getElementById('login-password').value = '';
      errEl.classList.add('hidden');
    } else {
      showFormError(errEl, data.message);
    }
  } catch (e) {
    showFormError(errEl, 'Connection error. Please try again.');
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const genre = document.getElementById('reg-genre').value;
  const experience = document.getElementById('reg-exp').value;
  const errEl = document.getElementById('register-error');
  const sucEl = document.getElementById('register-success');

  if (!name || !email || !password) {
    showFormError(errEl, 'Please fill in all required fields.');
    return;
  }
  if (password.length < 6) {
    showFormError(errEl, 'Password must be at least 6 characters.');
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, genre, experience })
    });
    const data = await res.json();

    if (data.success) {
      errEl.classList.add('hidden');
      sucEl.textContent = '🎉 Account created! You can now sign in.';
      sucEl.classList.remove('hidden');
      setTimeout(() => switchModal('register', 'login'), 1800);
    } else {
      showFormError(errEl, data.message);
    }
  } catch (e) {
    showFormError(errEl, 'Connection error. Please try again.');
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  clearUser();
  showToast('Signed out successfully.', 'success');
}

// ═══════════════════════════════════════════════ COACHES
async function loadCoaches() {
  const grid = document.getElementById('coaches-grid');
  try {
    const res = await fetch('/api/coaches');
    const coaches = await res.json();

    grid.innerHTML = coaches.map(c => `
      <div class="coach-card">
        <div class="coach-card__top">
          <div class="coach-avatar" style="background: ${c.accent_color};">${c.image_initial}</div>
          <div class="coach-info">
            <div class="coach-name">${c.name}</div>
            <div class="coach-specialty">${c.specialty}</div>
            <div class="coach-exp">${c.experience_years} yrs experience</div>
          </div>
          <div class="coach-rating">★ ${c.rating}</div>
        </div>
        <div class="coach-card__bio">${c.bio}</div>
        <div class="coach-card__footer">
          <div>
            <div class="coach-price">$${c.price_per_session} <small>/ session</small></div>
            <div class="coach-sessions">${c.sessions_completed}+ sessions</div>
          </div>
          <button class="btn btn--accent btn--sm" onclick="openBooking(${c.id}, '${c.name}')">Book →</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    grid.innerHTML = '<div class="loading-spinner">Failed to load coaches.</div>';
  }
}

// ═══════════════════════════════════════════════ JOURNEY TABS
function initJourneyTabs() {
  document.querySelectorAll('.journey-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.journey-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.journey-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════════ RECOMMENDATION
function initRecommendation() {
  // Genre buttons
  document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedGenre = btn.dataset.val;
      document.getElementById('step1-next').disabled = false;
    });
  });

  // Experience radios
  document.querySelectorAll('input[name="experience"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('step2-next').disabled = false;
    });
  });

  // Goal buttons
  document.querySelectorAll('.goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.selectedGoal = btn.dataset.val;
      document.getElementById('step3-next').disabled = false;
    });
  });
}

function nextStep(step) {
  document.querySelectorAll('.rec-step').forEach(s => s.classList.remove('active'));
  document.querySelector(`[data-step="${step}"]`).classList.add('active');
}

function prevStep(step) {
  nextStep(step);
}

async function submitRecommendation() {
  const experience = document.querySelector('input[name="experience"]:checked')?.value;
  if (!state.selectedGenre || !experience || !state.selectedGoal) {
    showToast('Please complete all steps.', 'error');
    return;
  }

  const btn = document.getElementById('step3-next');
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre: state.selectedGenre, experience, goal: state.selectedGoal })
    });
    const data = await res.json();

    if (data.success) {
      renderResult(data.result, state.selectedGenre, experience, state.selectedGoal);
    } else {
      showToast('Error generating recommendation.', 'error');
    }
  } catch (e) {
    showToast('Connection error. Please try again.', 'error');
  }

  btn.textContent = 'Get My Roadmap ✦';
  btn.disabled = false;
}

function renderResult(result, genre, experience, goal) {
  const formBox = document.getElementById('rec-form-box');
  const resultEl = document.getElementById('rec-result');
  const body = document.getElementById('result-body');

  const goalLabels = {
    performance: 'Performance', recording: 'Recording',
    songwriting: 'Songwriting', career: 'Career Growth'
  };

  body.innerHTML = `
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:2rem;">
      <span style="background:rgba(212,168,67,0.1);border:1px solid rgba(212,168,67,0.25);padding:0.35rem 0.9rem;border-radius:100px;font-size:0.75rem;color:var(--gold);font-family:var(--font-mono);">🎵 ${genre}</span>
      <span style="background:rgba(212,168,67,0.1);border:1px solid rgba(212,168,67,0.25);padding:0.35rem 0.9rem;border-radius:100px;font-size:0.75rem;color:var(--gold);font-family:var(--font-mono);">📊 ${experience.charAt(0).toUpperCase()+experience.slice(1)}</span>
      <span style="background:rgba(212,168,67,0.1);border:1px solid rgba(212,168,67,0.25);padding:0.35rem 0.9rem;border-radius:100px;font-size:0.75rem;color:var(--gold);font-family:var(--font-mono);">🎯 ${goalLabels[goal]||goal}</span>
    </div>

    <div class="result-section">
      <h4>Your Personalized Advice</h4>
      <p>${result.advice}</p>
    </div>

    ${result.genre_tip ? `
    <div class="result-section">
      <h4>Genre Insight — ${genre}</h4>
      <p>${result.genre_tip}</p>
    </div>
    ` : ''}

    <div class="result-section">
      <h4>Your Next Action Steps</h4>
      <ul class="result-steps">
        ${result.next_steps.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>

    <div class="result-section">
      <h4>Your Coach Match</h4>
      <div class="coach-match-pill">🎓 ${result.coach_recommendation} is your recommended coach</div>
    </div>

    <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--border);display:flex;gap:1rem;flex-wrap:wrap;">
      <button class="btn btn--accent" onclick="scrollTo('coaches')">Book a Session →</button>
      <button class="btn btn--ghost" onclick="resetRecommendation()">Get New Guidance</button>
    </div>
  `;

  formBox.classList.add('hidden');
  resultEl.classList.remove('hidden');
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetRecommendation() {
  document.getElementById('rec-form-box').classList.remove('hidden');
  document.getElementById('rec-result').classList.add('hidden');
  // Reset selections
  document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('input[name="experience"]').forEach(r => r.checked = false);
  document.getElementById('step1-next').disabled = true;
  document.getElementById('step2-next').disabled = true;
  document.getElementById('step3-next').disabled = true;
  state.selectedGenre = null;
  state.selectedGoal = null;
  nextStep(1);
}

// ═══════════════════════════════════════════════ BOOKING
function setMinBookingDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateEl = document.getElementById('booking-date');
  if (dateEl) dateEl.min = tomorrow.toISOString().split('T')[0];
}

function openBooking(coachId, coachName) {
  if (!state.user) {
    showToast('Please sign in to book a session.', 'error');
    openModal('login');
    return;
  }
  state.currentBookingCoachId = coachId;
  document.getElementById('booking-coach-name').textContent = `with ${coachName}`;
  document.getElementById('booking-error').classList.add('hidden');
  document.getElementById('booking-success').classList.add('hidden');
  openModal('booking');
}

async function submitBooking() {
  const date = document.getElementById('booking-date').value;
  const time = document.getElementById('booking-time').value;
  const errEl = document.getElementById('booking-error');
  const sucEl = document.getElementById('booking-success');

  if (!date) {
    showFormError(errEl, 'Please select a date.');
    return;
  }

  try {
    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coach_id: state.currentBookingCoachId, date, time })
    });
    const data = await res.json();

    if (data.success) {
      errEl.classList.add('hidden');
      sucEl.textContent = '🎉 ' + data.message;
      sucEl.classList.remove('hidden');
      setTimeout(() => closeModal('booking'), 2000);
    } else {
      showFormError(errEl, data.message);
    }
  } catch (e) {
    showFormError(errEl, 'Booking failed. Please try again.');
  }
}

// ═══════════════════════════════════════════════ MODALS
function openModal(name) {
  document.getElementById(`modal-${name}`)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(name) {
  document.getElementById(`modal-${name}`)?.classList.remove('open');
  document.body.style.overflow = '';
}

function switchModal(from, to) {
  closeModal(from);
  setTimeout(() => openModal(to), 200);
}

// Close modals on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['login', 'register', 'booking'].forEach(closeModal);
  }
});

// ═══════════════════════════════════════════════ UTILITIES
function showFormError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast--${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// Enter key for login/register
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (document.getElementById('modal-login')?.classList.contains('open')) handleLogin();
  if (document.getElementById('modal-register')?.classList.contains('open')) handleRegister();
});
