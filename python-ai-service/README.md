# AI Multimodal Search - Python Microservice

This Python Flask microservice provides AI-powered voice transcription for the Bazm-E-Sukhan poetry platform.

## Features

- **Voice-to-Text**: Transcribes audio files using Google Speech Recognition
- **Multi-language Support**: Urdu (ur-PK), English (en-US), Hindi (hi-IN)
- **Automatic Format Conversion**: Supports WAV, MP3, WebM, OGG, M4A
- **RESTful API**: Flask-based REST API with CORS enabled

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Setup Instructions

### 1. Create Virtual Environment

```bash
cd python-ai-service
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
.\venv\Scripts\activate.bat
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Service

```bash
python app.py
```

The service will start on `http://localhost:5001`

## API Endpoints

### Health Check
```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "AI Multimodal Search Python Service",
  "version": "1.0.0"
}
```

### Voice Transcription
```
POST /analyze/audio
```

Request (multipart/form-data):
- `file`: Audio file (WAV, MP3, WebM, OGG, M4A)
- `language`: Language code (optional, default: ur-PK)

Response:
```json
{
  "success": true,
  "text": "transcribed text in Urdu or English",
  "confidence": 0.85,
  "language": "ur-PK"
}
```

## Integration with Express Backend

The Express backend (`backend/routes/multimodal.js`) automatically forwards audio transcription requests to this Python service.

### Environment Variable

Add to `backend/.env`:
```
PYTHON_AI_SERVICE_URL=http://localhost:5001
```

## Supported Languages

- **Urdu**: `ur-PK`
- **English**: `en-US`
- **Hindi**: `hi-IN`

The service automatically tries fallback languages if the primary language fails to recognize the audio.

## File Size Limits

- Maximum file size: 16MB
- Supported formats: WAV, MP3, WebM, OGG, M4A

## Troubleshooting

### Python service not responding
Make sure the service is running:
```bash
cd python-ai-service
python app.py
```

### Import errors
Reinstall dependencies:
```bash
pip install --upgrade -r requirements.txt
```

### Audio format errors
The service automatically converts audio to WAV format. Ensure `ffmpeg` is installed:

**Windows**: Download from https://ffmpeg.org/download.html
**Linux**: `sudo apt-get install ffmpeg`
**Mac**: `brew install ffmpeg`

## Development

### Run in Debug Mode
The service runs in debug mode by default. To disable:

Edit `app.py`:
```python
app.run(host='0.0.0.0', port=5001, debug=False)
```

### Logs
The service logs all requests and errors to the console.

## Production Deployment

For production, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

## License

Part of Bazm-E-Sukhan FYP Project
