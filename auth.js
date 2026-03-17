/* ═══════════════════════════════════════════════
   EPIC Cars — auth.js  v5
   PERMANENT FIX — single storage key, no migration,
   seed runs only when storage is truly empty
   ═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   SINGLE STORAGE KEY — never changes
   All users (default + admin-created) live here
───────────────────────────────────────────── */
var EPIC_KEY_USERS   = 'epicUsers';
var EPIC_KEY_SESSION = 'epicSession';
var EPIC_KEY_PDFS    = 'epicPDFs';

/* ── Role permissions ── */
var EPIC_PERMS = {
  admin:     { edit:true,  delete:true,  viewAll:true,  manageUsers:true,  pdf:true  },
  staff:     { edit:true,  delete:false, viewAll:false, manageUsers:false, pdf:true  },
  evaluator: { edit:true,  delete:false, viewAll:false, manageUsers:false, pdf:true  },
  sales:     { edit:false, delete:false, viewAll:false, manageUsers:false, pdf:false }
};

/* ═══════════════════════════════════════
   READ / WRITE — completely separate,
   no side effects whatsoever
═══════════════════════════════════════ */
function _readUsers() {
  try {
    var s = localStorage.getItem(EPIC_KEY_USERS);
    if (!s) return null;           /* null = key doesn't exist at all */
    var p = JSON.parse(s);
    return Array.isArray(p) ? p : null;
  } catch(e) {
    console.error('[EPIC] _readUsers error:', e);
    return null;
  }
}

function _writeUsers(arr) {
  try {
    localStorage.setItem(EPIC_KEY_USERS, JSON.stringify(arr));
    return true;
  } catch(e) {
    console.error('[EPIC] _writeUsers error:', e);
    return false;
  }
}

/* ═══════════════════════════════════════
   PUBLIC API
═══════════════════════════════════════ */
function epicGetUsers() {
  /* Returns current user list. If storage is empty, returns defaults
     but does NOT write to storage — caller must save if needed. */
  var stored = _readUsers();
  if (stored !== null) return stored;
  return _getDefaults();
}

function epicSaveUsers(arr) {
  return _writeUsers(arr);
}

function _getDefaults() {
  return [
    { id:1, name:'Administrator', username:'admin',  email:'admin@epiccars.in',  password:'admin123', role:'admin' },
    { id:2, name:'Staff User 1',  username:'staff1', email:'staff1@epiccars.in', password:'staff123', role:'staff' }
  ];
}

/* Seed: write defaults to storage ONLY if key doesn't exist yet */
function epicBootUsers() {
  if (_readUsers() !== null) return;          /* already has data — stop */
  _writeUsers(_getDefaults());
  console.log('[EPIC] Defaults seeded to storage');
}

/* ═══════════════════════════════════════
   SESSION
═══════════════════════════════════════ */
function epicGetSession() {
  try {
    var s = sessionStorage.getItem(EPIC_KEY_SESSION);
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
}

function epicSetSession(user) {
  var s = { id:user.id, username:user.username, role:user.role, name:user.name };
  sessionStorage.setItem(EPIC_KEY_SESSION, JSON.stringify(s));
  return s;
}

function epicClearSession() {
  sessionStorage.removeItem(EPIC_KEY_SESSION);
}

function currentUser() { return epicGetSession(); }

function can(perm) {
  var u = currentUser();
  if (!u) return false;
  var p = EPIC_PERMS[u.role];
  return p ? !!p[perm] : false;
}

/* ═══════════════════════════════════════
   LOGIN / LOGOUT
═══════════════════════════════════════ */
function doLogin(username, password) {
  var users = epicGetUsers();
  var input = (username || '').trim().toLowerCase();

  console.log('[EPIC] Login attempt:', input);
  console.log('[EPIC] Users in storage:', users.map(function(u){ return u.username; }).join(', '));

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var matchUN    = u.username.trim().toLowerCase() === input;
    var matchEmail = u.email && u.email.trim().toLowerCase() === input;
    if ((matchUN || matchEmail) && u.password === password) {
      console.log('[EPIC] Login OK:', u.username, '/', u.role);
      return epicSetSession(u);
    }
  }

  console.log('[EPIC] Login FAILED — no matching user+password');
  return null;
}

function doLogout() {
  epicClearSession();
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-root').style.display     = 'none';
  document.getElementById('login-username').value       = '';
  document.getElementById('login-password').value       = '';
  document.getElementById('login-error').textContent    = '';
}

