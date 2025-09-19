// api.js - Google Apps Script API Communication Module

// Configuration - use the main APP_CONFIG
const API_CONFIG = {
    // Use the SCRIPT_URL from the main config
    get SCRIPT_URL() {
        return APP_CONFIG ? APP_CONFIG.SCRIPT_URL : 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
    },
    // Timeout for API requests (in milliseconds)
    TIMEOUT: 30000,
    // Retry configuration
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

/**
 * Test backend connectivity with CORS-friendly approach
 */
async function testBackendConnection() {
    try {
        console.log('Testing backend connection to:', API_CONFIG.SCRIPT_URL);
        
        // Test with GET request first (most CORS-friendly)
        console.log('Testing with GET request...');
        const getResponse = await fetch(API_CONFIG.SCRIPT_URL + '?action=test', {
            method: 'GET',
            mode: 'cors'
        });
        
        if (getResponse.ok) {
            const getResult = await getResponse.json();
            console.log('GET test result:', getResult);
            return getResult.success === true;
        }
        
        return false;
        
    } catch (error) {
        console.error('Backend connection test failed:', error);
        return false;
    }
}

/**
 * Check if an action can be performed with a simple GET request
 */
function isSimpleAction(action) {
    const simpleActions = ['test', 'ping', 'getEmployees', 'getTasks', 'getKPIMetrics', 'authenticateUser', 'getUserRole', 'getEmployeeByEmail'];
    return simpleActions.includes(action);
}

/**
 * Make API call using GET parameters to avoid CORS
 */
async function makeGETAPICall(action, data = {}, user = null) {
    try {
        // Build URL with parameters
        const url = new URL(API_CONFIG.SCRIPT_URL);
        url.searchParams.append('action', action);
        
        // Add data parameters (flatten the object)
        if (data && typeof data === 'object') {
            for (const [key, value] of Object.entries(data)) {
                if (value !== null && value !== undefined) {
                    url.searchParams.append(key, String(value));
                }
            }
        }
        
        // Add user info if present
        if (user && user.email) {
            url.searchParams.append('userEmail', user.email);
            if (user.token) {
                url.searchParams.append('userToken', user.token);
            }
        }
        
        console.log('Making GET API call to:', url.toString());
        
        // Use fetch with GET request
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors',
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('GET API call result:', result);
        
        return result;
        
    } catch (error) {
        console.error('GET API call failed:', error);
        throw error;
    }
}

/**
 * Check if the current auth token is still valid
 */
async function checkTokenExpiry() {
    // Get the current auth token from the auth module
    if (typeof getAuthToken === 'function') {
        return getAuthToken(); // This function in auth.js already handles expiry
    }
    
    // Fallback: check if auth module is available
    if (window.authModule && typeof window.authModule.getAuthToken === 'function') {
        return window.authModule.getAuthToken();
    }
    
    // If no auth token available, that's okay - the backend will handle it
    return null;
}

/**
 * Make a call to Google Apps Script Web App with CORS-friendly approach
 * @param {string} action - The action to perform
 * @param {Object} data - Data to send with the request
 * @returns {Promise} - Promise that resolves with the response
 */
async function callGoogleAppsScript(action, data = {}) {
    const maxRetries = API_CONFIG.MAX_RETRIES;
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Check and refresh token if needed
            await checkTokenExpiry();
            
            const user = getCurrentUser() ? {
                email: getCurrentUser().email,
                token: getCurrentUser().token
            } : null;
            
            console.log(`API Call [${action}] - Attempt ${attempt + 1}:`, data);
            
            // Strategy 1: Try GET request first (most CORS-friendly)
            if (isSimpleAction(action)) {
                const result = await makeGETAPICall(action, data, user);
                if (result && (result.success !== false)) {
                    console.log(`API Response [${action}] (GET):`, result);
                    return result;
                }
            }
            
            // Strategy 2: Try POST with simplified headers
            const payload = {
                action: action,
                data: data,
                user: user
            };
            
            const response = await fetch(API_CONFIG.SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain', // Use text/plain to avoid CORS preflight
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
            }
            
            // Check content type before trying to parse JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.warn('Non-JSON response received:', textResponse.substring(0, 200));
                throw new Error('Server returned HTML instead of JSON - backend may not be deployed correctly');
            }
            
            const result = await response.json();
            console.log(`API Response [${action}]:`, result);
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            return result;
            
        } catch (error) {
            lastError = error;
            console.error(`API Error [${action}] - Attempt ${attempt + 1}:`, error);
            
            // Check if this is a backend deployment issue
            if (error.message && (
                error.message.includes('Unexpected token') || 
                error.message.includes('HTML instead of JSON') ||
                error.message.includes('backend may not be deployed')
            )) {
                console.warn('Backend appears to be returning HTML instead of JSON - likely not deployed or accessible');
                // Don't retry HTML errors - they won't fix themselves
                break;
            }
            
            // Don't retry on authentication errors
            if (error.message && error.message.includes('auth')) {
                throw error;
            }
            
            // Don't retry on body stream errors
            if (error.message && error.message.includes('body stream already read')) {
                throw error;
            }
            
            // Wait before retrying (except on last attempt)
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => 
                    setTimeout(resolve, API_CONFIG.RETRY_DELAY * (attempt + 1))
                );
            }
        }
    }
    
    // All retries failed
    const isBackendIssue = lastError.message && lastError.message.includes('Unexpected token');
    const errorMessage = isBackendIssue 
        ? `Backend not accessible - HTML response received instead of JSON. Check if Google Apps Script is deployed correctly.`
        : `API call failed after ${maxRetries} attempts: ${lastError.message}`;
    
    throw new Error(errorMessage);
}

