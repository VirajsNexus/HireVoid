import os
import json
import requests
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_sqlalchemy import SQLAlchemy
from authlib.integrations.flask_client import OAuth
from groq import Groq
from dotenv import load_dotenv
from functools import wraps

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hirevoid.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'index'

# OAuth Configuration
oauth = OAuth(app)

# Google OAuth
google = oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# GitHub OAuth
github = oauth.register(
    name='github',
    client_id=os.getenv("GITHUB_CLIENT_ID"),
    client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
    access_token_url='https://github.com/login/oauth/access_token',
    access_token_params=None,
    authorize_url='https://github.com/login/oauth/authorize',
    authorize_params=None,
    api_base_url='https://api.github.com/',
    client_kwargs={'scope': 'user:email'},
)

# LinkedIn OAuth
linkedin = oauth.register(
    name='linkedin',
    client_id=os.getenv("LINKEDIN_CLIENT_ID"),
    client_secret=os.getenv("LINKEDIN_CLIENT_SECRET"),
    access_token_url='https://www.linkedin.com/oauth/v2/accessToken',
    authorize_url='https://www.linkedin.com/oauth/v2/authorization',
    api_base_url='https://api.linkedin.com/v2/',
    client_kwargs={'scope': 'r_liteprofile r_emailaddress'},
)

# Database Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100))
    avatar = db.Column(db.String(500))
    provider = db.Column(db.String(20))
    provider_id = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.email}>'

class SavedAnalysis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    analysis_type = db.Column(db.String(50))
    data = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('analyses', lazy=True))

# Create tables
with app.app_context():
    db.create_all()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

def get_groq_json(system_prompt, user_prompt):
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": f"{system_prompt} Respond ONLY in valid JSON."},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Error: {e}")
        return None

# Custom decorator for API endpoints that require login
def api_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({
                'error': 'Authentication required',
                'message': 'Please sign in to use this feature',
                'authenticated': False
            }), 401
        return f(*args, **kwargs)
    return decorated_function

# ============================================
# AUTHENTICATION ROUTES
# ============================================

@app.route('/')
def index():
    return render_template('index.html', user=current_user)

@app.route('/login/<provider>')
def login(provider):
    """Initiate OAuth login"""
    if provider == 'google':
        redirect_uri = url_for('authorize_google', _external=True)
        return google.authorize_redirect(redirect_uri)
    elif provider == 'github':
        redirect_uri = url_for('authorize_github', _external=True)
        return github.authorize_redirect(redirect_uri)
    elif provider == 'linkedin':
        redirect_uri = url_for('authorize_linkedin', _external=True)
        return linkedin.authorize_redirect(redirect_uri)
    else:
        return jsonify({"error": "Invalid provider"}), 400

@app.route('/authorize/google')
def authorize_google():
    """Google OAuth callback"""
    try:
        token = google.authorize_access_token()
        user_info = google.get('https://www.googleapis.com/oauth2/v3/userinfo').json()
        
        user = User.query.filter_by(email=user_info['email']).first()
        if not user:
            user = User(
                email=user_info['email'],
                name=user_info.get('name'),
                avatar=user_info.get('picture'),
                provider='google',
                provider_id=user_info['sub']
            )
            db.session.add(user)
        else:
            user.last_login = datetime.utcnow()
            user.avatar = user_info.get('picture')
        
        db.session.commit()
        login_user(user)
        return redirect('/')
    except Exception as e:
        print(f"Google auth error: {e}")
        return redirect('/?error=auth_failed')

@app.route('/authorize/github')
def authorize_github():
    """GitHub OAuth callback"""
    try:
        token = github.authorize_access_token()
        resp = github.get('user')
        user_info = resp.json()
        
        email = user_info.get('email')
        if not email:
            emails_resp = github.get('user/emails')
            emails = emails_resp.json()
            email = next((e['email'] for e in emails if e['primary']), None)
        
        if not email:
            return redirect('/?error=no_email')
        
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                email=email,
                name=user_info.get('name') or user_info.get('login'),
                avatar=user_info.get('avatar_url'),
                provider='github',
                provider_id=str(user_info['id'])
            )
            db.session.add(user)
        else:
            user.last_login = datetime.utcnow()
            user.avatar = user_info.get('avatar_url')
        
        db.session.commit()
        login_user(user)
        return redirect('/')
    except Exception as e:
        print(f"GitHub auth error: {e}")
        return redirect('/?error=auth_failed')

