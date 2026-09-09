import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// ==================== DATA ====================
const appsData = [
  { id: 'a1', title: 'Leave Request', icon: 'fa-clipboard-check', category: 'tools', file: 'permission.html' },
  { id: 'a2', title: 'Student Registration', icon: 'fa-id-card', category: 'tools', file: 'rigister.html' },
  { id: 'a3', title: 'School Chat', icon: 'fa-comments', category: 'tools', file: 'chat.html' },
  { id: 'a4', title: 'Announcements', icon: 'fa-newspaper', category: 'tools', file: 'news.html' },
  { id: 'a7', title: 'My Results', icon: 'fa-chart-line', category: 'tools', file: 'results.html' },
  { id: 'a10', title: 'Quizzes (soon)', icon: 'fa-pen-to-square', category: 'learning', file: 'soon.html' },
  { id: 'a11', title: 'Games', icon: 'fa-gamepad', category: 'fun', file: 'game.html' },
  { id: 'a8', title: 'Developer Info', icon: 'fa-code', category: 'learning', file: 'dev.html' },
  { id: 'a12', title: '12HUB (soon)', icon: 'fa-book-open-reader', category: 'learning', file: 'soon.html' }
];

const staffData = [
  { name: 'Mr. Dejene', role: 'director', roleLabel: 'Director', subject: 'School Leadership', img: 'djne.png', bio: 'Visionary leader with 20+ years in education.' },
  { name: 'Mr. PLACEHOLDER', role: 'leader', roleLabel: 'Unit Leader', subject: 'Administration', img: 'teacher.jpg', bio: 'NO info yet!' },
  { name: 'Ms. PLACEHOLDER', role: 'teacher', roleLabel: 'Teacher', subject: 'Mathematics', img: 'teacher.jpg', bio: 'NO info yet!' },
  { name: 'Mr. PLACEHOLDER', role: 'teacher', roleLabel: 'Teacher', subject: 'Science', img: 'teacher.jpg', bio: 'NO info yet!' },
  { name: 'Ms. PLACEHOLDER', role: 'teacher', roleLabel: 'Teacher', subject: 'English', img: 'teacher.jpg', bio: 'NO info yet!' }
];
const achieversData = [
  { name: 'Jamal Abdisa', cat: 'gpa', achievement: '4.0 GPA Valedictorian', img: 'he.jpg' },
  { name: 'Alazar Alemayew', cat: 'it', achievement: 'National Coding Champion', img: 'he.jpg' },
  { name: 'Meaza Ylma', cat: 'gpa', achievement: '3.9 GPA Honor Roll', img: 'she.jpg' },
  { name: 'Samrawit Ytages', cat: 'art', achievement: 'Regional Art Competition Winner', img: 'she.jpg' },
  { name: 'Ezra Tadele', cat: 'football', achievement: 'Team Captain Regional Finals', img: 'he.jpg' },
  { name: 'Olana Debele', cat: 'debate', achievement: 'Regional Debate Champion', img: 'he.jpg' },
  { name: 'Fikir Habtamu', cat: 'it', achievement: 'Lead System Developer', img: 'he.jpg' }
];

const timelineData = [
  { year: '2005', title: 'Foundation', desc: 'Seden Adea was founded with a vision to revolutionize education.', details: 'Established with an initial batch of 50 students.' },
  { year: '2010', title: 'First Expansion', desc: 'Added new campus wing and digital tools.', details: 'Introduced the first computer lab with 60 workstations.' },
  { year: '2015', title: 'Digital Transformation', desc: 'Launched Smart School Platform.', details: 'Won National Education Innovation Award for digital integration.' },
  { year: '2024', title: 'SASS 2.0', desc: 'Complete platform redesign with 24+ tools.', details: 'Introduced AI Assistant, digital results, and gamified learning.' }
];

