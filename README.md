# SQRL — Budget · Simply

A PWA (Progressive Web App) that installs directly to your iPhone home screen.

## Deploy to Vercel (free, ~5 minutes)

### Step 1 — Install dependencies locally (optional, just to verify)
```
npm install
npm run build
```

### Step 2 — Push to GitHub
1. Create a new repo at github.com (e.g. `sqrl-budget`)
2. In this folder, run:
```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sqrl-budget.git
git push -u origin main
```

### Step 3 — Deploy on Vercel
1. Go to vercel.com and sign in (free account)
2. Click **Add New → Project**
3. Import your `sqrl-budget` GitHub repo
4. Leave all settings as defaults — Vercel auto-detects Vite
5. Click **Deploy**
6. In ~60 seconds you'll get a URL like `https://sqrl-budget.vercel.app`

### Step 4 — Install on iPhone
1. Open the Vercel URL in **Safari** on your iPhone
2. Tap the **Share** button (the box with the arrow pointing up)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

SQRL now appears on your home screen and runs full-screen like a native app.

---

## Local development
```
npm install
npm run dev
```
Then open http://localhost:5173 in your browser.
