/* ── Xpense · auth.js ── */

let currentUser = null;

/* On page load — check if already logged in */
window.addEventListener('DOMContentLoaded', function () {
  // Apply saved theme first
  var savedTheme = localStorage.getItem('xpense_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  var saved = localStorage.getItem('xpense_user');
  if (saved) {
    try {
      var parsed = JSON.parse(saved);
      // Re-verify user still exists in users store (prevents stale sessions)
      var users = getUsers();
      var fresh = users[parsed.email];
      if (fresh && fresh.password === parsed.password) {
        currentUser = fresh;
        showPage('welcome');
        return;
      } else {
        // Stale / tampered session — clear it
        localStorage.removeItem('xpense_user');
      }
    } catch(e) {
      localStorage.removeItem('xpense_user');
    }
  }
  showPage('auth');
});

/* ── Show a page ── */
function showPage(name) {
  var pages = { auth: 'authPage', welcome: 'welcomePage', app: 'appPage' };
  Object.values(pages).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.add('is-hidden'); el.classList.remove('page-in'); }
  });
  var target = document.getElementById(pages[name]);
  if (!target) return;
  target.classList.remove('is-hidden');
  setTimeout(function() { target.classList.add('page-in'); }, 10);
  if (name === 'welcome') fillWelcome();
}

/* ── Fill welcome screen ── */
function fillWelcome() {
  if (!currentUser) return;
  var first = currentUser.name.split(' ')[0];
  var greet = getGreeting();
  document.getElementById('welcomeGreeting').textContent = greet + ',';
  document.getElementById('welcomeName').textContent     = first + '.';
  document.getElementById('welcomeAvatar').textContent   = first.charAt(0).toUpperCase();
}

/* ── Go to main app ── */
function goToApp() {
  if (!currentUser) return;
  var first = currentUser.name.split(' ')[0];
  document.getElementById('topbarGreet').textContent = getGreeting();
  document.getElementById('topbarName').textContent  = first;
  document.getElementById('userName').textContent    = first;
  document.getElementById('userDot').textContent     = first.charAt(0).toUpperCase();
  showPage('app');
  if (typeof initApp === 'function') initApp();
}

/* ── Switch tabs ── */
function switchTab(tab) {
  clearErr();
  var isLogin = tab === 'login';
  document.getElementById('loginForm').classList.toggle('is-hidden', !isLogin);
  document.getElementById('signupForm').classList.toggle('is-hidden', isLogin);
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabSignup').classList.toggle('active', !isLogin);
}

/* ── Sign up ── */
function handleSignup() {
  var name  = getVal('signupName');
  var email = getVal('signupEmail').toLowerCase();
  var pass  = getVal('signupPassword');
  var conf  = getVal('signupConfirm');

  if (!name)                  { showErr('What should we call you?');              return; }
  if (!isValidEmail(email))   { showErr("That email doesn't look right.");        return; }
  if (pass.length < 6)        { showErr('Password needs at least 6 characters.'); return; }
  if (!/[A-Za-z]/.test(pass)) { showErr('Password must contain at least one letter.'); return; }
  if (pass !== conf)          { showErr("Passwords don't match.");                return; }

  var users = getUsers();
  if (users[email]) { showErr('Account already exists — sign in instead.'); return; }

  var user = { name: name, email: email, password: pass, createdAt: Date.now() };
  users[email] = user;
  localStorage.setItem('xpense_users', JSON.stringify(users));
  doLogin(user);
}

/* ── Sign in ── */
function handleLogin() {
  var email = getVal('loginEmail').toLowerCase();
  var pass  = getVal('loginPassword');

  if (!isValidEmail(email)) { showErr('Enter a valid email address.'); return; }
  if (!pass)                 { showErr('Enter your password.');         return; }

  var users = getUsers();
  var user  = users[email];

  // Strict check: account must exist AND password must match exactly
  if (!user)                  { showErr('No account found with that email.');  return; }
  if (user.password !== pass) { showErr('Incorrect password. Try again.');     return; }

  doLogin(user);
}

/* ── Persist login ── */
function doLogin(user) {
  currentUser = user;
  // Store only safe fields (no extra data leakage)
  localStorage.setItem('xpense_user', JSON.stringify({
    name: user.name,
    email: user.email,
    password: user.password
  }));
  showPage('welcome');
}

/* ── Sign out ── */
function handleLogout() {
  currentUser = null;
  localStorage.removeItem('xpense_user');
  ['loginEmail','loginPassword'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  clearErr();
  switchTab('login');
  // Close mobile nav if open
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  showPage('auth');
}

/* ── Show/hide password ── */
function toggleEye(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text';     btn.textContent = 'hide'; }
  else                         { inp.type = 'password'; btn.textContent = 'show'; }
}

/* ── Theme toggle ── */
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'light';
  var next    = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('xpense_theme', next);
  // Update all toggle buttons
  document.querySelectorAll('.theme-icon').forEach(function(el) {
    el.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/* ── Helpers ── */
function getVal(id) { return document.getElementById(id).value.trim(); }

function isValidEmail(email) {
  // RFC-5322-inspired — rejects common typos and missing TLD
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

function getUsers()   { return JSON.parse(localStorage.getItem('xpense_users') || '{}'); }
function showErr(msg) { document.getElementById('authErr').textContent = msg; }
function clearErr()   { document.getElementById('authErr').textContent = ''; }

function getGreeting() {
  var h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* ── Enter key shortcuts ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var id = document.activeElement ? document.activeElement.id : '';
  if (id === 'loginEmail' || id === 'loginPassword') handleLogin();
  if (['signupName','signupEmail','signupPassword','signupConfirm'].includes(id)) handleSignup();
});    var el = document.getElementById(id);
    if (el) { el.classList.add('is-hidden'); el.classList.remove('page-in'); }
  });
  var target = document.getElementById(pages[name]);
  if (!target) return;
  target.classList.remove('is-hidden');
  setTimeout(function() { target.classList.add('page-in'); }, 10);
  if (name === 'welcome') fillWelcome();
}

