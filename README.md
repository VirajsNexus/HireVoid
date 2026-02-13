# 🚀 HireVoid — AI Career Intelligence Platform

> Land your dream job with AI clarity.  
> Resume Analysis • Job Match Scoring • JD Breakdown • Live Job Search

HireVoid is an AI-powered career intelligence web application that helps job seekers analyze resumes, compare them against job descriptions, decode JDs, and discover relevant job opportunities in seconds.

Built with **Flask, Groq AI (LLaMA 3.3 70B), Tailwind CSS, and RapidAPI**.

---

## 🌐 Live Demo

🔗 **Deployed Website:**  
https://hirevoid.onrender.com/

---

## 🎥 Demo Video

📺Click below to watch the demo:

[![HireVoid Demo](https://img.youtube.com/vi/uQ3CFjjOuGA/maxresdefault.jpg)](https://youtu.be/uQ3CFjjOuGA)



---

## ✨ Features

### 🔍 Resume Review
- AI score out of 10
- Strengths & improvement feedback
- Extracted skills
- Actionable suggestions

### 🎯 Resume vs Job Match
- Overall Match Score (0–100%)
- Skills, Experience & Keyword breakdown
- Missing skills detection
- AI strategic recommendations

### 📄 Job Description Analyzer
- Must-have skills
- Nice-to-have skills
- Key responsibilities
- Interview preparation tips

### 💼 Live Job Search
- Search by role, location, and experience level
- Remote / Full-time / Contract filters
- Resume-based match scoring
- Experience level auto-detection
- RapidAPI JSearch integration

---

## 🧠 AI Engine

- Groq API  
- Model: llama-3.3-70b-versatile  
- Structured JSON responses  
- Ultra-fast inference  

All AI responses are strictly formatted in JSON for reliable frontend rendering.

---

## 🏗️ Tech Stack

### Backend
- Python
- Flask
- Groq API
- RapidAPI (JSearch)
- Flask-CORS
- python-dotenv

### Frontend
- HTML5
- Tailwind CSS
- Vanilla JavaScript
- PDF.js
- Font Awesome

### Deployment
- Render

---

## 📂 Project Structure

HireVoid/

- app.py                  (Main Flask application)
- .env                    (Environment variables)
- requirements.txt        (Python dependencies)

- templates/
  - index.html            (Main frontend page)

- static/
  - style.css             (Custom styling)
  - script.js             (Frontend logic)
  - assets/               (Images, icons, thumbnails)

- README.md               (Project documentation)

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

git clone https://github.com/VirajsNexus/HireVoid.git  
cd HireVoid

---

### 2️⃣ Create Virtual Environment

python -m venv venv

Activate:

Windows:
venv\Scripts\activate

Mac/Linux:
source venv/bin/activate

---

### 3️⃣ Install Dependencies

pip install flask flask-cors requests python-dotenv groq

---

### 4️⃣ Setup Environment Variables

Create a `.env` file in the root directory:

GROQ_API_KEY=your_groq_api_key  
RAPIDAPI_KEY=your_rapidapi_key  

---

### 5️⃣ Run the Application

python app.py

App runs at:

http://localhost:5000

---

## 🔐 Environment Variables

GROQ_API_KEY – API key from Groq  
RAPIDAPI_KEY – API key for RapidAPI JSearch  

---

## 🔌 API Endpoints

POST /api/analyze-resume  
Returns:
- rating  
- strengths  
- improvements  
- skills  
- suggestions  

POST /api/analyze-match  
Returns:
- score (0–100)  
- verdict  
- summary  
- matchedSkills  
- missingSkills  
- breakdown  
- suggestions  

POST /api/analyze-jd  
Returns:
- overview  
- mustHaveSkills  
- niceToHaveSkills  
- responsibilities  
- preparationTips  

POST /api/find-linkedin-jobs  
Returns:
- jobs list  
- matchScore  
- experienceLevel detection  
- summary  

---

## 🎨 UI Highlights

- Animated particle background  
- Smooth transitions  
- Interactive score ring  
- Dynamic breakdown bars  
- Fully responsive design  
- Modern glassmorphism interface  

---

## 🔒 Privacy

- No resume data is stored  
- No database used  
- All processing is real-time  
- Secure API-based communication  

---

## 🚀 Future Improvements

- User authentication system  
- ATS compatibility scoring  
- AI cover letter generator  
- Multi-language support  
- CI/CD deployment pipeline  

---

## 👨‍💻 Author

Viraj Vilas Jamdhade  
B.Tech Computer Science Engineering (2024–2028)

GitHub: https://github.com/VirajsNexus  
LinkedIn: https://www.linkedin.com/in/viraj-jamdhade9420/  
X (Twitter): https://x.com/Viraj_2609  
Email: virajjamdhade6@gmail.com

---

## ⭐ Support

If you found this project useful, consider giving it a star ⭐ on GitHub!
