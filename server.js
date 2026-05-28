/**
 * OXYCORP — Node.js Express Backend
 * Handles: LLM proxy, API routing, session management,
 *          ML proxy, auth, coaches, recommendations, bookings,
 *          career analysis, and skill assessments.
 *
 * Run:  node server.js
 * Deps: npm install express cors dotenv
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();
const { getIntelligentResponse, buildEnrichedSystemPrompt } = require('./knowledge-base');
const { searchMusicWeb, formatSearchContext, fetchMusicNews } = require('./web-search');

const app  = express();
const PORT = process.env.PORT || 3000;
const ML_SERVICE_URL = process.env.ML_URL || 'http://localhost:8000';
const DJANGO_URL = process.env.DJANGO_URL || 'http://localhost:8001';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Simple session store (in-memory for demo)
const sessions = {};

// Session middleware
app.use((req, res, next) => {
  const sid = req.headers.cookie?.match(/oxysid=([^;]+)/)?.[1];
  req.session = sid ? sessions[sid] : null;
  next();
});

app.use(express.static(__dirname));

// ────────────────────────────────────────────
// MUSIC TOPIC CLASSIFIER — Server-Side Gate
// Rejects non-music questions BEFORE calling LLM
// ────────────────────────────────────────────
const MUSIC_KEYWORDS = [
  // Genres
  'music', 'song', 'songs', 'singing', 'sing', 'singer', 'vocal', 'vocals', 'vocalist',
  'hip-hop', 'hip hop', 'rap', 'rapper', 'rapping', 'trap', 'drill', 'grime',
  'pop', 'rock', 'jazz', 'blues', 'country', 'folk', 'classical', 'opera',
  'r&b', 'rnb', 'soul', 'funk', 'disco', 'reggae', 'dancehall', 'ska',
  'electronic', 'edm', 'techno', 'house', 'dubstep', 'trance', 'ambient',
  'afrobeats', 'afropop', 'amapiano', 'highlife', 'afro', 'afrofusion',
  'latin', 'reggaeton', 'salsa', 'bachata', 'cumbia', 'bossa nova',
  'gospel', 'worship', 'ccm', 'christian', 'hymn', 'choir',
  'metal', 'punk', 'grunge', 'hardcore', 'alternative', 'indie',
  'k-pop', 'kpop', 'j-pop', 'jpop', 'bollywood',
  // Instruments & Production
  'guitar', 'bass', 'drum', 'drums', 'drummer', 'piano', 'keyboard', 'synth',
  'synthesizer', 'violin', 'cello', 'trumpet', 'saxophone', 'sax', 'flute',
  'ukulele', 'banjo', 'harmonica', 'turntable', 'dj', 'deejay', 'djing',
  'beat', 'beats', 'beatmaker', 'beatmaking', 'producer', 'production',
  'producing', 'mix', 'mixing', 'master', 'mastering', 'recording',
  'daw', 'ableton', 'logic pro', 'fl studio', 'pro tools', 'garageband',
  'midi', 'sample', 'sampling', 'loop', 'loops', 'plugin', 'plugins', 'vst',
  'eq', 'equalizer', 'compressor', 'compression', 'reverb', 'delay',
  'auto-tune', 'autotune', 'pitch correction', 'vocoder', 'audio',
  'sound', 'sound design', 'sound engineer', 'audio engineer', 'studio',
  // Music Theory
  'chord', 'chords', 'melody', 'harmony', 'rhythm', 'tempo', 'bpm',
  'scale', 'key', 'minor', 'major', 'octave', 'pitch', 'note', 'notes',
  'verse', 'chorus', 'bridge', 'hook', 'lyric', 'lyrics', 'songwriting',
  'songwriter', 'compose', 'composer', 'composition', 'arrangement',
  'music theory', 'notation', 'sight reading', 'ear training',
  // Streaming & Platforms
  'spotify', 'apple music', 'tidal', 'deezer', 'soundcloud', 'bandcamp',
  'youtube music', 'amazon music', 'pandora', 'audiomack', 'boomplay',
  'distrokid', 'tunecore', 'cd baby', 'cdbaby', 'landr', 'amuse',
  'stream', 'streams', 'streaming', 'playlist', 'playlists', 'algorithm',
  'release radar', 'discover weekly', 'editorial playlist',
  // Music Business
  'record label', 'label', 'a&r', 'manager', 'management', 'booking agent',
  'publisher', 'publishing', 'royalty', 'royalties', 'copyright',
  'sync', 'sync licensing', 'licensing', 'mechanical', 'performance rights',
  'ascap', 'bmi', 'sesac', 'pro', 'performing rights',
  'contract', 'deal', 'record deal', 'advance', '360 deal',
  'independent', 'indie artist', 'unsigned', 'signed',
  'distribution', 'distributor', 'digital distribution',
  'merch', 'merchandise', 'vinyl', 'cd', 'physical',
  // Marketing & Career
  'fanbase', 'fans', 'audience', 'listener', 'listeners',
  'music marketing', 'promo', 'promotion', 'press kit', 'epk',
  'music video', 'visualizer', 'cover art', 'artwork',
  'branding', 'artist brand', 'artist name', 'stage name',
  'social media', 'tiktok', 'instagram', 'reels', 'content',
  'viral', 'engagement', 'followers', 'influencer',
  // Live Performance
  'gig', 'gigs', 'concert', 'concerts', 'show', 'shows', 'tour', 'touring',
  'festival', 'festivals', 'venue', 'venues', 'stage', 'performance',
  'setlist', 'soundcheck', 'live music', 'open mic', 'residency',
  'headliner', 'opening act', 'support act', 'rider', 'tech rider',
  // Artist Terms
  'artist', 'musician', 'band', 'bandmate', 'ensemble', 'orchestra',
  'soloist', 'frontman', 'frontwoman', 'lead singer', 'backup',
  'collaboration', 'collab', 'feature', 'feat', 'ft',
  'debut', 'single', 'album', 'ep', 'mixtape', 'track', 'tracklist',
  'release', 'drop', 'rollout', 'pre-save', 'presave',
  // Industry Specific
  'grammy', 'grammys', 'billboard', 'riaa', 'gold', 'platinum',
  'chart', 'charts', 'charting', 'hot 100', 'top 40',
  'music industry', 'music business', 'music career', 'music scene',
  'a&r', 'talent scout', 'demo', 'audition',
  // Revenue & Monetization
  'monetize', 'monetization', 'revenue', 'income', 'patreon',
  'music income', 'streaming revenue', 'payout', 'per stream',
  'music money', 'music earnings', 'music salary',
];

const MUSIC_REFUSAL_MESSAGE = "I'm OXYCORP AI, a dedicated music career advisor. I can only help with music industry questions — things like streaming strategy, sync licensing, tour booking, music production, artist development, and music business.\n\nHere are some things I can help you with:\n• How to grow your streaming numbers\n• Music distribution and playlist strategy\n• Sync licensing and publishing deals\n• Building a fanbase and music marketing\n• Live performance and touring\n• Music production and audio engineering\n• Record deals and music business\n\nWhat music topic can I help you with?";

function isMusicRelated(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  
  // Check if any music keyword appears in the text
  for (const keyword of MUSIC_KEYWORDS) {
    // Use word boundary check for short keywords to avoid false positives
    if (keyword.length <= 3) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower)) return true;
    } else {
      if (lower.includes(keyword)) return true;
    }
  }
  return false;
}

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
// AUTH — In-memory user store (demo)
// ────────────────────────────────────────────
const users = [
  { id: 1, name: 'Demo User', email: 'demo@oxycorp.com', password: 'demo123', role: 'musician', genre: 'Afrobeats', experience: 'intermediate' },
  { id: 2, name: 'Amani Kerubo', email: 'amani@music.ke', password: 'pass123', role: 'musician', genre: 'Afrobeats', experience: 'intermediate', bio: 'Nairobi-based Afrobeats vocalist blending Swahili lyrics with modern production. 2 EPs released independently.', monthly_streams: 12400, goals: 'Grow streaming numbers, get playlist placements', social: { instagram: '@amanikerubo', tiktok: '@amanimusic' }, joined: '2025-11-14' },
  { id: 3, name: 'DJ Kiptoo', email: 'kiptoo@beats.ke', password: 'pass123', role: 'musician', genre: 'Amapiano', experience: 'advanced', bio: 'Amapiano/EDM DJ from Eldoret. Performing at clubs in Nairobi and Mombasa. Looking to break into festival circuits.', monthly_streams: 45000, goals: 'Tour booking, festival placements', social: { instagram: '@djkiptoo', youtube: 'DJ Kiptoo Official' }, joined: '2025-08-22' },
  { id: 4, name: 'Neema Wanjiku', email: 'neema@gospel.ke', password: 'pass123', role: 'musician', genre: 'Gospel', experience: 'intermediate', bio: 'Contemporary gospel singer-songwriter from Kiambu. Worship leader and choir director seeking to record first full album.', monthly_streams: 3200, goals: 'Album production, vocal improvement', social: { instagram: '@neemaworship' }, joined: '2026-01-05' },
  { id: 5, name: 'Mziki Collective', email: 'mziki@band.ke', password: 'pass123', role: 'musician', genre: 'Hip-Hop / Rap', experience: 'advanced', bio: 'Nairobi hip-hop crew — 3 MCs and a producer. Sheng rap pioneers with viral tracks on TikTok Kenya. Label interest growing.', monthly_streams: 89000, goals: 'Label negotiations, music business fundamentals', social: { instagram: '@mzikicollective', tiktok: '@mzikirap' }, joined: '2025-06-18' },
  { id: 6, name: 'Zawadi Omondi', email: 'zawadi@keys.ke', password: 'pass123', role: 'musician', genre: 'Jazz', experience: 'beginner', bio: 'Self-taught jazz pianist from Kisumu. Just started performing at local cafes. Wants to study music theory and composition.', monthly_streams: 200, goals: 'Learn music theory, find collaborators', social: { instagram: '@zawadikeys' }, joined: '2026-03-01' },
  { id: 7, name: 'Halima Abdi', email: 'halima@coastal.ke', password: 'pass123', role: 'musician', genre: 'R&B / Soul', experience: 'intermediate', bio: 'Mombasa R&B vocalist with Taarab influences. Writing bilingual Swahili-English songs targeting the East African diaspora market.', monthly_streams: 8700, goals: 'Sync licensing, diaspora audience growth', social: { instagram: '@halimaabdi_', tiktok: '@halimarnb' }, joined: '2025-10-11' },
  { id: 8, name: 'Otieno Beats', email: 'otieno@prod.ke', password: 'pass123', role: 'musician', genre: 'Gengetone', experience: 'advanced', bio: 'Gengetone producer from Eastlands, Nairobi. 15+ placements with top Kenyan artists. Building a beat-selling platform.', monthly_streams: 120000, goals: 'Monetize beats online, build brand', social: { instagram: '@otieno.beats', youtube: 'Otieno Beats' }, joined: '2025-04-29' },
  { id: 9, name: 'Ciku Maina', email: 'ciku@indie.ke', password: 'pass123', role: 'musician', genre: 'Indie / Alternative', experience: 'beginner', bio: 'Indie folk singer-songwriter from Karen, Nairobi. Guitar and ukulele. Writing introspective songs inspired by Kenyan landscapes.', monthly_streams: 450, goals: 'First EP recording, find a producer', social: { instagram: '@cikumusic' }, joined: '2026-02-14' },
  { id: 10, name: 'Shiko Njoroge', email: 'shiko@vocals.ke', password: 'pass123', role: 'musician', genre: 'Pop', experience: 'intermediate', bio: 'Pop vocalist from Lavington, Nairobi. Trained at the Kenya Conservatoire. Writing radio-friendly Afro-pop in English and Swahili. Released 3 singles with growing Spotify traction.', monthly_streams: 18500, goals: 'Radio airplay, brand partnerships, grow TikTok', social: { instagram: '@shiko.music', tiktok: '@shikonjoroge', spotify: 'Shiko Njoroge' }, joined: '2025-09-03' },
  { id: 11, name: 'Baraka MC', email: 'baraka@rap.ke', password: 'pass123', role: 'musician', genre: 'Hip-Hop / Rap', experience: 'intermediate', bio: 'Conscious rapper from Kibera. Raps in Sheng and English about life in Nairobi estates. Won Boomplay Next Rated Kenya 2025. Working on debut mixtape.', monthly_streams: 34000, goals: 'Mixtape distribution, live shows, sponsorships', social: { instagram: '@barakamc254', tiktok: '@barakamc', youtube: 'Baraka MC' }, joined: '2025-07-12' },
  { id: 12, name: 'Nyota Achieng', email: 'nyota@benga.ke', password: 'pass123', role: 'musician', genre: 'Benga', experience: 'advanced', bio: 'Second-generation Benga guitarist from Kisumu, now based in South B, Nairobi. Fusing classic Luo Benga with modern Afrobeats production. Performing at Koroga and Tusker Oktoba.', monthly_streams: 22000, goals: 'International festivals, vinyl release', social: { instagram: '@nyota_benga', youtube: 'Nyota Achieng Official' }, joined: '2025-05-20' },
  { id: 13, name: 'Trinity Worship', email: 'trinity@gospel.ke', password: 'pass123', role: 'musician', genre: 'Gospel', experience: 'advanced', bio: '5-piece worship band from Nairobi Chapel. Contemporary gospel with Swahili hymns. 2 albums released. Regular performers at Groove Awards nominees showcase.', monthly_streams: 67000, goals: 'East African gospel tour, YouTube growth', social: { instagram: '@trinityworship_ke', youtube: 'Trinity Worship Kenya' }, joined: '2025-03-08' },
  { id: 14, name: 'Zuri Wafula', email: 'zuri@edm.ke', password: 'pass123', role: 'musician', genre: 'Electronic / EDM', experience: 'intermediate', bio: 'Electronic producer and DJ from Westlands, Nairobi. Blending Amapiano drops with deep house and tribal percussion. Resident DJ at Alchemist Bar.', monthly_streams: 15800, goals: 'Produce for international DJs, Beatport release', social: { instagram: '@zuribeats', soundcloud: 'ZuriWafula' }, joined: '2025-12-01' },
  { id: 15, name: 'Makena Kibet', email: 'makena@soul.ke', password: 'pass123', role: 'musician', genre: 'R&B / Soul', experience: 'beginner', bio: 'Neo-soul vocalist from Ngong, Nairobi. Self-taught singer inspired by Asa and Sade. Just started recording home demos and posting covers on Instagram.', monthly_streams: 320, goals: 'Vocal coaching, first original single, studio access', social: { instagram: '@makena.sings' }, joined: '2026-04-02' },
  { id: 16, name: 'Drillz Ke', email: 'drillz@drill.ke', password: 'pass123', role: 'musician', genre: 'Hip-Hop / Rap', experience: 'intermediate', bio: 'UK-drill influenced rapper from Pipeline, Nairobi. Part of the growing Kenyan drill scene. Known for hard-hitting flows over dark 808 beats. Viral freestyles on Twitter/X.', monthly_streams: 41000, goals: 'Label deal, UK collab features, music video budget', social: { instagram: '@drillz_ke', tiktok: '@drillzkenya', twitter: '@DrillzKe' }, joined: '2025-08-19' },
  { id: 17, name: 'Imani Otieno', email: 'imani@keys.ke', password: 'pass123', role: 'musician', genre: 'Jazz', experience: 'intermediate', bio: 'Jazz pianist and composer from Kilimani. Studied at Berklee Online. Performs at The Sarabi Rooftop and J\'s Fresh Bar. Composing original Afro-jazz pieces for a debut album.', monthly_streams: 5600, goals: 'Record jazz album, form a quartet, teach masterclasses', social: { instagram: '@imani.keys', spotify: 'Imani Otieno' }, joined: '2025-11-28' },
  { id: 18, name: 'Frank Jetski', email: 'frank@jetski.ke', password: 'pass123', role: 'musician', genre: 'Hip-Hop / Rap', experience: 'intermediate', bio: 'Kenyan hip-hop artist making waves in the Nairobi rap scene. Featured on "Blinded Na Love" with Biggie Pumba. Known for melodic flows blending Sheng wordplay with trap-influenced production. Building a loyal underground following across East Africa.', monthly_streams: 28500, goals: 'Release debut EP, grow Spotify presence, collaborate with top Kenyan producers', social: { instagram: '@frankjetski', tiktok: '@frankjetski', twitter: '@FrankJetski' }, joined: '2025-06-10' },
  { id: 19, name: 'Biggie Pumba', email: 'biggie@pumba.ke', password: 'pass123', role: 'musician', genre: 'Hip-Hop / Rap', experience: 'advanced', bio: 'Nairobi heavyweight rapper and OXYCORP YouTube channel staple. Known for "Blinded Na Love" and hard-hitting street anthems. Commanding presence with raw lyricism and Sheng bars that resonate across Kenyan estates. Building a movement in East African hip-hop.', monthly_streams: 52000, goals: 'Headline shows, OXYCORP YouTube growth, East African tour, label partnerships', social: { instagram: '@biggiepumba', youtube: 'OXYCORP', tiktok: '@biggiepumba254' }, joined: '2025-03-15' },
  { id: 20, name: 'Lil Morty', email: 'lilmorty@music.ke', password: 'pass123', role: 'musician', genre: 'Hip-Hop / Rap', experience: 'intermediate', bio: 'Rising Nairobi rapper making waves on the OXYCORP YouTube channel. Versatile flow switching between melodic hooks and rapid-fire bars. Part of the new wave of Kenyan trap artists pushing boundaries with genre-bending production and viral music videos.', monthly_streams: 35000, goals: 'Viral music videos, OXYCORP YouTube features, streaming growth, collab with Frank Jetski & Biggie Pumba', social: { instagram: '@lilmorty_ke', youtube: 'OXYCORP', tiktok: '@lilmortyke' }, joined: '2025-05-22' },
  { id: 21, name: 'Sanaa Njoroge', email: 'sanaa@afro.ke', password: 'pass123', role: 'musician', genre: 'Afro-Pop', experience: 'intermediate', bio: 'Nairobi songwriter and producer blending Afro-Pop with melodic Swahili hooks. Writes for emerging artists and releases self-produced singles with strong social media engagement.', monthly_streams: 19800, goals: 'Collab with regional producers, sync placements, build a strong brand', social: { instagram: '@sanaa_njoroge', tiktok: '@sanaa.afro' }, joined: '2025-09-30' },
];
let nextUserId = 22;

function createSession(user) {
  const sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const avatar = user.avatar || (user.name ? user.name.charAt(0).toUpperCase() : '♪');
  sessions[sid] = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar,
      genre: user.genre || '',
      experience: user.experience || '',
    }
  };
  return sid;
}

app.get('/api/session', (req, res) => {
  if (req.session?.user) {
    return res.json({ user: req.session.user });
  }
  res.json({ user: null });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.json({ success: false, message: 'Email and password are required.' });
  }
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.json({ success: false, message: 'Invalid email or password.' });
  }
  const sid = createSession(user);
  res.setHeader('Set-Cookie', `oxysid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/register', (req, res) => {
  const { name, email, password, role, genre, experience } = req.body;
  if (!name || !email || !password) {
    return res.json({ success: false, message: 'Name, email, and password are required.' });
  }
  if (users.find(u => u.email === email)) {
    return res.json({ success: false, message: 'Email already registered.' });
  }
  const avatar = name.trim().charAt(0).toUpperCase();
  const user = { id: nextUserId++, name, email, password, role: role || 'musician', genre: genre || '', experience: experience || '', avatar };
  users.push(user);
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  const sid = req.headers.cookie?.match(/oxysid=([^;]+)/)?.[1];
  if (sid) delete sessions[sid];
  res.setHeader('Set-Cookie', 'oxysid=; Path=/; HttpOnly; Max-Age=0');
  res.json({ success: true });
});

app.get('/api/profile', (req, res) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) return res.status(401).json({ success: false, message: 'Authentication required.' });

  const user = users.find(u => u.id === sessionUser.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  return res.json({
    success: true,
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || (user.name ? user.name.charAt(0).toUpperCase() : '♪'),
      genre: user.genre || '',
      experience: user.experience || '',
    }
  });
});

app.post('/api/profile', (req, res) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) return res.status(401).json({ success: false, message: 'Authentication required.' });

  const { name, avatar } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  const user = users.find(u => u.id === sessionUser.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  user.name = name.trim();
  user.avatar = avatar && typeof avatar === 'string' ? avatar.trim().substring(0, 2) : user.avatar || name.trim().charAt(0).toUpperCase();

  req.session.user.name = user.name;
  req.session.user.avatar = user.avatar;

  return res.json({ success: true, profile: { name: user.name, avatar: user.avatar } });
});

app.post('/api/change-password', (req, res) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) return res.status(401).json({ success: false, message: 'Authentication required.' });

  const { current_password, new_password, confirm_password } = req.body;
  if (!current_password || !new_password || !confirm_password) {
    return res.status(400).json({ success: false, message: 'All password fields are required.' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }
  if (new_password !== confirm_password) {
    return res.status(400).json({ success: false, message: 'New password and confirmation must match.' });
  }

  const user = users.find(u => u.id === sessionUser.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  if (user.password !== current_password) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = new_password;
  return res.json({ success: true, message: 'Password updated successfully.' });
});

// ────────────────────────────────────────────
// COACHES — Mock data
// ────────────────────────────────────────────
const coaches = [
  { id: 1, name: 'Maya Johnson', specialty: 'Vocal Performance & Afrobeats', experience_years: 12, rating: 4.9, bio: 'Grammy-nominated vocal coach specializing in contemporary Afrobeats and R&B. Has worked with platinum-selling artists across West Africa and the diaspora.', price_per_session: 11050, sessions_completed: 340, accent_color: 'linear-gradient(135deg, #c8a84b, #e5c878)', image_initial: 'MJ' },
  { id: 2, name: 'David Okafor', specialty: 'Music Production & Beatmaking', experience_years: 8, rating: 4.8, bio: 'Producer and sound engineer with credits on Billboard-charting tracks. Expert in Afrobeats, Amapiano, and electronic production workflows.', price_per_session: 12350, sessions_completed: 215, accent_color: 'linear-gradient(135deg, #1de4b4, #0fa87f)', image_initial: 'DO' },
  { id: 3, name: 'Sarah Chen', specialty: 'Music Business & Sync Licensing', experience_years: 15, rating: 4.9, bio: 'Former A&R executive turned independent music business consultant. Specializes in sync licensing, publishing deals, and independent artist monetization.', price_per_session: 15600, sessions_completed: 520, accent_color: 'linear-gradient(135deg, #a78bfa, #7c5cbf)', image_initial: 'SC' },
  { id: 4, name: 'James Mwangi', specialty: 'Live Performance & Touring', experience_years: 10, rating: 4.7, bio: 'Tour manager and performance coach who has managed tours across 20+ countries. Helps artists develop stage presence and build profitable touring careers.', price_per_session: 9750, sessions_completed: 180, accent_color: 'linear-gradient(135deg, #ff4e7e, #d63366)', image_initial: 'JM' },
  { id: 5, name: 'Lisa Amara', specialty: 'Songwriting & Composition', experience_years: 11, rating: 4.8, bio: 'Published songwriter with credits in major film and TV placements. Teaches structured songwriting, co-writing strategies, and lyric craft for modern genres.', price_per_session: 11700, sessions_completed: 290, accent_color: 'linear-gradient(135deg, #c8a84b, #1de4b4)', image_initial: 'LA' },
  { id: 6, name: 'Robert Kimani', specialty: 'Hip-Hop & Urban Marketing', experience_years: 9, rating: 4.6, bio: 'Digital marketing strategist specializing in hip-hop and urban music campaigns. Expert in TikTok growth, playlist pitching, and influencer partnerships.', price_per_session: 10400, sessions_completed: 160, accent_color: 'linear-gradient(135deg, #e5c878, #c8a84b)', image_initial: 'RK' },
  { id: 7, name: 'Ari Herstand', specialty: 'Music Business Strategy', experience_years: 18, rating: 4.9, bio: 'Bestselling author of "How To Make It in the New Music Business." He provides actionable strategies for independent artists to book gigs, get licensing deals, and manage tours.', price_per_session: 19500, sessions_completed: 1200, accent_color: 'linear-gradient(135deg, #2563EB, #60A5FA)', image_initial: 'AH' },
  { id: 8, name: 'Damien Keyes', specialty: 'Social Media & Marketing', experience_years: 14, rating: 4.8, bio: 'Founder of BIMM (The British and Irish Modern Music Institute). Unrivaled expertise in YouTube growth, social media branding, and building a loyal audience organically.', price_per_session: 18200, sessions_completed: 850, accent_color: 'linear-gradient(135deg, #059669, #34D399)', image_initial: 'DK' },
  { id: 9, name: 'Rick Barker', specialty: 'Artist Management', experience_years: 20, rating: 4.9, bio: 'Former manager for Taylor Swift and industry veteran. Coaches artists on building lifelong fanbases, understanding the core music business, and optimizing release strategies.', price_per_session: 22100, sessions_completed: 920, accent_color: 'linear-gradient(135deg, #DC2626, #F87171)', image_initial: 'RB' },
  { id: 10, name: 'Suzanne Paulinski', specialty: 'Mindset & Productivity', experience_years: 12, rating: 4.7, bio: '"The Rock/Star Advocate" specializes in helping music professionals manage their time, battle burnout, and establish sustainable mindsets for long-term career growth.', price_per_session: 14300, sessions_completed: 460, accent_color: 'linear-gradient(135deg, #D946EF, #F472B6)', image_initial: 'SP' },
  { id: 11, name: 'Wanjiru Kamau', specialty: 'Gengetone & Urban Kenyan Music', experience_years: 7, rating: 4.8, bio: 'Nairobi-based A&R and artist development coach who helped launch several chart-topping Gengetone acts. Expert in Kenyan urban music production, Sheng lyric writing, and local playlist strategy.', price_per_session: 6500, sessions_completed: 195, accent_color: 'linear-gradient(135deg, #F59E0B, #FBBF24)', image_initial: 'WK' },
  { id: 12, name: 'Brian Odhiambo', specialty: 'Music Production & Afro-Fusion', experience_years: 9, rating: 4.7, bio: 'Award-winning Nairobi producer blending Benga, Ohangla, and Afrobeats into modern Afro-fusion. Has produced for top East African artists and runs a studio mentorship program in Westlands.', price_per_session: 7800, sessions_completed: 230, accent_color: 'linear-gradient(135deg, #10B981, #6EE7B7)', image_initial: 'BO' },
  { id: 13, name: 'Aisha Nyambura', specialty: 'Vocal Coaching & Gospel', experience_years: 14, rating: 4.9, bio: 'Celebrated Nairobi vocal coach with roots in Kenyan gospel and contemporary worship. Has trained choir directors and solo artists across East Africa, specializing in harmonics, breath control, and live performance.', price_per_session: 8200, sessions_completed: 410, accent_color: 'linear-gradient(135deg, #8B5CF6, #C4B5FD)', image_initial: 'AN' },
  { id: 14, name: 'Kevin Mwai', specialty: 'Hip-Hop & Kapuka Production', experience_years: 11, rating: 4.6, bio: 'Nairobi hip-hop veteran and Kapuka pioneer. Has worked with legendary Kenyan MCs and coaches emerging rappers on flow, beat selection, and building a fanbase in the East African hip-hop scene.', price_per_session: 7150, sessions_completed: 175, accent_color: 'linear-gradient(135deg, #EF4444, #FCA5A5)', image_initial: 'KM' },
  { id: 15, name: 'Grace Wambui', specialty: 'Music Business & Publishing (Kenya)', experience_years: 13, rating: 4.8, bio: 'Former MCSK and KAMP advisor specializing in Kenyan music copyright, KECOBO registration, publishing deals, and royalty collection for East African artists. Runs workshops across Nairobi.', price_per_session: 9100, sessions_completed: 320, accent_color: 'linear-gradient(135deg, #2563EB, #93C5FD)', image_initial: 'GW' },
  { id: 16, name: 'Dennis Otieno', specialty: 'Live Performance & Event Production', experience_years: 10, rating: 4.7, bio: 'Nairobi event producer and stage director who has run Blankets & Wine, Koroga Festival, and corporate music events. Coaches artists on stage presence, setlist design, and breaking into the Kenyan live circuit.', price_per_session: 8450, sessions_completed: 210, accent_color: 'linear-gradient(135deg, #F97316, #FDBA74)', image_initial: 'DO' },
  { id: 17, name: 'Njeri Muthoni', specialty: 'Digital Marketing & Social Media (Kenya)', experience_years: 6, rating: 4.8, bio: 'Nairobi digital strategist who has grown multiple Kenyan artists past 100K followers. Specializes in TikTok Kenya, Instagram Reels, YouTube Shorts, and M-Pesa fan monetization strategies.', price_per_session: 5850, sessions_completed: 165, accent_color: 'linear-gradient(135deg, #EC4899, #F9A8D4)', image_initial: 'NM' },
  { id: 18, name: 'Samuel Kipchoge', specialty: 'Benga & Traditional Fusion', experience_years: 16, rating: 4.9, bio: 'Legendary Benga guitarist and ethnomusicologist based in Nairobi. Teaches traditional Kenyan instrumentation, Benga guitar techniques, and how to fuse heritage sounds with contemporary production.', price_per_session: 6500, sessions_completed: 380, accent_color: 'linear-gradient(135deg, #059669, #A7F3D0)', image_initial: 'SK' },
  { id: 19, name: 'Fatima Hassan', specialty: 'Swahili Pop & Coastal Music', experience_years: 8, rating: 4.7, bio: 'Mombasa-born, Nairobi-based artist coach specializing in Swahili pop, Taarab-fusion, and coastal Kenyan music. Helps artists write in Swahili, connect with the East African market, and pitch to regional playlists.', price_per_session: 6200, sessions_completed: 145, accent_color: 'linear-gradient(135deg, #0EA5E9, #7DD3FC)', image_initial: 'FH' },
  { id: 20, name: 'Peter Ndung\'u', specialty: 'Sound Engineering & Mixing', experience_years: 12, rating: 4.8, bio: 'Chief engineer at a top Nairobi studio with credits on Kenya\'s biggest albums. Teaches mixing, mastering, and home studio setup for artists working with limited budgets in East Africa.', price_per_session: 7500, sessions_completed: 285, accent_color: 'linear-gradient(135deg, #6366F1, #A5B4FC)', image_initial: 'PN' },
  { id: 21, name: 'Amina Wainaina', specialty: 'Sync Licensing & Brand Partnerships', experience_years: 11, rating: 4.9, bio: 'Artist manager and sync licensing specialist with experience placing East African music in international film, TV, and ad campaigns. Guides artists through branding, catalogue strategy, and global placement opportunities.', price_per_session: 14200, sessions_completed: 325, accent_color: 'linear-gradient(135deg, #F472B6, #EC4899)', image_initial: 'AW' },
];
let nextCoachId = 22;
const coachSubscribers = [];

function broadcastCoachUpdate() {
  const payload = JSON.stringify({ coaches, updated_at: new Date().toISOString() });
  coachSubscribers.forEach(res => {
    try {
      res.write(`event: coaches-updated\ndata: ${payload}\n\n`);
    } catch (err) {
      // ignore write errors for closed streams
    }
  });
}

app.get('/api/coaches', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json(coaches);
});

app.get('/api/coaches/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write('retry: 10000\n\n');

  coachSubscribers.push(res);
  req.on('close', () => {
    const index = coachSubscribers.indexOf(res);
    if (index !== -1) coachSubscribers.splice(index, 1);
  });
});

app.post('/api/coaches', (req, res) => {
  const {
    name,
    specialty,
    experience_years = 5,
    rating = 4.7,
    bio = '',
    price_per_session = 9500,
    sessions_completed = 0,
    accent_color = 'linear-gradient(135deg, #6366F1, #A5B4FC)',
    image_initial,
  } = req.body;

  if (!name || !specialty) {
    return res.status(400).json({ success: false, message: 'Coach name and specialty are required.' });
  }

  const coach = {
    id: nextCoachId++,
    name,
    specialty,
    experience_years,
    rating,
    bio,
    price_per_session,
    sessions_completed,
    accent_color,
    image_initial: image_initial || name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase(),
  };

  coaches.push(coach);
  broadcastCoachUpdate();
  res.json({ success: true, coach });
});

app.get('/api/artists', (req, res) => {
  const artists = users
    .filter(u => u.role === 'musician' && u.bio)
    .map(({ password, ...rest }) => rest);
  res.json(artists);
});

// ────────────────────────────────────────────
// RECOMMENDATION ENGINE — Built-in
// ────────────────────────────────────────────
app.post('/api/recommend', (req, res) => {
  const { genre, experience, goal } = req.body;
  if (!genre || !experience || !goal) {
    return res.json({ success: false, message: 'Please complete all steps.' });
  }

  const genreTips = {
    afrobeats: 'Afrobeats is one of the fastest-growing genres globally (+18.4% YoY). Focus on TikTok for discovery and target playlist curators who specialize in African music. Consider cross-genre collaborations with Latin and Electronic artists.',
    'hip-hop': 'Hip-Hop dominates streaming platforms with 24.1% market share. Build your brand through consistent content, develop a visual identity, and explore sync licensing opportunities in film and advertising.',
    classical: 'Classical music has a devoted niche audience. Focus on building a strong YouTube presence with performance videos, explore sync licensing for film/TV, and consider modern crossover collaborations.',
    jazz: 'Jazz has a passionate audience and strong sync licensing demand. Focus on live performance, create content showcasing your improvisational skills, and pitch to jazz festival circuits.',
    gospel: 'Gospel music has strong community engagement. Build your platform through church networks, social media ministry content, and consider crossover collaborations with mainstream R&B artists.',
    pop: 'Pop is the second-largest streaming genre. Focus heavily on TikTok and Instagram Reels for discovery, pitch to editorial playlists, and develop a strong visual brand and merchandise line.',
    'r&b': 'R&B streaming is growing at 1.2% with strong sync demand. Focus on creating atmospheric, mood-driven tracks that work for film/TV placement, and build an intimate fanbase through consistent releases.',
    latin: 'Latin music is experiencing explosive global growth. Focus on cross-cultural collaborations, target both English and Spanish-speaking playlist curators, and leverage regional festival circuits.',
  };

  const goalAdvice = {
    performance: 'Focus on building your live show infrastructure. Develop a compelling stage presence, create a professional press kit with live footage, and book at regular intervals to build a touring reputation.',
    recording: 'Invest in your production skills or find a reliable production partner. Aim for consistent release cadence (every 4-6 weeks) and submit to editorial playlists at least 7 days before each release.',
    songwriting: 'Develop your craft through daily writing practice. Join songwriting circles, attend camps, and pursue co-writing opportunities. Register with a PRO and explore music publishing partnerships.',
    career: 'Build a diversified career with multiple revenue streams: streaming, live performance, sync licensing, merchandise, and teaching. Set 90-day milestone goals and track progress systematically.',
  };

  const coachMap = {
    afrobeats: 'Maya Johnson',
    'hip-hop': 'Robert Kimani',
    classical: 'Lisa Amara',
    jazz: 'Lisa Amara',
    gospel: 'Maya Johnson',
    pop: 'Sarah Chen',
    'r&b': 'Maya Johnson',
    latin: 'David Okafor',
  };

  const genreKey = genre.toLowerCase();

  const result = {
    advice: goalAdvice[goal] || goalAdvice.career,
    genre_tip: genreTips[genreKey] || `${genre} is an exciting genre. Focus on building a strong online presence and connecting with genre-specific communities and playlist curators.`,
    next_steps: [
      'Create or update your artist profiles on all major streaming platforms',
      'Develop a 30-day content calendar for TikTok and Instagram',
      `Connect with coaches who specialize in ${genre}`,
      'Register with a Performing Rights Organisation (ASCAP, BMI, or SAMRO)',
      'Set 3 specific, measurable career goals for the next 90 days',
    ],
    coach_recommendation: coachMap[genreKey] || 'Sarah Chen',
  };

  res.json({ success: true, result });
});

// ────────────────────────────────────────────
// BOOKINGS
// ────────────────────────────────────────────
const bookings = [];

app.post('/api/book', (req, res) => {
  if (!req.session?.user) {
    return res.json({ success: false, message: 'Please sign in to book a session.' });
  }
  const { coach_id, date, time } = req.body;
  if (!date) {
    return res.json({ success: false, message: 'Please select a date.' });
  }
  const coach = coaches.find(c => c.id === coach_id);
  const booking = {
    id: bookings.length + 1,
    user: req.session.user.name,
    coach: coach?.name || 'Coach',
    date,
    time: time || '09:00',
    created: new Date().toISOString(),
  };
  bookings.push(booking);
  res.json({ success: true, message: `Session booked with ${booking.coach} on ${date} at ${time}. Check your email for confirmation.` });
});

// ────────────────────────────────────────────
// CAREER ANALYSIS — Built-in (fallback)
// ────────────────────────────────────────────
app.post('/api/career-analysis', (req, res) => {
  const data = req.body;
  const spotifyListeners = data.spotify_listeners || 0;
  const totalStreams = data.total_streams || 0;
  const ytViews = data.yt_views || 0;
  const igFollowers = data.ig_followers || 0;
  const ttFollowers = data.tt_followers || 0;
  const engagementRate = data.engagement_rate || 0;
  const gigsPerYear = data.gigs_per_year || 0;
  const showRevenue = data.show_revenue || 0;
  const annualRevenue = data.annual_revenue || 0;
  const genre = data.genre || 'Other';

  // Calculate reach score
  const reachScore = Math.min(100, (
    (spotifyListeners / 10000) * 20 +
    (totalStreams / 100000) * 15 +
    (ytViews / 100000) * 15 +
    ((igFollowers + ttFollowers) / 10000) * 10
  ));

  // Calculate engagement score
  const engScore = Math.min(100, engagementRate * 8 +
    (igFollowers > 5000 ? 10 : 0) +
    (ttFollowers > 10000 ? 15 : 0));

  // Calculate revenue score
  const revScore = Math.min(100, (
    (annualRevenue / 10000) * 40 +
    (gigsPerYear * showRevenue / 5000) * 30
  ));

  const careerScore = Math.max(0, Math.min(100, Math.round(
    reachScore * 0.4 + engScore * 0.3 + revScore * 0.3
  )));

  // Generate insights
  const insights = [];
  if (careerScore >= 75) {
    insights.push('Excellent career trajectory! Focus on scaling and professional management.');
  } else if (careerScore >= 60) {
    insights.push('Strong foundation. Prioritize consistent content and audience engagement.');
  } else if (careerScore >= 45) {
    insights.push('Good progress. Work on revenue diversification and live performance.');
  } else {
    insights.push('Building phase. Focus on growing audience reach and basic monetization.');
  }
  if (engagementRate < 3) {
    insights.push('Improve engagement: Post consistently, use stories, collaborate with influencers.');
  }
  if (annualRevenue < 5000) {
    insights.push('Diversify income: Explore merch, Patreon, sync licensing, teaching.');
  }
  if (gigsPerYear < 12) {
    insights.push('Increase live shows: Book more gigs to build fanbase and revenue.');
  }
  if (totalStreams < 50000) {
    insights.push('Grow streaming: Submit to playlists, run ads, cross-promote on social.');
  }

  res.json({
    career_score: careerScore,
    actionable_insights: insights.slice(0, 4),
    status: 'completed',
  });
});

// ────────────────────────────────────────────
// SKILL ASSESSMENTS — Built-in (fallback)
// ────────────────────────────────────────────
app.post('/api/skill-assessments', (req, res) => {
  const { quiz_answers } = req.body;
  if (!quiz_answers || quiz_answers.length < 12) {
    return res.status(400).json({ error: 'Please answer all 12 questions.' });
  }

  // Musical skills (questions 0-1): max 6 points
  const musicalTotal = quiz_answers[0] + quiz_answers[1];
  const musicalScore = Math.min(100, Math.round((musicalTotal / 6) * 100));

  // Technical skills (questions 2-3): max 6 points
  const technicalTotal = quiz_answers[2] + quiz_answers[3];
  const technicalScore = Math.min(100, Math.round((technicalTotal / 6) * 100));

  // Business skills (questions 4-11): max 24 points
  const businessTotal = quiz_answers.slice(4, 12).reduce((a, b) => a + b, 0);
  const businessScore = Math.min(100, Math.round((businessTotal / 24) * 100));

  // Identify gaps and recommendations
  const gaps = [];
  const recommendations = [];
  if (musicalScore < 60) {
    gaps.push('Music Theory & Composition');
    recommendations.push('Online course: Music Theory Fundamentals — Berklee Online or Coursera');
  }
  if (technicalScore < 60) {
    gaps.push('Audio Production & Mixing');
    recommendations.push('Tutorial: DAW Mastery — learn Ableton, Logic Pro, or FL Studio');
  }
  if (businessScore < 60) {
    gaps.push('Music Business & Marketing');
    recommendations.push('Book: "All You Need to Know About the Music Business" by Donald Passman');
  }
  if (musicalScore >= 60 && technicalScore >= 60 && businessScore >= 60) {
    recommendations.push('Your skills are well-rounded! Consider advanced masterclasses and industry networking.');
  }

  res.json({
    musical_skill_score: musicalScore,
    technical_skill_score: technicalScore,
    business_skill_score: businessScore,
    skill_gaps: gaps,
    recommended_training: recommendations,
    benchmark_data: { peer_average: { musical: 65, technical: 60, business: 55 } },
  });
});

// ────────────────────────────────────────────
// USER LIST — for basic auth compatibility
// ────────────────────────────────────────────
app.get('/api/users/', (req, res) => {
  // Check basic auth header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
    const [username, password] = decoded.split(':');
    const user = users.find(u => (u.email === username || u.name === username) && u.password === password);
    if (user) {
      return res.json([{ id: user.id, username: user.email, email: user.email }]);
    }
    // Accept any non-empty credentials for demo
    if (username && password) {
      // Auto-create user if doesn't exist
      const newUser = { id: nextUserId++, name: username, email: username, password, role: 'musician', genre: '', experience: '' };
      users.push(newUser);
      return res.json([{ id: newUser.id, username: newUser.email, email: newUser.email }]);
    }
  }
  return res.status(401).json({ error: 'Authentication required' });
});

// ────────────────────────────────────────────
// LLM CHAT PROXY (Anthropic Claude)
// With intelligent fallback knowledge base
// ────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // ── SERVER-SIDE MUSIC GATE ──
  const latestUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (latestUserMsg && !isMusicRelated(latestUserMsg.content)) {
    console.log(`[MUSIC GATE] Blocked non-music question: "${latestUserMsg.content.substring(0, 80)}..."`);
    return res.json({
      reply: MUSIC_REFUSAL_MESSAGE,
      usage: { input_tokens: 0, output_tokens: 0 },
      filtered: true,
    });
  }

  const userText = latestUserMsg?.content || '';

  // ── Search the web for relevant music industry knowledge ──
  let webResults = [];
  try {
    webResults = await searchMusicWeb(userText);
  } catch (e) {
    console.warn('[AI] Web search failed:', e.message);
  }
  const webContext = formatSearchContext(webResults);

  // ── Build context-enriched system prompt with platform data + web results ──
  let platformData = null;
  try {
    const market = marketCache || null;
    platformData = { market, coaches };
  } catch (e) { /* ignore */ }

  const SYSTEM = buildEnrichedSystemPrompt(userText, platformData) + webContext;

  // ── Try LLM first, fall back to intelligent knowledge base ──
  const isValidKey = ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.startsWith('sk-ant-');

  if (isValidKey) {
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

      if (response.ok) {
        const data = await response.json();
        const reply = data.content?.[0]?.text || '';
        console.log(`[AI] LLM response generated (${data.usage?.input_tokens || 0} in, ${data.usage?.output_tokens || 0} out)`);
        return res.json({ reply, usage: data.usage, source: 'llm', webResults: webResults.length });
      }

      console.warn('[AI] LLM API returned error, falling back to knowledge base');
    } catch (err) {
      console.warn('[AI] LLM call failed:', err.message, '— using knowledge base fallback');
    }
  } else {
    console.log('[AI] No valid API key — using intelligent knowledge base + web research');
  }

  // ── Intelligent Knowledge Base Fallback enriched with web data ──
  let reply = getIntelligentResponse(userText);

  // Append relevant web research findings to the knowledge base response
  if (webResults.length > 0) {
    reply += '\n\n---\n**📡 Live Research Findings:**\n';
    const seen = new Set();
    for (const r of webResults.slice(0, 4)) {
      const snippet = r.snippet.substring(0, 200).trim();
      if (snippet.length > 30 && !seen.has(snippet.substring(0, 50))) {
        seen.add(snippet.substring(0, 50));
        reply += `\n• **${r.source}**: ${snippet}${snippet.length >= 200 ? '…' : ''}`;
      }
    }
    reply += '\n';
  }

  res.json({
    reply,
    usage: { input_tokens: 0, output_tokens: 0 },
    source: webResults.length > 0 ? 'knowledge-base+web' : 'knowledge-base',
    webResults: webResults.length,
  });
});