const phrasesByLang = {
  en: ['Learn Smarter, Not Harder', 'AI-Powered Insights', 'Real-time Collaboration', 'Gamified Learning'],
  am: ['በብልህነት ተማር፣ እንጂ በልፋት አይደለም', 'በ AI የተደገፈ ትምህርት', 'በእውነተኛ ጊዜ ትብብር', 'በጨዋታ የተደገፈ ትምህርት'],
  om: ['Ammayyaa Baradhu', 'Yaada AI-in gargaarame', 'Hojii yeroo dhugaa', 'Barnoota taphaan']
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ==================== LANGUAGE ====================
const translations = {
  en: {
    onboarding_title: "Welcome to SASS", onboarding_subtitle: "Tell us about yourself", get_started: "Get Started",
    nav_home: "Home", nav_about: "About", nav_staff: "Staff", nav_achievers: "Achievers", nav_history: "History", nav_apps: "Apps",
    sign_in: "Sign In",
    hero_title: "Smart School Platform", hero_students: "Students", hero_teachers: "Teachers", hero_tools: "Smart Tools",
    about_title: "About Our School", about_subtitle: "Learn about our institution, statistics, and location",
    school_name: "Seden Adea Secondary School", school_address: "Bishoftu, Ethiopia",
    school_hours: "Mon–Fri: 8:00 AM – 4:00 PM", school_established: "Established: 2005",
    school_description: "Seden Adea is a premier secondary school in Bishoftu dedicated to academic excellence, discipline, and innovation, preparing students for university and beyond.",
    staff_title: "Our Staff", staff_subtitle: "Meet our dedicated team of educators",
    achievers_title: "Top Achievers", achievers_subtitle: "Celebrating student excellence across all fields",
    ach_all: "All", ach_gpa: "GPA", ach_it: "IT", ach_football: "Football", ach_art: "Art", ach_debate: "Debate",
    history_title: "School History", history_subtitle: "Our journey through the years",
    apps_title: "Smart Apps", apps_subtitle: "Browse our collection of smart learning tools",
    app_filter_all: "All Categories", app_filter_learning: "Learning", app_filter_tools: "Tools", app_filter_fun: "Fun",
    search_apps: "Search apps...",
    footer_call: "Call Us", footer_email: "Email", footer_home: "Home",
    footer_copy: "© 2024 Seden Adea Secondary School – Smart Academic School System. All rights reserved.",
    profile_name_label: "Name", profile_subject_label: "Favorite Subject", profile_class_label: "Class",
    save_profile: "Save Profile", favorite_apps_title: "Favorite Apps", reset_data: "Reset All Data",
    toggle_theme: "Toggle Theme", logout: "Logout",
    name_placeholder: "Your Name", subject_placeholder: "Favorite Subject", class_placeholder: "Your Class (e.g. Grade 10)",
  },
  am: {
    onboarding_title: "እንኳን ወደ SASS በደህና መጡ", onboarding_subtitle: "ስለራስዎ ይንገሩን", get_started: "ይጀምሩ",
    nav_home: "መነሻ", nav_about: "ስለ እኛ", nav_staff: "ሰራተኞች", nav_achievers: "ምርጥ ተማሪዎች", nav_history: "ታሪክ", nav_apps: "መተግበሪያዎች",
    sign_in: "ግባ",
    hero_title: "ዘመናዊ የትምህርት ቤት ሥርዓት", hero_students: "ተማሪዎች", hero_teachers: "አስተማሪዎች", hero_tools: "ስማርት መሳሪያዎች",
    about_title: "ስለ ትምህርት ቤታችን", about_subtitle: "ስለ ተቋማችን፣ ስታቲስቲክስ እና አድራሻ ይወቁ",
    school_name: "ሰደን አዳ ሁለተኛ ደረጃ ትምህርት ቤት", school_address: "ቢሾፍቱ፣ ኢትዮጵያ",
    school_hours: "ሰኞ–አርብ፡ 2:00 – 10:00 (በሀገር ውስጥ ሰዓት)", school_established: "የተቋቋመው: 1997 ዓ.ም",
    school_description: "ሰደን አዳ በቢሾፍቱ የሚገኝ ከፍተኛ ደረጃ ያለው ሁለተኛ ደረጃ ትምህርት ቤት ሲሆን ለትምህርታዊ ጥራትና ፈጠራ የቆመ ነው።",
    staff_title: "ሰራተኞቻችን", staff_subtitle: "የኛን ቁርጠኛ አስተማሪዎችን ይተዋወቁ",
    achievers_title: "ምርጥ ተማሪዎች", achievers_subtitle: "በሁሉም ዘርፍ የተማሪዎችን የላቀ ውጤት እናከብራለን",
    ach_all: "ሁሉም", ach_gpa: "GPA", ach_it: "IT", ach_football: "እግር ኳስ", ach_art: "ሥነ ጥበብ", ach_debate: "ክርክር",
    history_title: "የትምህርት ቤቱ ታሪክ", history_subtitle: "በዓመታት ውስጥ ያለው ጉዟችን",
    apps_title: "ስማርት መተግበሪያዎች", apps_subtitle: "የኛን ስማርት የትምህርት መሳሪያዎች ይወቁ",
    app_filter_all: "ሁሉም ምድቦች", app_filter_learning: "ትምህርት", app_filter_tools: "መሳሪያዎች", app_filter_fun: "መዝናኛ",
    search_apps: "መተግበሪያዎችን ይፈልጉ...",
    footer_call: "ይደውሉ", footer_email: "ኢሜል", footer_home: "መነሻ",
    footer_copy: "© 2024 ሰደን አዳ ሁለተኛ ደረጃ ትምህርት ቤት – ስማርት አካዳሚክ ትምህርት ቤት ሲስተም. ሁሉም መብቶች የተጠበቁ ናቸው.",
    profile_name_label: "ስም", profile_subject_label: "የሚወዱት ትምህርት", profile_class_label: "ክፍል",
    save_profile: "መገለጫ አስቀምጥ", favorite_apps_title: "ተወዳጅ መተግበሪያዎች", reset_data: "ሁሉንም ውሂብ አጥፋ",
    toggle_theme: "ገጽታ ቀይር", logout: "ውጣ",
    name_placeholder: "ስምዎ", subject_placeholder: "የሚወዱት ትምህርት", class_placeholder: "ክፍልዎ (ለምሳሌ 10ኛ ክፍል)",
  },
  om: {
    onboarding_title: "Baga nagaan SASS dhuftan", onboarding_subtitle: "Waa'ee keessan nutti himaa", get_started: "Jalqabi",
    nav_home: "Seensa", nav_about: "Waa'ee", nav_staff: "Hojjattoota", nav_achievers: "Milkaa'oota", nav_history: "Seenaa", nav_apps: "Appilikeeshinii",
    sign_in: "Galmaa'i",
    hero_title: "Sirna Barnootaa Ammayyaa", hero_students: "Barattoota", hero_teachers: "Barsiisota", hero_tools: "Meeshaalee Smart",
    about_title: "Waa'ee Mana Barnootaa Keenyaa", about_subtitle: "Waa'ee dhaabbata keenyaa, istaatistiksii fi bakka jireenyaa baradhaa",
    school_name: "Mana Barnootaa Sadarkaa Lammaffaa Sadan Addaa", school_address: "Bishooftuu, Itoophiyaa",
    school_hours: "Wiixata–Jimaata: 8:00 AM – 4:00 PM", school_established: "Kan hundeefame: 2005",
    school_description: "Sadan Addaa mana barnootaa sadarkaa lammaffaa olaanaa Bishooftuu keessatti argamu kan akkaataan barnootaa fi haaromsaaf of kennedha.",
    staff_title: "Hojjattoota Keenyaa", staff_subtitle: "Barsiisota keenyaa of kennoo ta'an wal barri",
    achievers_title: "Milkaa'oota Gurguddoo", achievers_subtitle: "Barattoota hundumaa keessatti milkaa'ina argataniif kabaja",
    ach_all: "Hunda", ach_gpa: "GPA", ach_it: "IT", ach_football: "Kubbaa Miillaa", ach_art: "Aartii", ach_debate: "Falmii",
    history_title: "Seenaa Mana Barnootaa", history_subtitle: "Imala keenya waggaawwan keessa",
    apps_title: "Appilikeeshinii Smart", apps_subtitle: "Meeshaalee barnootaa keenyaa sakatta'i",
    app_filter_all: "Ramaddii Hunda", app_filter_learning: "Barnoota", app_filter_tools: "Meeshaalee", app_filter_fun: "Bashannana",
    search_apps: "Appilikeeshinii barbaadi...",
    footer_call: "Bilbilaa", footer_email: "Email", footer_home: "Seensa",
    footer_copy: "© 2024 Sadan Addaa – Sirna Barnoota Smart. Mirgi hundi eegamaadha.",
    profile_name_label: "Maqaa", profile_subject_label: "Barnoota Jaallattu", profile_class_label: "Kutaa",
    save_profile: "Profile Olkaa'i", favorite_apps_title: "Appilikeeshinii Jaallattan", reset_data: "Daataa Hunda Haqi",
    toggle_theme: "Theme Jijjiiri", logout: "Ba'i",
    name_placeholder: "Maqaa Kee", subject_placeholder: "Barnoota Jaallattu", class_placeholder: "Kutaa Kee (fkn Grade 10)",
  }
};

let currentLang = localStorage.getItem('sass_lang') || 'en';
let theme = localStorage.getItem('sass_theme') || 'dark';
let favorites = JSON.parse(localStorage.getItem('sass_favorites') || '[]');
let userProfileData = null;
let currentUser = null;
let heroCounted = false;
let achieverCat = 'all';
let pIdx = 0, cIdx = 0, deleting = false;
let botHideTimer, botDragOffset, botWasDragged, botStartPos;
let botX = window.innerWidth - 70, botY = window.innerHeight - 120;
let mapZoom = 1;
let statsChart = null;

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('sass_lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) el.textContent = translations[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang] && translations[lang][key]) el.placeholder = translations[lang][key];
  });
  const langSelect = $('#lang-select');
  if (langSelect) langSelect.value = lang;
  restartTyping();
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const icon = document.querySelector('#theme-toggle i');
  if (icon) icon.className = t === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  localStorage.setItem('sass_theme', t);
  initSchoolStatsChart();
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('#toast-container').appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function typeLoop() {
  const phrases = phrasesByLang[currentLang] || phrasesByLang.en;
  const cur = phrases[pIdx];
  if (!cur) return setTimeout(typeLoop, 200);
  const typingSpan = $('#typing-span');
  if (!typingSpan) return;
  
  if (deleting) {
    typingSpan.textContent = cur.substring(0, cIdx - 1);
    cIdx--;
    if (cIdx <= 0) { deleting = false; pIdx = (pIdx + 1) % phrases.length; }
    setTimeout(typeLoop, 38);
  } else {
    typingSpan.textContent = cur.substring(0, cIdx + 1);
    cIdx++;
    if (cIdx >= cur.length) { setTimeout(() => { deleting = true; typeLoop(); }, 1700); }
    else setTimeout(typeLoop, 65);
  }
}