/* ── Fill welcome screen ── */
function fillWelcome() {
  if (!currentUser) return;
  var first = currentUser.name.split(' ')[0];
  var greet = getGreeting();
  document.getElementById('welcomeGreeting').textContent = greet + ',';
  document.getElementById('welcomeName').textContent     = first + '.';
  document.getElementById('welcomeAvatar').textContent   = first.charAt(0).toUpperCase();
}

/* ── Go to main app ── */
function goToApp() {
  if (!currentUser) return;
  var first = currentUser.name.split(' ')[0];
  document.getElementById('topbarGreet').textContent = getGreeting();
  document.getElementById('topbarName').textContent  = first;
  document.getElementById('userName').textContent    = first;
  document.getElementById('userDot').textContent     = first.charAt(0).toUpperCase();
  showPage('app');
  if (typeof initApp === 'function') initApp();
}

/* ── Switch tabs ── */
function switchTab(tab) {
  clearErr();
  var isLogin = tab === 'login';
  document.getElementById('loginForm').classList.toggle('is-hidden', !isLogin);
  document.getElementById('signupForm').classList.toggle('is-hidden', isLogin);
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabSignup').classList.toggle('active', !isLogin);
}

/* ── Sign up ── */
function handleSignup() {
  var name  = getVal('signupName');
  var email = getVal('signupEmail').toLowerCase();
  var pass  = getVal('signupPassword');
  var conf  = getVal('signupConfirm');

  if (!name)                  { showErr('What should we call you?');              return; }
  if (!isValidEmail(email))   { showErr("That email doesn't look right.");        return; }
  if (pass.length < 6)        { showErr('Password needs at least 6 characters.'); return; }
  if (!/[A-Za-z]/.test(pass)) { showErr('Password must contain at least one letter.'); return; }
  if (pass !== conf)          { showErr("Passwords don't match.");                return; }

  var users = getUsers();
  if (users[email]) { showErr('Account already exists — sign in instead.'); return; }

  var user = { name: name, email: email, password: pass, createdAt: Date.now() };
  users[email] = user;
  localStorage.setItem('xpense_users', JSON.stringify(users));
  doLogin(user);
}

/* ── Sign in ── */
function handleLogin() {
  var email = getVal('loginEmail').toLowerCase();
  var pass  = getVal('loginPassword');

  if (!isValidEmail(email)) { showErr('Enter a valid email address.'); return; }
  if (!pass)                 { showErr('Enter your password.');         return; }

  var users = getUsers();
  var user  = users[email];

  // Strict check: account must exist AND password must match exactly
  if (!user)                  { showErr('No account found with that email.');  return; }
  if (user.password !== pass) { showErr('Incorrect password. Try again.');     return; }

  doLogin(user);
}

/* ── Persist login ── */
function doLogin(user) {
  currentUser = user;
  // Store only safe fields (no extra data leakage)
  localStorage.setItem('xpense_user', JSON.stringify({
    name: user.name,
    email: user.email,
    password: user.password
  }));
  showPage('welcome');
}

/* ── Sign out ── */
function handleLogout() {
  currentUser = null;
  localStorage.removeItem('xpense_user');
  ['loginEmail','loginPassword'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  clearErr();
  switchTab('login');
  // Close mobile nav if open
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  showPage('auth');
}

/* ── Show/hide password ── */
function toggleEye(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text';     btn.textContent = 'hide'; }
  else                         { inp.type = 'password'; btn.textContent = 'show'; }
}

/* ── Theme toggle ── */
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'light';
  var next    = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('xpense_theme', next);
  // Update all toggle buttons
  document.querySelectorAll('.theme-icon').forEach(function(el) {
    el.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

/* ── Helpers ── */
function getVal(id) { return document.getElementById(id).value.trim(); }

function isValidEmail(email) {
  // RFC-5322-inspired — rejects common typos and missing TLD
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

function getUsers()   { return JSON.parse(localStorage.getItem('xpense_users') || '{}'); }
function showErr(msg) { document.getElementById('authErr').textContent = msg; }
function clearErr()   { document.getElementById('authErr').textContent = ''; }

function getGreeting() {
  var h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/* ── Enter key shortcuts ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var id = document.activeElement ? document.activeElement.id : '';
  if (id === 'loginEmail' || id === 'loginPassword') handleLogin();
  if (['signupName','signupEmail','signupPassword','signupConfirm'].includes(id)) handleSignup();
});