/* ═══════════════════════════════════════
   SCREEN SWITCHING
═══════════════════════════════════════ */
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-root').style.display     = 'none';
}

function showApp(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-root').style.display     = 'flex';

  var el;
  el = document.getElementById('hdr-name');   if (el) el.textContent = user.name;
  el = document.getElementById('hdr-role');
  if (el) { el.textContent = user.role.toUpperCase(); el.className = 'role-badge role-' + user.role; }
  el = document.getElementById('hdr-avatar'); if (el) el.textContent = user.name.charAt(0).toUpperCase();

  applyPerms(user.role);
}

function applyPerms(role) {
  var p = EPIC_PERMS[role] || {};

  /* Users & Password nav — visible to all (everyone can change own password) */
  var nav = document.getElementById('nav-usermgmt');
  if (nav) nav.style.display = '';

  /* Admin-only cards — hidden for non-admins */
  setTimeout(function() {
    document.querySelectorAll('.admin-only-card').forEach(function(el) {
      el.style.display = p.manageUsers ? '' : 'none';
    });
  }, 150);

  /* Clear All Records button — admin only */
  var cb = document.getElementById('btn-clear-records');
  if (cb) cb.style.display = p.delete ? '' : 'none';

  /* Staff notice banners */
  document.querySelectorAll('.staff-only-notice').forEach(function(el) {
    el.style.display = p.viewAll ? 'none' : 'flex';
  });
}

/* ═══════════════════════════════════════
   LOGIN FORM
═══════════════════════════════════════ */
function handleLogin() {
  var un  = (document.getElementById('login-username').value || '').trim();
  var pw  = document.getElementById('login-password').value  || '';
  var err = document.getElementById('login-error');
  err.textContent = '';

  if (!un || !pw) { err.textContent = 'Please enter username/email and password.'; return; }

  var sess = doLogin(un, pw);
  if (!sess) {
    err.textContent = 'Incorrect username or password.';
    var box = document.getElementById('login-box');
    if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
    return;
  }
  showApp(sess);
}

function togglePw() {
  var f = document.getElementById('login-password');
  if (f) f.type = (f.type === 'password') ? 'text' : 'password';
}

/* ═══════════════════════════════════════
   USER MANAGEMENT
═══════════════════════════════════════ */
function toggleNewUserPw() {
  var f   = document.getElementById('nu-password');
  var eye = document.getElementById('nu-pw-eye');
  if (!f) return;
  f.type = (f.type === 'password') ? 'text' : 'password';
  if (eye) eye.textContent = (f.type === 'text') ? '🙈' : '👁';
}

function renderUserTable() {
  var tb = document.getElementById('users-tbody');
  if (!tb) return;
  var users = epicGetUsers();
  if (!users.length) {
    tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">No users found.</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var actions = (u.username === 'admin')
      ? '<span style="color:var(--muted);font-size:11px;">Protected</span>'
      : '<button class="btn btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="resetPW(' + u.id + ')">🔑 Reset PW</button>'
        + ' <button class="btn btn-ghost" style="padding:4px 10px;font-size:11px;color:#ef4444;border-color:#ef444440;" onclick="removeUser(' + u.id + ')">✕ Delete</button>';
    html += '<tr>'
      + '<td>' + u.name + '</td>'
      + '<td><code style="color:var(--accent)">' + u.username + '</code></td>'
      + '<td><span class="role-badge role-' + u.role + '">' + u.role.toUpperCase() + '</span></td>'
      + '<td style="display:flex;gap:6px;flex-wrap:wrap;">' + actions + '</td>'
      + '</tr>';
  }
  tb.innerHTML = html;
}