function restartTyping() {
  pIdx = 0; cIdx = 0; deleting = false;
  const span = $('#typing-span');
  if (span) span.textContent = '';
  typeLoop();
}

async function fetchUserProfile(uid) {
  const cols = ['admins', 'teachers', 'students'];
  try {
    const queries = cols.map(col => getDocs(query(collection(db, col), where('uid', '==', uid))));
    const results = await Promise.allSettled(queries);
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled' && !results[i].value.empty) {
        const data = results[i].value.docs[0].data();
        return {
          name: data.name || data.displayName || '',
          email: currentUser?.email || data.email || '',
          role: cols[i].slice(0, -1),
          docId: results[i].value.docs[0].id,
          collection: cols[i],
          subject: data.subject || '',
          class: data.class || ''
        };
      }
    }
  } catch (e) {
    console.error('Error fetching profile:', e);
  }
  return null;
}

function updateAuthUI() {
  const signInBtn = $('#sign-in-btn');
  const profileBtn = $('#profile-btn');
  const emailEl = $('#profile-email-display');
  const nameEl = $('#profile-name-display');
  const roleEl = $('#profile-role-display');
  const inputEl = $('#profile-edit-name');

  if (currentUser) {
    if (signInBtn) signInBtn.style.display = 'none';
    if (profileBtn) profileBtn.style.display = 'inline-flex';
    if (emailEl) emailEl.textContent = userProfileData?.email || currentUser.email || '';
    if (nameEl) nameEl.textContent = userProfileData?.name || currentUser.email?.split('@')[0] || 'User';
    if (roleEl) roleEl.textContent = userProfileData?.role ? userProfileData.role.toUpperCase() : '';
    if (inputEl) inputEl.value = userProfileData?.name || '';
  } else {
    if (signInBtn) signInBtn.style.display = 'inline-flex';
    if (profileBtn) profileBtn.style.display = 'none';
    if (emailEl) emailEl.textContent = '';
    const local = JSON.parse(localStorage.getItem('sass_profile') || 'null');
    if (nameEl) nameEl.textContent = local?.name || 'Guest User';
    if (inputEl) inputEl.value = local?.name || '';
    if (roleEl) roleEl.textContent = '';
  }
}

