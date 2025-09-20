/**
 * CalibrationManager - Main orchestrator for camera/projector calibration workflow
 * Coordinates all calibration components and manages the overall process
 */

import { CalibrationStorage } from '../storage/CalibrationStorage.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';

export class CalibrationManager {
    constructor(firebaseConfig) {
        this.storage = new CalibrationStorage(firebaseConfig);
        this.errorHandler = new ErrorHandler();

        // Calibration state
        this.cameraCalibration = null;
        this.projectorCalibration = null;
        this.quadCalibration = null;
        this.isCalibrated = false;
        this.calibrationId = null;

        // Component references
        this.cameraCalibrator = null;
        this.projectorCalibrator = null;
        this.quadCalibrator = null;

        // Status tracking
        this.currentStep = 0;
        this.totalSteps = 5;
        this.status = 'initialized';
        this.lastError = null;

        // Event callbacks
        this.onStatusChange = null;
        this.onProgress = null;
        this.onError = null;
        this.onComplete = null;
    }

    /**
     * Initialize the calibration manager
     * Sets up storage, validates dependencies, and prepares for calibration
     */
    async initialize() {
        try {
            this.status = 'initializing';
            this._notifyStatusChange();

            // Initialize storage connection
            await this.storage.initialize();

            // Validate OpenCV.js availability
            if (typeof cv === 'undefined') {
                throw new Error('OpenCV.js not loaded. Please ensure opencv.js is included.');
            }

            // Check for required browser APIs
            this._validateBrowserAPIs();

            this.status = 'ready';
            this._notifyStatusChange();

            return {
                success: true,
                message: 'CalibrationManager initialized successfully'
            };

        } catch (error) {
            this.lastError = error;
            this.status = 'error';
            this._notifyError(error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load existing calibration for a user
     */
    async loadCalibration(userId) {
        try {
            this.status = 'loading';
            this._notifyStatusChange();

            const calibrationData = await this.storage.loadLatestCalibration(userId);

            if (calibrationData) {
                this.cameraCalibration = calibrationData.camera;
                this.projectorCalibration = calibrationData.projector;
                this.quadCalibration = calibrationData.quad;
                this.calibrationId = calibrationData.id;
                this.isCalibrated = this._validateCalibrationData(calibrationData);

                this.status = this.isCalibrated ? 'calibrated' : 'invalid';
                this._notifyStatusChange();

                return {
                    success: true,
                    calibrationData,
                    isValid: this.isCalibrated
                };
            } else {
                this.status = 'no-calibration';
                this._notifyStatusChange();

                return {
                    success: true,
                    calibrationData: null,
                    isValid: false
                };
            }
        } catch (error) {
            this.lastError = error;
            this.status = 'error';
            this._notifyError(error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start the full calibration workflow
     */
    async performFullCalibration(mode = 'quad') {
        try {
            this.status = 'calibrating';
            this.currentStep = 0;
            this._notifyStatusChange();
            this._notifyProgress();

            // Reset calibration data
            this._resetCalibrationData();

            // Step 1: Camera setup and validation
            await this._stepCameraSetup();

            // Step 2: Projector setup and validation
            await this._stepProjectorSetup();

            // Step 3: Calibration mode execution
            if (mode === 'quad') {
                await this._stepQuadCalibration();
            } else {
                await this._stepFullGeometricCalibration();
            }

            // Step 4: Validation and testing
            await this._stepValidation();

            // Step 5: Save calibration
            await this._stepSaveCalibration();

            this.isCalibrated = true;
            this.status = 'completed';
            this._notifyComplete();

            return {
                success: true,
                calibrationData: this._getCalibrationData()
            };

        } catch (error) {
            this.lastError = error;
            this.status = 'error';
            this._notifyError(error);
            return {
                success: false,
                error: error.message,
                step: this.currentStep
            };
        }
    }

    /**
     * Save current calibration data
     */
    async saveCalibration(userId) {
        try {
            if (!this.isCalibrated) {
                throw new Error('No valid calibration data to save');
            }

            const calibrationData = this._getCalibrationData();
            const result = await this.storage.saveCalibration(userId, calibrationData);

            this.calibrationId = result.calibrationId;

            return {
                success: true,
                calibrationId: this.calibrationId
            };

        } catch (error) {
            this.lastError = error;
            this._notifyError(error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get current calibration status
     */
    getStatus() {
        return {
            status: this.status,
            isCalibrated: this.isCalibrated,
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            lastError: this.lastError,
            calibrationId: this.calibrationId
        };
    }

    /**
     * Get calibration data for external use
     */
    getCalibrationData() {
        if (!this.isCalibrated) {
            return null;
        }

        return this._getCalibrationData();
    }

    /**
     * Set event callbacks
     */
    setCallbacks({ onStatusChange, onProgress, onError, onComplete }) {
        this.onStatusChange = onStatusChange;
        this.onProgress = onProgress;
        this.onError = onError;
        this.onComplete = onComplete;
    }

    /**
     * Register calibration components
     */
    registerComponents({ cameraCalibrator, projectorCalibrator, quadCalibrator }) {
        this.cameraCalibrator = cameraCalibrator;
        this.projectorCalibrator = projectorCalibrator;
        this.quadCalibrator = quadCalibrator;
    }

    // Private methods

    _validateBrowserAPIs() {
        const requiredAPIs = [
            'navigator.mediaDevices',
            'navigator.mediaDevices.getUserMedia',
            'window.requestAnimationFrame'
        ];

        for (const api of requiredAPIs) {
            const parts = api.split('.');
            let obj = window;

            for (const part of parts) {
                if (!obj[part]) {
                    throw new Error(`Required browser API not available: ${api}`);
                }
                obj = obj[part];
            }
        }
    }

    _validateCalibrationData(data) {
        try {
            // Check required fields
            if (!data.camera || !data.projector) {
                return false;
            }

            // Validate camera data
            if (!data.camera.intrinsicMatrix || !data.camera.resolution) {
                return false;
            }

            // Validate projector data
            if (!data.projector.resolution) {
                return false;
            }

            // Validate quad data if present
            if (data.quad && (!data.quad.corners || data.quad.corners.length !== 4)) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    _resetCalibrationData() {
        this.cameraCalibration = null;
        this.projectorCalibration = null;
        this.quadCalibration = null;
        this.isCalibrated = false;
        this.calibrationId = null;
    }

    _getCalibrationData() {
        return {
            id: this.calibrationId,
            timestamp: new Date().toISOString(),
            camera: this.cameraCalibration,
            projector: this.projectorCalibration,
            quad: this.quadCalibration,
            validation: {
                isValid: this.isCalibrated,
                validatedAt: new Date().toISOString()
            }
        };
    }

    // Calibration workflow steps (to be implemented with actual calibrators)

    async _stepCameraSetup() {
        this.currentStep = 1;
        this._notifyProgress();

        if (!this.cameraCalibrator) {
            throw new Error('CameraCalibrator not registered');
        }

        // Camera setup will be implemented in Step 2
        this.cameraCalibration = { placeholder: true };
    }

    async _stepProjectorSetup() {
        this.currentStep = 2;
        this._notifyProgress();

        if (!this.projectorCalibrator) {
            throw new Error('ProjectorCalibrator not registered');
        }

        // Projector setup will be implemented in Step 3
        this.projectorCalibration = { placeholder: true };
    }

    async _stepQuadCalibration() {
        this.currentStep = 3;
        this._notifyProgress();

        if (!this.quadCalibrator) {
            throw new Error('QuadCalibrator not registered');
        }

        // Quad calibration will be implemented in Step 4
        this.quadCalibration = { placeholder: true };
    }

    async _stepFullGeometricCalibration() {
        this.currentStep = 3;
        this._notifyProgress();

        // Full geometric calibration (future implementation)
        throw new Error('Full geometric calibration not yet implemented');
    }

    async _stepValidation() {
        this.currentStep = 4;
        this._notifyProgress();

        // Validation logic will be implemented later
        return true;
    }

    async _stepSaveCalibration() {
        this.currentStep = 5;
        this._notifyProgress();

        // Save logic already implemented in saveCalibration method
        return true;
    }

    // Event notification methods

    _notifyStatusChange() {
        if (this.onStatusChange) {
            this.onStatusChange(this.getStatus());
        }
    }

    _notifyProgress() {
        if (this.onProgress) {
            this.onProgress({
                currentStep: this.currentStep,
                totalSteps: this.totalSteps,
                progress: (this.currentStep / this.totalSteps) * 100
            });
        }
    }

    _notifyError(error) {
        if (this.onError) {
            this.onError(error);
        }
    }

    _notifyComplete() {
        if (this.onComplete) {
            this.onComplete(this.getCalibrationData());
        }
    }
}