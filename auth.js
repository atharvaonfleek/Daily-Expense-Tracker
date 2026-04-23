/* ── Xpense · auth.js ── */

let currentUser = null;

/* On page load — check if already logged in */
window.addEventListener('DOMContentLoaded', function () {
  var saved = localStorage.getItem('xpense_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    showPage('welcome');
  }
  // auth page is visible by default in HTML
});

/* ── Show a page ── */
function showPage(name) {
  var pages = { auth: 'authPage', welcome: 'welcomePage', app: 'appPage' };

  // hide all pages
  Object.values(pages).forEach(function(id) {
    var el = document.getElementById(id);
    el.classList.add('is-hidden');
    el.classList.remove('page-in');
  });

  // show the target page
  var target = document.getElementById(pages[name]);
  target.classList.remove('is-hidden');

  // trigger animation on next frame
  setTimeout(function() {
    target.classList.add('page-in');
  }, 10);

  // fill welcome content when showing welcome
  if (name === 'welcome') fillWelcome();
}

/* ── Fill welcome screen ── */
function fillWelcome() {
  if (!currentUser) return;
  var first  = currentUser.name.split(' ')[0];
  var hour   = new Date().getHours();
  var greet  = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';

  document.getElementById('welcomeGreeting').textContent = greet;
  document.getElementById('welcomeName').textContent     = first + '.';
  document.getElementById('welcomeAvatar').textContent   = first.charAt(0).toUpperCase();
}

/* ── Go to main app ── */
function goToApp() {
  if (!currentUser) return;
  var first = currentUser.name.split(' ')[0];
  var hour  = new Date().getHours();
  var greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  document.getElementById('topbarGreet').textContent = greet;
  document.getElementById('topbarName').textContent  = first;
  document.getElementById('userName').textContent    = first;
  document.getElementById('userDot').textContent     = first.charAt(0).toUpperCase();

  showPage('app');

  if (typeof initApp === 'function') {
    initApp();
  }
}

/* ── Switch between Sign in / New here tabs ── */
function switchTab(tab) {
  clearErr();
  if (tab === 'login') {
    document.getElementById('loginForm').classList.remove('is-hidden');
    document.getElementById('signupForm').classList.add('is-hidden');
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('tabSignup').classList.remove('active');
  } else {
    document.getElementById('signupForm').classList.remove('is-hidden');
    document.getElementById('loginForm').classList.add('is-hidden');
    document.getElementById('tabSignup').classList.add('active');
    document.getElementById('tabLogin').classList.remove('active');
  }
}

/* ── Sign up ── */
function handleSignup() {
  var name  = getVal('signupName');
  var email = getVal('signupEmail').toLowerCase();
  var pass  = getVal('signupPassword');
  var conf  = getVal('signupConfirm');

  if (!name)           { showErr('What should we call you?');             return; }
  if (!isEmail(email)) { showErr("That email doesn't look right.");       return; }
  if (pass.length < 6) { showErr('Password needs at least 6 characters.'); return; }
  if (pass !== conf)   { showErr("Passwords don't match.");               return; }

  var users = getUsers();
  if (users[email])    { showErr('Account already exists — sign in instead.'); return; }

  var user = { name: name, email: email, password: pass };
  users[email] = user;
  localStorage.setItem('xpense_users', JSON.stringify(users));

  doLogin(user);
}

/* ── Sign in ── */
function handleLogin() {
  var email = getVal('loginEmail').toLowerCase();
  var pass  = getVal('loginPassword');

  if (!isEmail(email)) { showErr('Enter a valid email address.'); return; }
  if (!pass)           { showErr('Enter your password.');         return; }

  var users = getUsers();
  var user  = users[email];

  if (!user)                  { showErr('No account with that email.'); return; }
  if (user.password !== pass) { showErr('Wrong password.');             return; }

  doLogin(user);
}

/* ── Set current user and go to welcome ── */
function doLogin(user) {
  currentUser = user;
  localStorage.setItem('xpense_user', JSON.stringify(user));
  showPage('welcome');
}

/* ── Sign out ── */
function handleLogout() {
  currentUser = null;
  localStorage.removeItem('xpense_user');

  document.getElementById('loginEmail').value    = '';
  document.getElementById('loginPassword').value = '';
  clearErr();
  switchTab('login');
  showPage('auth');
}

/* ── Show / hide password ── */
function toggleEye(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.textContent = 'hide';
  } else {
    inp.type = 'password';
    btn.textContent = 'show';
  }
}

/* ── Helpers ── */
function getVal(id)    { return document.getElementById(id).value.trim(); }
function isEmail(e)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function getUsers()    { return JSON.parse(localStorage.getItem('xpense_users') || '{}'); }
function showErr(msg)  { document.getElementById('authErr').textContent = msg; }
function clearErr()    { document.getElementById('authErr').textContent = ''; }

/* ── Enter key shortcut ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  var id = document.activeElement ? document.activeElement.id : '';
  if (id === 'loginEmail' || id === 'loginPassword')                              handleLogin();
  if (id === 'signupName' || id === 'signupEmail' ||
      id === 'signupPassword' || id === 'signupConfirm')                          handleSignup();
});