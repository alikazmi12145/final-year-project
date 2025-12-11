// ============================================
// FRONTEND INTEGRATION EXAMPLES
// ============================================

// Example 1: Add to any poem page
// ===================================
import BookmarkButton from './components/bookmarks/BookmarkButton';
import DownloadPDFButton from './components/pdf/DownloadPDFButton';
import { useTrackPoemView } from './hooks/useHistory';

function PoemPage({ poemId }) {
  // Automatically track this poem as read
  useTrackPoemView(poemId);

  return (
    <div>
      <h1>Poem Title</h1>
      <div className="actions">
        <BookmarkButton poemId={poemId} size="lg" showLabel />
        <DownloadPDFButton poemId={poemId} variant="primary" />
      </div>
      {/* Your poem content */}
    </div>
  );
}

// Example 2: Create a Library page
// ===================================
import React from 'react';
import BookmarksList from './components/bookmarks/BookmarksList';
import HistoryList from './components/history/HistoryList';

function LibraryPage() {
  const [tab, setTab] = React.useState('bookmarks');

  return (
    <div>
      <h1>My Library</h1>
      <div className="tabs">
        <button onClick={() => setTab('bookmarks')}>Bookmarks</button>
        <button onClick={() => setTab('history')}>History</button>
      </div>
      
      {tab === 'bookmarks' ? (
        <BookmarksList />
      ) : (
        <HistoryList showStats={true} />
      )}
    </div>
  );
}

// Example 3: Export multiple poems
// ===================================
import { usePDFExport } from './hooks/usePDFExport';
import useBookmarks from './hooks/useBookmarks';

function ExportBookmarks() {
  const { bookmarks } = useBookmarks();
  const { exportCollectionPDF, loading } = usePDFExport();

  const handleExport = () => {
    const poemIds = bookmarks.map(b => b.poem._id);
    exportCollectionPDF(poemIds, 'my-poetry-collection.pdf');
  };

  return (
    <button onClick={handleExport} disabled={loading}>
      {loading ? 'Generating PDF...' : 'Export All as PDF'}
    </button>
  );
}

// Example 4: Custom bookmark hook usage
// ===================================
import { useIsBookmarked } from './hooks/useBookmarks';

function CustomBookmarkComponent({ poemId }) {
  const { isBookmarked, toggleBookmark, loading } = useIsBookmarked(poemId);

  return (
    <button 
      onClick={toggleBookmark}
      disabled={loading}
      className={isBookmarked ? 'bookmarked' : ''}
    >
      {isBookmarked ? '⭐ Bookmarked' : '☆ Bookmark'}
    </button>
  );
}

// Example 5: Reading stats display
// ===================================
import { useReadingStreak } from './hooks/useHistory';

function StatsWidget() {
  const { currentStreak, longestStreak, loading } = useReadingStreak();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="stats">
      <div className="stat">
        <h3>🔥 Current Streak</h3>
        <p>{currentStreak} days</p>
      </div>
      <div className="stat">
        <h3>🏆 Best Streak</h3>
        <p>{longestStreak} days</p>
      </div>
    </div>
  );
}

// Example 6: Add to router
// ===================================
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MyLibrary from './pages/MyLibrary';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<MyLibrary />} />
        <Route path="/poems/:id" element={<PoemDetailExample />} />
        {/* other routes */}
      </Routes>
    </BrowserRouter>
  );
}
