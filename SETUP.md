# EPIC Cars — Setup Guide

## Google Drive Integration (Optional)

By default the app downloads PDFs to your device.
To save PDFs directly to Google Drive, follow these steps:

---

### Step 1 — Go to Google Cloud Console
1. Open https://console.cloud.google.com
2. Sign in with your Google account
3. Click **"New Project"** → name it `epic-cars` → click **Create**

### Step 2 — Enable Google Drive API
1. Go to **APIs & Services → Library**
2. Search for **Google Drive API**
3. Click it → click **Enable**

### Step 3 — Create API Key
1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → API Key**
3. Copy the key — you will need it below

### Step 4 — Create OAuth Client ID
1. Click **+ Create Credentials → OAuth Client ID**
2. Select **Web Application**
3. Under **Authorized JavaScript Origins** add:
   - `http://localhost` (for VS Code Live Server)
   - `http://127.0.0.1:5500`
4. Copy the **Client ID**

### Step 5 — Add to auth.js
Open `auth.js` and find these lines near the top:

```js
const GDRIVE_CONFIG = {
  clientId: 'YOUR_GOOGLE_CLIENT_ID',   // ← paste Client ID here
  apiKey:   'YOUR_GOOGLE_API_KEY',      // ← paste API Key here
  ...
};
```

Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_API_KEY` with your values.

### Step 6 — Done!
Open the app → generate a PDF → it will upload to your Google Drive automatically.
You can find saved files in **My Drive → epic-cars** folder.

---

## Default Login Credentials

| Role   | Username | Password  |
|--------|----------|-----------|
| Admin  | admin    | admin123  |
| Staff  | staff1   | staff123  |
| Viewer | viewer   | view123   |

**Important:** Change these passwords after first login via the User Management section.

---

## Role Permissions

| Feature              | Admin | Staff | Viewer |
|----------------------|-------|-------|--------|
| Fill & Edit Form     | ✅    | ✅    | ❌     |
| Generate PDF         | ✅    | ✅    | ❌     |
| Save to Records      | ✅    | ✅    | ❌     |
| View Analytics       | ✅    | ✅    | ✅     |
| View Saved PDFs      | ✅    | ✅    | ✅     |
| Delete Records       | ✅    | ❌    | ❌     |
| Manage Users         | ✅    | ❌    | ❌     |
