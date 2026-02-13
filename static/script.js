// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Global auth state
let isAuthenticated = false;

// Check authentication status on page load
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        isAuthenticated = data.authenticated;
        return isAuthenticated;
    } catch (error) {
        console.error('Auth check failed:', error);
        isAuthenticated = false;
        return false;
    }
}

// Initialize auth check
checkAuthStatus();

// Helper function to require login
function requireLogin(action) {
    if (!isAuthenticated) {
        // Show login modal
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
        
        // Show notification
        showNotification('Please sign in to use this feature', 'warning');
        return false;
    }
    return true;
}

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
                uploadLabel.querySelector('strong').textContent = "Processing PDF...";
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
                        uploadLabel.querySelector('strong').textContent = `✓ ${file.name}`;
                        uploadLabel.style.borderColor = '#10b981';
                        uploadLabel.style.background = 'rgba(16, 185, 129, 0.05)';
                    }
                } catch (err) {
                    alert("Error reading PDF: " + err.message);
                    if (uploadLabel) {
                        uploadLabel.querySelector('strong').textContent = "Drop PDF or click to upload";
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
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(tabName + '-tab').classList.add('active');
    event.currentTarget.classList.add('active');
}

// ============================================
// QUICK FILTER FUNCTIONALITY
// ============================================
function applyQuickFilter(filterType) {
    const roleInput = document.getElementById('job-role');
    const currentRole = roleInput.value.trim();
    
    if (!currentRole) {
        roleInput.value = filterType;
    } else {
        if (!currentRole.toLowerCase().includes(filterType.toLowerCase())) {
            roleInput.value = `${currentRole} ${filterType}`;
        }
    }
    
    showNotification(`Filter "${filterType}" applied!`, "success");
}

// ============================================
// MATCH ANALYSIS (LOGIN REQUIRED)
// ============================================
async function analyzeMatch() {
    // Check authentication first
    if (!requireLogin('analyze match')) {
        return;
    }

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
        const res = await fetch('/api/analyze-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume, jd })
        });

        if (res.status === 401) {
            // User is not authenticated
            isAuthenticated = false;
            requireLogin('analyze match');
            return;
        }

        if (!res.ok) throw new Error("Server responded with error");
        
        const data = await res.json();

        // Animate main score
        animateScore(data.score || 0);
        
        document.getElementById('match-score').textContent = data.score || 0;
        
        if (data.breakdown) {
            animateBreakdown(data.breakdown);
        } else {
            const defaultBreakdown = {
                skills: Math.max(0, (data.score || 0) - 10 + Math.random() * 20),
                experience: Math.max(0, (data.score || 0) - 5 + Math.random() * 10),
                keywords: Math.max(0, (data.score || 0) - 15 + Math.random() * 30)
            };
            animateBreakdown(defaultBreakdown);
        }
        
        document.getElementById('analysis-text').textContent = data.summary || "";
        
        const matchedSkills = document.getElementById('matched-skills');
        matchedSkills.innerHTML = (data.matchedSkills || [])
            .map((s, i) => `<span class="skill-tag skill-matched" style="animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        const missingSkills = document.getElementById('missing-skills');
        missingSkills.innerHTML = (data.missingSkills || [])
            .map((s, i) => `<span class="skill-tag skill-missing" style="animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        const recommendations = document.getElementById('recommendations');
        recommendations.innerHTML = (data.suggestions || [])
            .map((s, i) => `
                <div class="suggestion-card ${s.type}" style="animation: slideInLeft 0.5s ease-out ${i * 0.1}s both">
                    <b>${s.title}</b>
                    <p>${s.description}</p>
                </div>
            `).join('');

        resultDiv.classList.add('show');
        showNotification("Analysis complete! Results saved to your account.", "success");
        
    } catch (e) {
        showNotification("Analysis failed: " + e.message, "error");
    } finally {
        loader.classList.remove('show');
    }
}

