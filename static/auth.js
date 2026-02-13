// ============================================
// AUTHENTICATION MANAGER
// ============================================

class AuthManager {
    constructor() {
        this.user = null;
        this.authenticated = false;
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.updateUI();
        this.attachEventListeners();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/user');
            const data = await response.json();
            this.authenticated = data.authenticated;
            this.user = data.user || null;
            return this.authenticated;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.authenticated = false;
            this.user = null;
            return false;
        }
    }

    updateUI() {
        const loginBtn = document.getElementById('nav-login-btn');
        const userMenu = document.getElementById('nav-user-menu');

        if (this.authenticated && this.user) {
            // Hide login button, show user menu
            if (loginBtn) loginBtn.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'flex';
                this.populateUserMenu();
            }
        } else {
            // Show login button, hide user menu
            if (loginBtn) loginBtn.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    populateUserMenu() {
        const avatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');

        if (avatar && this.user.avatar) {
            avatar.src = this.user.avatar;
            avatar.style.display = 'block';
        }
        
        if (userName && this.user.name) {
            userName.textContent = this.user.name;
        }
        
        if (userEmail && this.user.email) {
            userEmail.textContent = this.user.email;
        }
    }

    attachEventListeners() {
        // Login button
        const loginBtn = document.getElementById('nav-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-btn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserDropdown();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown && !e.target.closest('#nav-user-menu')) {
                dropdown.classList.remove('show');
            }
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Close modal buttons
        const closeModalBtns = document.querySelectorAll('.close-modal, .modal-overlay');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.hideLoginModal());
        });

        // OAuth provider buttons
        document.querySelectorAll('.oauth-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const provider = e.currentTarget.dataset.provider;
                this.login(provider);
            });
        });
    }

    showLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    toggleUserDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    login(provider) {
        // Redirect to OAuth login
        window.location.href = `/login/${provider}`;
    }

    logout() {
        // Redirect to logout
        window.location.href = '/logout';
    }

    // Show notification if there's an auth error
    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error === 'auth_failed') {
            showNotification('Authentication failed. Please try again.', 'error');
            // Clean URL
            window.history.replaceState({}, document.title, '/');
        } else if (error === 'no_email') {
            showNotification('Could not retrieve email. Please ensure email access is granted.', 'error');
            window.history.replaceState({}, document.title, '/');
        }
    }
}

// Initialize auth manager when DOM is ready
let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
    authManager.checkUrlParams();
});

// Export for use in other scripts
window.authManager = authManager;
