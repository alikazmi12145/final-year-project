"""
Simple Flask service ONLY for OCR (no ML dependencies)
This avoids the heavy ML model loading issues
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from werkzeug.utils import secure_filename
import os
import tempfile

# Import only the OCR module
from image_ocr import get_ocr_engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Initialize OCR engine
logger.info("🚀 Initializing OCR engine...")
ocr_engine = get_ocr_engine()
logger.info("✅ OCR engine initialized")


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'OCR Service for Urdu Poetry',
        'version': '1.0.0'
    })


@app.route('/analyze/image', methods=['POST'])
def analyze_image():
    """
    Extract text from image using optimized OCR
    
    POST /analyze/image
    Content-Type: multipart/form-data
    
    Body:
        file: image file
    
    Response:
        {
            "success": true,
            "text": "extracted text",
            "confidence": 0.85,
            "language": "urdu"
        }
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty filename'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}'
            }), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"📸 Processing image: {filename}")
        
        # Extract text using OCR
        result = ocr_engine.extract_text(filepath)
        
        # Log detailed results
        if result['success']:
            logger.info(f"✅ OCR Success!")
            logger.info(f"   - Text Length: {len(result['text'])} characters")
            logger.info(f"   - Confidence: {(result['confidence'] * 100):.1f}%")
            logger.info(f"   - Language: {result['language']}")
            logger.info(f"   - Word Count: {result['word_count']}")
            logger.info(f"   - Extracted Text: {result['text']}")
        else:
            logger.error(f"❌ OCR Failed: {result.get('error', 'Unknown error')}")
        
        # Cleanup
        try:
            os.remove(filepath)
        except:
            pass
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        logger.error(f"❌ Image analysis error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'success': False,
        'error': 'File too large. Maximum size is 16MB.'
    }), 413


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    
    print("=" * 70)
    print("🐍 Urdu Poetry OCR Service (Lightweight)")
    print("=" * 70)
    print(f"🚀 Starting Flask server on http://localhost:{port}")
    print("🤖 OCR Engine: Tesseract (Urdu/English/Arabic)")
    print("")
    print("📡 Endpoints:")
    print("   - GET  /health")
    print("   - POST /analyze/image  (Urdu poetry couplet OCR)")
    print("=" * 70)
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False,
        use_reloader=False
    )