function showProfileLoading(show) {
  const el = $('#profile-loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  updateAuthUI();
  if (user) {
    showProfileLoading(true);
    userProfileData = await fetchUserProfile(user.uid);
    showProfileLoading(false);
    updateAuthUI();
    const onboarding = $('#onboarding-overlay');
    if (onboarding) onboarding.classList.remove('active');
  } else {
    userProfileData = null;
    updateAuthUI();
    const local = JSON.parse(localStorage.getItem('sass_profile') || 'null');
    if (!local?.name) {
      setTimeout(() => {
        const onboarding = $('#onboarding-overlay');
        if (onboarding) onboarding.classList.add('active');
      }, 700);
    }
  }
});

const signInBtn = $('#sign-in-btn');
if (signInBtn) signInBtn.addEventListener('click', () => window.location.href = 'login.html');
const logoutBtn = $('#logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  closeSidebar();
});

function openSidebar() {
  const sidebar = $('#profile-sidebar');
  if (sidebar) sidebar.classList.add('open');
  const overlay = $('#sidebar-overlay');
  if (overlay) overlay.classList.add('active');
  renderFavList();
  updateAuthUI();
}

function closeSidebar() {
  const sidebar = $('#profile-sidebar');
  if (sidebar) sidebar.classList.remove('open');
  const overlay = $('#sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
}

const profileBtn = $('#profile-btn');
if (profileBtn) profileBtn.onclick = openSidebar;
const closeSidebarBtn = $('#close-sidebar');
if (closeSidebarBtn) closeSidebarBtn.onclick = closeSidebar;
const sidebarOverlay = $('#sidebar-overlay');
if (sidebarOverlay) sidebarOverlay.onclick = closeSidebar;

const onboardSave = $('#onboard-save-btn');
if (onboardSave) onboardSave.onclick = () => {
  const name = $('#onboard-name').value.trim();
  if (!name) { showToast('Please enter your name'); return; }
  localStorage.setItem('sass_profile', JSON.stringify({
    name,
    subject: $('#onboard-subject').value.trim(),
    class: $('#onboard-class').value.trim()
  }));
  const onboarding = $('#onboarding-overlay');
  if (onboarding) onboarding.classList.remove('active');
  updateAuthUI();
  showToast('Welcome, ' + name + '!');
};

window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = $('#loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 400);
    }
  }, 400);
  applyLanguage(currentLang);
  initSchoolStatsChart();
  observeHeroCounters();
  setTimeout(renderStaff, 100);
  setTimeout(renderAchievers, 150);
  setTimeout(renderTimeline, 200);
  renderAllApps();
});

