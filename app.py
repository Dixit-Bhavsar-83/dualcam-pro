import os
from datetime import datetime
from flask import Flask, render_init_template, render_template, jsonify, request

app = Flask(__name__, template_folder='templates', static_folder='static')

# Ensure mockup storage directories exist
UPLOAD_FOLDER = os.path.join('static', 'downloads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/generate-filename', methods=['POST'])
def generate_filename():
    """Generates standardized production-compliant filenames for media tracks."""
    data = request.get_json() or {}
    prefix = data.get('prefix', 'Track')
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{prefix}_{timestamp}.mp4"
    return jsonify({
        "status": "success",
        "filename": filename,
        "timestamp": timestamp
    })

@app.route('/api/simulate-upload', methods=['POST'])
def simulate_upload():
    """Simulates cloud/local disk persistence for recorded video objects."""
    if 'video' not in request.files:
        return jsonify({"status": "error", "message": "No video file provided"}), 400
        
    file = request.files['video']
    filename = request.form.get('filename', f"video_{int(datetime.now().timestamp())}.mp4")
    
    # In a full production environment, files are saved here:
    # file.save(os.path.join(UPLOAD_FOLDER, filename))
    
    return jsonify({
        "status": "success",
        "message": "File written to simulated storage layer successfully",
        "saved_as": filename,
        "path": f"/static/downloads/{filename}"
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