// ============================================
// RESUME REVIEW (LOGIN REQUIRED)
// ============================================
async function reviewResume() {
    // Check authentication first
    if (!requireLogin('review resume')) {
        return;
    }

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
        const res = await fetch('/api/analyze-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume })
        });

        if (res.status === 401) {
            isAuthenticated = false;
            requireLogin('review resume');
            return;
        }

        if (!res.ok) throw new Error("Server responded with error");
        
        const data = await res.json();

        animateRating(data.rating || 0);
        
        document.getElementById('strengths-text').textContent = data.strengths || "";
        document.getElementById('improvements-text').textContent = data.improvements || "";
        
        const skillsDiv = document.getElementById('resume-skills');
        skillsDiv.innerHTML = (data.skills || [])
            .map((s, i) => `<span class="skill-tag skill-matched" style="animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        const suggestions = document.getElementById('resume-suggestions');
        suggestions.innerHTML = (data.suggestions || [])
            .map((s, i) => `
                <div class="suggestion-card ${s.type}" style="animation: slideInLeft 0.5s ease-out ${i * 0.1}s both">
                    <b>${s.title}</b>
                    <p>${s.description}</p>
                </div>
            `).join('');

        resultDiv.classList.add('show');
        showNotification("Resume review complete! Saved to your account.", "success");
        
    } catch (e) {
        showNotification("Analysis failed: " + e.message, "error");
    } finally {
        loader.classList.remove('show');
    }
}

// ============================================
// JOB DESCRIPTION ANALYSIS (LOGIN REQUIRED)
// ============================================
async function analyzeJD() {
    // Check authentication first
    if (!requireLogin('analyze job description')) {
        return;
    }

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
        const res = await fetch('/api/analyze-jd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jd })
        });

        if (res.status === 401) {
            isAuthenticated = false;
            requireLogin('analyze job description');
            return;
        }

        if (!res.ok) throw new Error("Server responded with error");
        
        const data = await res.json();

        document.getElementById('overview').innerHTML = `
            <h3 style="margin-bottom: 15px; font-size: 1.3rem;">📋 Role Overview</h3>
            <p style="line-height: 1.8;">${data.overview || ""}</p>
        `;
        
        const mustHaveSkills = document.getElementById('must-have-skills');
        const mustHaveArray = Array.isArray(data.mustHaveSkills) ? data.mustHaveSkills : [];
        mustHaveSkills.innerHTML = mustHaveArray
            .map((s, i) => `<span class="skill-tag skill-matched" style="animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        const niceToHaveSkills = document.getElementById('nice-to-have-skills');
        const niceToHaveArray = Array.isArray(data.niceToHaveSkills) ? data.niceToHaveSkills : [];
        niceToHaveSkills.innerHTML = niceToHaveArray
            .map((s, i) => `<span class="skill-tag" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; animation-delay: ${i * 0.1}s">${s}</span>`)
            .join('');
        
        const responsibilities = document.getElementById('responsibilities');
        let responsibilitiesArray = [];
        
        if (Array.isArray(data.responsibilities)) {
            responsibilitiesArray = data.responsibilities;
        } else if (typeof data.responsibilities === 'string') {
            responsibilitiesArray = data.responsibilities
                .split(/\n|•|-/)
                .filter(r => r.trim())
                .map(r => ({ title: r.trim(), description: '', emoji: '📌' }));
        }
        
        responsibilities.innerHTML = responsibilitiesArray.map((r, i) => {
            const title = typeof r === 'object' ? (r.title || r.name || '') : r;
            const description = typeof r === 'object' ? (r.description || r.desc || '') : '';
            const emoji = typeof r === 'object' ? (r.emoji || '📌') : '📌';
            
            return `
                <div class="responsibility-card" style="animation: slideInLeft 0.5s ease-out ${i * 0.1}s both">
                    <div class="responsibility-emoji">${emoji}</div>
                    <div class="responsibility-content">
                        <h4>${title}</h4>
                        ${description ? `<p>${description}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        if (responsibilitiesArray.length === 0) {
            responsibilities.innerHTML = `
                <div class="responsibility-card">
                    <div class="responsibility-emoji">ℹ️</div>
                    <div class="responsibility-content">
                        <h4>No specific responsibilities extracted</h4>
                        <p>The AI couldn't identify specific responsibilities from the job description.</p>
                    </div>
                </div>
            `;
        }
        
        const prepTips = document.getElementById('preparation-tips');
        let prepTipsArray = [];
        
        if (Array.isArray(data.preparationTips)) {
            prepTipsArray = data.preparationTips;
        } else if (typeof data.preparationTips === 'string') {
            prepTipsArray = [{ 
                title: 'Preparation Tips', 
                description: data.preparationTips,
                type: 'info'
            }];
        }
        
        prepTips.innerHTML = prepTipsArray.map((s, i) => {
            const title = typeof s === 'object' ? (s.title || 'Tip') : 'Tip';
            const description = typeof s === 'object' ? (s.description || s) : s;
            const type = typeof s === 'object' ? (s.type || 'info') : 'info';
            
            return `
                <div class="suggestion-card ${type}" style="animation: slideInLeft 0.5s ease-out ${i * 0.1}s both">
                    <b>${title}</b>
                    <p>${description}</p>
                </div>
            `;
        }).join('');
        
        if (prepTipsArray.length === 0) {
            prepTips.innerHTML = `
                <div class="suggestion-card info">
                    <b>No specific preparation tips available</b>
                    <p>Review the job requirements carefully and prepare examples from your experience that demonstrate the required skills.</p>
                </div>
            `;
        }

        resultDiv.classList.add('show');
        showNotification("JD analysis complete! Saved to your account.", "success");
        
    } catch (e) {
        console.error('JD Analysis Error:', e);
        showNotification("Analysis failed: " + e.message, "error");
    } finally {
        loader.classList.remove('show');
    }
}

// ============================================
// LINKEDIN JOB SEARCH (LOGIN REQUIRED)
// ============================================
async function getLinkedInJobs() {
    // Check authentication first
    if (!requireLogin('search jobs')) {
        return;
    }

    const jobRole = document.getElementById('job-role').value.trim();
    const location = document.getElementById('job-location').value.trim();
    const experienceLevel = document.getElementById('experience-level').value;
    const resumeText = document.getElementById('resume-linkedin').value.trim();
    
    if (!jobRole) {
        showNotification("Please enter a job role to search for", "warning");
        return;
    }
    
    if (!location) {
        showNotification("Please enter a location", "warning");
        return;
    }

    const loader = document.getElementById('loading-linkedin');
    const resultDiv = document.getElementById('results-linkedin');

    loader.classList.add('show');
    resultDiv.classList.remove('show');

    try {
        const res = await fetch('/api/find-linkedin-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                role: jobRole,
                location: location,
                experienceLevel: experienceLevel,
                resume: resumeText || null
            })
        });

        if (res.status === 401) {
            isAuthenticated = false;
            requireLogin('search jobs');
            return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch jobs");

        displayLinkedInJobs(data, jobRole, location, experienceLevel);
        
        resultDiv.classList.add('show');
        showNotification(`Found ${data.jobs.length} jobs! Saved to your account.`, "success");

    } catch (e) {
        console.error('LinkedIn jobs error:', e);
        showNotification("Search Error: " + e.message, "error");
    } finally {
        loader.classList.remove('show');
    }
}

