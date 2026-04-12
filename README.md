# 🎭 Bazm-E-Sukhan - Urdu Poetry Platform

A comprehensive Urdu poetry platform with AI-powered multimodal search capabilities.

## 🚀 Quick Start

### First Time Setup

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

2. **Setup Python AI Service**
   ```powershell
   .\setup-python-service.ps1
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application

**Option 1: Three Separate Terminals (Recommended)**

Terminal 1 - Python AI Service:
```powershell
.\start-python-service.ps1
```

Terminal 2 - Express Backend:
```powershell
.\start-backend.ps1
```

Terminal 3 - React Frontend:
```bash
cd frontend
npm run dev
```

**Option 2: Manual Start**

See [START_INSTRUCTIONS.md](START_INSTRUCTIONS.md) for detailed instructions.

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Python AI Service**: http://localhost:5001/health

## ✨ Features

### 🔍 AI Multimodal Search

- **Text Search (متن)**: Search by poet name, poem title, or poetry lines
- **Voice Search (آواز)**: Upload audio files for Urdu/English/Hindi transcription
- **Image Search (تصویر)**: OCR extraction from images containing Urdu text
- **Fuzzy Search (ذہین)**: Typo-tolerant search with phonetic matching

### 🎨 Cultural Design

- Authentic Islamic patterns and Nastaleeq fonts
- Responsive layout for all devices
- Interactive poem cards (like, bookmark, favorite)

### 🤖 AI Integration

- Voice-to-text transcription using Google Speech Recognition
- Multi-language support (Urdu, English, Hindi, Arabic)
- External poetry source integration (Rekhta.org)

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│  React Frontend │ ───> │  Express Backend │ ───> │ Python AI Service   │
│  (Port 5173)    │      │  (Port 5000)     │      │ (Port 5001)         │
└─────────────────┘      └──────────────────┘      └─────────────────────┘
                                │
                                │
                         ┌──────▼──────┐
                         │   MongoDB   │
                         └─────────────┘
```

## 🛠️ Tech Stack

### Frontend
- React + Vite
- Tailwind CSS
- Axios for API calls

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Tesseract.js (OCR)
- Fuse.js (Fuzzy search)
- JWT Authentication

### Python AI Service
- Flask + Flask-CORS
- SpeechRecognition
- pydub (Audio processing)
- Google Speech API

## 📚 Documentation

- [Integration Guide](INTEGRATION_GUIDE.md) - Complete architecture and API documentation
- [Start Instructions](START_INSTRUCTIONS.md) - Detailed startup guide
- [Python Service README](python-ai-service/README.md) - Python service documentation

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
PYTHON_AI_SERVICE_URL=http://localhost:5001
```

### Python Service Environment

Already configured in `python-ai-service/.env`:
```env
PORT=5001
DEFAULT_LANGUAGE=ur-PK
SUPPORTED_LANGUAGES=ur-PK,en-US,hi-IN
```

## 🧪 Testing

### Test Python Service
```bash
curl http://localhost:5001/health
```

### Test Voice Search
1. Navigate to http://localhost:5173/search
2. Click آواز (Voice) tab
3. Upload an audio file with Urdu speech
4. Verify transcription and search results

### Test Text Search
1. Go to http://localhost:5173/search
2. Click متن (Text) tab
3. Type "allama iqbal"
4. Verify results appear from database and Rekhta

## 🐛 Troubleshooting

### Python Service Not Responding

**Error:** `ECONNREFUSED 127.0.0.1:5001`

**Solution:**
```powershell
cd python-ai-service
.\venv\Scripts\Activate.ps1
python app.py
```

### Backend Missing Dependencies

**Error:** `Cannot find module 'form-data'`

**Solution:**
```bash
cd backend
npm install
```

### Voice Transcription Fails

**Solutions:**
1. Check audio quality (clear speech, low noise)
2. Verify Python service is running
3. Try alternative language: `en-US` or `hi-IN`
4. Install FFmpeg for audio format conversion

### Port Already in Use

**Solution:**
```powershell
netstat -ano | findstr :5000
taskkill /PID <process_id> /F
```

## 📦 Project Structure

```
bazm-e-sukhan/
├── backend/              # Express API server
│   ├── controllers/      # Business logic
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   └── services/        # External services (Rekhta, OpenAI)
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   └── services/    # API client
├── python-ai-service/   # Flask microservice
│   ├── app.py          # Main Flask app
│   ├── requirements.txt # Python dependencies
│   └── venv/           # Virtual environment
└── start scripts/       # Helper scripts
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `FLASK_ENV=production` in Python service
- [ ] Set `NODE_ENV=production` for Express
- [ ] Use Gunicorn for Python: `gunicorn -w 4 app:app`
- [ ] Use PM2 for Express: `pm2 start server.js`
- [ ] Configure reverse proxy (Nginx)
- [ ] Enable HTTPS with SSL certificates
- [ ] Set up MongoDB Atlas with IP whitelist
- [ ] Configure production environment variables

## 📄 License

Part of Bazm-E-Sukhan FYP Project

---

Made with ❤️ for Urdu poetry lovers
# bazm-e-sukhan