/**
 * Employee Management API Functions
 */
const EmployeeAPI = {
    /**
     * Get all employees
     */
    async getAll() {
        return await callGoogleAppsScript('getEmployees');
    },
    
    /**
     * Add a new employee
     */
    async add(employeeData) {
        return await callGoogleAppsScript('addEmployee', employeeData);
    },
    
    /**
     * Update employee information
     */
    async update(employeeId, employeeData) {
        return await callGoogleAppsScript('updateEmployee', {
            employeeId,
            ...employeeData
        });
    },
    
    /**
     * Delete an employee
     */
    async delete(employeeId) {
        return await callGoogleAppsScript('deleteEmployee', { employeeId });
    },
    
    /**
     * Get employee by email
     */
    async getByEmail(email) {
        return await callGoogleAppsScript('getEmployeeByEmail', { email });
    }
};

/**
 * Task Management API Functions
 */
const TaskAPI = {
    /**
     * Get all tasks
     */
    async getAll() {
        return await callGoogleAppsScript('getTasks');
    },
    
    /**
     * Get tasks for a specific employee
     */
    async getByEmployee(employeeId) {
        return await callGoogleAppsScript('getTasksByEmployee', { employeeId });
    },
    
    /**
     * Get tasks supervised by a specific supervisor
     */
    async getBySupervisor(supervisorId) {
        return await callGoogleAppsScript('getTasksBySupervisor', { supervisorId });
    },
    
    /**
     * Add a new task
     */
    async add(taskData) {
        return await callGoogleAppsScript('addTask', taskData);
    },
    
    /**
     * Update task information
     */
    async update(taskId, taskData) {
        return await callGoogleAppsScript('updateTask', {
            taskId,
            ...taskData
        });
    },
    
    /**
     * Delete a task
     */
    async delete(taskId) {
        return await callGoogleAppsScript('deleteTask', { taskId });
    },
    
    /**
     * Update task progress
     */
    async updateProgress(taskId, progressData) {
        return await callGoogleAppsScript('updateTaskProgress', {
            taskId,
            ...progressData
        });
    }
};

/**
 * Progress Tracking API Functions
 */
const ProgressAPI = {
    /**
     * Get progress entries for a task
     */
    async getByTask(taskId) {
        return await callGoogleAppsScript('getProgressByTask', { taskId });
    },
    
    /**
     * Add progress entry
     */
    async add(progressData) {
        return await callGoogleAppsScript('addProgress', progressData);
    },
    
    /**
     * Update progress entry
     */
    async update(progressId, progressData) {
        return await callGoogleAppsScript('updateProgress', {
            progressId,
            ...progressData
        });
    },
    
    /**
     * Delete progress entry
     */
    async delete(progressId) {
        return await callGoogleAppsScript('deleteProgress', { progressId });
    }
};

