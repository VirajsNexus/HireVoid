try {
    // We remove the 'http://127.0.0.1:5000' and use the live Render URL
    const res = await fetch('https://hirevoid.onrender.com/api/analyze-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jd })
    });
Important: Watch out for "Free Tier Sleep"
As you can see in your screenshot, Render says:

"Your free instance will spin down with inactivity, which can delay requests by 50 seconds or more."

This is why you were getting the "Failed to fetch" error.

If the site hasn't been used in 15 minutes, Render "turns off" the server.

When you click the "Analyze" button, the frontend tries to talk to a backend that is currently asleep.

The request times out before the backend can fully wake up.

How to test if it's working:

Refresh your page and wait about 60 seconds (to give Render time to wake up your instance).

Then try to run the analysis.

If it still fails, check the "Logs" tab in Render to see if your Flask app is throwing a Python error.

One last check
Since you are calling the API on the same domain (hirevoid.onrender.com calling hirevoid.onrender.com), you can actually make your code even cleaner and "future-proof" by using a relative path:

JavaScript
// This will automatically use whatever domain the site is currently hosted on
const res = await fetch('/api/analyze-match', { 
    method: 'POST',
    // ... rest of your code
Would you like me to double-check your app.py to make sure the /api/analyze-match route is set up correctly to handle these requests?

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