window.scrollToSection = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

function observeHeroCounters() {
  const hero = $('#hero');
  if (!hero) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !heroCounted) { heroCounted = true; animateCounters(); }
  }, { threshold: 0.25 });
  obs.observe(hero);
  setTimeout(() => { if (!heroCounted) { heroCounted = true; animateCounters(); } }, 1800);
}

function animateCounters() {
  $$('#hero .stat-num').forEach(el => {
    const tgt = parseInt(el.dataset.target);
    const dur = 1600, st = performance.now();
    function upd(ts) {
      const prog = Math.min((ts - st) / dur, 1);
      el.textContent = Math.floor(prog * tgt).toLocaleString() + '+';
      if (prog < 1) requestAnimationFrame(upd);
      else el.textContent = tgt.toLocaleString() + '+';
    }
    requestAnimationFrame(upd);
  });
}

function renderStaff() {
  const grid = $('#staff-grid');
  if (!grid) return;
  grid.innerHTML = '';
  staffData.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'teacher-card';
    card.innerHTML = `<div class="image-zone"><img class="teacher-img" src="${s.img}" alt="${s.name}" loading="lazy"></div><h3 class="teacher-name">${s.name}</h3><span class="teacher-role ${s.role}">${s.roleLabel}</span><div class="teacher-subject">${s.subject}</div>`;
    card.onclick = () => openStaffModal(s);
    grid.appendChild(card);
  });
}

