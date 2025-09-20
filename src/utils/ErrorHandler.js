/**
 * ErrorHandler - Centralized error handling and logging for the calibration system
 * Provides consistent error reporting, logging, and user-friendly error messages
 */

export class ErrorHandler {
    constructor(options = {}) {
        this.enableConsoleLogging = options.enableConsoleLogging !== false;
        this.enableRemoteLogging = options.enableRemoteLogging || false;
        this.maxLogEntries = options.maxLogEntries || 100;

        this.errorLog = [];
        this.errorCounts = new Map();
        this.startTime = Date.now();
    }

    /**
     * Log an error with context information
     */
    logError(context, error, additionalInfo = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            context,
            message: error.message || String(error),
            stack: error.stack,
            type: error.constructor.name,
            additionalInfo,
            id: this._generateErrorId()
        };

        // Add to local log
        this.errorLog.push(errorEntry);
        this._trimLog();

        // Update error counts
        const errorKey = `${context}:${error.message}`;
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

        // Console logging
        if (this.enableConsoleLogging) {
            console.error(`[${context}] ${error.message}`, {
                error,
                additionalInfo,
                errorId: errorEntry.id
            });
        }

        // Remote logging (if enabled)
        if (this.enableRemoteLogging) {
            this._sendToRemoteLogging(errorEntry);
        }

        return errorEntry.id;
    }

    /**
     * Log a warning with context information
     */
    logWarning(context, message, additionalInfo = {}) {
        const warningEntry = {
            timestamp: new Date().toISOString(),
            context,
            message,
            type: 'Warning',
            additionalInfo,
            id: this._generateErrorId()
        };

        this.errorLog.push(warningEntry);
        this._trimLog();

        if (this.enableConsoleLogging) {
            console.warn(`[${context}] ${message}`, additionalInfo);
        }

        return warningEntry.id;
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error, context = '') {
        const errorMessage = error.message || String(error);

        // Common error patterns and their user-friendly messages
        const errorPatterns = {
            'Firebase initialization failed': 'Unable to connect to cloud storage. Please check your internet connection.',
            'Permission denied': 'Access denied. Please check your permissions or sign in again.',
            'Camera not found': 'Camera not detected. Please ensure your camera is connected and permissions are granted.',
            'Projector resolution': 'Projector configuration issue. Please check your projector connection.',
            'OpenCV.js not loaded': 'Computer vision library not loaded. Please refresh the page.',
            'Invalid calibration data': 'Calibration data is corrupted or invalid. Please recalibrate.',
            'Network request failed': 'Network connection error. Please check your internet connection.',
            'Quota exceeded': 'Storage quota exceeded. Please clean up old calibrations.',
            'Document not found': 'Calibration data not found. Please create a new calibration.',
            'Authentication required': 'Please sign in to access your calibrations.',
            'Timeout': 'Operation timed out. Please try again.',
            'getUserMedia': 'Camera access denied. Please grant camera permissions in your browser.'
        };

        // Find matching pattern
        for (const [pattern, message] of Object.entries(errorPatterns)) {
            if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
                return message;
            }
        }

        // Context-specific messages
        switch (context) {
            case 'CalibrationManager.initialize':
                return 'Failed to initialize calibration system. Please refresh the page.';
            case 'CalibrationStorage':
                return 'Unable to save or load calibration data. Please check your connection.';
            case 'CameraCalibrator':
                return 'Camera calibration failed. Please check your camera and try again.';
            case 'ProjectorCalibrator':
                return 'Projector calibration failed. Please check your projector setup.';
            case 'QuadCalibrator':
                return 'Marker detection failed. Please ensure markers are visible and well-lit.';
            default:
                return 'An unexpected error occurred. Please try again or contact support.';
        }
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const now = Date.now();
        const uptime = now - this.startTime;

        const errorsByType = {};
        const errorsByContext = {};
        const recentErrors = this.errorLog.filter(
            entry => new Date(entry.timestamp).getTime() > now - 3600000 // Last hour
        );

        this.errorLog.forEach(entry => {
            errorsByType[entry.type] = (errorsByType[entry.type] || 0) + 1;
            errorsByContext[entry.context] = (errorsByContext[entry.context] || 0) + 1;
        });

        return {
            totalErrors: this.errorLog.length,
            recentErrors: recentErrors.length,
            errorsByType,
            errorsByContext,
            mostCommonErrors: Array.from(this.errorCounts.entries())
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5),
            uptime
        };
    }

    /**
     * Clear error log
     */
    clearLog() {
        this.errorLog = [];
        this.errorCounts.clear();
    }

    /**
     * Get recent errors
     */
    getRecentErrors(limit = 10) {
        return this.errorLog
            .slice(-limit)
            .reverse()
            .map(entry => ({
                id: entry.id,
                timestamp: entry.timestamp,
                context: entry.context,
                message: entry.message,
                type: entry.type
            }));
    }

    /**
     * Create error for common scenarios
     */
    createError(type, message, details = {}) {
        const error = new Error(message);
        error.type = type;
        error.details = details;
        error.timestamp = new Date().toISOString();
        return error;
    }

    /**
     * Wrap async function with error handling
     */
    wrapAsync(fn, context) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                const errorId = this.logError(context, error, { args });
                throw this._enhanceError(error, context, errorId);
            }
        };
    }

    /**
     * Wrap function with error handling
     */
    wrap(fn, context) {
        return (...args) => {
            try {
                return fn(...args);
            } catch (error) {
                const errorId = this.logError(context, error, { args });
                throw this._enhanceError(error, context, errorId);
            }
        };
    }

    /**
     * Check if error should be retried
     */
    shouldRetry(error, retryCount = 0, maxRetries = 3) {
        if (retryCount >= maxRetries) {
            return false;
        }

        const retryableErrors = [
            'network',
            'timeout',
            'connection',
            'temporary',
            'rate limit',
            'service unavailable'
        ];

        const errorMessage = (error.message || '').toLowerCase();
        return retryableErrors.some(pattern => errorMessage.includes(pattern));
    }

    /**
     * Handle Firebase-specific errors
     */
    handleFirebaseError(error) {
        const firebaseErrorMessages = {
            'auth/user-not-found': 'User account not found. Please sign up first.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'permission-denied': 'Access denied. Please sign in with the correct account.',
            'not-found': 'Document not found. The calibration may have been deleted.',
            'quota-exceeded': 'Storage quota exceeded. Please clean up old data.',
            'unavailable': 'Service temporarily unavailable. Please try again later.'
        };

        const errorCode = error.code || '';
        return firebaseErrorMessages[errorCode] || this.getUserFriendlyMessage(error, 'Firebase');
    }

    // Private methods

    _generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    _trimLog() {
        if (this.errorLog.length > this.maxLogEntries) {
            this.errorLog = this.errorLog.slice(-this.maxLogEntries);
        }
    }

    _enhanceError(error, context, errorId) {
        error.context = context;
        error.errorId = errorId;
        error.userMessage = this.getUserFriendlyMessage(error, context);
        return error;
    }

    async _sendToRemoteLogging(errorEntry) {
        try {
            // This would send to a remote logging service
            // Implementation depends on your logging service (e.g., Sentry, LogRocket, etc.)
            console.debug('Remote logging would send:', errorEntry);
        } catch (error) {
            console.warn('Failed to send error to remote logging:', error);
        }
    }
}