/**
 * Dashboard API Functions
 */
const DashboardAPI = {
    /**
     * Get supervisor dashboard data
     */
    async getSupervisorData(supervisorId) {
        return await callGoogleAppsScript('getSupervisorDashboard', { supervisorId });
    },
    
    /**
     * Get employee dashboard data
     */
    async getEmployeeData(employeeId) {
        return await callGoogleAppsScript('getEmployeeDashboard', { employeeId });
    },
    
    /**
     * Get KPI metrics
     */
    async getKPIMetrics(filters = {}) {
        return await callGoogleAppsScript('getKPIMetrics', filters);
    }
};

/**
 * Authentication API Functions
 */
const AuthAPI = {
    /**
     * Authenticate user with backend
     */
    async authenticate(userData) {
        return await callGoogleAppsScript('authenticateUser', userData);
    },
    
    /**
     * Verify user permissions
     */
    async verifyPermissions(action) {
        return await callGoogleAppsScript('verifyPermissions', { action });
    }
};

/**
 * Utility function to handle API errors gracefully
 */
function handleAPIError(error, context = '') {
    console.error(`API Error${context ? ` (${context})` : ''}:`, error);
    
    let userMessage = 'An error occurred. Please try again.';
    
    if (error.message) {
        if (error.message.includes('timeout') || error.message.includes('network')) {
            userMessage = 'Connection timeout. Please check your internet connection and try again.';
        } else if (error.message.includes('auth')) {
            userMessage = 'Authentication failed. Please sign in again.';
            // Trigger re-authentication
            setTimeout(() => {
                if (typeof signOut === 'function') {
                    signOut();
                }
            }, 1000);
        } else if (error.message.includes('permission')) {
            userMessage = 'You don\'t have permission to perform this action.';
        } else if (error.message.includes('not found')) {
            userMessage = 'The requested data was not found.';
        } else {
            userMessage = error.message;
        }
    }
    
    showError(userMessage);
    return null;
}

/**
 * Wrapper function for API calls with error handling
 */
async function safeAPICall(apiFunction, context = '') {
    try {
        showLoading(true);
        const result = await apiFunction();
        showLoading(false);
        return result;
    } catch (error) {
        showLoading(false);
        return handleAPIError(error, context);
    }
}

/**
 * Batch API calls with error handling
 */
async function batchAPICall(apiCalls) {
    const results = [];
    const errors = [];
    
    for (const [name, apiCall] of Object.entries(apiCalls)) {
        try {
            const result = await apiCall();
            results.push({ name, result });
        } catch (error) {
            errors.push({ name, error });
            console.error(`Batch API Error [${name}]:`, error);
        }
    }
    
    return { results, errors };
}

/**
 * Cache management for API responses
 */
const APICache = {
    cache: new Map(),
    ttl: 5 * 60 * 1000, // 5 minutes
    
    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },
    
    get(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.ttl) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    },
    
    clear() {
        this.cache.clear();
    },
    
    delete(key) {
        this.cache.delete(key);
    }
};

/**
 * Cached API call wrapper
 */
async function cachedAPICall(cacheKey, apiFunction) {
    // Check cache first
    const cached = APICache.get(cacheKey);
    if (cached) {
        console.log(`Cache hit for: ${cacheKey}`);
        return cached;
    }
    
    // Make API call and cache result
    const result = await apiFunction();
    APICache.set(cacheKey, result);
    return result;
}

/**
 * Clear specific cache entries
 */
function clearCache(pattern) {
    if (pattern) {
        for (const key of APICache.cache.keys()) {
            if (key.includes(pattern)) {
                APICache.delete(key);
            }
        }
    } else {
        APICache.clear();
    }
}

// Export API modules
window.api = {
    Employee: EmployeeAPI,
    Task: TaskAPI,
    Progress: ProgressAPI,
    Dashboard: DashboardAPI,
    Auth: AuthAPI,
    call: callGoogleAppsScript,
    safe: safeAPICall,
    batch: batchAPICall,
    cached: cachedAPICall,
    clearCache,
    handleError: handleAPIError
};