function addUser() {
  var nameEl = document.getElementById('nu-name');
  var unEl   = document.getElementById('nu-username');
  var pwEl   = document.getElementById('nu-password');
  var roleEl = document.getElementById('nu-role');
  var emailEl= document.getElementById('nu-email');
  var err    = document.getElementById('nu-error');

  var name  = nameEl  ? nameEl.value.trim()                          : '';
  var un    = unEl    ? unEl.value.trim().toLowerCase()               : '';
  var pw    = pwEl    ? pwEl.value                                    : '';
  var role  = roleEl  ? roleEl.value                                  : 'staff';
  var email = emailEl ? emailEl.value.trim().toLowerCase()            : '';

  err.textContent = '';
  err.style.color = 'var(--accent)';

  /* ── Validate ── */
  if (!name) { err.textContent = 'Full name is required'; return; }
  if (!un)   { err.textContent = 'Username is required'; return; }
  if (!pw)   { err.textContent = 'Password is required'; return; }
  if (pw.length < 4) { err.textContent = 'Password must be at least 4 characters'; return; }
  if (!/^[a-z0-9_]+$/.test(un)) {
    err.textContent = 'Username: only lowercase letters, numbers, underscores (no spaces)';
    return;
  }

  /* ── Check duplicate ── */
  var users = epicGetUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === un) {
      err.textContent = 'Username "' + un + '" already exists. Choose a different one.';
      return;
    }
    if (email && users[i].email && users[i].email === email) {
      err.textContent = 'Email "' + email + '" already used by another user.';
      return;
    }
  }

  /* ── Create new user object ── */
  var newUser = {
    id:       Date.now(),
    name:     name,
    username: un,
    email:    email,
    password: pw,
    role:     role
  };

  users.push(newUser);

  /* ── Write to storage ── */
  var saved = epicSaveUsers(users);
  if (!saved) {
    err.textContent = '⚠ Storage write failed. Are you in Incognito/Private mode?';
    return;
  }

  /* ── Read back and verify ── */
  var check = epicGetUsers();
  var found = null;
  for (var j = 0; j < check.length; j++) {
    if (check[j].username === un) { found = check[j]; break; }
  }

  if (!found) {
    err.textContent = '⚠ User was not saved. Storage may be blocked in this browser.';
    return;
  }

  if (found.password !== pw) {
    err.textContent = '⚠ Password did not save correctly. Please try again.';
    return;
  }

  /* ── Clear form ── */
  if (nameEl)  nameEl.value  = '';
  if (unEl)    unEl.value    = '';
  if (pwEl)    pwEl.value    = '';
  if (emailEl) emailEl.value = '';

  renderUserTable();

  /* ── Green success message with credentials ── */
  err.style.color = '#22c55e';
  err.textContent = '✓ User "' + name + '" created! Login: ' + un + ' / ' + pw;
  setTimeout(function() { err.textContent = ''; }, 10000);

  console.log('[EPIC] addUser: new user saved →', un, '/', role);
  console.log('[EPIC] All users now →', epicGetUsers().map(function(u){ return u.username; }).join(', '));
}

function removeUser(id) {
  if (!confirm('Delete this user?')) return;
  epicSaveUsers(epicGetUsers().filter(function(u) { return u.id !== id; }));
  renderUserTable();
  showToast('User deleted');
}

function resetPW(id) {
  var pw = prompt('New password (min 4 chars):');
  if (!pw) return;
  if (pw.length < 4) { alert('Too short — minimum 4 characters'); return; }
  epicSaveUsers(epicGetUsers().map(function(u) {
    return (u.id === id) ? Object.assign({}, u, { password: pw }) : u;
  }));
  showToast('Password updated');
}

/* ═══════════════════════════════════════
   CHANGE MY OWN PASSWORD
═══════════════════════════════════════ */
function changeMyPassword() {
  var current = document.getElementById('cp-current').value;
  var newPw   = document.getElementById('cp-new').value;
  var confirm = document.getElementById('cp-confirm').value;
  var errEl   = document.getElementById('cp-error');
  var okEl    = document.getElementById('cp-success');

  errEl.textContent  = '';
  okEl.style.display = 'none';

  var user = currentUser();
  if (!user) { errEl.textContent = 'Not logged in'; return; }

  var users   = epicGetUsers();
  var matched = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].id === user.id && users[i].password === current) { matched = users[i]; break; }
  }

  if (!matched)          { errEl.textContent = 'Current password is incorrect'; return; }
  if (!newPw)            { errEl.textContent = 'New password cannot be empty'; return; }
  if (newPw.length < 4)  { errEl.textContent = 'Minimum 4 characters'; return; }
  if (newPw !== confirm)  { errEl.textContent = 'Passwords do not match'; return; }
  if (newPw === current)  { errEl.textContent = 'New password must be different'; return; }

  epicSaveUsers(users.map(function(u) {
    return (u.id === user.id) ? Object.assign({}, u, { password: newPw }) : u;
  }));

  document.getElementById('cp-current').value = '';
  document.getElementById('cp-new').value     = '';
  document.getElementById('cp-confirm').value = '';
  okEl.style.display = 'block';
  setTimeout(function() { okEl.style.display = 'none'; }, 4000);
  showToast('Password changed!');
}

