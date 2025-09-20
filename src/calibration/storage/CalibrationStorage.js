/**
 * CalibrationStorage - Interface for calibration data persistence
 * Handles loading, saving, and validation of calibration data
 */

import { FirebaseAdapter } from './FirebaseAdapter.js';
import { DataValidator } from './DataValidator.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';

export class CalibrationStorage {
    constructor(firebaseConfig) {
        this.adapter = new FirebaseAdapter(firebaseConfig);
        this.validator = new DataValidator();
        this.errorHandler = new ErrorHandler();

        this.isInitialized = false;
        this.currentUser = null;
    }

    /**
     * Initialize the storage system
     */
    async initialize() {
        try {
            await this.adapter.initialize();
            this.isInitialized = true;

            return {
                success: true,
                message: 'CalibrationStorage initialized successfully'
            };
        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.initialize', error);
            throw new Error(`Failed to initialize storage: ${error.message}`);
        }
    }

    /**
     * Set the current user for storage operations
     */
    setCurrentUser(user) {
        this.currentUser = user;
    }

    /**
     * Save calibration data for a user
     */
    async saveCalibration(userId, calibrationData) {
        try {
            this._validateInitialized();

            // Validate calibration data
            const validationResult = this.validator.validateCalibrationData(calibrationData);
            if (!validationResult.isValid) {
                throw new Error(`Invalid calibration data: ${validationResult.errors.join(', ')}`);
            }

            // Add metadata
            const dataToSave = {
                ...calibrationData,
                userId,
                timestamp: new Date().toISOString(),
                version: '1.0',
                metadata: {
                    savedAt: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    platform: navigator.platform
                }
            };

            // Generate calibration ID
            const calibrationId = this._generateCalibrationId();
            dataToSave.id = calibrationId;

            // Save to Firebase
            await this.adapter.saveCalibration(userId, calibrationId, dataToSave);

            return {
                success: true,
                calibrationId,
                timestamp: dataToSave.timestamp
            };

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.saveCalibration', error);
            throw error;
        }
    }

    /**
     * Load the latest calibration for a user
     */
    async loadLatestCalibration(userId) {
        try {
            this._validateInitialized();

            const calibrationData = await this.adapter.loadLatestCalibration(userId);

            if (calibrationData) {
                // Validate loaded data
                const validationResult = this.validator.validateCalibrationData(calibrationData);
                if (!validationResult.isValid) {
                    console.warn('Loaded calibration data is invalid:', validationResult.errors);
                    return null;
                }

                return calibrationData;
            }

            return null;

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.loadLatestCalibration', error);
            throw error;
        }
    }

    /**
     * Load a specific calibration by ID
     */
    async loadCalibration(userId, calibrationId) {
        try {
            this._validateInitialized();

            const calibrationData = await this.adapter.loadCalibration(userId, calibrationId);

            if (calibrationData) {
                // Validate loaded data
                const validationResult = this.validator.validateCalibrationData(calibrationData);
                if (!validationResult.isValid) {
                    console.warn('Loaded calibration data is invalid:', validationResult.errors);
                    return null;
                }

                return calibrationData;
            }

            return null;

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.loadCalibration', error);
            throw error;
        }
    }

    /**
     * List all calibrations for a user
     */
    async listCalibrations(userId, limit = 10) {
        try {
            this._validateInitialized();

            const calibrations = await this.adapter.listCalibrations(userId, limit);

            // Return basic info only (no full calibration data)
            return calibrations.map(cal => ({
                id: cal.id,
                timestamp: cal.timestamp,
                type: cal.type || 'quad',
                accuracy: cal.validation?.accuracy || 'unknown',
                metadata: cal.metadata
            }));

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.listCalibrations', error);
            throw error;
        }
    }

    /**
     * Delete a calibration
     */
    async deleteCalibration(userId, calibrationId) {
        try {
            this._validateInitialized();

            await this.adapter.deleteCalibration(userId, calibrationId);

            return {
                success: true,
                calibrationId
            };

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.deleteCalibration', error);
            throw error;
        }
    }

    /**
     * Update calibration metadata (without changing core calibration data)
     */
    async updateCalibrationMetadata(userId, calibrationId, metadata) {
        try {
            this._validateInitialized();

            await this.adapter.updateCalibrationMetadata(userId, calibrationId, {
                ...metadata,
                updatedAt: new Date().toISOString()
            });

            return {
                success: true,
                calibrationId
            };

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.updateCalibrationMetadata', error);
            throw error;
        }
    }

    /**
     * Check if storage is available and user is authenticated
     */
    async checkAvailability() {
        try {
            const isAvailable = await this.adapter.checkConnection();
            const user = await this.adapter.getCurrentUser();

            return {
                isAvailable,
                isAuthenticated: !!user,
                user: user ? {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                } : null
            };

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.checkAvailability', error);
            return {
                isAvailable: false,
                isAuthenticated: false,
                user: null,
                error: error.message
            };
        }
    }

    /**
     * Get storage statistics for a user
     */
    async getStorageStats(userId) {
        try {
            this._validateInitialized();

            const stats = await this.adapter.getStorageStats(userId);

            return {
                totalCalibrations: stats.count || 0,
                lastCalibration: stats.lastTimestamp,
                storageUsed: stats.sizeBytes || 0,
                oldestCalibration: stats.oldestTimestamp
            };

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.getStorageStats', error);
            throw error;
        }
    }

    /**
     * Cleanup old calibrations (keep only the most recent N)
     */
    async cleanupOldCalibrations(userId, keepCount = 5) {
        try {
            this._validateInitialized();

            const result = await this.adapter.cleanupOldCalibrations(userId, keepCount);

            return {
                success: true,
                deletedCount: result.deletedCount,
                remainingCount: result.remainingCount
            };

        } catch (error) {
            this.errorHandler.logError('CalibrationStorage.cleanupOldCalibrations', error);
            throw error;
        }
    }

    // Private methods

    _validateInitialized() {
        if (!this.isInitialized) {
            throw new Error('CalibrationStorage not initialized. Call initialize() first.');
        }
    }

    _generateCalibrationId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `cal_${timestamp}_${random}`;
    }
}