// Display LinkedIn Jobs Results
function displayLinkedInJobs(data, jobRole, location, experienceLevel) {
    const summaryEl = document.getElementById('linkedin-summary');
    
    let summaryHTML = `
        <div class="search-summary">
            <h3><i class="fas fa-search"></i> Search Results</h3>
            <div class="search-params">
                <span class="search-param">
                    <i class="fas fa-briefcase"></i>
                    <strong>Role:</strong> ${jobRole}
                </span>
                <span class="search-param">
                    <i class="fas fa-map-marker-alt"></i>
                    <strong>Location:</strong> ${location}
                </span>`;
    
    if (experienceLevel && experienceLevel !== '') {
        summaryHTML += `
                <span class="search-param">
                    <i class="fas fa-chart-line"></i>
                    <strong>Level:</strong> ${experienceLevel}
                </span>`;
    }
    
    summaryHTML += `
                <span class="search-param">
                    <i class="fas fa-check-circle"></i>
                    <strong>Found:</strong> ${data.jobs.length} opportunities
                </span>
            </div>
            <p>${data.summary}</p>
        </div>
    `;
    
    summaryEl.innerHTML = summaryHTML;
    
    const jobsContainer = document.getElementById('jobs-container');
    
    if (!data.jobs || data.jobs.length === 0) {
        jobsContainer.innerHTML = `
            <div class="no-jobs-found">
                <i class="fas fa-search" style="font-size: 3rem; color: #64748b; margin-bottom: 1rem;"></i>
                <h3>No jobs found</h3>
                <p>Try searching with different keywords or location</p>
                <div class="search-tips">
                    <h4>Search Tips:</h4>
                    <ul>
                        <li>Try broader job titles</li>
                        <li>Search in major cities or use "Remote"</li>
                        <li>Try different experience levels</li>
                        <li>Check your spelling</li>
                    </ul>
                </div>
            </div>
        `;
        return;
    }
    
    jobsContainer.innerHTML = data.jobs.map((job, i) => `
        <div class="job-card" style="animation-delay: ${i * 0.1}s">
            <div class="job-header">
                <h4>${job.title}</h4>
                <span class="job-match-badge job-match-${job.matchLevel || 'medium'}">
                    ${job.matchScore || 85}% Match
                </span>
            </div>
            <p class="job-company">
                <i class="fas fa-building"></i> ${job.company}
            </p>
            ${job.experienceLevel ? `
                <p class="job-company">
                    <i class="fas fa-chart-line"></i> ${job.experienceLevel}
                </p>
            ` : ''}
            ${job.description ? `<p class="job-description">${job.description}</p>` : ''}
            ${job.requiredSkills && job.requiredSkills.length > 0 ? `
                <div class="job-skills">
                    ${job.requiredSkills.map(s => `<span class="job-skill">${s}</span>`).join('')}
                </div>
            ` : ''}
            ${job.postedDate ? `<p class="job-posted"><i class="far fa-clock"></i> ${job.postedDate}</p>` : ''}
            <a href="${job.url}" target="_blank" class="job-link">
                <i class="fas fa-external-link-alt"></i> Apply Now
            </a>
        </div>
    `).join('');
}

