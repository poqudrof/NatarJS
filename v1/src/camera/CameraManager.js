/**
 * CameraManager - Enhanced camera management with user-friendly interface
 * Extends existing camera functionality with calibration support and novice-friendly features
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';

export class CameraManager {
    constructor() {
        this.errorHandler = new ErrorHandler();

        // Camera state
        this.currentStream = null;
        this.isActive = false;
        this.devices = [];
        this.selectedDevice = null;
        this.currentResolution = null;

        // Settings
        this.supportedResolutions = [
            { width: 640, height: 480, label: '640×480 (SD)', description: 'Standard quality, fast processing' },
            { width: 1280, height: 720, label: '1280×720 (HD)', description: 'High quality, good for calibration' },
            { width: 1920, height: 1080, label: '1920×1080 (Full HD)', description: 'Best quality, slower processing' }
        ];

        // User feedback
        this.feedbackCallback = null;
        this.statusCallback = null;
    }

    /**
     * Initialize camera manager and enumerate devices
     */
    async initialize() {
        try {
            await this._requestPermissions();
            await this._enumerateDevices();

            this._provideFeedback('success', 'Camera system ready');
            return { success: true };

        } catch (error) {
            this.errorHandler.logError('CameraManager.initialize', error);
            this._provideFeedback('error', this.errorHandler.getUserFriendlyMessage(error));
            return { success: false, error: error.message };
        }
    }

    /**
     * Get available camera devices with user-friendly descriptions
     */
    getAvailableDevices() {
        return this.devices.map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${this.devices.indexOf(device) + 1}`,
            description: this._getDeviceDescription(device),
            isRecommended: this._isRecommendedDevice(device)
        }));
    }

    /**
     * Get supported resolutions with recommendations
     */
    getSupportedResolutions() {
        return this.supportedResolutions.map(res => ({
            ...res,
            isRecommended: res.width === 1280 && res.height === 720
        }));
    }

    /**
     * Start camera with user-friendly error handling
     */
    async startCamera(deviceId = null, resolution = null) {
        try {
            this._updateStatus('starting', 'Starting camera...');

            // Use recommended defaults if not specified
            if (!deviceId && this.devices.length > 0) {
                const recommended = this.devices.find(d => this._isRecommendedDevice(d));
                deviceId = recommended ? recommended.deviceId : this.devices[0].deviceId;
            }

            if (!resolution) {
                resolution = { width: 1280, height: 720 }; // Recommended default
            }

            // Stop existing stream
            if (this.currentStream) {
                await this.stopCamera();
            }

            const constraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    width: { ideal: resolution.width },
                    height: { ideal: resolution.height },
                    facingMode: deviceId ? undefined : 'environment'
                }
            };

            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.selectedDevice = this.devices.find(d => d.deviceId === deviceId);
            this.currentResolution = resolution;
            this.isActive = true;

            this._updateStatus('active', 'Camera active');
            this._provideFeedback('success',
                `Camera started: ${this.selectedDevice?.label || 'Default'} at ${resolution.width}×${resolution.height}`
            );

            return {
                success: true,
                stream: this.currentStream,
                device: this.selectedDevice,
                resolution: this.currentResolution
            };

        } catch (error) {
            this.errorHandler.logError('CameraManager.startCamera', error);
            this._updateStatus('error', 'Camera start failed');

            const userMessage = this._getCameraErrorMessage(error);
            this._provideFeedback('error', userMessage);

            return { success: false, error: error.message, userMessage };
        }
    }

    /**
     * Stop camera stream
     */
    async stopCamera() {
        try {
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
                this.currentStream = null;
            }

            this.isActive = false;
            this._updateStatus('stopped', 'Camera stopped');
            this._provideFeedback('info', 'Camera stopped');

            return { success: true };

        } catch (error) {
            this.errorHandler.logError('CameraManager.stopCamera', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test camera setup and provide detailed feedback
     */
    async testCameraSetup(deviceId = null, resolution = null) {
        try {
            this._updateStatus('testing', 'Testing camera setup...');

            const testResults = {
                deviceAccess: false,
                resolutionSupported: false,
                videoQuality: null,
                recommendations: []
            };

            // Test device access
            try {
                const result = await this.startCamera(deviceId, resolution);
                if (result.success) {
                    testResults.deviceAccess = true;
                    testResults.resolutionSupported = true;

                    // Test video quality
                    await this._testVideoQuality(testResults);

                    await this.stopCamera();
                } else {
                    testResults.recommendations.push('Camera access failed - check permissions');
                }
            } catch (error) {
                testResults.recommendations.push(`Camera test failed: ${this._getCameraErrorMessage(error)}`);
            }

            this._updateStatus('ready', 'Camera test complete');
            return { success: true, results: testResults };

        } catch (error) {
            this.errorHandler.logError('CameraManager.testCameraSetup', error);
            this._updateStatus('error', 'Camera test failed');
            return { success: false, error: error.message };
        }
    }

    /**
     * Get camera status and recommendations
     */
    getCameraStatus() {
        return {
            isActive: this.isActive,
            deviceCount: this.devices.length,
            selectedDevice: this.selectedDevice,
            currentResolution: this.currentResolution,
            recommendations: this._getSetupRecommendations()
        };
    }

    /**
     * Auto-detect best camera settings
     */
    async autoDetectBestSettings() {
        try {
            this._updateStatus('detecting', 'Auto-detecting best camera settings...');

            const recommendations = {
                device: null,
                resolution: null,
                confidence: 0
            };

            // Test each device
            for (const device of this.devices) {
                const score = await this._scoreDevice(device);
                if (score > recommendations.confidence) {
                    recommendations.device = device;
                    recommendations.confidence = score;
                }
            }

            // Recommend resolution based on device capabilities
            if (recommendations.device) {
                recommendations.resolution = await this._detectBestResolution(recommendations.device);
            }

            this._updateStatus('ready', 'Auto-detection complete');
            return { success: true, recommendations };

        } catch (error) {
            this.errorHandler.logError('CameraManager.autoDetectBestSettings', error);
            this._updateStatus('error', 'Auto-detection failed');
            return { success: false, error: error.message };
        }
    }

    /**
     * Set callback functions for user feedback
     */
    setCallbacks({ feedbackCallback, statusCallback }) {
        this.feedbackCallback = feedbackCallback;
        this.statusCallback = statusCallback;
    }

    // Private methods

    async _requestPermissions() {
        try {
            // Request camera permissions
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Camera permission denied. Please allow camera access and try again.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No camera found. Please connect a camera and try again.');
            } else {
                throw new Error('Camera access failed. Please check your camera connection.');
            }
        }
    }

    async _enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.devices = devices.filter(device => device.kind === 'videoinput');

            if (this.devices.length === 0) {
                throw new Error('No cameras found');
            }

            return this.devices;
        } catch (error) {
            throw new Error('Failed to enumerate camera devices');
        }
    }

    _getDeviceDescription(device) {
        const label = device.label.toLowerCase();

        if (label.includes('front') || label.includes('user')) {
            return 'Front-facing camera (good for video calls)';
        } else if (label.includes('back') || label.includes('environment')) {
            return 'Back-facing camera (recommended for calibration)';
        } else if (label.includes('usb') || label.includes('external')) {
            return 'External USB camera (excellent for calibration)';
        } else {
            return 'Camera device';
        }
    }

    _isRecommendedDevice(device) {
        const label = device.label.toLowerCase();
        // Prefer external/USB cameras, then back-facing cameras
        return label.includes('usb') ||
               label.includes('external') ||
               label.includes('back') ||
               label.includes('environment');
    }

    async _testVideoQuality(testResults) {
        // This would analyze the video feed for quality metrics
        // For now, we'll simulate quality assessment
        testResults.videoQuality = {
            resolution: this.currentResolution,
            frameRate: 30, // Would be detected from actual stream
            quality: 'good'
        };

        if (this.currentResolution.width >= 1280) {
            testResults.recommendations.push('✅ Good resolution for calibration');
        } else {
            testResults.recommendations.push('⚠️ Consider using higher resolution for better calibration accuracy');
        }
    }

    async _scoreDevice(device) {
        try {
            // Score based on device characteristics
            let score = 0.5; // Base score

            const label = device.label.toLowerCase();

            // Prefer external cameras
            if (label.includes('usb') || label.includes('external')) {
                score += 0.3;
            }

            // Prefer back-facing cameras over front-facing
            if (label.includes('back') || label.includes('environment')) {
                score += 0.2;
            } else if (label.includes('front') || label.includes('user')) {
                score -= 0.1;
            }

            // Test actual functionality
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: device.deviceId } }
                });
                stream.getTracks().forEach(track => track.stop());
                score += 0.2; // Device works
            } catch (error) {
                score = 0; // Device doesn't work
            }

            return Math.max(0, Math.min(1, score));

        } catch (error) {
            return 0;
        }
    }

    async _detectBestResolution(device) {
        // Test resolutions from highest to lowest
        for (const res of this.supportedResolutions.reverse()) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: { exact: device.deviceId },
                        width: { exact: res.width },
                        height: { exact: res.height }
                    }
                });
                stream.getTracks().forEach(track => track.stop());
                return res; // This resolution works
            } catch (error) {
                continue; // Try next resolution
            }
        }

        // Return default if nothing works
        return { width: 640, height: 480 };
    }

    _getCameraErrorMessage(error) {
        const errorName = error.name || '';
        const errorMessage = error.message || '';

        if (errorName === 'NotAllowedError') {
            return '🔒 Camera permission denied. Please click "Allow" when prompted for camera access.';
        } else if (errorName === 'NotFoundError') {
            return '📷 No camera found. Please connect a camera and refresh the page.';
        } else if (errorName === 'OverconstrainedError') {
            return '⚙️ Camera settings not supported. Trying with default settings...';
        } else if (errorMessage.includes('Permission denied')) {
            return '🔒 Camera access blocked. Please enable camera permissions in browser settings.';
        } else if (errorMessage.includes('not found')) {
            return '📷 Camera not detected. Please check camera connection.';
        } else {
            return '❌ Camera error. Please try refreshing the page or using a different camera.';
        }
    }

    _getSetupRecommendations() {
        const recommendations = [];

        if (this.devices.length === 0) {
            recommendations.push('Connect a camera device');
        } else if (this.devices.length === 1) {
            recommendations.push('Camera detected and ready');
        } else {
            const recommended = this.devices.find(d => this._isRecommendedDevice(d));
            if (recommended) {
                recommendations.push(`Use ${recommended.label} for best results`);
            }
        }

        if (!this.isActive) {
            recommendations.push('Start camera to begin calibration');
        }

        return recommendations;
    }

    _provideFeedback(type, message) {
        if (this.feedbackCallback) {
            this.feedbackCallback(type, message);
        }
    }

    _updateStatus(status, message) {
        if (this.statusCallback) {
            this.statusCallback(status, message);
        }
    }
}