import os
import json
import hashlib
import uuid
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import base64

app = Flask(__name__)
app.secret_key = os.getenv('SESSION_SECRET', 'your-secret-key-here')

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Ensure directories exist
os.makedirs('data', exist_ok=True)
os.makedirs('uploads', exist_ok=True)

def load_json_file(filename, default=None):
    """Load JSON data from file with error handling"""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default if default is not None else []

def save_json_file(filename, data):
    """Save JSON data to file"""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_by_email(email):
    """Get user by email from JSON storage"""
    users = load_json_file('data/users.json', [])
    for user in users:
        if user['email'] == email:
            return user
    return None

def create_user(email, password, username):
    """Create new user in JSON storage"""
    users = load_json_file('data/users.json', [])
    
    # Check if user already exists
    if get_user_by_email(email):
        return False
    
    user_id = str(uuid.uuid4())
    hashed_password = generate_password_hash(password)
    
    new_user = {
        'id': user_id,
        'email': email,
        'username': username,
        'password': hashed_password,
        'created_at': datetime.now().isoformat()
    }
    
    users.append(new_user)
    save_json_file('data/users.json', users)
    return True

def save_model(user_id, model_data):
    """Save 3D model data to JSON storage"""
    models = load_json_file('data/models.json', [])
    
    model_id = str(uuid.uuid4())
    model_entry = {
        'id': model_id,
        'user_id': user_id,
        'name': model_data.get('name', 'Untitled Model'),
        'type': model_data.get('type', 'upload'),  # 'upload' or 'draw'
        'original_file': model_data.get('original_file'),
        'model_file': model_data.get('model_file'),
        'thumbnail': model_data.get('thumbnail'),
        'created_at': datetime.now().isoformat(),
        'processing_status': 'completed'
    }
    
    models.append(model_entry)
    save_json_file('data/models.json', models)
    return model_id

def get_user_models(user_id):
    """Get all models for a specific user"""
    models = load_json_file('data/models.json', [])
    return [model for model in models if model['user_id'] == user_id]

@app.route('/')
def index():
    """Home page"""
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        
        user = get_user_by_email(email)
        
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        username = request.form['username']
        
        if create_user(email, password, username):
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        else:
            flash('Email already exists', 'error')
    
    return render_template('register.html')

@app.route('/logout')
def logout():
    """User logout"""
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    """User dashboard"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_models = get_user_models(session['user_id'])
    return render_template('dashboard.html', models=user_models)

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    """Image upload for 2D to 3D conversion"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file selected', 'error')
            return redirect(request.url)
        
        file = request.files['file']
        model_name = request.form.get('model_name', 'Untitled Model')
        
        if file.filename == '':
            flash('No file selected', 'error')
            return redirect(request.url)
        
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add timestamp to avoid conflicts
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
            filename = timestamp + filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Simulate 3D model generation
            model_data = {
                'name': model_name,
                'type': 'upload',
                'original_file': filename,
                'model_file': f'model_{uuid.uuid4().hex[:8]}.obj',
                'thumbnail': f'thumb_{uuid.uuid4().hex[:8]}.jpg'
            }
            
            model_id = save_model(session['user_id'], model_data)
            flash('Model generated successfully!', 'success')
            return redirect(url_for('models'))
        else:
            flash('Invalid file type. Please upload PNG, JPG, JPEG, GIF, or WebP files.', 'error')
    
    return render_template('upload.html')

@app.route('/draw', methods=['GET', 'POST'])
def draw():
    """In-app drawing for 2D to 3D conversion"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        canvas_data = request.form.get('canvas_data')
        model_name = request.form.get('model_name', 'Untitled Drawing')
        
        if canvas_data:
            # Save canvas data as image
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
            filename = f'{timestamp}drawing.png'
            
            # Decode base64 image data
            try:
                image_data = canvas_data.split(',')[1]
                with open(os.path.join(app.config['UPLOAD_FOLDER'], filename), 'wb') as f:
                    f.write(base64.b64decode(image_data))
                
                # Simulate 3D model generation
                model_data = {
                    'name': model_name,
                    'type': 'draw',
                    'original_file': filename,
                    'model_file': f'model_{uuid.uuid4().hex[:8]}.obj',
                    'thumbnail': f'thumb_{uuid.uuid4().hex[:8]}.jpg'
                }
                
                model_id = save_model(session['user_id'], model_data)
                return jsonify({'success': True, 'model_id': model_id})
            except Exception as e:
                return jsonify({'success': False, 'error': str(e)})
        
        return jsonify({'success': False, 'error': 'No canvas data received'})
    
    return render_template('draw.html')

@app.route('/models')
def models():
    """View user's 3D models"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_models = get_user_models(session['user_id'])
    return render_template('models.html', models=user_models)

@app.route('/features')
def features():
    """Features page"""
    return render_template('features.html')

@app.route('/about')
def about():
    """About page"""
    return render_template('about.html')

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    """Contact page"""
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        message = request.form['message']
        
        # In a real application, you would send this to your email service
        flash('Thank you for your message! We will get back to you soon.', 'success')
        return redirect(url_for('contact'))
    
    return render_template('contact.html')

@app.route('/demo')
def demo():
    """Demo page with video"""
    return render_template('demo.html')

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    flash('File is too large. Maximum size is 16MB.', 'error')
    return redirect(request.url)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
