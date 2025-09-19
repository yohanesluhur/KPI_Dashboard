// app.js - Main Application Controller

/**
 * Global Application State
 */
const app = {
    currentScreen: 'loginScreen',
    currentUser: null,
    isLoading: false,
    notifications: []
};

/**
 * Initialize application
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('KPI Dashboard App Initializing...');
    
    // Initialize screen navigation
    initializeScreenNavigation();
    
    // Initialize global event listeners
    initializeGlobalEventListeners();
    
    // Initialize notification system
    initializeNotificationSystem();
    
    // Initialize modal system
    initializeModalSystem();
    
    console.log('KPI Dashboard App Initialized');
});

/**
 * Initialize screen navigation
 */
function initializeScreenNavigation() {
    // Dashboard navigation buttons
    const supervisorDashboardBtn = document.getElementById('supervisorDashboardBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    const employeeTasksBtn = document.getElementById('employeeTasksBtn');
    
    if (supervisorDashboardBtn) {
        supervisorDashboardBtn.addEventListener('click', () => {
            if (hasRole('supervisor') || hasRole('admin')) {
                showScreen('supervisorDashboard');
            } else {
                showError('You do not have permission to access the supervisor dashboard.');
            }
        });
    }
    
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            if (hasRole('supervisor') || hasRole('admin')) {
                showScreen('adminPanel');
            } else {
                showError('You do not have permission to access the admin panel.');
            }
        });
    }
    
    if (employeeTasksBtn) {
        employeeTasksBtn.addEventListener('click', () => {
            showScreen('employeeTasks');
        });
    }
}

/**
 * Initialize global event listeners
 */
function initializeGlobalEventListeners() {
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('taskModal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    // Handle form submissions to check for edit mode
    const addTaskForm = document.getElementById('addTaskForm');
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', function(event) {
            // Check if we're in edit mode
            if (window.adminPanel && window.adminPanel.currentEditingTask) {
                event.preventDefault();
                window.adminPanel.updateTask();
            }
        });
    }
}

/**
 * Initialize notification system
 */
function initializeNotificationSystem() {
    // Create notification container if it doesn't exist
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
}

/**
 * Initialize modal system
 */
function initializeModalSystem() {
    // Ensure modal exists
    if (!document.getElementById('taskModal')) {
        console.warn('Task modal not found in DOM');
    }
}

/**
 * Show specific screen and hide others
 */
function showScreen(screenId) {
    console.log(`Switching to screen: ${screenId}`);
    
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        app.currentScreen = screenId;
        
        // Initialize screen-specific functionality
        initializeScreenFunctionality(screenId);
        
        // Update URL hash for deep linking
        window.location.hash = screenId;
        
    } else {
        console.error(`Screen not found: ${screenId}`);
        showError('Requested page not found');
    }
}

/**
 * Initialize functionality for specific screens
 */
function initializeScreenFunctionality(screenId) {
    // Cleanup previous screen
    cleanupScreenFunctionality();
    
    switch (screenId) {
        case 'supervisorDashboard':
            if (typeof initSupervisorDashboard === 'function') {
                initSupervisorDashboard();
            }
            break;
            
        case 'adminPanel':
            if (typeof initAdminPanel === 'function') {
                initAdminPanel();
            }
            break;
            
        case 'employeeTasks':
            if (typeof initEmployeeTaskManager === 'function') {
                initEmployeeTaskManager();
            }
            break;
            
        case 'dashboardNav':
            // Update navigation cards based on user role
            updateNavigationAccess();
            break;
    }
}

/**
 * Cleanup functionality from previous screen
 */
function cleanupScreenFunctionality() {
    // Stop any running intervals
    if (typeof cleanupSupervisorDashboard === 'function') {
        cleanupSupervisorDashboard();
    }
    
    if (typeof cleanupEmployeeTaskManager === 'function') {
        cleanupEmployeeTaskManager();
    }
}

/**
 * Update navigation access based on user role
 */
function updateNavigationAccess() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Show/hide navigation cards based on role
    const supervisorCard = document.getElementById('supervisorDashboardBtn');
    const adminCard = document.getElementById('adminPanelBtn');
    
    if (supervisorCard) {
        supervisorCard.style.display = (user.role === 'supervisor' || user.role === 'admin') ? 'block' : 'none';
    }
    
    if (adminCard) {
        adminCard.style.display = (user.role === 'supervisor' || user.role === 'admin') ? 'block' : 'none';
    }
}

/**
 * Show loading state
 */
