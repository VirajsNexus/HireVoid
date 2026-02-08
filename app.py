import os
import json
import requests
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# On production, you can restrict CORS to your domain for better security
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
        print(f"Error calling Groq: {e}")
        return {"error": "AI processing failed"}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze-resume', methods=['POST'])
def analyze_resume():
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
    return jsonify(get_groq_json(system, user))

@app.route('/api/analyze-match', methods=['POST'])
def analyze_match():
    data = request.get_json()
    system = """
    Compare Resume vs Job Description. Return JSON:
    - 'score': int (0-100)
    - 'verdict': string
    - 'summary': string
    - 'matchedSkills': array of strings
    - 'missingSkills': array of strings
    - 'suggestions': array of objects with 'title', 'description', and 'type'
    """
    user = f"Resume: {data.get('resume')}\nJD: {data.get('jd')}"
    return jsonify(get_groq_json(system, user))

@app.route('/api/analyze-jd', methods=['POST'])
def analyze_jd():
    data = request.get_json()
    system = "Return JSON with keys: 'overview', 'mustHaveSkills', 'niceToHaveSkills', 'responsibilities' (array of objects with 'title', 'desc'), 'preparationTips' (array of objects)."
    user = f"JD: {data.get('jd')}"
    return jsonify(get_groq_json(system, user))

@app.route('/api/find-linkedin-jobs', methods=['POST'])
def find_linkedin_jobs():
    try:
        data = request.get_json()
        location = data.get('location', 'India')
        
        url = "https://jsearch.p.rapidapi.com/search"
        querystring = {"query": f"Software Engineer in {location}", "num_pages": "1"}
        headers = {
            "x-rapidapi-key": os.getenv("RAPIDAPI_KEY"),
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }
        
        api_res = requests.get(url, headers=headers, params=querystring)
        api_res.raise_for_status()
        results = api_res.json().get('data', [])

        formatted_jobs = []
        for job in results[:6]:
            formatted_jobs.append({
                "title": job.get('job_title', 'Role'),
                "company": job.get('employer_name', 'N/A'),
                "url": job.get('job_apply_link', '#'),
                "matchScore": 85,
                "matchLevel": "high"
            })

        return jsonify({
            "jobs": formatted_jobs,
            "summary": f"Found {len(formatted_jobs)} opportunities in {location}"
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "Failed to fetch jobs", "jobs": []}), 500

if __name__ == '__main__':
    # Important: Render/Railway will inject the PORT environment variable
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
