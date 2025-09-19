// auth.js - Google Sign-In Authentication Module

// Configuration
const AUTH_CONFIG = {
    // Replace with your Google Client ID
    CLIENT_ID: '982944345380-0o9ccqh8ifkm9v5sq9mmht6sasuqa2is.apps.googleusercontent.com',
    // Scopes required for the application
    SCOPES: 'profile email'
};

// Global variables
let currentUser = null;
let isSignedIn = false;

/**
 * Initialize Google Sign-In API using Google Identity Services
 */
function initAuth() {
    // Check if google is available
    if (typeof google === 'undefined') {
        console.error('Google Identity Services not loaded yet. Retrying...');
        setTimeout(initAuth, 100);
        return;
    }
    
    try {
        // Initialize Google Identity Services
        google.accounts.id.initialize({
            client_id: AUTH_CONFIG.CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: false
        });

        console.log('Google Identity Services initialized');
        
        // Test backend connectivity (optional - doesn't block login)
        if (typeof testBackendConnection === 'function') {
            testBackendConnection().then(isConnected => {
                if (isConnected) {
                    console.log('✅ Backend connection test successful');
                } else {
                    console.warn('⚠️ Backend connection test failed - frontend will work with fallback data');
                    console.info('🔗 Testing backend URL directly:', API_CONFIG?.SCRIPT_URL || APP_CONFIG?.SCRIPT_URL);
                }
            });
        }
        
        // Render the sign-in button in header
        const signInBtn = document.getElementById('signInBtn');
        if (signInBtn) {
            google.accounts.id.renderButton(signInBtn, {
                theme: 'outline',
                size: 'medium',
                width: 200
            });
        }
        
        // Render the sign-in button on login screen
        const loginSignInBtn = document.getElementById('loginSignInBtn');
        if (loginSignInBtn) {
            google.accounts.id.renderButton(loginSignInBtn, {
                theme: 'filled_blue',
                size: 'large',
                width: 300
            });
        }
        
        // Check for existing session
        checkExistingSession();
        
    } catch (error) {
        console.error('Error initializing Google Auth:', error);
    }
}

/**
 * Handle the credential response from Google
 */
function handleCredentialResponse(response) {
    try {
        // Decode the JWT token
        const token = response.credential;
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Create user object
        currentUser = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            token: token
        };
        
        isSignedIn = true;
        
        // Store in localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('authToken', token);
        
        console.log('User signed in:', currentUser);
        
        // Update UI
        updateAuthUI();
        
        // Trigger authentication success event
        window.dispatchEvent(new CustomEvent('authSuccess', { 
            detail: currentUser 
        }));
        
    } catch (error) {
        console.error('Error handling credential response:', error);
        handleAuthError(error);
    }
}

/**
 * Check for existing session in localStorage
 */
function checkExistingSession() {
    try {
        const storedUser = localStorage.getItem('currentUser');
        const storedToken = localStorage.getItem('authToken');
        
        if (storedUser && storedToken) {
            currentUser = JSON.parse(storedUser);
            isSignedIn = true;
            
            // Verify token is still valid (basic check)
            const payload = JSON.parse(atob(storedToken.split('.')[1]));
            const now = Date.now() / 1000;
            
            if (payload.exp > now) {
                console.log('Existing session found:', currentUser);
                updateAuthUI();
                return;
            } else {
                console.log('Stored token expired');
                signOut();
            }
        }
        
        // No valid session, show login
        showScreen('loginScreen');
        
    } catch (error) {
        console.error('Error checking existing session:', error);
        showScreen('loginScreen');
    }
}

/**
 * Update authentication UI based on sign-in state
 */
function updateAuthUI() {
    if (isSignedIn && currentUser) {
        // Hide login screen, show dashboard navigation
        showScreen('dashboardNav');
        
        // Update user info in header
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userPhoto = document.getElementById('userPhoto');
        
        if (userInfo) userInfo.style.display = 'flex';
        if (userName) userName.textContent = currentUser.name || currentUser.email;
        if (userPhoto) userPhoto.src = currentUser.picture || '';
        
        // Hide sign-in button, show sign-out
        const signInBtn = document.getElementById('signInBtn');
        const signOutBtn = document.getElementById('signOutBtn');
        
        if (signInBtn) signInBtn.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'inline-block';
        
        // Load user role and permissions
        loadUserRole();
        
    } else {
        // Show login screen
        showScreen('loginScreen');
        
        // Hide user info
        const userInfo = document.getElementById('userInfo');
        if (userInfo) userInfo.style.display = 'none';
        
        // Show sign-in button, hide sign-out
        const signInBtn = document.getElementById('signInBtn');
        const signOutBtn = document.getElementById('signOutBtn');
        
        if (signInBtn) signInBtn.style.display = 'inline-block';
        if (signOutBtn) signOutBtn.style.display = 'none';
    }
}

/**
 * Sign out the current user
 */
function signOut() {
    try {
        // Clear current user data
        currentUser = null;
        isSignedIn = false;
        
        // Clear localStorage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        
        // Sign out from Google
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }
        
        console.log('User signed out');
        
        // Update UI
        updateAuthUI();
        
        // Trigger sign-out event
        window.dispatchEvent(new CustomEvent('authSignOut'));
        
    } catch (error) {
        console.error('Error during sign-out:', error);
    }
}

/**
 * Load user role from backend
 */