function openStaffModal(s) {
  const content = $('#staff-modal-content');
  if (!content) return;
  content.innerHTML = `<img src="${s.img}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid var(--border);margin-bottom:12px;"><h3>${s.name}</h3><span class="teacher-role ${s.role}" style="display:inline-block;margin:8px 0;">${s.roleLabel}</span><p style="color:var(--text2);margin-bottom:8px;">${s.subject}</p><p style="font-size:0.95rem;">${s.bio}</p>`;
  openModal('staff-modal');
}

function renderAchievers() {
  const grid = $('#achievers-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const list = achieverCat === 'all' ? achieversData : achieversData.filter(a => a.cat === achieverCat);
  list.forEach((a) => {
    const card = document.createElement('div');
    card.className = 'achiever-card';
    card.innerHTML = `<div class="ach-img-wrap"><img src="${a.img}" alt="${a.name}" loading="lazy"></div><h4>${a.name}</h4><p class="ach-desc">${a.achievement}</p><span class="ach-cat-tag">${a.cat}</span>`;
    grid.appendChild(card);
  });
}

const achieverCategories = $('#achiever-categories');
if (achieverCategories) achieverCategories.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  $$('#achiever-categories button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  achieverCat = btn.dataset.cat;
  renderAchievers();
});

function renderTimeline() {
  const tl = $('#timeline');
  if (!tl) return;
  tl.innerHTML = '';
  timelineData.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `<div class="pin"></div><div class="timeline-card"><span class="year">${ev.year}</span><h3>${ev.title}</h3><p style="color:var(--text2);font-size:0.9rem;">${ev.desc}</p></div>`;
    item.querySelector('.timeline-card').onclick = e => {
      e.stopPropagation();
      const titleEl = $('#timeline-modal-title');
      if (titleEl) titleEl.textContent = ev.year + ' - ' + ev.title;
      const descEl = $('#timeline-modal-desc');
      if (descEl) descEl.textContent = ev.details;
      openModal('timeline-modal');
    };
    tl.appendChild(item);
  });
}

function saveFavs() { localStorage.setItem('sass_favorites', JSON.stringify(favorites)); }
function toggleFav(id) {
  const idx = favorites.indexOf(id);
  if (idx > -1) { favorites.splice(idx, 1); showToast('Removed from favorites'); }
  else { favorites.push(id); showToast('Added to favorites'); }
  saveFavs();
  renderAllApps();
  renderFavList();
}
function isFav(id) { return favorites.includes(id); }

function createAppCard(app) {
  const card = document.createElement('div');
  card.className = 'app-card';
  card.setAttribute('data-category', app.category);
  card.innerHTML = `<button class="btn-fav-app ${isFav(app.id) ? 'favorited' : ''}" data-app-id="${app.id}"><i class="fa-solid fa-heart"></i></button><div class="app-icon-wrap"><i class="fa-solid ${app.icon}"></i></div><h4>${app.title}</h4>`;
  card.querySelector('.btn-fav-app').onclick = e => { e.stopPropagation(); toggleFav(app.id); };
  card.onclick = () => openAppIframe(app);
  return card;
}

function renderAllApps() {
  const catV = $('#app-category-filter')?.value || 'all';
  const searchV = ($('#app-search-local')?.value || '').toLowerCase();
  const filtered = appsData.filter(a => (catV === 'all' || a.category === catV) && (!searchV || a.title.toLowerCase().includes(searchV)));
  const grid = $('#apps-grid');
  if (!grid) return;
  grid.innerHTML = '';
  filtered.forEach(a => grid.appendChild(createAppCard(a)));
}

