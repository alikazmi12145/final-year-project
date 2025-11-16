/* Example usage in any poem component or page:

import { useState } from "react";
import { Share2 } from "lucide-react";
import PoetryCardGenerator from "../components/homepage/PoetryCardGenerator";

function PoemCard({ poem, poet }) {
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <>
      <div className="poem-card">
        {/* Your poem card content *\/}
        
        {/* Share as Image Button *\/}
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Share2 className="w-4 h-4 ml-2" />
          <span className="nastaleeq-primary">تصویر بنائیں</span>
        </button>
      </div>

      {/* Poetry Card Generator Modal *\/}
      {showGenerator && (
        <PoetryCardGenerator
          poem={poem}
          poet={poet}
          onClose={() => setShowGenerator(false)}
        />
      )}
    </>
  );
}

*/

// This file serves as documentation for using the PoetryCardGenerator component
export const USAGE_NOTES = `
The PoetryCardGenerator component can be integrated anywhere you display poems.
Simply pass the poem object and poet object as props, and it will handle the rest.

Props:
- poem: { _id, title, content, category, mood }
- poet: { name, penName }
- onClose: callback function to close the modal

The component automatically:
1. Generates a beautifully styled card with cultural Urdu design
2. Converts the card to PNG image using html2canvas
3. Provides download and share functionality
4. Handles responsive design and RTL text
`;

export default USAGE_NOTES;
