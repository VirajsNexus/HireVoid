"""
HireVoid - AI-Powered Resume Analysis Platform
Enhanced with LinkedIn Job Matching
"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import json
import re
import os
import requests

# Configure Gemini API
API_KEY = "AIzaSyApePbEJ1cbs-XW8gp34859pKKQzg1xXsg"
genai.configure(api_key=API_KEY)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure Gemini model
model = genai.GenerativeModel(
    model_name='gemini-3-pro-preview',
    generation_config=genai.types.GenerationConfig(
        temperature=0.3,
        max_output_tokens=2048,
    )
)

# Helper function to parse JSON from response
def parse_json_response(text):
    """Extract and parse JSON from Gemini response"""
    # Remove markdown code fences if present
    text = re.sub(r'^```json\s*', '', text.strip())
    text = re.sub(r'^```\s*', '', text.strip())
    text = re.sub(r'\s*```$', '', text.strip())
    
    # Find JSON object
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            print(f"Text: {text[:500]}")
            raise
    raise ValueError("No valid JSON found in response")

# Routes
@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/api/analyze-match', methods=['POST'])
def analyze_match():
    """Analyze resume against job description"""
    try:
        data = request.get_json()
        resume = data.get('resume', '').strip()
        jd = data.get('jd', '').strip()
        
        if not resume or not jd:
            return jsonify({'error': 'Both resume and job description are required'}), 400
        
        prompt = f"""You are an expert resume analyzer. Analyze this resume against the job description and provide a detailed match analysis.

RESUME:
{resume}

JOB DESCRIPTION:
{jd}

Provide a comprehensive analysis of how well the resume matches the job description. Calculate a match score based on:
1. Skills alignment (technical and soft skills)
2. Experience relevance
3. Qualifications match
4. Keywords presence
5. Overall suitability

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{{
  "score": 85,
  "verdict": "Strong Match" / "Good Match" / "Moderate Match" / "Weak Match",
  "summary": "2-3 sentence comprehensive summary explaining the match quality, key strengths, and main gaps",
  "matchedSkills": ["Python", "Flask", "AWS", "Docker", "SQL"],
  "missingSkills": ["Kubernetes", "React", "GraphQL"],
  "suggestions": [
    {{"type": "green", "title": "Strong Technical Foundation", "description": "Your experience with Python and cloud technologies aligns perfectly with the role's backend requirements. The 3 years of hands-on AWS experience is a significant asset."}},
    {{"type": "amber", "title": "Expand DevOps Toolkit", "description": "While you have Docker experience, adding Kubernetes and CI/CD pipeline knowledge would strengthen your candidacy. Consider completing a certification or personal project."}},
    {{"type": "red", "title": "Frontend Skills Gap", "description": "The role requires React experience which isn't present in your resume. Consider taking an online course or building a full-stack project to demonstrate this capability."}}
  ]
}}

Ensure suggestions are actionable, specific, and helpful. Use green for strengths, amber for improvements, and red for critical gaps."""

        response = model.generate_content(prompt)
        result = parse_json_response(response.text)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in analyze_match: {e}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/api/analyze-resume', methods=['POST'])
def analyze_resume():
    """Analyze resume only"""
    try:
        data = request.get_json()
        resume = data.get('resume', '').strip()
        
        if not resume:
            return jsonify({'error': 'Resume text is required'}), 400
        
        prompt = f"""You are a professional resume coach with 15+ years of experience. Review this resume comprehensively and provide actionable feedback.

RESUME:
{resume}

Analyze the resume for:
1. Overall structure and formatting
2. Content quality and achievements
3. Skills presentation
4. Experience descriptions
5. ATS compatibility
6. Impact and measurability

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{{
  "rating": 8,
  "strengths": "Detailed paragraph (100-150 words) highlighting the strongest aspects of the resume including: clear achievements with metrics, strong technical skills presentation, and effective use of action verbs. Mention specific examples from the resume.",
  "improvements": "Detailed paragraph (100-150 words) explaining areas needing improvement such as: missing quantifiable achievements, weak action verbs, formatting inconsistencies, or gaps in experience. Provide specific suggestions for each issue.",
  "skills": ["Python", "JavaScript", "SQL", "Git", "Docker", "AWS", "React", "Node.js", "PostgreSQL", "REST APIs"],
  "suggestions": [
    {{"type": "green", "title": "Strong Technical Depth", "description": "Your technical skills section is comprehensive and well-organized. The progression from foundational languages to advanced frameworks demonstrates clear growth."}},
    {{"type": "amber", "title": "Add Quantifiable Metrics", "description": "Include specific numbers in your achievements: 'Improved performance by 40%' instead of 'Improved performance significantly'. This makes impact measurable."}},
    {{"type": "amber", "title": "Optimize for ATS", "description": "Use standard section headers like 'Work Experience' and 'Education'. Avoid tables or columns that ATS systems might not parse correctly."}},
    {{"type": "red", "title": "Missing Leadership Examples", "description": "For senior roles, add examples of mentoring, team leadership, or cross-functional collaboration. This demonstrates career progression beyond technical skills."}}
  ]
}}

Rate out of 10 based on content quality, impact, and presentation. Provide 3-5 specific, actionable suggestions."""

        response = model.generate_content(prompt)
        result = parse_json_response(response.text)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in analyze_resume: {e}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/api/analyze-jd', methods=['POST'])
def analyze_jd():
    """Analyze job description"""
    try:
        data = request.get_json()
        jd = data.get('jd', '').strip()
        
        if not jd:
            return jsonify({'error': 'Job description is required'}), 400
        
        prompt = f"""You are a career analyst specializing in job market trends. Analyze this job description thoroughly to help candidates understand what's really being asked.

JOB DESCRIPTION:
{jd}