@app.route('/authorize/linkedin')
def authorize_linkedin():
    """LinkedIn OAuth callback"""
    try:
        token = linkedin.authorize_access_token()
        
        headers = {'Authorization': f'Bearer {token["access_token"]}'}
        profile_resp = requests.get('https://api.linkedin.com/v2/me', headers=headers)
        profile = profile_resp.json()
        
        email_resp = requests.get(
            'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
            headers=headers
        )
        email_data = email_resp.json()
        email = email_data['elements'][0]['handle~']['emailAddress']
        
        first_name = profile.get('localizedFirstName', '')
        last_name = profile.get('localizedLastName', '')
        name = f"{first_name} {last_name}".strip()
        
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                email=email,
                name=name,
                provider='linkedin',
                provider_id=profile['id']
            )
            db.session.add(user)
        else:
            user.last_login = datetime.utcnow()
        
        db.session.commit()
        login_user(user)
        return redirect('/')
    except Exception as e:
        print(f"LinkedIn auth error: {e}")
        return redirect('/?error=auth_failed')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/')

@app.route('/api/user')
def get_user():
    """Get current user info"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'email': current_user.email,
                'name': current_user.name,
                'avatar': current_user.avatar,
                'provider': current_user.provider
            }
        })
    return jsonify({'authenticated': False})

# ============================================
# PROTECTED API ROUTES (LOGIN REQUIRED)
# ============================================

@app.route('/api/analyze-resume', methods=['POST'])
@api_login_required
def analyze_resume():
    """Resume analysis - LOGIN REQUIRED"""
    data = request.get_json()
    system = """
    Return a JSON object with:
    - 'rating': int (1-10)
    - 'strengths': string (brief paragraph)
    - 'improvements': string (brief paragraph)
    - 'skills': array of strings
    - 'suggestions': array of objects, each with 'title', 'description', and 'type' (use 'success', 'warning', or 'info')
    """
    user = f"Resume Content: {data.get('resume')}"
    result = get_groq_json(system, user)
    
    # Save to user's history
    if result:
        try:
            analysis = SavedAnalysis(
                user_id=current_user.id,
                analysis_type='resume',
                data=json.dumps({'input': data, 'output': result})
            )
            db.session.add(analysis)
            db.session.commit()
        except Exception as e:
            print(f"Error saving analysis: {e}")
    
    return jsonify(result), 200

@app.route('/api/analyze-match', methods=['POST'])
@api_login_required
def analyze_match():
    """Match analysis - LOGIN REQUIRED"""
    data = request.get_json()
    system = """
    Compare Resume vs Job Description. Return JSON:
    - 'score': int (0-100) - overall match score
    - 'verdict': string - brief verdict message
    - 'summary': string - detailed analysis paragraph
    - 'matchedSkills': array of strings - skills found in both resume and JD
    - 'missingSkills': array of strings - required skills missing from resume
    - 'breakdown': object with three integer percentages (0-100):
        - 'skills': percentage of required skills matched
        - 'experience': percentage of experience requirements met
        - 'keywords': percentage of important keywords matched
    - 'suggestions': array of objects with 'title', 'description', and 'type' (use 'success', 'warning', or 'info')
    """
    user = f"Resume: {data.get('resume')}\nJD: {data.get('jd')}"
    result = get_groq_json(system, user)
    
    # Save to user's history
    if result:
        try:
            analysis = SavedAnalysis(
                user_id=current_user.id,
                analysis_type='match',
                data=json.dumps({'input': data, 'output': result})
            )
            db.session.add(analysis)
            db.session.commit()
        except Exception as e:
            print(f"Error saving analysis: {e}")
    
    return jsonify(result), 200

@app.route('/api/analyze-jd', methods=['POST'])
@api_login_required
def analyze_jd():
    """JD analysis - LOGIN REQUIRED"""
    data = request.get_json()
    system = "Return keys: 'overview', 'mustHaveSkills', 'niceToHaveSkills', 'responsibilities', 'preparationTips'."
    user = f"JD: {data.get('jd')}"
    result = get_groq_json(system, user)
    
    # Save to user's history
    if result:
        try:
            analysis = SavedAnalysis(
                user_id=current_user.id,
                analysis_type='jd',
                data=json.dumps({'input': data, 'output': result})
            )
            db.session.add(analysis)
            db.session.commit()
        except Exception as e:
            print(f"Error saving analysis: {e}")
    
    return jsonify(result), 200

@app.route('/api/find-linkedin-jobs', methods=['POST'])
@api_login_required
def find_linkedin_jobs():
    """Job search - LOGIN REQUIRED"""
    try:
        data = request.get_json()
        role = data.get('role', '').strip()
        location = data.get('location', '').strip()
        experience_level = data.get('experienceLevel', '')
        filter_type = data.get('filterType', '')
        resume = data.get('resume', None)
        
        if not role:
            return jsonify({"error": "Please enter a job role to search for", "jobs": []}), 400
        if not location:
            return jsonify({"error": "Please enter a location", "jobs": []}), 400
        
        search_parts = [role]
        if experience_level and experience_level != '':
            search_parts.append(experience_level)
        if filter_type and filter_type != '':
            search_parts.append(filter_type)
        
        search_query = f"{' '.join(search_parts)} in {location}"
        
        url = "https://jsearch.p.rapidapi.com/search"
        querystring = {"query": search_query, "num_pages": "1"}
        headers = {
            "x-rapidapi-key": os.getenv("RAPIDAPI_KEY"),
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        
        api_res = requests.get(url, headers=headers, params=querystring)
        api_res.raise_for_status()
        results = api_res.json().get('data', [])

        formatted_jobs = []
        for job in results[:10]:
            job_title = job.get('job_title', '')
            job_desc = job.get('job_description', '')
            detected_level = detect_experience_level(job_title, job_desc)
            
            job_type = 'Full-time'
            if 'contract' in job_title.lower() or 'contract' in job_desc.lower():
                job_type = 'Contract'
            elif 'part-time' in job_title.lower() or 'part-time' in job_desc.lower():
                job_type = 'Part-time'
            elif 'intern' in job_title.lower():
                job_type = 'Internship'
            
            formatted_jobs.append({
                "title": job.get('job_title', 'Role'),
                "company": job.get('employer_name', 'N/A'),
                "description": job.get('job_description', '')[:200] + "..." if job.get('job_description') else '',
                "url": job.get('job_apply_link', '#'),
                "matchScore": calculate_match_score(job, resume, experience_level),
                "matchLevel": "high",
                "requiredSkills": job.get('job_required_skills', [])[:4] if job.get('job_required_skills') else [],
                "postedDate": format_posted_date(job.get('job_posted_at_datetime_utc', '')),
                "experienceLevel": detected_level,
                "jobType": job_type
            })

        summary_parts = [f"Found {len(formatted_jobs)} {role} opportunities"]
        if experience_level and experience_level != '':
            summary_parts.append(f"at {experience_level} level")
        summary_parts.append(f"in {location}")
        summary = " ".join(summary_parts)
        
        result = {"jobs": formatted_jobs, "summary": summary}
        
        # Save to user's history
        try:
            analysis = SavedAnalysis(
                user_id=current_user.id,
                analysis_type='jobs',
                data=json.dumps({'input': data, 'output': result})
            )
            db.session.add(analysis)
            db.session.commit()
        except Exception as e:
            print(f"Error saving analysis: {e}")
        
        return jsonify(result), 200

    except requests.exceptions.RequestException as e:
        print(f"API Error: {str(e)}")
        return jsonify({"error": "Failed to fetch jobs from the API.", "jobs": []}), 500
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred.", "jobs": []}), 500

# ============================================
# USER HISTORY (Protected Routes)
# ============================================

@app.route('/api/history')
@login_required
def get_history():
    """Get user's saved analyses"""
    analyses = SavedAnalysis.query.filter_by(user_id=current_user.id).order_by(SavedAnalysis.created_at.desc()).limit(50).all()
    return jsonify({
        'analyses': [{
            'id': a.id,
            'type': a.analysis_type,
            'data': json.loads(a.data),
            'created_at': a.created_at.isoformat()
        } for a in analyses]
    })

