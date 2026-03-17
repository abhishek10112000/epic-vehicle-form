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
/* Show exactly what's in the password field so admin can verify */
function syncPwDisplay(input) {
  var display = document.getElementById('nu-pw-display');
  if (display) {
    display.textContent = input.value || '';
    display.style.color = input.value.length >= 4 ? '#22c55e' : '#ef4444';
  }
}

function toggleNewUserPw() {
  var f   = document.getElementById('nu-password');
  var eye = document.getElementById('nu-pw-eye');
  if (!f) return;
  f.type = (f.type === 'password') ? 'text' : 'password';
  if (eye) eye.textContent = (f.type === 'text') ? '🙈' : '👁';
}

function togglePasswordCol(btn) {
  var cols = document.querySelectorAll('.pw-col');
  var showing = btn.textContent.indexOf('Hide') > -1;
  cols.forEach(function(c) { c.style.display = showing ? 'none' : ''; });
  btn.textContent = showing ? '👁 Show Passwords' : '🙈 Hide Passwords';
}

function renderUserTable() {
  var tb = document.getElementById('users-tbody');
  if (!tb) return;
  var users = epicGetUsers();
  if (!users.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px;">No users found.</td></tr>';
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
      + '<td class="pw-col" style="display:none;"><code style="color:#f59e0b;font-size:12px;">' + (u.password || '—') + '</code></td>'
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
  var display = document.getElementById('nu-pw-display');
  if (display) display.textContent = '';

  renderUserTable();

  /* ── Green success message — show EXACT saved password ── */
  err.style.color = '#22c55e';
  err.textContent = '✓ User "' + name + '" created! Login: ' + un + ' / ' + found.password;
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
   STAFF SLOTS SYSTEM
   10 pre-made login slots.
   Admin assigns real names to slots.
   Visible only to admin.
═══════════════════════════════════════ */

var EPIC_KEY_SLOTS = 'epicSlots';

/* 10 fixed slot usernames — only usernames are fixed, passwords can be changed */
var SLOT_DEFAULTS = [
  { slot:1,  username:'epic_s01', defaultPassword:'Epic@S01' },
  { slot:2,  username:'epic_s02', defaultPassword:'Epic@S02' },
  { slot:3,  username:'epic_s03', defaultPassword:'Epic@S03' },
  { slot:4,  username:'epic_s04', defaultPassword:'Epic@S04' },
  { slot:5,  username:'epic_s05', defaultPassword:'Epic@S05' },
  { slot:6,  username:'epic_s06', defaultPassword:'Epic@S06' },
  { slot:7,  username:'epic_s07', defaultPassword:'Epic@S07' },
  { slot:8,  username:'epic_s08', defaultPassword:'Epic@S08' },
  { slot:9,  username:'epic_s09', defaultPassword:'Epic@S09' },
  { slot:10, username:'epic_s10', defaultPassword:'Epic@S10' },
];

/* Get current password for a slot — custom if set, else default */
function getSlotPassword(slotNum) {
  var slots = getSlots();
  return (slots[slotNum] && slots[slotNum].password) || SLOT_DEFAULTS[slotNum-1].defaultPassword;
}

function getSlots() {
  try {
    var s = localStorage.getItem(EPIC_KEY_SLOTS);
    return s ? JSON.parse(s) : {};
  } catch(e) { return {}; }
}

function saveSlots(obj) {
  localStorage.setItem(EPIC_KEY_SLOTS, JSON.stringify(obj));
}

/* ── Ensure all 10 slot users exist in epicUsers ──
   Always uses the password stored in epicSlots (custom or default).
   If user already exists, syncs password from slots in case it changed. */
function ensureSlotUsers() {
  var users   = epicGetUsers();
  var slots   = getSlots();
  var changed = false;

  SLOT_DEFAULTS.forEach(function(sd) {
    var pw       = (slots[sd.slot] && slots[sd.slot].password) || sd.defaultPassword;
    var name     = (slots[sd.slot] && slots[sd.slot].assignedTo) || ('Slot ' + sd.slot);
    var existing = users.findIndex(function(u) { return u.username === sd.username; });

    if (existing === -1) {
      /* Not found — create it */
      users.push({
        id:       sd.slot * -1,
        name:     name,
        username: sd.username,
        email:    '',
        password: pw,
        role:     'staff',
        isSlot:   true,
        slotNum:  sd.slot
      });
      changed = true;
    } else {
      /* Found — sync password and name in case they changed */
      if (users[existing].password !== pw || users[existing].name !== name) {
        users[existing] = Object.assign({}, users[existing], { password: pw, name: name });
        changed = true;
      }
    }
  });

  if (changed) epicSaveUsers(users);
}

/* ── Assign a name to a slot ── */
function assignSlot(slotNum) {
  var nameEl = document.getElementById('slot-name-' + slotNum);
  if (!nameEl) return;
  var val = nameEl.value.trim();
  if (!val) { showToast('Enter a name first'); return; }

  var slots = getSlots();
  slots[slotNum] = slots[slotNum] || {};
  slots[slotNum].assignedTo = val;
  saveSlots(slots);

  ensureSlotUsers();
  renderSlots();
  showToast('Slot ' + slotNum + ' assigned to ' + val);
}

/* ── Clear slot assignment ── */
function clearSlot(slotNum) {
  var slots = getSlots();
  if (slots[slotNum]) {
    delete slots[slotNum].assignedTo;
  }
  saveSlots(slots);
  ensureSlotUsers();
  renderSlots();
  showToast('Slot ' + slotNum + ' cleared');
}

/* ── Change password for a slot ── */
function changeSlotPassword(slotNum) {
  var pwEl = document.getElementById('slot-pw-' + slotNum);
  if (!pwEl) return;
  var pw = pwEl.value.trim();

  if (!pw)         { showToast('Enter a new password'); return; }
  if (pw.length < 4) { showToast('Password must be at least 4 characters'); return; }

  var slots = getSlots();
  slots[slotNum] = slots[slotNum] || {};
  slots[slotNum].password = pw;
  saveSlots(slots);

  /* Sync to epicUsers immediately */
  ensureSlotUsers();

  pwEl.value = '';
  renderSlots();
  showToast('✓ Slot ' + slotNum + ' password changed to: ' + pw);
}

/* ── Reset slot password back to default ── */
function resetSlotPassword(slotNum) {
  if (!confirm('Reset slot ' + slotNum + ' password back to default (' + SLOT_DEFAULTS[slotNum-1].defaultPassword + ')?')) return;

  var slots = getSlots();
  if (slots[slotNum]) delete slots[slotNum].password;
  saveSlots(slots);

  ensureSlotUsers();
  renderSlots();
  showToast('Slot ' + slotNum + ' password reset to default');
}

/* ── Render all 10 slots ── */
function renderSlots() {
  var grid = document.getElementById('slots-grid');
  if (!grid) return;

  ensureSlotUsers();

  var slots = getSlots();

  var html = SLOT_DEFAULTS.map(function(sd) {
    var slotData    = slots[sd.slot] || {};
    var assigned    = slotData.assignedTo || '';
    var currentPw   = slotData.password || sd.defaultPassword;
    var isCustomPw  = !!slotData.password;
    var isAssigned  = !!assigned;

    return '<div class="slot-card' + (isAssigned ? ' slot-assigned' : '') + '">'

      /* Header */
      + '<div class="slot-header">'
      + '  <span class="slot-num">S' + String(sd.slot).padStart(2,'0') + '</span>'
      + '  <span class="slot-status">' + (isAssigned ? '🟢 ' + assigned : '⚪ Free') + '</span>'
      + '</div>'

      /* Current credentials */
      + '<div class="slot-creds">'
      + '  <div class="slot-cred-row"><span>Username</span><code>' + sd.username + '</code></div>'
      + '  <div class="slot-cred-row"><span>Password</span>'
      + '    <code style="color:' + (isCustomPw ? '#22c55e' : '#f59e0b') + '">' + currentPw + '</code>'
      + '    <span style="font-size:9px;color:var(--muted);margin-left:4px;">' + (isCustomPw ? '(custom)' : '(default)') + '</span>'
      + '  </div>'
      + '</div>'

      /* Assign name row */
      + '<div class="slot-section-label">👤 Assign to person</div>'
      + '<div class="slot-assign-row">'
      + '  <input id="slot-name-' + sd.slot + '" type="text" class="slot-name-input"'
      + '    placeholder="Person\'s name" value="' + (assigned || '') + '" autocomplete="off"'
      + '    onkeydown="if(event.key===\'Enter\')assignSlot(' + sd.slot + ')"/>'
      + '  <button class="btn btn-primary" style="padding:5px 12px;font-size:11px;" onclick="assignSlot(' + sd.slot + ')">✓</button>'
      + (isAssigned ? '<button class="btn btn-ghost" style="padding:5px 10px;font-size:11px;color:#ef4444;border-color:#ef444440;" onclick="clearSlot(' + sd.slot + ')">✕</button>' : '')
      + '</div>'

      /* Change password row */
      + '<div class="slot-section-label" style="margin-top:10px;">🔑 Change Password</div>'
      + '<div class="slot-assign-row">'
      + '  <input id="slot-pw-' + sd.slot + '" type="text" class="slot-name-input"'
      + '    placeholder="New password (min 4 chars)" autocomplete="off"'
      + '    style="font-family:\'DM Mono\',monospace;font-size:12px;"'
      + '    onkeydown="if(event.key===\'Enter\')changeSlotPassword(' + sd.slot + ')"/>'
      + '  <button class="btn btn-secondary" style="padding:5px 12px;font-size:11px;" onclick="changeSlotPassword(' + sd.slot + ')">Set</button>'
      + (isCustomPw ? '<button class="btn btn-ghost" style="padding:5px 10px;font-size:11px;" title="Reset to default" onclick="resetSlotPassword(' + sd.slot + ')">↺</button>' : '')
      + '</div>'

      + '</div>';
  }).join('');

  grid.innerHTML = html;
}

/* ── Export slots as printable page ── */
function exportSlots() {
  ensureSlotUsers();
  var slots = getSlots();
  var rows  = SLOT_DEFAULTS.map(function(sd) {
    var assigned = (slots[sd.slot] && slots[sd.slot].assignedTo) || '—';
    var pw       = (slots[sd.slot] && slots[sd.slot].password)   || sd.defaultPassword;
    return '<tr>'
      + '<td>S' + String(sd.slot).padStart(2,'0') + '</td>'
      + '<td>' + assigned + '</td>'
      + '<td><code>' + sd.username + '</code></td>'
      + '<td><code>' + pw + '</code></td>'
      + '</tr>';
  }).join('');

  var win = window.open('', '_blank');
  win.document.write(
    '<html><head><title>EPIC Staff Login Slots</title>'
    + '<style>body{font-family:sans-serif;padding:24px;}'
    + 'table{border-collapse:collapse;width:100%;}'
    + 'th,td{border:1px solid #ccc;padding:10px 14px;text-align:left;}'
    + 'th{background:#f0f0f0;font-size:12px;letter-spacing:1px;}'
    + 'code{background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:13px;}'
    + 'h2{margin-bottom:4px;} p{color:#666;margin-bottom:20px;font-size:13px;}'
    + '@media print{button{display:none}}'
    + '</style></head><body>'
    + '<h2>🚗 EPIC Cars — Staff Login Slots</h2>'
    + '<p>Generated: ' + new Date().toLocaleString('en-IN')
    + '&nbsp;|&nbsp; <strong>Admin use only — do not share publicly</strong></p>'
    + '<table><thead><tr><th>SLOT</th><th>ASSIGNED TO</th><th>USERNAME</th><th>PASSWORD</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table>'
    + '<br/><button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;">🖨 Print</button>'
    + '</body></html>'
  );
  win.document.close();
}

/* ═══════════════════════════════════════
   EXPORT / IMPORT USERS
   Solves cross-browser/profile sync issue
═══════════════════════════════════════ */
function exportUsers() {
  var users = epicGetUsers();
  var slots = getSlots();
  var data  = {
    _epic_export: true,
    _version:     2,
    _exportedAt:  new Date().toISOString(),
    _exportedBy:  (currentUser() || {}).name || 'Admin',
    users:        users,
    slots:        slots       /* includes custom passwords + assignments */
  };

  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'epic_users_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported! Copy file to other browsers to sync.');
}

function importUsers(input) {
  var file = input.files[0];
  if (!file) return;

  var result = document.getElementById('import-result');
  result.textContent = 'Reading file...';
  result.style.color = 'var(--muted)';

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);

      if (!data._epic_export || !Array.isArray(data.users)) {
        result.textContent = '⚠ Invalid file. Use a file exported from this app.';
        result.style.color = 'var(--accent)';
        return;
      }

      /* Import users — merge, no duplicates */
      var existing = epicGetUsers();
      var added = 0, skipped = 0;
      data.users.forEach(function(u) {
        var exists = existing.some(function(e) { return e.username === u.username; });
        if (exists) { skipped++; } else { existing.push(u); added++; }
      });
      epicSaveUsers(existing);

      /* Import slot data (assignments + custom passwords) */
      if (data.slots) {
        var currentSlots = getSlots();
        Object.keys(data.slots).forEach(function(k) {
          currentSlots[k] = Object.assign({}, currentSlots[k] || {}, data.slots[k]);
        });
        saveSlots(currentSlots);
        ensureSlotUsers();   /* sync new passwords into epicUsers */
      }

      input.value = '';
      renderUserTable();
      renderSlots();

      result.style.color = '#22c55e';
      result.textContent = '✓ Imported! ' + added + ' user(s) added, ' + skipped + ' skipped. Slot passwords/assignments also synced.';
      showToast('Import complete!');

    } catch(err) {
      result.style.color = 'var(--accent)';
      result.textContent = '⚠ Could not read file: ' + err.message;
    }
  };
  reader.readAsText(file);
}

/* ═══════════════════════════════════════
   BOOT
═══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', function() {
  /* 1. Seed defaults only if storage is completely empty */
  epicBootUsers();

  /* 2. Ensure all 10 slot users exist */
  ensureSlotUsers();

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