// Opens apps in the 100% Full-Screen App Overlay
function openAppIframe(app) {
  const titleEl = $('#full-app-title');
  if (titleEl) titleEl.textContent = app.title;
  const iframe = $('#full-app-iframe');
  if (iframe) iframe.src = app.file;
  const overlay = $('#app-fullscreen-view');
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Back button handler for the full-screen view container
const btnBackApps = $('#btn-back-apps');
if (btnBackApps) {
  btnBackApps.onclick = () => {
    const overlay = $('#app-fullscreen-view');
    if (overlay) overlay.classList.remove('active');
    const iframe = $('#full-app-iframe');
    if (iframe) iframe.src = '';
    document.body.style.overflow = '';
  };
}

function renderFavList() {
  const list = $('#fav-list-sidebar');
  if (!list) return;
  list.innerHTML = '';
  if (favorites.length === 0) { list.innerHTML = '<li style="color:var(--text2);font-size:0.9rem;">No favorites added.</li>'; return; }
  favorites.forEach(fid => {
    const app = appsData.find(a => a.id === fid);
    if (!app) return;
    const li = document.createElement('li');
    li.style = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg); padding:8px 12px; border-radius:8px; font-size:0.9rem;';
    li.innerHTML = `<span><i class="fa-solid ${app.icon}" style="margin-right:8px; color:var(--blue);"></i> ${app.title}</span><button data-remove="${fid}" style="background:none; border:none; color:var(--text2); cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>`;
    li.querySelector('button').onclick = () => { toggleFav(fid); renderFavList(); };
    list.appendChild(li);
  });
}

const iframeClose = $('#iframe-close-btn');
if (iframeClose) iframeClose.onclick = () => {
  const overlay = $('#iframe-overlay');
  if (overlay) overlay.classList.remove('active');
  const iframe = $('#iframe-content');
  if (iframe) iframe.src = '';
  document.body.style.overflow = '';
};
const iframeOverlay = $('#iframe-overlay');
if (iframeOverlay) iframeOverlay.addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('active');
    const iframe = $('#iframe-content');
    if (iframe) iframe.src = '';
    document.body.style.overflow = '';
  }
});
const appCategoryFilter = $('#app-category-filter');
if (appCategoryFilter) appCategoryFilter.addEventListener('change', renderAllApps);
const appSearchLocal = $('#app-search-local');
if (appSearchLocal) appSearchLocal.addEventListener('input', renderAllApps);

const mapZoomIn = $('#map-zoom-in');
if (mapZoomIn) mapZoomIn.onclick = () => { mapZoom = Math.min(2.5, mapZoom + 0.2); const mi = $('#map-inner'); if (mi) mi.style.transform = `scale(${mapZoom})`; };
const mapZoomOut = $('#map-zoom-out');
if (mapZoomOut) mapZoomOut.onclick = () => { mapZoom = Math.max(0.5, mapZoom - 0.2); const mi = $('#map-inner'); if (mi) mi.style.transform = `scale(${mapZoom})`; };
const mapZoomReset = $('#map-zoom-reset');
if (mapZoomReset) mapZoomReset.onclick = () => { mapZoom = 1; const mi = $('#map-inner'); if (mi) mi.style.transform = 'scale(1)'; };

window.openModal = id => {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
};
window.closeModal = id => {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
};
$$('.modal-overlay').forEach(m => m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); }));

// ==================== FLOATING BOT (Mobile touch support + 80% overlay) ====================
const bot = $('#floating-bot');
function positionBot() {
  if (!bot) return;
  bot.style.left = botX + 'px';
  bot.style.top = botY + 'px';
  bot.style.right = 'auto';
  bot.style.bottom = 'auto';
}
function hideBotToEdge() {
  if (!bot) return;
  const rect = bot.getBoundingClientRect();
  const w = window.innerWidth;
  const distLeft = rect.left;
  const distRight = w - rect.right;
  let tx = (distLeft < distRight) ? -rect.left - 15 : w - rect.right + 15;
  bot.style.transform = `translate(${tx}px, 0)`;
  bot.classList.add('hiding');
}
function resetBot() {
  if (!bot) return;
  bot.classList.remove('hiding');
  bot.style.transform = '';
  clearTimeout(botHideTimer);
  botHideTimer = setTimeout(hideBotToEdge, 5000);
}