@app.route('/api/history/<int:analysis_id>', methods=['DELETE'])
@login_required
def delete_analysis(analysis_id):
    """Delete a saved analysis"""
    analysis = SavedAnalysis.query.filter_by(id=analysis_id, user_id=current_user.id).first()
    if analysis:
        db.session.delete(analysis)
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'error': 'Analysis not found'}), 404

# Helper functions
def detect_experience_level(title, description):
    text = (title + " " + description).lower()
    if any(word in text for word in ['intern', 'internship', 'student']):
        return 'Internship'
    elif any(word in text for word in ['entry', 'junior', 'graduate', 'associate']):
        return 'Entry Level'
    elif any(word in text for word in ['senior', 'sr.', 'sr ']):
        return 'Senior'
    elif any(word in text for word in ['lead', 'principal', 'staff']):
        return 'Lead'
    elif any(word in text for word in ['manager', 'head of', 'director']):
        return 'Manager'
    elif any(word in text for word in ['vp', 'vice president', 'cto', 'ceo']):
        return 'Executive'
    elif any(word in text for word in ['mid-level', 'intermediate', '3-5 years', '2-4 years']):
        return 'Mid Level'
    else:
        return None

def calculate_match_score(job, resume, experience_level):
    score = 85
    if resume and job.get('job_required_skills'):
        resume_lower = resume.lower()
        matched_skills = sum(1 for skill in job.get('job_required_skills', []) if skill.lower() in resume_lower)
        total_skills = len(job.get('job_required_skills', []))
        if total_skills > 0:
            skill_match_percentage = (matched_skills / total_skills) * 100
            score = int((score + skill_match_percentage) / 2)
    return min(score, 99)

def format_posted_date(date_string):
    if not date_string:
        return 'Recently'
    try:
        return date_string[:10]
    except:
        return 'Recently'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