// ============================================
// ANIMATION HELPERS
// ============================================
function animateScore(targetScore) {
    const scoreElement = document.getElementById('match-score');
    const progressCircle = document.getElementById('scoreCircle');
    
    if (!scoreElement) return;
    
    const circumference = 2 * Math.PI * 85;
    
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;
    }
    
    let currentScore = 0;
    const increment = targetScore / 60;
    
    const animation = setInterval(() => {
        currentScore += increment;
        if (currentScore >= targetScore) {
            currentScore = targetScore;
            clearInterval(animation);
        }
        
        scoreElement.textContent = Math.round(currentScore);
        
        if (progressCircle) {
            const offset = circumference - (currentScore / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset;
        }
    }, 16);
}

function animateBreakdown(breakdown) {
    animateBar('skills-bar', 'skills-percentage', breakdown.skills || 0);
    animateBar('experience-bar', 'experience-percentage', breakdown.experience || 0);
    animateBar('keywords-bar', 'keywords-percentage', breakdown.keywords || 0);
}

function animateBar(barId, percentageId, targetValue) {
    const bar = document.getElementById(barId);
    const percentageText = document.getElementById(percentageId);
    
    if (!bar || !percentageText) return;
    
    let currentValue = 0;
    const increment = targetValue / 60;
    
    const animation = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(animation);
        }
        
        const roundedValue = Math.round(currentValue);
        bar.style.width = roundedValue + '%';
        percentageText.textContent = roundedValue + '%';
    }, 16);
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
console.log('%c🔒 Login Required for All Features', 'color: #f59e0b; font-size: 12px;');
console.log('%cPowered by Groq AI', 'color: #764ba2; font-size: 12px;');