function showLoading(show = true) {
    app.isLoading = show;
    
    // Update loading indicators
    const loadingElements = document.querySelectorAll('.loading-indicator');
    loadingElements.forEach(element => {
        element.style.display = show ? 'block' : 'none';
    });
    
    // Disable form inputs while loading
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => {
            input.disabled = show;
        });
    });
    
    // Show cursor loading state
    document.body.style.cursor = show ? 'wait' : 'default';
}

/**
 * Show error notification
 */
function showError(message, duration = 5000) {
    console.error('Error:', message);
    showNotification(message, 'error', duration);
}

/**
 * Show success notification
 */
function showSuccess(message, duration = 3000) {
    console.log('Success:', message);
    showNotification(message, 'success', duration);
}

/**
 * Show info notification
 */
function showInfo(message, duration = 4000) {
    console.log('Info:', message);
    showNotification(message, 'info', duration);
}

/**
 * Show notification
 */
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
    
    // Add to app state
    app.notifications.push({
        message,
        type,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 10 notifications
    if (app.notifications.length > 10) {
        app.notifications = app.notifications.slice(-10);
    }
}

/**
 * Show modal dialog
 */
function showModal(title, content, buttons = []) {
    const modal = document.getElementById('taskModal');
    if (!modal) {
        console.error('Modal not found');
        return;
    }
    
    // Update modal content
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = modal.querySelector('.modal-body');
    
    if (modalTitle) {
        modalTitle.textContent = title;
    }
    
    if (modalBody) {
        modalBody.innerHTML = content;
    }
    
    // Update buttons if provided
    if (buttons.length > 0) {
        const modalFooter = modal.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = buttons.map(button => 
                `<button class="btn ${button.class}" onclick="${button.onclick}">${button.text}</button>`
            ).join('');
        }
    }
    
    // Show modal
    modal.style.display = 'block';
}

/**
 * Close modal dialog
 */
function closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Clean up employee task manager state
    if (window.employeeTaskManager) {
        window.employeeTaskManager.currentEditingTask = null;
    }
}

/**
 * Handle deep linking
 */
function handleDeepLinking() {
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        // Only switch if user is authenticated
        if (isUserSignedIn()) {
            showScreen(hash);
        }
    }
}

/**
 * Get user role from current user
 */
function hasRole(role) {
    if (typeof window.authModule !== 'undefined') {
        return window.authModule.hasRole(role);
    }
    const user = getCurrentUser();
    return user && user.role === role;
}

/**
 * Check if user is signed in
 */
function isUserSignedIn() {
    if (typeof window.authModule !== 'undefined') {
        return window.authModule.isUserSignedIn();
    }
    return getCurrentUser() !== null;
}

/**
 * Get current user
 */
function getCurrentUser() {
    if (typeof window.authModule !== 'undefined') {
        return window.authModule.getCurrentUser();
    }
    return app.currentUser;
}

/**
 * Error boundary for unhandled errors
 */
window.addEventListener('error', function(event) {
    console.error('Unhandled error:', event.error);
    
    // Don't show error notifications for network errors during development
    if (event.error && event.error.message && 
        !event.error.message.includes('Script error') &&
        !event.error.message.includes('Non-Error promise rejection')) {
        showError('An unexpected error occurred. Please refresh the page if problems persist.');
    }
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Don't show notifications for API errors (they're handled elsewhere)
    if (event.reason && typeof event.reason === 'object' && 
        !event.reason.message?.includes('API')) {
        showError('An unexpected error occurred. Please try again.');
    }
});

/**
 * Handle hash changes for deep linking
 */
window.addEventListener('hashchange', handleDeepLinking);

/**
 * Utility functions for global access
 */
window.app = app;
window.showScreen = showScreen;
window.showLoading = showLoading;
window.showError = showError;
window.showSuccess = showSuccess;
window.showInfo = showInfo;
window.showNotification = showNotification;
window.showModal = showModal;
window.closeModal = closeModal;

// Add notification styles to head if not already present
if (!document.getElementById('notificationStyles')) {
    const styles = document.createElement('style');
    styles.id = 'notificationStyles';
    styles.textContent = `
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            max-width: 400px;
        }
        
        .notification {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin-bottom: 10px;
            border-left: 4px solid #007bff;
            animation: slideInRight 0.3s ease;
        }
        
        .notification-error {
            border-left-color: #dc3545;
        }
        
        .notification-success {
            border-left-color: #28a745;
        }
        
        .notification-info {
            border-left-color: #17a2b8;
        }
        
        .notification-content {
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .notification-message {
            flex: 1;
            margin-right: 10px;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #6c757d;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .notification-close:hover {
            color: #333;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @media (max-width: 768px) {
            .notification-container {
                left: 20px;
                right: 20px;
                max-width: none;
            }
        }
    `;
    document.head.appendChild(styles);
}