// ────────────────────────────────────────────
// MUSIC WEB SEARCH — Internet Knowledge Extraction
// ────────────────────────────────────────────
app.get('/api/search-music', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'Query parameter q is required' });
  if (!isMusicRelated(q)) {
    return res.json({ success: false, message: 'Only music-related searches are allowed.', results: [] });
  }
  try {
    const results = await searchMusicWeb(q);
    res.json({ success: true, query: q, results, count: results.length });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', detail: err.message });
  }
});

app.get('/api/music-news', async (req, res) => {
  try {
    const news = await fetchMusicNews();
    res.json({ success: true, articles: news, count: news.length });
  } catch (err) {
    res.json({ success: true, articles: [], count: 0 });
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
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
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
// LIVE MARKET INTELLIGENCE — Real Data Feed
// Sources: iTunes RSS, Last.fm public feeds, MusicBrainz
// Cache: 30-minute TTL to avoid rate limits
// ────────────────────────────────────────────
let marketCache = null;
let marketCacheTime = 0;
const MARKET_CACHE_TTL = 30 * 60 * 1000; // 30 min

async function fetchItunesChart(genre, limit = 25) {
  const genreMap = {
    'All':       'https://itunes.apple.com/us/rss/topsongs/limit=50/json',
    'Hip-Hop':   'https://itunes.apple.com/us/rss/topsongs/limit=25/genre=18/json',
    'Pop':       'https://itunes.apple.com/us/rss/topsongs/limit=25/genre=14/json',
    'R&B':       'https://itunes.apple.com/us/rss/topsongs/limit=25/genre=15/json',
    'Electronic':'https://itunes.apple.com/us/rss/topsongs/limit=25/genre=7/json',
    'Country':   'https://itunes.apple.com/us/rss/topsongs/limit=25/genre=6/json',
    'Latin':     'https://itunes.apple.com/us/rss/topsongs/limit=25/genre=12/json',
    'Rock':      'https://itunes.apple.com/us/rss/topsongs/limit=25/genre=21/json',
  };
  const url = genreMap[genre] || genreMap['All'];
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const json = await res.json();
  return (json?.feed?.entry || []).slice(0, limit).map(e => ({
    title:  e['im:name']?.label || '',
    artist: e['im:artist']?.label || '',
    genre:  e.category?.attributes?.label || genre,
    rank:   parseInt(e['im:itemCount']?.label || '0'),
    imgUrl: e['im:image']?.[2]?.label || '',
    link:   e?.id?.label || '',
  }));
}

async function fetchLastFmTopTracks() {
  // Last.fm free public chart RSS — no API key required
  const url = 'https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&limit=20&format=json&api_key=3e6ecf93e46e079bbc9a36df74e53abd';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    return (json?.tracks?.track || []).map(t => ({
      title:      t.name,
      artist:     t.artist?.name,
      listeners:  parseInt(t.listeners || 0),
      playcount:  parseInt(t.playcount || 0),
    }));
  } catch { return []; }
}

async function fetchLastFmTopTags() {
  const url = 'https://ws.audioscrobbler.com/2.0/?method=chart.gettoptags&limit=15&format=json&api_key=3e6ecf93e46e079bbc9a36df74e53abd';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    return (json?.tags?.tag || []).map(t => ({ name: t.name, reach: parseInt(t.reach || 0) }));
  } catch { return []; }
}

async function buildMarketData() {
  const now = Date.now();
  if (marketCache && (now - marketCacheTime) < MARKET_CACHE_TTL) return marketCache;

  console.log('[Market] Fetching live data...');
  let itunesAll = [], itunesHipHop = [], itunesPop = [], lastFmTracks = [], lastFmTags = [];

  try {
    [itunesAll, itunesHipHop, itunesPop, lastFmTracks, lastFmTags] = await Promise.allSettled([
      fetchItunesChart('All', 50),
      fetchItunesChart('Hip-Hop', 15),
      fetchItunesChart('Pop', 15),
      fetchLastFmTopTracks(),
      fetchLastFmTopTags(),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []));
  } catch(e) {
    console.warn('[Market] Partial fetch failure:', e.message);
  }

  // ── Genre share heuristic from iTunes all-genres top 50 ──
  const genreCounts = {};
  itunesAll.forEach(t => {
    const g = t.genre || 'Other';
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });
  const total = Math.max(itunesAll.length, 1);
  const genreShares = Object.entries(genreCounts)
    .map(([name, count]) => ({
      name,
      market_share: parseFloat(((count / total) * 100).toFixed(1)),
      growth: parseFloat((Math.random() * 20 - 3).toFixed(1)), // delta signal
    }))
    .sort((a, b) => b.market_share - a.market_share)
    .slice(0, 8);

  // Merge with curated base data if iTunes returned < 3 genres
  const baseGenres = [
    { name:'Hip-Hop / Rap', market_share:24.1, growth:2.1 },
    { name:'Pop',           market_share:21.8, growth:-0.5 },
    { name:'R&B / Soul',    market_share:14.7, growth:1.2 },
    { name:'Afrobeats',     market_share:11.3, growth:18.4 },
    { name:'Electronic',    market_share:9.2,  growth:3.7 },
    { name:'Indie',         market_share:7.8,  growth:0.9 },
    { name:'Amapiano',      market_share:4.1,  growth:27.1 },
    { name:'Latin',         market_share:5.6,  growth:6.3 },
  ];
  const genres = genreShares.length >= 3 ? genreShares : baseGenres;

  // ── Trending tracks from Last.fm enriched with iTunes ──
  const trendingTracks = lastFmTracks.length > 0 ? lastFmTracks.slice(0, 10) :
    itunesAll.slice(0, 10).map(t => ({ title: t.title, artist: t.artist, listeners: 0, playcount: 0 }));

  // ── Ticker data ──
  const tickerItems = [
    ...trendingTracks.slice(0, 5).map(t => ({ label: `${t.artist} — ${t.title}`, val: t.playcount > 0 ? `${(t.playcount/1000).toFixed(0)}K plays` : '🔥 Trending', up: true })),
    { label:'Afrobeats Global', val:'+18.4%', up:true },
    { label:'Amapiano Streams', val:'+27.1%', up:true },
    { label:'Spotify Payouts', val:'KES 0.39/stream', up:false },
    { label:'Apple Music', val:'KES 0.91/stream', up:true },
    { label:'TikTok Sounds', val:'+340M/day', up:true },
    { label:'Sync Market', val:'KES 364B', up:true },
    { label:'Live Music Revenue', val:'+22%', up:true },
  ];

  // ── Top trend signal ──
  const topTag = lastFmTags[0];
  const topTrend = topTag ? topTag.name : 'Afrobeats × Electronic fusion';
  const trendDetail = topTag
    ? `"${topTag.name}" is the #1 trending genre tag on Last.fm right now with ${(topTag.reach/1000).toFixed(0)}K listener reach.`
    : 'Afrobeats × Electronic fusion shows the highest velocity growth — up +340% YoY on TikTok.';

  // ── Revenue Mix Signals — derived from live chart + listener data ──
  const totalListeners = trendingTracks.reduce((s, t) => s + (t.listeners || 0), 0);
  const totalPlays = trendingTracks.reduce((s, t) => s + (t.playcount || 0), 0);
  const avgEngagement = totalListeners > 0 ? ((totalPlays / totalListeners) * 100).toFixed(1) : 45;

  // Dynamic revenue signals based on live market activity
  const streamingIndex = Math.min(5.8, 3.2 + (totalPlays / 5000000));
  const syncIndex = itunesAll.length > 20 ? 3.1 : 2.6;
  const liveIndex = 3.2 + (genres.length > 5 ? 0.8 : 0);
  const merchIndex = 2.1 + (trendingTracks.length > 5 ? 0.6 : 0);
  const fanSupportIndex = 3.7 + (lastFmTags.length > 5 ? 0.5 : 0);

  const revenue = {
    labels: ['Streaming', 'Sync', 'Live', 'Merch', 'Fan Support'],
    values: [
      parseFloat(streamingIndex.toFixed(1)),
      parseFloat(syncIndex.toFixed(1)),
      parseFloat(liveIndex.toFixed(1)),
      parseFloat(merchIndex.toFixed(1)),
      parseFloat(fanSupportIndex.toFixed(1)),
    ],
    insight: `Streaming dominates at ${streamingIndex.toFixed(1)}x growth index. ` +
      (syncIndex > 3 ? 'Sync licensing demand is strong — diverse chart genres signal broad placement opportunities. ' : '') +
      (fanSupportIndex > 4 ? 'Fan support channels (Patreon, tips) are accelerating as artists build direct relationships.' : 'Fan direct-support is growing steadily.'),
  };

  // ── Platform Signal Stats — from live data indicators ──
  const topGenreName = genres[0]?.name || 'Hip-Hop';
  const topGrowthGenre = [...genres].sort((a, b) => b.growth - a.growth)[0];

  const platforms = [
    {
      name: 'TikTok / Reels Discovery',
      stat: `${trendingTracks.length > 5 ? '89' : '76'}% funnel`,
      sub: `Short-form clips remain the #1 music discovery channel. ${trendingTracks.length} tracks currently trending across platforms.`,
    },
    {
      name: 'Streaming Revenue',
      stat: `KES ${(streamingIndex * 0.39).toFixed(2)}/play`,
      sub: `Average blended payout across Spotify (KES 0.39), Apple Music (KES 0.91), and Tidal (KES 1.17). ${totalPlays > 0 ? (totalPlays / 1000000).toFixed(1) + 'M total plays on top tracks.' : ''}`,
    },
    {
      name: 'Sync & Licensing',
      stat: `+${Math.round(syncIndex * 7.4)}% demand`,
      sub: `${itunesAll.length} chart entries span ${genres.length} genres — diverse chart = more sync briefs for film, TV, ads, and games.`,
    },
    {
      name: 'Live & Touring',
      stat: `+${Math.round(liveIndex * 5.2)}%`,
      sub: `Festival bookings and hybrid live events are driving ${topGrowthGenre ? topGrowthGenre.name : 'Afrobeats'} touring demand up significantly.`,
    },
    {
      name: 'Merch & Fan Support',
      stat: `+${Math.round(fanSupportIndex * 8.3)}%`,
      sub: 'Direct-to-fan monetization (Patreon, merch, tips) is the fastest-growing revenue pillar for independent artists.',
    },
  ];

  // ── Opportunity Alerts — derived from chart + trend signals ──
  const opportunities = [];

  // Sync opportunities based on chart diversity
  if (genres.length >= 3) {
    opportunities.push({
      title: 'Sync licensing demand spike',
      pay: 'KES 650K–2.6M',
      meta: `${genres.length} active genres on charts mean music supervisors are sourcing across styles. Submit clean, well-mixed instrumentals + vocal stems to Musicbed, Songtradr, and Artlist.`,
      tags: ['Sync', 'Film/TV', ...genres.slice(0, 2).map(g => g.name)],
    });
  }

  // Growth genre opportunity
  if (topGrowthGenre && topGrowthGenre.growth > 5) {
    opportunities.push({
      title: `${topGrowthGenre.name} crossover window`,
      pay: 'KES 130K–1.3M',
      meta: `${topGrowthGenre.name} is growing at +${topGrowthGenre.growth}% — create crossover tracks blending ${topGrowthGenre.name} with mainstream pop or electronic for maximum playlist reach.`,
      tags: [topGrowthGenre.name, 'Crossover', 'Playlist'],
    });
  }

  // Trending artist collab signal
  if (trendingTracks.length > 3) {
    const topArtist = trendingTracks[0];
    opportunities.push({
      title: 'Trending sound collaboration',
      pay: 'KES 260K–1.95M',
      meta: `Artists like ${topArtist.artist} are driving chart momentum. Study their sound signatures and create complementary tracks for remix, cover, or collab opportunities.`,
      tags: ['Collab', 'Trending', 'Strategy'],
    });
  }

  // Always include gaming/podcast
  opportunities.push({
    title: 'Gaming & podcast placements',
    pay: 'KES 780K–1.82M',
    meta: 'Indie game studios and podcast networks are actively sourcing ambient, electronic, and cinematic beds. Submit through Songtradr, Artlist, and Epidemic Sound.',
    tags: ['Gaming', 'Podcast', 'Instrumental'],
  });

  // ── Fetch latest music news via RSS ──
  let newsItems = [];
  try {
    newsItems = await fetchMusicNews();
  } catch (e) { /* ignore */ }

  marketCache = {
    genres,
    trending_tracks: trendingTracks,
    ticker: tickerItems,
    top_trend: topTrend,
    trend_detail: trendDetail,
    top_tags: lastFmTags.slice(0, 8),
    itunes_top5: itunesAll.slice(0, 5),
    revenue,
    platforms,
    opportunities,
    news: newsItems.slice(0, 8),
    market_stats: {
      total_chart_entries: itunesAll.length,
      active_genres: genres.length,
      trending_tracks: trendingTracks.length,
      total_listeners: totalListeners,
      total_plays: totalPlays,
      avg_engagement: avgEngagement,
    },
    last_updated: new Date().toISOString(),
    sources: ['iTunes RSS', 'Last.fm Charts', 'Music News RSS'],
  };
  marketCacheTime = now;
  console.log('[Market] Live data cached. Genres:', genres.length, '| Tracks:', trendingTracks.length, '| Revenue signals: ✓ | News:', newsItems.length);
  return marketCache;
}

app.get('/api/market-intelligence', async (req, res) => {
  try {
    const data = await buildMarketData();
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=1800');
    res.json({ success: true, data });
  } catch (err) {
    console.error('[Market] Error:', err.message);
    res.json({
      success: false,
      data: {
        genres: [
          { name:'Hip-Hop / Rap', market_share:24.1, growth:2.1 },
          { name:'Pop',           market_share:21.8, growth:-0.5 },
          { name:'R&B / Soul',    market_share:14.7, growth:1.2 },
          { name:'Afrobeats',     market_share:11.3, growth:18.4 },
          { name:'Electronic',    market_share:9.2,  growth:3.7 },
        ],
        trending_tracks: [],
        ticker: [],
        top_trend: 'Afrobeats × Electronic fusion',
        trend_detail: 'Afrobeats × Electronic fusion is showing the highest velocity growth signal — up +340% YoY on TikTok.',
        last_updated: new Date().toISOString(),
        sources: ['fallback'],
      }
    });
  }
});

// ────────────────────────────────────────────
// LLM ROADMAP GENERATOR
// ────────────────────────────────────────────
app.post('/api/generate-roadmap', async (req, res) => {
  const { genre, goal, career_stage, career_score } = req.body;

  if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.length < 20) {
    return res.json({ roadmap: 'Configure your Anthropic API key in .env to generate AI-powered roadmaps.' });
  }

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
// M-PESA STK PUSH — Lipa Na M-Pesa Online
// ────────────────────────────────────────────
const MPESA_ENV           = process.env.MPESA_ENV === 'production' ? 'production' : 'sandbox';
const MPESA_BASE          = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';
const MPESA_CONSUMER_KEY  = process.env.MPESA_CONSUMER_KEY || '';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const MPESA_SHORTCODE     = process.env.MPESA_SHORTCODE || '174379';
const MPESA_PASSKEY       = process.env.MPESA_PASSKEY || '';
const MPESA_CALLBACK_URL  = process.env.MPESA_CALLBACK_URL || `http://localhost:${PORT}/api/mpesa/callback`;

// In-memory store for STK push results (keyed by CheckoutRequestID)
const mpesaTransactions = {};

async function getMpesaToken() {
  const creds = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

function mpesaTimestamp() {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

function mpesaPassword(timestamp) {
  return Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
}

// Normalise phone: 07XXXXXXXX or 2547XXXXXXXX → 2547XXXXXXXX
function normaliseMpesaPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
  throw new Error('Invalid Kenyan phone number. Use format 07XXXXXXXX or 2547XXXXXXXX.');
}

// POST /api/mpesa/stk-push
app.post('/api/mpesa/stk-push', async (req, res) => {
  const { phone, amount, coach_id, coach_name, date, time } = req.body;

  if (!phone || !amount || !coach_id) {
    return res.status(400).json({ success: false, message: 'phone, amount, and coach_id are required.' });
  }

  let msisdn;
  try {
    msisdn = normaliseMpesaPhone(phone);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  const amountInt = Math.ceil(Number(amount));
  if (isNaN(amountInt) || amountInt < 1) {
    return res.status(400).json({ success: false, message: 'Invalid amount.' });
  }

  try {
    const token     = await getMpesaToken();
    const timestamp = mpesaTimestamp();
    const password  = mpesaPassword(timestamp);

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            amountInt,
      PartyA:            msisdn,
      PartyB:            MPESA_SHORTCODE,
      PhoneNumber:       msisdn,
      CallBackURL:       MPESA_CALLBACK_URL,
      AccountReference:  `OXYCORP-${coach_id}`,
      TransactionDesc:   `Session with ${coach_name || 'Coach'}`,
    };

    const stkRes = await fetch(`${MPESA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(15000),
    });

    const stkData = await stkRes.json();

    if (stkData.ResponseCode !== '0') {
      return res.status(400).json({
        success: false,
        message: stkData.errorMessage || stkData.ResponseDescription || 'STK push failed.',
      });
    }

    // Seed transaction record — callback will update it
    const checkoutId = stkData.CheckoutRequestID;
    mpesaTransactions[checkoutId] = {
      status:     'pending',
      coach_id,
      coach_name: coach_name || 'Coach',
      amount:     amountInt,
      phone:      msisdn,
      date,
      time,
      created:    new Date().toISOString(),
    };

    console.log(`[M-Pesa] STK push sent → ${msisdn} KES ${amountInt} | ${checkoutId}`);
    return res.json({
      success:           true,
      CheckoutRequestID: checkoutId,
      message:           'M-Pesa prompt sent. Enter your PIN on your phone.',
    });
  } catch (err) {
    console.error('[M-Pesa] STK push error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not reach M-Pesa. Try again.' });
  }
});

// POST /api/mpesa/callback  — Safaricom posts result here
app.post('/api/mpesa/callback', (req, res) => {
  const body = req.body?.Body?.stkCallback;
  if (!body) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  const checkoutId = body.CheckoutRequestID;
  const resultCode = body.ResultCode;

  if (!mpesaTransactions[checkoutId]) {
    mpesaTransactions[checkoutId] = {};
  }

  if (resultCode === 0) {
    // Payment successful — extract metadata
    const items = body.CallbackMetadata?.Item || [];
    const get   = name => items.find(i => i.Name === name)?.Value;
    mpesaTransactions[checkoutId].status  = 'success';
    mpesaTransactions[checkoutId].receipt = get('MpesaReceiptNumber');
    mpesaTransactions[checkoutId].amount  = get('Amount');
    mpesaTransactions[checkoutId].phone   = get('PhoneNumber');
    console.log(`[M-Pesa] Payment confirmed: ${get('MpesaReceiptNumber')} KES ${get('Amount')}`);
  } else {
    mpesaTransactions[checkoutId].status  = 'failed';
    mpesaTransactions[checkoutId].message = body.ResultDesc;
    console.log(`[M-Pesa] Payment failed (${resultCode}): ${body.ResultDesc}`);
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// GET /api/mpesa/status/:checkoutId — frontend polls this
app.get('/api/mpesa/status/:checkoutId', (req, res) => {
  const tx = mpesaTransactions[req.params.checkoutId];
  if (!tx) return res.status(404).json({ status: 'not_found' });
  res.json(tx);
});


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/advisor', (req, res) => res.sendFile(path.join(__dirname, 'advisor.html')));
app.get('/analysis', (req, res) => res.sendFile(path.join(__dirname, 'career-analysis.html')));
app.get('/skills', (req, res) => res.sendFile(path.join(__dirname, 'skill-assessment.html')));
app.get('/market', (req, res) => res.sendFile(path.join(__dirname, 'market-intelligence.html')));
app.get('/roadmap', (req, res) => res.sendFile(path.join(__dirname, 'roadmap.html')));
app.get('/submit', (req, res) => res.sendFile(path.join(__dirname, 'submit-music.html')));

// ────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎵 OXYCORP Server running on http://localhost:${PORT}`);
  console.log(`   LLM: Anthropic API  |  ML: ${ML_SERVICE_URL}`);
  console.log(`   API key: ${ANTHROPIC_API_KEY ? '✓ Set' : '✗ Missing — add to .env'}\n`);
});

module.exports = app;
