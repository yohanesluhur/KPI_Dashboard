// config.js - Configuration File for Development and Production

/**
 * Application Configuration
 * Copy this file and update the values for your deployment
 */

const APP_CONFIG = {
    // Google OAuth Configuration
    GOOGLE_CLIENT_ID: '982944345380-0o9ccqh8ifkm9v5sq9mmht6sasuqa2is.apps.googleusercontent.com',
    
    // Google Apps Script Configuration
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzCz4Lf787j34MWFpdSs48yWMipb1CAnt7IT_N8_qktQSQdMnwganGIB0PqJlK1nhcdlQ/exec',
    
    // Google Sheets Configuration (for reference)
    SPREADSHEET_ID: '1VTERW3H4DaMTDSgrQOBQTRZlx601EnDMzF4-S3TxloA',
    
    // Application Settings
    APP_NAME: 'KPI Dashboard',
    VERSION: '1.0.0',
    
    // API Settings
    API_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    
    // UI Settings
    AUTO_REFRESH_INTERVAL: 5, // minutes
    NOTIFICATION_DURATION: 4000, // milliseconds
    
    // Features
    FEATURES: {
        AUTO_REFRESH: true,
        NOTIFICATIONS: true,
        DARK_MODE: false,
        EXPORT_DATA: true,
        OFFLINE_MODE: false
    },
    
    // Development Settings
    DEBUG: false,
    LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
    
    // Security Settings
    ENABLE_AUTH: true,
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
    
    // Data Settings
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_TASKS_PER_PAGE: 50,
    MAX_EMPLOYEES: 1000,
    
    // CORS Settings (for development)
    CORS_ORIGIN: '*'
};

// Environment-specific configurations
const ENVIRONMENTS = {
    development: {
        DEBUG: true,
        LOG_LEVEL: 'debug',
        AUTO_REFRESH_INTERVAL: 1, // 1 minute for faster testing
        CORS_ORIGIN: '*'
    },
    
    staging: {
        DEBUG: true,
        LOG_LEVEL: 'info',
        CORS_ORIGIN: 'https://your-staging-domain.com'
    },
    
    production: {
        DEBUG: false,
        LOG_LEVEL: 'error',
        CORS_ORIGIN: 'https://your-production-domain.com'
    }
};

// Function to get environment-specific config
function getConfig(environment = 'development') {
    const envConfig = ENVIRONMENTS[environment] || ENVIRONMENTS.development;
    return { ...APP_CONFIG, ...envConfig };
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, ENVIRONMENTS, getConfig };
} else {
    window.APP_CONFIG = APP_CONFIG;
    window.getConfig = getConfig;
}