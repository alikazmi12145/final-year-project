# Bazm-e-Sukhan (بزمِ سخن)

> A full-stack, RTL-first Urdu poetry platform — read, write, share, and listen to classical and contemporary Urdu poetry in a beautifully crafted modern web app.

Bazm-e-Sukhan is a final-year project built around the MERN stack (MongoDB · Express · React · Node) with a clean separation between a React/Vite frontend and a Node/Express backend.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Available Scripts](#available-scripts)
- [Security Notes](#security-notes)
- [License](#license)

---

## Features

### For Readers
- Browse poetry by **poet, era, and genre** (ghazal, nazm, rubai, qawwali, hamd, naat, …)
- **Bookmarks**, reading history, and personalised feeds
- **Urdu Text-to-Speech** for any poem (multiple voice personas)
- **PDF export** of poems with custom Urdu fonts
- Real-time **comments, likes, and discussions**
- Full RTL Urdu UI using the **Jameel Noori Nastaleeq** font family

### For Poets
- Rich poet dashboard with a publishing pipeline (draft → admin approval → public)
- Analytics: views, likes, followers, top poems, engagement trends
- **Tiered verification** (Bronze · Silver · Gold · Diamond) based on real activity
- Real-time notifications for follows, comments, and reports
- Direct messaging with other poets and readers (Socket.IO)
- Poetry collections, biographies, contests, and memorial contributions
- **Copyright reporting** flow with admin review

### For Admins
- User & poet approval workflow
- Verification request management with auto-evaluation
- **Copyright/fraud report** panel — review, resolve, or dismiss
- News, newsletters, contests, learning resources, and chatbot FAQs
- Platform-wide analytics dashboard
- Data export tools

---

## Tech Stack

### Frontend
- **React 18** + **Vite** + **Tailwind CSS**
- **React Router v6**, **React Query**, **React Hook Form**
- **Socket.IO client** for real-time notifications & chat
- **Recharts** for analytics
- **Lucide React** icons
- **pdfjs-dist** + **html2canvas** for PDF previews

### Backend
- **Node.js + Express 4** (ES Modules)
- **MongoDB** + **Mongoose 8**
- **JWT** auth + **Passport.js** (Google OAuth)
- **Socket.IO** for realtime
- **Cloudinary** for media uploads
- **Nodemailer** for transactional email
- **OpenAI** SDK for AI features

---

## Project Structure

```
Bazm-E-Sukhan/
├── backend/                 # Node.js + Express API
│   ├── config/              # Database, Cloudinary, OAuth, OpenAI config
│   ├── controllers/         # Route handlers
│   ├── middleware/          # auth, error handling
│   ├── models/              # Mongoose schemas
│   ├── routes/              # Express routers
│   ├── services/            # Business logic
│   ├── utils/               # Helpers
│   ├── validations/         # Request validators
│   ├── server.js            # App entry point
│   └── package.json
│
├── frontend/                # React + Vite SPA
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level pages
│   │   ├── hooks/           # Custom hooks
│   │   ├── context/         # React contexts
│   │   ├── utils/           # Helpers
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── start-backend.ps1
├── start-services.ps1
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js 18+** and **npm**
- **MongoDB** (local instance or MongoDB Atlas)
- Accounts / API keys for:
  - **Cloudinary** (media uploads)
  - **Google OAuth** (sign-in) — optional but recommended
  - **OpenAI** (AI features) — optional
  - An **SMTP** provider (Gmail, SendGrid, etc.) for email

---

## Getting Started

```powershell
# 1. Clone
git clone https://github.com/alikazmi12145/final-year-project.git
cd final-year-project

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install
```

Create `.env` files in **both** `backend/` and `frontend/` (see next section). They are git-ignored.

---

## Environment Variables

### `backend/.env`

```env
# Server
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5001

# Database
MONGODB_URI=mongodb://localhost:27017/bazm-e-sukhan

# Auth
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
SESSION_SECRET=replace-with-another-long-random-string

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# OpenAI (optional)
OPENAI_API_KEY=

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Bazm-e-Sukhan <noreply@example.com>
```

> Never commit real values. The repository's `.gitignore` already excludes `.env*` files.

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

---

## Running the App

### Option 1 — manually (two terminals)

```powershell
# Terminal 1 — backend
cd backend
npm run dev

# Terminal 2 — frontend
cd frontend
npm run dev
```

- Backend: <http://localhost:5001>
- Frontend: <http://localhost:5173>

### Option 2 — helper scripts (Windows PowerShell)

From the repo root:

```powershell
# Backend only
./start-backend.ps1

# Backend + frontend
./start-services.ps1
```

---

## Available Scripts

### Backend (`backend/package.json`)
- `npm run dev` — start with nodemon (auto-reload)
- `npm start` — start in production mode

### Frontend (`frontend/package.json`)
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

---

## Security Notes

- All secrets are loaded from environment variables — **never hard-code keys**.
- `.env`, `.env.*`, `node_modules/`, and build output are git-ignored.
- If you ever accidentally commit a secret, **rotate it immediately** in the provider's dashboard. Removing the file from a future commit does **not** invalidate the leaked value.
- Use a strong, random `JWT_SECRET` and `SESSION_SECRET` (at least 32 chars).

---

## License

This project is developed as an academic final-year project. All rights reserved by the authors unless otherwise stated.
