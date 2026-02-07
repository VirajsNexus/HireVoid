// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// ============================================
// PDF TEXT EXTRACTION
// ============================================
document.querySelectorAll('.pdf-upload').forEach(input => {
    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const targetId = e.target.getAttribute('data-target');
        const targetArea = document.getElementById(targetId);
        const uploadLabel = e.target.previousElementSibling;

        if (file && file.type === "application/pdf") {
            targetArea.placeholder = "Extracting text from PDF... please wait.";
            if (uploadLabel) {
                uploadLabel.querySelector('.upload-text').textContent = "Processing PDF...";
            }
            
            const reader = new FileReader();
            
            reader.onload = async function() {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = "";
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(" ");
                        fullText += pageText + "\n\n";
                    }
                    
                    targetArea.value = fullText.trim();
                    if (uploadLabel) {
                        uploadLabel.querySelector('.upload-text').textContent = `✓ ${file.name}`;
                        uploadLabel.style.borderColor = '#10b981';
                        uploadLabel.style.background = 'rgba(16, 185, 129, 0.05)';
                    }
                } catch (err) {
                    alert("Error reading PDF: " + err.message);
                    if (uploadLabel) {
                        uploadLabel.querySelector('.upload-text').textContent = "Drop PDF or click to upload";
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });
});

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tabName, event) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.getElementById(tabName + '-tab').classList.add('active');
    event.currentTarget.classList.add('active');
}

// ============================================
// MATCH ANALYSIS
// ============================================
async function analyzeMatch() {
    const resume = document.getElementById('resume-match').value;
    const jd = document.getElementById('jd-match').value;
    const loader = document.getElementById('loading-match');
    const resultDiv = document.getElementById('results-match');

    if (!resume || !jd) {
        showNotification("Please provide both resume and job description", "warning");
        return;
    }

    loader.classList.add('show');
    resultDiv.classList.remove('show');

    try {
        const res = await fetch('http://127.0.0.1:5000/api/analyze-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume, jd })
        });

        if (!res.ok) throw new Error("Server responded with error");
        
        const data = await res.json();

        // Animate score
        animateScore(data.score || 0);
        
        document.getElementById('verdict').textContent = data.verdict || "Analysis Complete";
        document.getElementById('summary').textContent = data.summary || "";
        
        // Matched skills
        const matchedSkills = document.getElementById('matched-skills');
        matchedSkills.innerHTML = (data.matchedSkills || [])
            .map((s, i) => `<span class="skill-tag skill-matched" style="animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        // Missing skills
        const missingSkills = document.getElementById('missing-skills');
        missingSkills.innerHTML = (data.missingSkills || [])
            .map((s, i) => `<span class="skill-tag skill-missing" style="animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        // Suggestions
        const suggestions = document.getElementById('suggestions');
        suggestions.innerHTML = (data.suggestions || [])
            .map((s, i) => `
                <div class="suggestion-card ${s.type}" style="animation: slideInLeft 0.5s ease-out ${i * 0.1}s both">
                    <b>${s.title}</b>
                    <p>${s.description}</p>
                </div>
            `).join('');

        resultDiv.classList.add('show');
        showNotification("Analysis complete!", "success");
        
    } catch (e) {
        showNotification("Analysis failed: " + e.message, "error");
    } finally {
        loader.classList.remove('show');
    }
}