Decode the job description by:
1. Identifying explicit and implicit requirements
2. Distinguishing must-have vs nice-to-have skills
3. Understanding key responsibilities
4. Recognizing company culture indicators
5. Highlighting preparation areas

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{{
  "overview": "2-3 sentence overview explaining the role's core purpose, seniority level, and what success looks like in this position. Mention team size or reporting structure if available.",
  "mustHaveSkills": ["Python", "Flask", "SQL", "REST APIs", "Git"],
  "niceToHaveSkills": ["Docker", "AWS", "React", "GraphQL"],
  "responsibilities": [
    {{"emoji": "💻", "title": "Backend Development", "desc": "Design and implement scalable microservices using Python and Flask. Own the API layer and ensure high performance under load."}},
    {{"emoji": "🔧", "title": "System Architecture", "desc": "Collaborate with senior engineers to design system architecture. Make technology decisions for new features and improvements."}},
    {{"emoji": "👥", "title": "Code Review & Mentorship", "desc": "Review pull requests, provide constructive feedback, and mentor junior developers. Foster code quality and best practices across the team."}},
    {{"emoji": "📊", "title": "Performance Optimization", "desc": "Identify and resolve performance bottlenecks. Implement caching strategies and database optimizations to improve system efficiency."}}
  ],
  "preparationTips": [
    {{"type": "green", "title": "Master the Core Tech Stack", "description": "Deep dive into Python, Flask, and PostgreSQL. Build a portfolio project demonstrating scalable API design with proper error handling and authentication."}},
    {{"type": "green", "title": "Study System Design", "description": "Review common system design patterns: microservices, caching strategies, database sharding, load balancing. Practice explaining trade-offs between different approaches."}},
    {{"type": "amber", "title": "Prepare Behavioral Examples", "description": "Prepare STAR method examples for: debugging complex issues, handling production incidents, collaborating across teams, and making technical trade-off decisions."}},
    {{"type": "green", "title": "Research the Company", "description": "Understand their product, tech stack, recent news, and engineering blog. Prepare thoughtful questions about their architecture challenges and team culture."}}
  ]
}}

Extract 3-7 responsibilities and 4-6 preparation tips. Be specific and actionable."""

        response = model.generate_content(prompt)
        result = parse_json_response(response.text)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in analyze_jd: {e}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@app.route('/api/find-linkedin-jobs', methods=['POST'])
def find_linkedin_jobs():
    try:
        data = request.get_json()
        resume = data.get('resume', '').strip()
        location = data.get('location', 'India')  # Default to India
        
        if not resume:
            return jsonify({'error': 'Resume is required'}), 400

        # --- STEP 1: Get Real Data from JSearch API ---
        url = "https://jsearch.p.rapidapi.com/search"
        
        # We'll use a simple query like "Software Engineer in Indore"
        querystring = {
            "query": f"Software Engineer in {location}",
            "page": "1",
            "num_pages": "1"
        }

        headers = {
            "x-rapidapi-key": "41ae8f40afmsh064a9df0c41456cp11270ajsna30bb882700b", # Paste your key here
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
        }

        api_response = requests.get(url, headers=headers, params=querystring)
        
        if api_response.status_code != 200:
            return jsonify({'error': 'Failed to fetch jobs from API'}), 500
        
        raw_jobs = api_response.json().get('data', [])

        # --- STEP 2: Process Jobs for Gemini ---
        # We format the real job data into a small string to send to Gemini for a summary
        jobs_list_for_ai = []
        formatted_jobs = []

        for job in raw_jobs[:5]: # Take top 5 real jobs
            job_info = {
                "title": job.get('job_title'),
                "company": job.get('employer_name'),
                "location": f"{job.get('job_city')}, {job.get('job_country')}",
                "matchScore": 85, # You can implement custom matching logic here later
                "matchLevel": "high",
                "description": job.get('job_description')[:200] + "...",
                "requiredSkills": job.get('job_required_skills', [])[:5],
                "url": job.get('job_apply_link')
            }
            formatted_jobs.append(job_info)
            jobs_list_for_ai.append(f"{job_info['title']} at {job_info['company']}")

        # --- STEP 3: Use Gemini to generate a personalized summary ---
        summary_prompt = f"""
        Based on this user's resume: {resume[:500]}...
        And these real job openings: {', '.join(jobs_list_for_ai)}
        Provide a 2-sentence encouragement summary about which roles fit them best.
        """
        
        ai_summary_response = model.generate_content(summary_prompt)
        ai_summary = ai_summary_response.text.strip()

        # --- STEP 4: Return Combined Result ---
        return jsonify({
            "summary": ai_summary,
            "jobs": formatted_jobs
        }), 200
        
    except Exception as e:
        print(f"Error in find_linkedin_jobs: {e}")
        return jsonify({'error': f'Job search failed: {str(e)}'}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'api': 'configured', 'version': '2.0'}), 200

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 HireVoid v2.0 - AI Career Intelligence Platform")
    print("=" * 70)
    print(f"🌐 Server: http://localhost:5000")
    print(f"🤖 AI Model: Gemini 2.0 Flash")
    print(f"✨ Features: Resume Analysis | Job Matching | Career Intelligence")
    print(f"🔑 API Status: Active")
    print("=" * 70)
    print()
    print("📊 Available Endpoints:")
    print("  • POST /api/analyze-match      - Resume vs JD matching")
    print("  • POST /api/analyze-resume     - Comprehensive resume review")
    print("  • POST /api/analyze-jd         - Job description analysis")
    print("  • POST /api/find-linkedin-jobs - LinkedIn job matching")
    print("  • GET  /health                 - Health check")
    print()
    print("💡 Tip: Upload PDFs directly in the web interface!")
    print("=" * 70)
    print()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
