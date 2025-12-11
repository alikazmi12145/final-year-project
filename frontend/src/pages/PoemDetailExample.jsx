import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Calendar } from "lucide-react";
import BookmarkButton from "../components/bookmarks/BookmarkButton";
import DownloadPDFButton from "../components/pdf/DownloadPDFButton";
import { useTrackPoemView } from "../hooks/useHistory";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

/**
 * Poem Detail Page Example
 * Shows how to integrate bookmark, history tracking, and PDF export
 */
const PoemDetail = () => {
  const { id } = useParams();
  const [poem, setPoem] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Automatically track poem view
  useTrackPoemView(id);

  useEffect(() => {
    // Fetch poem data (replace with your actual API call)
    const fetchPoem = async () => {
      try {
        setLoading(true);
        // Example: const response = await axios.get(`/api/poems/${id}`);
        // setPoem(response.data.poem);
        
        // Mock data for demonstration
        setPoem({
          _id: id,
          title: "Sample Poem Title",
          urduTitle: "نمونہ شعر کا عنوان",
          author: {
            _id: "author1",
            name: "Sample Poet",
          },
          verses: [
            { urdu: "یہ ایک نمونہ شعر ہے", roman: "Yeh aik namoona sher hai" },
            { urdu: "جو صرف مثال کے لیے ہے", roman: "Jo sirf misaal ke liye hai" },
          ],
          category: "Ghazal",
          createdAt: new Date(),
        });
      } catch (error) {
        console.error("Fetch poem error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoem();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-urdu-brown mb-4">
            Poem not found
          </h2>
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cultural-bg py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          to="/search"
          className="inline-flex items-center text-urdu-brown hover:text-urdu-gold mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Search
        </Link>

        {/* Poem Card */}
        <div className="card p-8">
          {/* Header with Actions */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-urdu-brown mb-2">
                {poem.urduTitle}
              </h1>
              {poem.title && poem.title !== poem.urduTitle && (
                <h2 className="text-xl text-urdu-maroon mb-4">{poem.title}</h2>
              )}
              <div className="flex items-center gap-4 text-urdu-maroon">
                {poem.author && (
                  <div className="flex items-center">
                    <User size={16} className="mr-2" />
                    <Link
                      to={`/poets/${poem.author._id}`}
                      className="hover:text-urdu-gold transition-colors"
                    >
                      {poem.author.name}
                    </Link>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar size={16} className="mr-2" />
                  {new Date(poem.createdAt).toLocaleDateString()}
                </div>
                {poem.category && (
                  <span className="bg-urdu-cream px-3 py-1 rounded-full text-sm">
                    {poem.category}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 ml-4">
              <BookmarkButton poemId={poem._id} size="lg" />
              <DownloadPDFButton poemId={poem._id} size="md" />
            </div>
          </div>

          {/* Poem Content */}
          <div className="border-t border-urdu-cream pt-6">
            {poem.verses && poem.verses.length > 0 ? (
              <div className="space-y-6">
                {poem.verses.map((verse, index) => (
                  <div
                    key={index}
                    className="text-center py-4 border-b border-urdu-cream/50 last:border-0"
                  >
                    {verse.urdu && (
                      <p className="text-2xl text-urdu-brown mb-2 font-urdu leading-relaxed">
                        {verse.urdu}
                      </p>
                    )}
                    {verse.roman && (
                      <p className="text-lg text-urdu-maroon italic">
                        {verse.roman}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-lg text-urdu-brown text-center py-8">
                {poem.content || "No content available"}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-urdu-cream pt-6 mt-6 flex justify-center gap-4">
            <DownloadPDFButton
              poemId={poem._id}
              variant="outline"
              showLabel={true}
            />
            <Link to={`/poets/${poem.author?._id}`} className="btn-secondary">
              More by {poem.author?.name}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoemDetail;