if (bot) {
  const startDrag = (clientX, clientY) => {
    botWasDragged = false;
    botStartPos = { x: clientX, y: clientY };
    const rect = bot.getBoundingClientRect();
    botDragOffset = { x: clientX - rect.left, y: clientY - rect.top };
    bot.classList.add('dragging');
    resetBot();
  };

  const moveDrag = (clientX, clientY) => {
    if (!bot.classList.contains('dragging')) return;
    if (Math.abs(clientX - botStartPos.x) > 3 || Math.abs(clientY - botStartPos.y) > 3) botWasDragged = true;
    botX = Math.max(0, Math.min(window.innerWidth - 55, clientX - botDragOffset.x));
    botY = Math.max(0, Math.min(window.innerHeight - 55, clientY - botDragOffset.y));
    positionBot();
    resetBot();
  };

  const endDrag = () => {
    if (bot.classList.contains('dragging')) {
      bot.classList.remove('dragging');
      if (!botWasDragged) {
        const iframeTitle = $('#iframe-title');
        if (iframeTitle) iframeTitle.textContent = 'AI Assistant';
        const iframeContent = $('#iframe-content');
        if (iframeContent) iframeContent.src = 'ai.html';
        const iframeOverlay = $('#iframe-overlay');
        if (iframeOverlay) iframeOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
      resetBot();
    }
  };

  // Mouse events
  bot.addEventListener('mousedown', e => { if (e.button === 0) startDrag(e.clientX, e.clientY); });
  document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', endDrag);

  // Touch events for Mobile
  bot.addEventListener('touchstart', e => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  document.addEventListener('touchend', endDrag);

  positionBot();
  resetBot();
  window.addEventListener('resize', () => {
    botX = Math.min(botX, window.innerWidth - 55);
    botY = Math.min(botY, window.innerHeight - 55);
    positionBot();
  });
}

function initSchoolStatsChart() {
  const canvas = $('#school-stats-chart');
  if (!canvas) return;

  if (statsChart) {
    statsChart.destroy();
    statsChart = null;
  }

  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue('--blue').trim() || '#38bdf8';
  const accent = styles.getPropertyValue('--purple').trim() || '#818cf8';
  const textColor = styles.getPropertyValue('--text2').trim() || '#a0a0a0';

  statsChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'],
      datasets: [
        { label: 'Students', data: [800, 1100, 1400, 1700, 2000, 2250, 2450], borderColor: primary, backgroundColor: primary + '14', fill: true, tension: 0.4 },
        { label: 'Teachers', data: [30, 40, 48, 56, 65, 75, 84], borderColor: accent, backgroundColor: accent + '14', fill: true, tension: 0.4 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor }, beginAtZero: true } } }
  });
}

const resetDataBtn = $('#reset-data-btn');
if (resetDataBtn) resetDataBtn.onclick = () => {
  if (confirm('Reset all local data? (Your account remains safe)')) {
    localStorage.removeItem('sass_favorites');
    localStorage.removeItem('sass_profile');
    favorites = [];
    renderAllApps();
    renderFavList();
    closeSidebar();
    updateAuthUI();
  }
};

const themeToggle = $('#theme-toggle');
if (themeToggle) themeToggle.onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(theme); };
const sidebarThemeToggle = $('#sidebar-theme-toggle');
if (sidebarThemeToggle) sidebarThemeToggle.onclick = () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(theme); };

const langSelect = $('#lang-select');
if (langSelect) langSelect.addEventListener('change', (e) => applyLanguage(e.target.value));

const hamburgerBtn = $('#hamburger-btn');
const navLinks = $('#nav-links');
if (hamburgerBtn && navLinks) {
  hamburgerBtn.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });
}

window.addEventListener('scroll', () => {
  const progressBar = document.querySelector('.scroll-progress');
  if (progressBar) {
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = (scrollTop / scrollHeight) * 100;
    progressBar.style.width = progress + '%';
  }
  const nav = document.querySelector('nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});