async function loadUserRole() {
    if (!currentUser) return;
    
    try {
        // Check if backend is properly configured
        const scriptUrl = APP_CONFIG ? APP_CONFIG.SCRIPT_URL : '';
        if (!scriptUrl || scriptUrl.includes('YOUR_SCRIPT_ID')) {
            console.warn('Backend not configured yet, defaulting to admin role');
            currentUser.role = 'admin';
            updateNavigationForRole('admin');
            return;
        }
        
        const response = await callGoogleAppsScript('getUserRole', { email: currentUser.email });
        
        if (response.success && response.data && response.data.role) {
            currentUser.role = response.data.role;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('userRole', response.data.role);
            
            // Update navigation based on role
            updateNavigationForRole(response.data.role);
            
            console.log('User role loaded:', response.data.role);
        } else {
            console.warn('User role not found, defaulting to employee');
            currentUser.role = 'employee';
            updateNavigationForRole('employee');
        }
        
    } catch (error) {
        console.error('Error loading user role:', error);
        
        // Check if this is a backend connectivity issue
        if (error.message && error.message.includes('HTML response received')) {
            console.warn('🔧 Backend not deployed - Google Apps Script URL returns HTML instead of JSON');
            console.info('💡 To fix: Deploy the backend Google Apps Script or continue with frontend-only testing');
        }
        
        // Default to admin role for testing if backend not available
        currentUser.role = 'admin';
        updateNavigationForRole('admin');
        console.log('✅ Using admin role for frontend testing (backend not available)');
    }
}

/**
 * Update navigation based on user role
 */
function updateNavigationForRole(role) {
    const adminNav = document.getElementById('adminNav');
    const supervisorNav = document.getElementById('supervisorNav');
    const employeeNav = document.getElementById('employeeNav');
    
    // Hide all navigation items first
    if (adminNav) adminNav.style.display = 'none';
    if (supervisorNav) supervisorNav.style.display = 'none';
    if (employeeNav) employeeNav.style.display = 'none';
    
    // Show appropriate navigation based on role
    switch (role) {
        case 'admin':
            if (adminNav) adminNav.style.display = 'block';
            if (supervisorNav) supervisorNav.style.display = 'block';
            if (employeeNav) employeeNav.style.display = 'block';
            break;
            
        case 'supervisor':
            if (supervisorNav) supervisorNav.style.display = 'block';
            if (employeeNav) employeeNav.style.display = 'block';
            break;
            
        case 'employee':
        default:
            if (employeeNav) employeeNav.style.display = 'block';
            break;
    }
}

/**
 * Handle authentication errors
 */
function handleAuthError(error) {
    console.error('Authentication error:', error);
    
    let errorMessage = 'Authentication failed. Please try again.';
    
    if (error.error === 'popup_closed_by_user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
    } else if (error.error === 'access_denied') {
        errorMessage = 'Access denied. Please grant the required permissions.';
    } else if (error.error === 'invalid_client') {
        errorMessage = 'Invalid client configuration. Please contact support.';
    }
    
    showError(errorMessage);
}

/**
 * Get current user information
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Check if user is signed in
 */
function isUserSignedIn() {
    return isSignedIn && currentUser !== null;
}

/**
 * Get current auth token
 */
function getAuthToken() {
    if (currentUser && currentUser.token) {
        // Check if token is still valid
        try {
            const payload = JSON.parse(atob(currentUser.token.split('.')[1]));
            const now = Date.now() / 1000;
            
            if (payload.exp > now) {
                return currentUser.token;
            } else {
                console.log('Token expired, signing out');
                signOut();
                return null;
            }
        } catch (error) {
            console.error('Error checking token expiry:', error);
            return null;
        }
    }
    
    return null;
}

/**
 * Get user permissions based on role
 */
function getUserPermissions() {
    if (!currentUser || !currentUser.role) {
        return ['read_own_tasks'];
    }
    
    const permissions = {
        'admin': ['read_all', 'write_all', 'delete_all', 'manage_users', 'manage_tasks'],
        'supervisor': ['read_team', 'write_team', 'manage_tasks', 'view_reports'],
        'employee': ['read_own_tasks', 'write_own_tasks', 'update_progress']
    };
    
    return permissions[currentUser.role] || permissions['employee'];
}

/**
 * Check if user has specific permission
 */
function hasPermission(permission) {
    const userPermissions = getUserPermissions();
    return userPermissions.includes(permission) || userPermissions.includes('write_all');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Google API to be available before initializing
    function waitForGoogleAPI() {
        if (typeof google !== 'undefined') {
            initAuth();
        } else {
            console.log('Waiting for Google Identity Services to load...');
            setTimeout(waitForGoogleAPI, 200);
        }
    }
    
    waitForGoogleAPI();
    
    // Add sign out button event listener
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
    }
});

// Global error handler for authentication
window.addEventListener('error', function(event) {
    if (event.error && event.error.message && 
        event.error.message.includes('auth')) {
        handleAuthError(event.error);
    }
});

/**
 * Check if current user has a specific role
 */
function hasRole(role) {
    const user = getCurrentUser();
    if (!user || !user.role) {
        return false;
    }
    return user.role === role;
}

/**
 * Check if current user has any of the specified roles
 */
function hasAnyRole(roles) {
    const user = getCurrentUser();
    if (!user || !user.role) {
        return false;
    }
    return roles.includes(user.role);
}

// Export functions for use in other modules
window.authModule = {
    getCurrentUser,
    isUserSignedIn,
    getAuthToken,
    getUserPermissions,
    hasPermission,
    hasRole,
    hasAnyRole,
    signOut,
    loadUserRole
};