// ============================================
// RESUME ANALYSIS
// ============================================
async function analyzeResume() {
    const resume = document.getElementById('resume-review').value;
    const loader = document.getElementById('loading-resume');
    const resultDiv = document.getElementById('results-resume');

    if (!resume) {
        showNotification("Please provide a resume", "warning");
        return;
    }

    loader.classList.add('show');
    resultDiv.classList.remove('show');

    try {
        const res = await fetch('http://127.0.0.1:5000/api/analyze-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume })
        });

        if (!res.ok) throw new Error("Server responded with error");
        
        const data = await res.json();

        // Animate rating
        animateRating(data.rating || 0);
        
        document.getElementById('strengths-text').textContent = data.strengths || "";
        document.getElementById('improvements-text').textContent = data.improvements || "";
        
        // Skills
        const skillsDiv = document.getElementById('resume-skills');
        skillsDiv.innerHTML = (data.skills || [])
            .map((s, i) => `<span class="skill-tag skill-matched" style="animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        // Suggestions
        const suggestions = document.getElementById('resume-suggestions');
        suggestions.innerHTML = (data.suggestions || [])
            .map((s, i) => `
                <div class="suggestion-card ${s.type}" style="animation: slideInLeft 0.5s ease-out ${i * 0.1}s both">
                    <b>${s.title}</b>
                    <p>${s.description}</p>
                </div>
            `).join('');

        resultDiv.classList.add('show');
        showNotification("Resume analysis complete!", "success");
        
    } catch (e) {
        showNotification("Analysis failed: " + e.message, "error");
    } finally {
        loader.classList.remove('show');
    }
}

// ============================================
// JOB DESCRIPTION ANALYSIS
// ============================================
async function analyzeJD() {
    const jd = document.getElementById('jd-analyze').value;
    const loader = document.getElementById('loading-jd');
    const resultDiv = document.getElementById('results-jd');

    if (!jd) {
        showNotification("Please provide a job description", "warning");
        return;
    }

    loader.classList.add('show');
    resultDiv.classList.remove('show');

    try {
        const res = await fetch('http://127.0.0.1:5000/api/analyze-jd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jd })
        });

        if (!res.ok) throw new Error("Server responded with error");
        
        const data = await res.json();

        // Overview
        document.getElementById('overview').innerHTML = `
            <h3 style="margin-bottom: 15px; font-size: 1.3rem;">📋 Role Overview</h3>
            <p style="line-height: 1.8;">${data.overview || ""}</p>
        `;
        
        // Must-have skills
        const mustHaveSkills = document.getElementById('must-have-skills');
        mustHaveSkills.innerHTML = (data.mustHaveSkills || [])
            .map((s, i) => `<span class="skill-tag skill-matched" style="animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        // Nice-to-have skills
        const niceToHaveSkills = document.getElementById('nice-to-have-skills');
        niceToHaveSkills.innerHTML = (data.niceToHaveSkills || [])
            .map((s, i) => `<span class="skill-tag" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        // Responsibilities
        const responsibilities = document.getElementById('responsibilities');
        responsibilities.innerHTML = (data.responsibilities || [])
            .map((r, i) => `
                <div class="responsibility-card" style="animation: slideInLeft 0.5s ease-out ${i * 0.1}s both">
                    <div class="responsibility-emoji">${r.emoji}</div>
                    <div class="responsibility-content">
                        <h4>${r.title}</h4>
                        <p>${r.desc}</p>
                    </div>
                </div>
            `).join('');
        
        // Preparation tips
        const prepTips = document.getElementById('preparation-tips');
        prepTips.innerHTML = (data.preparationTips || [])
            .map((s, i) => `
                <div class="suggestion-card ${s.type}" style="animation: slideInLeft 0.5s ease-out ${i * 0.1}s both">
                    <b>${s.title}</b>
                    <p>${s.description}</p>
                </div>
            `).join('');

        resultDiv.classList.add('show');
        showNotification("JD analysis complete!", "success");
        
    } catch (e) {
        showNotification("Analysis failed: " + e.message, "error");
    } finally {
        loader.classList.remove('show');
    }
}

// ============================================
// LINKEDIN JOB MATCHING
// ============================================
async function findLinkedInJobs() {
    // 1. Get current values from the UI
    const resumeText = document.getElementById('resume-linkedin').value;
    const location = document.getElementById('linkedin-location').value || 'India';
    
    // Safety check: Don't call API if resume is empty
    if (!resumeText || resumeText.length < 50) {
        showNotification("Please upload or paste your resume first!", "warning");
        return;
    }

    const loader = document.getElementById('loading-linkedin');
    const resultDiv = document.getElementById('results-linkedin');

    loader.classList.add('show');
    resultDiv.classList.remove('show');

    try {
        const res = await fetch('http://127.0.0.1:5000/api/find-linkedin-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                resume: resumeText, 
                location: location 
            })
        });

        // Parse the JSON (Variable 'data' must match the keys used below)
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // 2. Inject Summary
        document.getElementById('linkedin-summary').innerHTML = `
            <h3>🎯 Results</h3>
            <p>${data.summary}</p>
        `;
        
        // 3. Inject Jobs (Mapping data.jobs to your HTML template)
        const jobsGrid = document.getElementById('jobs-grid');
        jobsGrid.innerHTML = data.jobs.map((job, i) => `
            <div class="job-card" style="animation-delay: ${i * 0.1}s">
                <div class="job-header">
                    <h4>${job.title}</h4>
                    <span class="job-match-badge job-match-${job.matchLevel}">
                        ${job.matchScore}% Match
                    </span>
                </div>
                <p>${job.company}</p>
                <div class="job-skills">
                    ${job.requiredSkills.map(s => `<span class="job-skill">${s}</span>`).join('')}
                </div>
                <a href="${job.url}" target="_blank" class="job-link">Apply Now</a>
            </div>
        `).join('');

        resultDiv.classList.add('show');

    } catch (e) {
        showNotification("Search Error: " + e.message, "error");
    } finally {
        loader.classList.remove('show');
    }
}

// ============================================
// ANIMATION HELPERS
// ============================================
function animateScore(targetScore) {
    const scoreElement = document.getElementById('score');
    const progressCircle = document.getElementById('score-progress');
    const circumference = 2 * Math.PI * 90; // radius = 90
    
    let currentScore = 0;
    const increment = targetScore / 60; // 60 frames
    
    const animation = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(animation);
        }
        
        scoreElement.textContent = Math.round(currentScore) + "%";
        
        // Update circle progress
        const offset = circumference - (currentScore / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }, 16); // ~60fps
}

function animateRating(targetRating) {
    const ratingElement = document.getElementById('rating');
    let currentRating = 0;
    const increment = targetRating / 30;
    
    const animation = setInterval(() => {
        currentRating += increment;
        if (currentRating >= targetRating) {
            currentRating = targetRating;
            clearInterval(animation);
        }
        
        ratingElement.textContent = currentRating.toFixed(1);
    }, 30);
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#f59e0b'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add keyframe for notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// INITIALIZE
// ============================================
console.log('%c🚀 HireVoid Initialized', 'color: #667eea; font-size: 16px; font-weight: bold;');
console.log('%cPowered by Gemini AI', 'color: #764ba2; font-size: 12px;');
