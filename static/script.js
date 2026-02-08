// ============================================
// HIREVOID - COMPLETE JAVASCRIPT
// AI-Powered Resume Analysis Platform
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const API_BASE = ''; // Empty string uses current domain (works for both local and Render)

// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tabName, event) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Add active class to clicked tab
    if (event) {
        event.currentTarget.classList.add('active');
    }
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

// ============================================
// PDF UPLOAD HANDLER
// ============================================
function setupPDFUpload() {
    const pdfInputs = document.querySelectorAll('.pdf-upload');
    
    pdfInputs.forEach(input => {
        input.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.type !== 'application/pdf') {
                showNotification('Please upload a PDF file', 'error');
                return;
            }
            
            const targetId = this.getAttribute('data-target');
            const textarea = document.getElementById(targetId);
            
            try {
                showNotification('Extracting text from PDF...', 'info');
                const text = await extractTextFromPDF(file);
                textarea.value = text;
                showNotification('PDF extracted successfully!', 'success');
            } catch (error) {
                console.error('PDF extraction error:', error);
                showNotification('Failed to extract PDF. Please try copy-pasting text manually.', 'error');
            }
        });
    });
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    
    return fullText.trim();
}

// ============================================
// MATCH ANALYSIS
// ============================================
async function analyzeMatch() {
    const resume = document.getElementById('resume-match').value.trim();
    const jd = document.getElementById('jd-match').value.trim();
    
    if (!resume || !jd) {
        showNotification('Please provide both resume and job description', 'error');
        return;
    }
    
    const loadingEl = document.getElementById('loading-match');
    const resultsEl = document.getElementById('results-match');
    
    loadingEl.classList.add('active');
    resultsEl.classList.remove('active');
    
    try {
        const response = await fetch(`${API_BASE}/api/analyze-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume, jd })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayMatchResults(data);
        
        loadingEl.classList.remove('active');
        resultsEl.classList.add('active');
        
        // Scroll to results
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
    } catch (error) {
        console.error('Match analysis error:', error);
        loadingEl.classList.remove('active');
        showNotification('Analysis failed. Please check your API keys and try again.', 'error');
    }
}

function displayMatchResults(data) {
    // Animate score
    animateScore(data.score || 0);
    
    // Update verdict
    const verdictEl = document.getElementById('verdict');
    if (verdictEl) {
        verdictEl.textContent = data.verdict || 'Analysis Complete';
    }
    
    // Update summary
    const summaryEl = document.getElementById('summary');
    if (summaryEl) {
        summaryEl.textContent = data.summary || 'No summary available';
    }
    
    // Display matched skills
    const matchedSkillsEl = document.getElementById('matched-skills');
    if (matchedSkillsEl && data.matchedSkills) {
        matchedSkillsEl.innerHTML = data.matchedSkills.map(skill => 
            `<span class="skill-badge success"><i class="fas fa-check-circle"></i> ${skill}</span>`
        ).join('');
    }
    
    // Display missing skills
    const missingSkillsEl = document.getElementById('missing-skills');
    if (missingSkillsEl && data.missingSkills) {
        missingSkillsEl.innerHTML = data.missingSkills.map(skill => 
            `<span class="skill-badge danger"><i class="fas fa-times-circle"></i> ${skill}</span>`
        ).join('');
    }
    
    // Display suggestions
    const suggestionsEl = document.getElementById('match-suggestions');
    if (suggestionsEl && data.suggestions) {
        suggestionsEl.innerHTML = data.suggestions.map(suggestion => `
            <div class="suggestion-card ${suggestion.type || 'info'}">
                <div class="suggestion-header">
                    <i class="fas fa-lightbulb"></i>
                    <h4>${suggestion.title || 'Suggestion'}</h4>
                </div>
                <p>${suggestion.description || ''}</p>
            </div>
        `).join('');
    }
}

// ============================================
// LINKEDIN JOBS SEARCH
// ============================================
async function findLinkedInJobs() {
    const location = document.getElementById('job-location').value.trim() || 'India';
    
    const loadingEl = document.getElementById('loading-linkedin');
    const resultsEl = document.getElementById('results-linkedin');
    
    loadingEl.classList.add('active');
    resultsEl.classList.remove('active');
    
    try {
        const response = await fetch(`${API_BASE}/api/find-linkedin-jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayLinkedInJobs(data);
        
        loadingEl.classList.remove('active');
        resultsEl.classList.add('active');
        
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
    } catch (error) {
        console.error('LinkedIn jobs error:', error);
        loadingEl.classList.remove('active');
        showNotification('Failed to fetch jobs. Please try again later.', 'error');
    }
}

function displayLinkedInJobs(data) {
    const summaryEl = document.getElementById('linkedin-summary');
    const jobsEl = document.getElementById('linkedin-jobs');
    
    if (summaryEl) {
        summaryEl.textContent = data.summary || 'Jobs found';
    }
    
    if (jobsEl && data.jobs) {
        if (data.jobs.length === 0) {
            jobsEl.innerHTML = '<p class="no-results">No jobs found. Try a different location.</p>';
            return;
        }
        
        jobsEl.innerHTML = data.jobs.map(job => `
            <div class="job-card">
                <div class="job-header">
                    <h3 class="job-title">${job.title || 'Job Title'}</h3>
                    <span class="match-badge ${job.matchLevel || 'medium'}">${job.matchScore || 0}% Match</span>
                </div>
                <p class="job-company"><i class="fas fa-building"></i> ${job.company || 'Company'}</p>
                <a href="${job.url || '#'}" target="_blank" class="job-apply-btn">
                    <i class="fas fa-external-link-alt"></i> Apply Now
                </a>
            </div>
        `).join('');
    }
}

// ============================================
// RESUME REVIEW
// ============================================
async function analyzeResume() {
    const resume = document.getElementById('resume-review').value.trim();
    
    if (!resume) {
        showNotification('Please provide your resume text', 'error');
        return;
    }
    
    const loadingEl = document.getElementById('loading-resume');
    const resultsEl = document.getElementById('results-resume');
    
    loadingEl.classList.add('active');
    resultsEl.classList.remove('active');
    
    try {
        const response = await fetch(`${API_BASE}/api/analyze-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayResumeResults(data);
        
        loadingEl.classList.remove('active');
        resultsEl.classList.add('active');
        
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
    } catch (error) {
        console.error('Resume analysis error:', error);
        loadingEl.classList.remove('active');
        showNotification('Analysis failed. Please check your API keys and try again.', 'error');
    }
}

function displayResumeResults(data) {
    // Animate rating
    animateRating(data.rating || 0);
    
    // Update strengths
    const strengthsEl = document.getElementById('strengths');
    if (strengthsEl) {
        strengthsEl.textContent = data.strengths || 'No strengths identified';
    }
    
    // Update improvements
    const improvementsEl = document.getElementById('improvements');
    if (improvementsEl) {
        improvementsEl.textContent = data.improvements || 'No improvements suggested';
    }
    
    // Display skills
    const skillsEl = document.getElementById('resume-skills');
    if (skillsEl && data.skills) {
        skillsEl.innerHTML = data.skills.map(skill => 
            `<span class="skill-badge info"><i class="fas fa-code"></i> ${skill}</span>`
        ).join('');
    }
    
    // Display suggestions
    const suggestionsEl = document.getElementById('resume-suggestions');
    if (suggestionsEl && data.suggestions) {
        suggestionsEl.innerHTML = data.suggestions.map(suggestion => `
            <div class="suggestion-card ${suggestion.type || 'info'}">
                <div class="suggestion-header">
                    <i class="fas fa-lightbulb"></i>
                    <h4>${suggestion.title || 'Suggestion'}</h4>
                </div>
                <p>${suggestion.description || ''}</p>
            </div>
        `).join('');
    }
}

// ============================================
// JOB DESCRIPTION ANALYSIS
// ============================================
async function analyzeJD() {
    const jd = document.getElementById('jd-analyze').value.trim();
    
    if (!jd) {
        showNotification('Please provide a job description', 'error');
        return;
    }
    
    const loadingEl = document.getElementById('loading-jd');
    const resultsEl = document.getElementById('results-jd');
    
    loadingEl.classList.add('active');
    resultsEl.classList.remove('active');
    
    try {
        const response = await fetch(`${API_BASE}/api/analyze-jd`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jd })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayJDResults(data);
        
        loadingEl.classList.remove('active');
        resultsEl.classList.add('active');
        
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
    } catch (error) {
        console.error('JD analysis error:', error);
        loadingEl.classList.remove('active');
        showNotification('Analysis failed. Please check your API keys and try again.', 'error');
    }
}

function displayJDResults(data) {
    // Update overview
    const overviewEl = document.getElementById('jd-overview');
    if (overviewEl) {
        overviewEl.textContent = data.overview || 'No overview available';
    }
    
    // Display must-have skills
    const mustHaveEl = document.getElementById('must-have-skills');
    if (mustHaveEl && data.mustHaveSkills) {
        mustHaveEl.innerHTML = data.mustHaveSkills.map(skill => 
            `<span class="skill-badge danger"><i class="fas fa-exclamation-circle"></i> ${skill}</span>`
        ).join('');
    }
    
    // Display nice-to-have skills
    const niceToHaveEl = document.getElementById('nice-to-have-skills');
    if (niceToHaveEl && data.niceToHaveSkills) {
        niceToHaveEl.innerHTML = data.niceToHaveSkills.map(skill => 
            `<span class="skill-badge success"><i class="fas fa-check-circle"></i> ${skill}</span>`
        ).join('');
    }
    
    // Display responsibilities
    const responsibilitiesEl = document.getElementById('responsibilities');
    if (responsibilitiesEl && data.responsibilities) {
        responsibilitiesEl.innerHTML = data.responsibilities.map(resp => `
            <div class="responsibility-item">
                <h4><i class="fas fa-tasks"></i> ${resp.title || 'Responsibility'}</h4>
                <p>${resp.desc || resp.description || ''}</p>
            </div>
        `).join('');
    }
    
    // Display preparation tips
    const tipsEl = document.getElementById('preparation-tips');
    if (tipsEl && data.preparationTips) {
        tipsEl.innerHTML = data.preparationTips.map(tip => `
            <div class="suggestion-card info">
                <div class="suggestion-header">
                    <i class="fas fa-graduation-cap"></i>
                    <h4>${tip.title || 'Tip'}</h4>
                </div>
                <p>${tip.description || tip.desc || ''}</p>
            </div>
        `).join('');
    }
}

// ============================================
// ANIMATION HELPERS
// ============================================
function animateScore(targetScore) {
    const scoreElement = document.getElementById('score');
    const progressCircle = document.getElementById('score-progress');
    
    if (!scoreElement || !progressCircle) return;
    
    const circumference = 2 * Math.PI * 90; // radius = 90
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;
    
    let currentScore = 0;
    const increment = targetScore / 60; // 60 frames
    
    const animation = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(animation);
        }
        
        scoreElement.textContent = Math.round(currentScore);
        
        // Update circle progress
        const offset = circumference - (currentScore / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }, 16); // ~60fps
}

function animateRating(targetRating) {
    const ratingElement = document.getElementById('rating');
    if (!ratingElement) return;
    
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
document.addEventListener('DOMContentLoaded', function() {
    // Configure PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }
    
    // Setup PDF uploads
    setupPDFUpload();
    
    console.log('%c🚀 HireVoid Initialized', 'color: #7c3aed; font-size: 16px; font-weight: bold;');
    console.log('%cPowered by Groq AI', 'color: #06b6d4; font-size: 12px;');
    
    // Show welcome notification
    setTimeout(() => {
        showNotification('HireVoid is ready! Upload your resume to get started.', 'success');
    }, 500);
});
