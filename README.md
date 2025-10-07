# 🎭 Bazm-E-Sukhan - Urdu Poetry Platform

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
npm install
npm run seed    # Create sample data
npm run dev     # Start backend server
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev     # Start frontend server
```

### Usage

1. Open `http://localhost:3000` in your browser
2. Navigate to Poetry Collection (`/poetry-collection`)
3. Test all features:
   - Search poems by typing in "تلاش کریں"
   - Filter by category (قسم) and mood (مزاج)
   - Sort results using "ترتیب" options
   - Interact with poem cards (like, bookmark, favorite)

## ✨ Features

- **Dynamic Search & Filters**: Real-time filtering with Urdu text support
- **Cultural Design**: Authentic Islamic patterns and Nastaleeq fonts
- **Interactive Cards**: Like, bookmark, and favorite poems
- **Responsive Layout**: Works on all devices
- **Sample Data**: Includes fallback data for testing without backend

## 🛠️ Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express, MongoDB
- **Features**: Real-time search, cultural UI, authentication

## 🔧 Troubleshooting

### API Connection Issues

If you see `404 (Not Found)` errors:

1. **Check Backend Server**:

   ```bash
   cd backend
   npm run dev
   ```

   Server should start on `http://localhost:5000`

2. **Test API Connection**:

   ```bash
   node test-api-connection.js
   ```

3. **Common Issues**:

   - ❌ Backend not running → Start with `npm run dev`
   - ❌ Wrong port → Backend should be on port 5000
   - ❌ Database connection → Check MongoDB connection in `.env`
   - ❌ CORS issues → Verify CORS settings allow localhost:5173

4. **Check Endpoints**:
   - Health: `http://localhost:5000/api/health`
   - Poetry: `http://localhost:5000/api/poetry`

### Frontend Issues

1. **Vite Proxy**: Frontend uses proxy configuration in `vite.config.js`
2. **Sample Data**: Poetry collection works with fallback data if backend is unavailable
3. **Error Messages**: Check browser console for detailed error information

### Environment Setup

Create `.env` files:

**Backend `.env`**:

```
MONGODB_URI=mongodb://localhost:27017/bazm-e-sukhan
JWT_SECRET=your-secret-key
PORT=5000
```

**Frontend `.env`**:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

---

Made with ❤️ for Urdu poetry lovers
