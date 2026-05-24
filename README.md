# 🪶 Bazm-e-Sukhan (بزمِ سخن)

> An AI-powered, RTL-first Urdu poetry platform — read, write, share, learn and listen to the literary heritage of the subcontinent in one beautifully crafted application.

Bazm-e-Sukhan is a full-stack web application built as a final-year project to bring classical and contemporary Urdu poetry into the modern era. It combines a **MERN-style stack** (MongoDB · Express · React · Node) with a **Python AI microservice** for advanced poetry intelligence: semantic search, OCR of handwritten ghazals, qaafia (rhyme) analysis, Rekhta scraping and Urdu Text-to-Speech.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running the Project](#-running-the-project)
- [Key Modules](#-key-modules)
- [Verification & Badges](#-verification--badges)
- [Fraud Reporting](#-fraud-reporting)
- [Google OAuth Setup](#-google-oauth-setup)
- [Scripts](#-scripts)
- [Screenshots](#-screenshots)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Authors](#-authors)

---

## ✨ Features

### 🎭 For Readers
- 📚 Browse poetry by **poet, era, genre (ghazal · nazm · rubai · qawwali · hamd · naat …)**
- 🔍 **AI-powered semantic search** that understands meaning, not just keywords
- 🔖 Bookmarks, reading history and personalised feeds
- 🎙️ **Listen to any poem** with Urdu Text-to-Speech (multiple voice personas)
- 🖼️ PDF export of poems with custom Urdu fonts
- 💬 Real-time comments, likes and discussions
- 🌐 Full RTL Urdu UI with the **Jameel Noori Nastaleeq** font family

### ✍️ For Poets
- 📝 Rich poet dashboard with publishing pipeline (draft → admin approval → public)
- 📊 Analytics: views, likes, followers, top poems, engagement trends
- 🥇 **Tiered verification** (Bronze · Silver · Gold · Diamond) based on real activity
- 🔔 Real-time notification bell + on-dashboard alerts for new follows, comments and fraud reports
- 🛡️ Fraud-report visibility with admin verdicts surfaced on the poet's dashboard
- 🤝 Direct messaging with other poets & readers (Socket.IO)
- 📜 Poetry collections, biographies, contests and memorial contributions

### 🛠️ For Admins
- 👥 User & poet approval workflow
- 🛡️ Verification request management with auto-evaluation
- 🚨 Fraud report panel — review, resolve or dismiss with notes that ping the reported poet
- 📰 News, newsletters, contests, learning resources and chatbot FAQs
- 📈 Platform-wide analytics dashboard

### 🤖 AI / Python Microservice
- Urdu/Arabic **OCR** of poem images (Tesseract + image preprocessing)
- **Qaafia (rhyme) detection** for ghazals
- **Semantic similarity** search across the entire corpus
- **Rekhta scraping** to enrich the database with classical poetry
- Text matcher for plagiarism / duplicate detection

---

## 🧱 Tech Stack

### Frontend
- **React 18** + **Vite** + **Tailwind CSS** (cultural Urdu theme tokens)
- **React Router v6**, **React Query**, **React Hook Form**
- **Socket.IO client** for real-time notifications & chat
- **Recharts** for analytics
- **Lucide React** icons
- **pdfjs-dist** + **html2canvas** for PDF previews
- **react-speech-recognition** for voice features

### Backend
- **Node.js + Express 4** (ES Modules)
- **MongoDB** + **Mongoose 8**
- **Socket.IO** for realtime
- **JWT** auth + **Passport** (Google, Facebook, GitHub OAuth)
- **Multer + Cloudinary** for media uploads
- **PDFKit** for downloadable poem PDFs
- **GTTS / msedge-tts** for Urdu Text-to-Speech
- **Nodemailer** for email
- **Stripe** for premium features
- **Helmet · CORS · express-rate-limit · express-validator**

### Python AI Service
- **Flask** REST microservice
- **Tesseract.js / pytesseract** for Urdu OCR
- **scikit-learn / sentence-transformers** for semantic search
- **BeautifulSoup** for Rekhta scraping
- Custom **qaafia utilities** for rhyme analysis

### Tooling
- **ESLint**, **Nodemon**, **PowerShell scripts** for orchestration

---

## 🏗️ Architecture

```
┌──────────────────────┐        ┌───────────────────────┐        ┌──────────────────────────┐
│   React Frontend     │ HTTPS  │   Express Backend     │ HTTP   │  Python AI Microservice  │
│   (Vite, port 5173)  │ ────►  │   (Node, port 5000)   │ ────►  │  (Flask, port 5001)      │
│                      │ ◄───── │                       │ ◄───── │                          │
└─────────┬────────────┘        └──────────┬────────────┘        └──────────────────────────┘
          │                                │
          │ Socket.IO                      │ Mongoose
          │                                ▼
          ▼                       ┌──────────────────┐
   Real-time notifications        │   MongoDB Atlas  │
   & chat                         └──────────────────┘
                                          │
                                          ▼
                                  ┌──────────────────┐
                                  │   Cloudinary     │
                                  │   (media CDN)    │
                                  └──────────────────┘
```

---

## 📁 Project Structure

```
Bazm-E-Sukhan/
├── backend/                     # Node + Express API
│   ├── config/                  # DB, Cloudinary, OAuth, OpenAI
│   ├── controllers/             # Business logic per resource
│   ├── middleware/              # auth, errorHandler
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # Express routers
│   ├── scripts/                 # One-off maintenance scripts
│   ├── services/                # Cross-cutting services (email, profile…)
│   ├── utils/                   # Helpers (autoVerification, seeding…)
│   ├── uploads/                 # Local file storage (profiles, fonts, audio)
│   └── server.js                # Entry point
│
├── frontend/                    # React + Vite SPA
│   ├── public/
│   └── src/
│       ├── components/          # UI building blocks (verification, admin, …)
│       ├── context/             # AuthContext, MessageContext
│       ├── hooks/               # useFraudReport, useAuth, …
│       ├── pages/               # Route-level pages (Dashboard, Poets, Auth…)
│       ├── services/            # axios api helpers
│       └── App.jsx
│
├── python-ai-service/           # Flask microservice
│   ├── app.py                   # Service entry
│   ├── ocr_service.py           # Urdu OCR
│   ├── image_ocr.py             # Image preprocessing
│   ├── qaafia_service.py        # Rhyme detection
│   ├── qaafia_utils.py
│   ├── semantic_search.py       # Embedding-based search
│   ├── rekhta_service.py        # Rekhta scraper
│   ├── text_matcher.py
│   └── requirements.txt
│
├── start-all-services.ps1       # Boot frontend + backend + python in one go
├── start-backend.ps1
├── start-python-service.ps1
├── start-services.ps1
├── setup-python-service.ps1
└── install-tesseract-languages.ps1
```

---

## 🚀 Getting Started

### Prerequisites

| Tool          | Recommended Version |
|---------------|---------------------|
| Node.js       | ≥ 18.x              |
| npm           | ≥ 9.x               |
| Python        | ≥ 3.10              |
| MongoDB       | Atlas cluster or local 6.x |
| Tesseract OCR | 5.x (with `urd` + `ara` language packs) |
| Git           | latest              |

### 1. Clone the repository

```powershell
git clone https://github.com/<your-username>/bazm-e-sukhan.git
cd "Bazm-E-Sukhan fyp"
```

### 2. Install backend dependencies

```powershell
cd backend
npm install
```

### 3. Install frontend dependencies

```powershell
cd ../frontend
npm install
```

### 4. Set up the Python AI service

```powershell
cd ../python-ai-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Or simply run the helper:

```powershell
.\setup-python-service.ps1
```

### 5. Install Tesseract Urdu/Arabic packs

```powershell
.\install-tesseract-languages.ps1
```

---

## 🔐 Environment Variables

Create **`backend/.env`** with the following keys (placeholders shown):

```env
# --- Server ---
NODE_ENV=development
PORT=5000
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173

# --- Database ---
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/bazm-e-sukhan

# --- JWT ---
JWT_SECRET=replace-with-strong-secret
JWT_REFRESH_SECRET=replace-with-strong-refresh-secret

# --- Email (SMTP) ---
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=you@example.com
EMAIL_PASS=app-password

# --- Cloudinary ---
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# --- OAuth ---
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# --- Optional integrations ---
OPENAI_API_KEY=sk-xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
PYTHON_SERVICE_URL=http://localhost:5001
```

Create **`frontend/.env`**:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## ▶️ Running the Project

### Option A — All at once

```powershell
.\start-all-services.ps1
```

### Option B — Individual services

```powershell
# Terminal 1 — Backend (Node)
cd backend
npm run dev          # http://localhost:5000

# Terminal 2 — Frontend (React)
cd frontend
npm run dev          # http://localhost:5173

# Terminal 3 — Python AI service
cd python-ai-service
.\venv\Scripts\Activate.ps1
python app.py        # http://localhost:5001
```

Open **http://localhost:5173** in your browser and you're in 🎉

---

## 🧩 Key Modules

### 🎙️ Text-to-Speech (TTS)
- Multiple Urdu voices (Edge TTS + Google TTS fallback)
- Caching of generated audio in `backend/uploads/`
- Frontend audio player with playback controls

### 🔎 Semantic Search
- Embedding-based ranking via the Python service
- Falls back to fuzzy search (Fuse.js) when the AI service is offline

### 🧠 OCR for Handwritten Poetry
- Upload a poem image → Tesseract returns Urdu text
- Image preprocessing pipeline (binarization, deskew, denoise)

### 📜 PDF Export
- Server-side PDFKit rendering with Jameel Noori Nastaleeq fonts
- Configurable layouts for ghazals, nazms and collections

### 🗣️ Real-time Chat & Notifications
- Socket.IO rooms per user
- Live typing indicators, read receipts and unread counts
- Bell dropdown + on-dashboard alert banners

---

## 🏅 Verification & Badges

Poets earn **automatic tiered verification** based on activity. Criteria are configured in [backend/utils/autoVerification.js](backend/utils/autoVerification.js):

| Tier      | Poems | Followers | Likes |
|-----------|-------|-----------|-------|
| 🥉 Bronze  | 10    | —         | —     |
| 🥈 Silver  | 50    | 500       | 300   |
| 🥇 Gold    | 100   | 1 000     | 1 000 |
| 💎 Diamond | 500   | 2 000     | 2 000 |

Featured / honorary poets can be hardcoded in the same file (e.g. *Abbas Tabish* → Gold).

A dedicated **Verification Tab** on the Poet Dashboard shows the hero card, progress bars and the full tier ladder.

---

## 🚨 Fraud Reporting

- Visitors can click **رپورٹ کریں (Report)** on any poet's public profile.
- The pre-filled report form posts to `POST /api/report`.
- The reported poet receives:
  - A **real-time bell notification**
  - A red **alert banner on their dashboard** showing every report against them
  - The **admin's decision + notes** once resolved or dismissed
- The dashboard alert auto-clears once the poet views the details **or** after **24 hours** — whichever comes first.
- Admin manages everything from the **Fraud Reports Panel** with filtering and bulk actions.

Endpoints:

| Method | Route                          | Purpose                              |
|--------|--------------------------------|--------------------------------------|
| POST   | `/api/report`                  | User submits a report                |
| GET    | `/api/report/against-me`       | Poet fetches reports against them    |
| PUT    | `/api/report/mark-seen`        | Poet acknowledges all reports        |
| GET    | `/api/admin/reports`           | Admin lists all reports              |
| PUT    | `/api/admin/report/:id/resolve`| Admin resolves / dismisses a report  |

---

## 🔑 Google OAuth Setup

1. Go to https://console.cloud.google.com/apis/credentials
2. Create an **OAuth 2.0 Client ID** (Web Application).
3. Add to **Authorized JavaScript origins**:
   ```
   http://localhost:5000
   http://localhost:5173
   ```
4. Add to **Authorized redirect URIs** (must match exactly):
   ```
   http://localhost:5000/api/auth/google/callback
   ```
5. Copy the Client ID + Secret into `backend/.env`.
6. New Google sign-ups are created with `status: "pending"` and **require admin approval** before they can log in (see [backend/config/passport.js](backend/config/passport.js)).

---

## 🧪 Scripts

```powershell
# Seed sample data
cd backend
npm run seed

# One-off helper to grant a verification badge
node scripts/verify-abbas-tabish.js

# Lint frontend
cd ../frontend
npm run lint
```

---

## 📸 Screenshots

> _Add your own screenshots in a `/docs/screenshots/` folder and link them here._

| Home | Poet Dashboard | Verification Tab | Fraud Panel |
|------|---------------|------------------|-------------|
| ![Home](docs/screenshots/home.png) | ![Dashboard](docs/screenshots/dashboard.png) | ![Verification](docs/screenshots/verification.png) | ![Fraud](docs/screenshots/fraud.png) |

---

## 🛣️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Audio recordings of poets reciting their own poetry
- [ ] AI-assisted poem composition helper
- [ ] Public REST API for third-party developers
- [ ] Multilingual UI (Hindi · English · Punjabi)
- [ ] Offline PWA support
- [ ] Stripe-powered premium memberships

---

## 🤝 Contributing

Contributions are warmly welcomed!

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m "feat: add amazing feature"`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

Please run `npm run lint` in the frontend before submitting.

---

## 📜 License

This project is released under the **MIT License**. See `LICENSE` for the full text.

---

## 👤 Authors

**Sayed Ali Zaidi** & team — Final Year Project, 2026

- 📧 Contact: `sayed@ali.com`
- 🌐 Project: _Bazm-e-Sukhan (بزمِ سخن)_
- 🎓 Built with love for the Urdu literary tradition

---

> _"شعر مرے یُوں تو زمانے کے لیے ہے میرا کام انسانوں کو سدا یاد رکھے گا"_
> 
> — *جوش ملیح آبادی*
