import os
import json
import requests
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze-resume', methods=['POST'])
def analyze_resume():
    data = request.get_json()
    # Define the structure clearly for the AI
    system = """
    Return a JSON object with:
    - 'rating': int (1-10)
    - 'strengths': string (brief paragraph)
    - 'improvements': string (brief paragraph)
    - 'skills': array of strings
    - 'suggestions': array of objects, each with 'title', 'description', and 'type' (use 'success', 'warning', or 'info')
    """
    user = f"Resume Content: {data.get('resume')}"
    return jsonify(get_groq_json(system, user)), 200

@app.route('/api/analyze-match', methods=['POST'])
def analyze_match():
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
    return jsonify(get_groq_json(system, user)), 200

@app.route('/api/analyze-jd', methods=['POST'])
def analyze_jd():
    data = request.get_json()
    system = "Return keys: 'overview', 'mustHaveSkills', 'niceToHaveSkills', 'responsibilities', 'preparationTips'."
    user = f"JD: {data.get('jd')}"
    return jsonify(get_groq_json(system, user)), 200


@app.route('/api/find-linkedin-jobs', methods=['POST'])
def find_linkedin_jobs():
    try:
        # Get data from Frontend
        data = request.get_json()
        role = data.get('role', '').strip()
        location = data.get('location', '').strip()
        experience_level = data.get('experienceLevel', '')
        filter_type = data.get('filterType', '')
        resume = data.get('resume', None)
        
        # Validate required inputs
        if not role:
            return jsonify({
                "error": "Please enter a job role to search for",
                "jobs": []
            }), 400
            
        if not location:
            return jsonify({
                "error": "Please enter a location",
                "jobs": []
            }), 400
        
        # Build search query with experience level
        search_parts = [role]
        
        # Add experience level to search if provided
        if experience_level and experience_level != '':
            search_parts.append(experience_level)
        
        # Add filter type if provided
        if filter_type and filter_type != '':
            search_parts.append(filter_type)
        
        # Add location
        search_query = f"{' '.join(search_parts)} in {location}"
        
        print(f"Search Query: {search_query}")  # For debugging
        
        # Call RapidAPI JSearch
        url = "https://jsearch.p.rapidapi.com/search"
        querystring = {
            "query": search_query,
            "num_pages": "1"
        }
        
        headers = {
            "x-rapidapi-key": os.getenv("RAPIDAPI_KEY"),
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        
        api_res = requests.get(url, headers=headers, params=querystring)
        api_res.raise_for_status()
        
        results = api_res.json().get('data', [])

        # Format jobs for frontend
        formatted_jobs = []
        for job in results[:10]:
            # Try to extract experience level from job title or description
            job_title = job.get('job_title', '')
            job_desc = job.get('job_description', '')
            detected_level = detect_experience_level(job_title, job_desc)
            
            # Determine job type
            job_type = 'Full-time'  # Default
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

        # Build summary message
        summary_parts = [f"Found {len(formatted_jobs)} {role} opportunities"]
        if experience_level and experience_level != '':
            summary_parts.append(f"at {experience_level} level")
        summary_parts.append(f"in {location}")
        
        summary = " ".join(summary_parts)

        return jsonify({
            "jobs": formatted_jobs,
            "summary": summary
        }), 200

    except requests.exceptions.RequestException as e:
        print(f"API Error: {str(e)}")
        return jsonify({
            "error": "Failed to fetch jobs from the API. Please check your API key and try again.",
            "jobs": []
        }), 500
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "error": "An unexpected error occurred. Please try again.",
            "jobs": []
        }), 500

# Helper function to detect experience level from job posting
def detect_experience_level(title, description):
    """Detect experience level from job title or description"""
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

# Helper function to calculate match score
def calculate_match_score(job, resume, experience_level):
    """Calculate match score based on various factors"""
    score = 85  # Base score
    
    # If resume provided, could use AI to calculate better match
    # For now, simple heuristic
    
    if resume and job.get('job_required_skills'):
        # Simple keyword matching
        resume_lower = resume.lower()
        matched_skills = 0
        total_skills = len(job.get('job_required_skills', []))
        
        for skill in job.get('job_required_skills', []):
            if skill.lower() in resume_lower:
                matched_skills += 1
        
        if total_skills > 0:
            skill_match_percentage = (matched_skills / total_skills) * 100
            score = int((score + skill_match_percentage) / 2)
    
    return min(score, 99)  # Cap at 99%

# Helper function to format posted date
def format_posted_date(date_string):
    """Format the posted date to human-readable format"""
    if not date_string:
        return 'Recently'
    
    try:
        # Extract just the date part (YYYY-MM-DD)
        date_part = date_string[:10]
        return date_part
    except:
        return 'Recently'

    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