/* ═══════════════════════════════════════
   PDF STORAGE
═══════════════════════════════════════ */
function epicGetAllPDFs() {
  try {
    var s = localStorage.getItem(EPIC_KEY_PDFS);
    var p = s ? JSON.parse(s) : [];
    return Array.isArray(p) ? p : [];
  } catch(e) { return []; }
}

function epicGetMyPDFs() {
  var all  = epicGetAllPDFs();
  var user = currentUser();
  if (!user) return [];
  if (user.role === 'admin' || can('viewAll')) return all;
  return all.filter(function(p) { return Number(p.uid) === Number(user.id); });
}

function storePDF(meta) {
  var all = epicGetAllPDFs();
  all.unshift(meta);
  try {
    localStorage.setItem(EPIC_KEY_PDFS, JSON.stringify(all.slice(0, 50)));
  } catch(e) {
    var lite = all.map(function(p) { var c = Object.assign({}, p); delete c.data; return c; });
    try { localStorage.setItem(EPIC_KEY_PDFS, JSON.stringify(lite.slice(0, 50))); } catch(e2) {}
    showToast('Storage full — PDF listed without re-download');
  }
}

function deletePDF(id) {
  if (!can('delete')) { showToast('No permission'); return; }
  localStorage.setItem(EPIC_KEY_PDFS, JSON.stringify(
    epicGetAllPDFs().filter(function(p) { return p.id !== id; })
  ));
  renderPDFList();
  showToast('PDF deleted');
}

function redownloadPDF(id) {
  var p = null;
  var all = epicGetAllPDFs();
  for (var i = 0; i < all.length; i++) { if (all[i].id === id) { p = all[i]; break; } }
  if (!p || !p.data) { showToast('Data not available — please regenerate'); return; }
  try {
    var bytes = atob(p.data);
    var arr   = new Uint8Array(bytes.length);
    for (var j = 0; j < bytes.length; j++) arr[j] = bytes.charCodeAt(j);
    var url = URL.createObjectURL(new Blob([arr], { type:'application/pdf' }));
    var a   = document.createElement('a');
    a.href = url; a.download = p.filename || 'report.pdf'; a.click();
    URL.revokeObjectURL(url);
  } catch(e) { showToast('Download failed — please regenerate'); }
}

function renderPDFList() {
  var tbody = document.getElementById('pdfs-tbody');
  if (!tbody) return;
  var list = epicGetMyPDFs();
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px;">No PDFs saved yet.</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    var p      = list[i];
    var delBtn = can('delete')
      ? '<button class="btn btn-ghost" style="padding:4px 10px;font-size:11px;color:#ef4444;border-color:#ef444440;" onclick="deletePDF(' + p.id + ')">✕</button>'
      : '';
    html += '<tr>'
      + '<td>' + (i+1) + '</td>'
      + '<td><strong>' + (p.name||'—') + '</strong><br>'
      + '<span style="font-size:11px;color:var(--muted)">' + (p.regno||'') + '</span></td>'
      + '<td>' + (p.by||'—') + '</td>'
      + '<td>' + (p.at ? new Date(p.at).toLocaleString('en-IN') : '—') + '</td>'
      + '<td style="display:flex;gap:6px;flex-wrap:wrap;">'
      + '<button class="btn btn-secondary" style="padding:4px 10px;font-size:11px;" onclick="redownloadPDF(' + p.id + ')">⬇ Download</button>'
      + delBtn + '</td></tr>';
  }
  tbody.innerHTML = html;
}

/* ═══════════════════════════════════════
   BOOT
═══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', function() {
  /* 1. Seed defaults only if storage is completely empty */
  epicBootUsers();

  /* 2. Enter key shortcuts */
  var unField = document.getElementById('login-username');
  var pwField = document.getElementById('login-password');
  if (unField) unField.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && pwField) pwField.focus();
  });
  if (pwField) pwField.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleLogin();
  });

  /* 3. Restore session if valid */
  var sess = epicGetSession();
  if (sess) {
    var users       = epicGetUsers();
    var stillExists = false;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === sess.id) { stillExists = true; break; }
    }
    if (stillExists) { showApp(sess); return; }
    epicClearSession();
  }
  showLogin();
});
