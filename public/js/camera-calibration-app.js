/**
 * Camera Calibration App - Main application controller
 * User-friendly interface for novice users to calibrate their cameras
 */

import { CalibrationManager } from '../../src/calibration/core/CalibrationManager.js';
import { CameraCalibrator } from '../../src/calibration/core/CameraCalibrator.js';
import { CameraManager } from '../../src/camera/CameraManager.js';
import { FeedbackDisplay } from '../../src/calibration/ui/FeedbackDisplay.js';
import { firebaseConfig } from '../../config/firebase.config.js';

class CameraCalibrationApp {
    constructor() {
        // Core components
        this.calibrationManager = new CalibrationManager(firebaseConfig);
        this.cameraManager = new CameraManager();
        this.cameraCalibrator = null;
        this.feedbackDisplay = null;

        // UI state
        this.currentStep = 'auth';
        this.isSignedIn = false;
        this.currentUser = null;
        this.autoCaptureEnabled = false;
        this.autoCaptureInterval = null;

        // DOM elements
        this.elements = {};

        // Initialize app
        this.init();
    }

    async init() {
        try {
            this._initializeElements();
            this._setupEventListeners();
            this._setupCallbacks();

            // Initialize feedback display
            this.feedbackDisplay = new FeedbackDisplay('calibration-feedback');

            // Show welcome message
            this.feedbackDisplay.showFeedback('info',
                'Welcome to camera calibration! We\'ll guide you through each step.'
            );

            // Initialize core systems
            await this._initializeSystems();

            // Start with authentication
            this._showAuthSection();

        } catch (error) {
            console.error('App initialization failed:', error);
            this._showError('Failed to initialize the application. Please refresh the page.');
        }
    }

    // Initialization methods

    _initializeElements() {
        // Authentication elements
        this.elements.authSection = document.getElementById('auth-section');
        this.elements.signInButton = document.getElementById('google-signin-button');
        this.elements.signOutButton = document.getElementById('google-signout-button');
        this.elements.userName = document.getElementById('user-name');

        // Camera setup elements
        this.elements.cameraSetupSection = document.getElementById('camera-setup-section');
        this.elements.cameraSelect = document.getElementById('camera-select');
        this.elements.resolutionSelect = document.getElementById('resolution-select');
        this.elements.cameraDescription = document.getElementById('camera-description');
        this.elements.testCameraBtn = document.getElementById('test-camera-btn');
        this.elements.autoDetectBtn = document.getElementById('auto-detect-btn');
        this.elements.startCameraBtn = document.getElementById('start-camera-btn');
        this.elements.cameraStatus = document.getElementById('camera-status');
        this.elements.cameraStatusContent = document.getElementById('camera-status-content');

        // Calibration elements
        this.elements.calibrationSection = document.getElementById('calibration-section');
        this.elements.cameraVideo = document.getElementById('camera-video');
        this.elements.cameraCanvas = document.getElementById('camera-canvas');
        this.elements.captureBtn = document.getElementById('capture-btn');
        this.elements.autoCaptureBtn = document.getElementById('auto-capture-btn');
        this.elements.resetCalibrationBtn = document.getElementById('reset-calibration-btn');

        // Results elements
        this.elements.calibrationResults = document.getElementById('calibration-results');
        this.elements.resultsContent = document.getElementById('results-content');
        this.elements.saveCalibrationBtn = document.getElementById('save-calibration-btn');
        this.elements.testCalibrationBtn = document.getElementById('test-calibration-btn');
        this.elements.newCalibrationBtn = document.getElementById('new-calibration-btn');

        // Other elements
        this.elements.loadingOverlay = document.getElementById('loading-overlay');
        this.elements.downloadPatternBtn = document.getElementById('download-pattern-btn');
    }

    _setupEventListeners() {
        // Authentication
        this.elements.signInButton.addEventListener('click', () => this._signIn());
        this.elements.signOutButton.addEventListener('click', () => this._signOut());

        // Camera setup
        this.elements.cameraSelect.addEventListener('change', () => this._onCameraChange());
        this.elements.resolutionSelect.addEventListener('change', () => this._onResolutionChange());
        this.elements.testCameraBtn.addEventListener('click', () => this._testCamera());
        this.elements.autoDetectBtn.addEventListener('click', () => this._autoDetectSettings());
        this.elements.startCameraBtn.addEventListener('click', () => this._startCamera());

        // Calibration
        this.elements.captureBtn.addEventListener('click', () => this._captureImage());
        this.elements.autoCaptureBtn.addEventListener('click', () => this._toggleAutoCapture());
        this.elements.resetCalibrationBtn.addEventListener('click', () => this._resetCalibration());

        // Results
        this.elements.saveCalibrationBtn.addEventListener('click', () => this._saveCalibration());
        this.elements.testCalibrationBtn.addEventListener('click', () => this._testCalibration());
        this.elements.newCalibrationBtn.addEventListener('click', () => this._startNewCalibration());

        // Other
        this.elements.downloadPatternBtn.addEventListener('click', () => this._downloadPattern());
    }

    _setupCallbacks() {
        // Camera manager callbacks
        this.cameraManager.setCallbacks({
            feedbackCallback: (type, message) => {
                this.feedbackDisplay.showFeedback(type, message);
            },
            statusCallback: (status, message) => {
                this._updateCameraStatus(status, message);
            }
        });
    }

    async _initializeSystems() {
        try {
            this._showLoading('Initializing systems...');

            // Initialize calibration manager
            const calibrationResult = await this.calibrationManager.initialize();
            if (!calibrationResult.success) {
                throw new Error(calibrationResult.error);
            }

            // Initialize camera manager
            const cameraResult = await this.cameraManager.initialize();
            if (!cameraResult.success) {
                throw new Error(cameraResult.error);
            }

            // Populate camera devices
            await this._populateCameraDevices();

            this._hideLoading();

        } catch (error) {
            this._hideLoading();
            throw error;
        }
    }

    // Authentication methods

    async _signIn() {
        try {
            this._showLoading('Signing in...');

            // Import Firebase auth dynamically
            const { signInWithPopup, GoogleAuthProvider, getAuth } = await import('firebase/auth');
            const { initializeApp } = await import('firebase/app');

            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const provider = new GoogleAuthProvider();

            const result = await signInWithPopup(auth, provider);
            this.currentUser = result.user;
            this.isSignedIn = true;

            this._updateAuthUI();
            this._showCameraSetupSection();

            this.feedbackDisplay.showFeedback('success',
                `Welcome, ${this.currentUser.displayName}! Let's set up your camera.`
            );

            this._hideLoading();

        } catch (error) {
            this._hideLoading();
            this.feedbackDisplay.showFeedback('error',
                'Sign in failed. Please try again or continue without signing in.'
            );
        }
    }

    async _signOut() {
        try {
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();
            await auth.signOut();

            this.currentUser = null;
            this.isSignedIn = false;

            this._updateAuthUI();
            this._resetToAuth();

        } catch (error) {
            this.feedbackDisplay.showFeedback('error', 'Sign out failed');
        }
    }

    _updateAuthUI() {
        if (this.isSignedIn && this.currentUser) {
            this.elements.userName.textContent = `Welcome, ${this.currentUser.displayName}`;
            this.elements.signInButton.style.display = 'none';
            this.elements.signOutButton.style.display = 'inline-flex';
        } else {
            this.elements.userName.textContent = '';
            this.elements.signInButton.style.display = 'inline-flex';
            this.elements.signOutButton.style.display = 'none';
        }
    }

    // Camera setup methods

    async _populateCameraDevices() {
        try {
            const devices = this.cameraManager.getAvailableDevices();

            this.elements.cameraSelect.innerHTML = '';

            if (devices.length === 0) {
                this.elements.cameraSelect.innerHTML = '<option value="">No cameras found</option>';
                return;
            }

            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label;
                if (device.isRecommended) {
                    option.textContent += ' (Recommended)';
                }
                this.elements.cameraSelect.appendChild(option);
            });

            // Select recommended device by default
            const recommended = devices.find(d => d.isRecommended);
            if (recommended) {
                this.elements.cameraSelect.value = recommended.deviceId;
                this._onCameraChange();
            }

        } catch (error) {
            this.feedbackDisplay.showFeedback('error', 'Failed to detect cameras');
        }
    }

    _onCameraChange() {
        const selectedDeviceId = this.elements.cameraSelect.value;
        const devices = this.cameraManager.getAvailableDevices();
        const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);

        if (selectedDevice) {
            this.elements.cameraDescription.textContent = selectedDevice.description;
        }
    }

    _onResolutionChange() {
        const resolution = this.elements.resolutionSelect.value;
        const [width, height] = resolution.split('x').map(Number);

        // Provide guidance based on resolution choice
        if (width >= 1920) {
            this.elements.resolutionSelect.parentNode.querySelector('.input-description').textContent =
                'Best quality - Perfect for precision calibration but slower processing';
        } else if (width >= 1280) {
            this.elements.resolutionSelect.parentNode.querySelector('.input-description').textContent =
                'High quality - Recommended balance of quality and speed';
        } else {
            this.elements.resolutionSelect.parentNode.querySelector('.input-description').textContent =
                'Standard quality - Faster processing but lower accuracy';
        }
    }

    async _testCamera() {
        try {
            this._showLoading('Testing camera...');

            const deviceId = this.elements.cameraSelect.value;
            const resolution = this._getSelectedResolution();

            const result = await this.cameraManager.testCameraSetup(deviceId, resolution);

            if (result.success) {
                this._showCameraTestResults(result.results);
                this.feedbackDisplay.showFeedback('success', 'Camera test completed successfully!');
            } else {
                this.feedbackDisplay.showFeedback('error', `Camera test failed: ${result.error}`);
            }

            this._hideLoading();

        } catch (error) {
            this._hideLoading();
            this.feedbackDisplay.showFeedback('error', 'Camera test failed');
        }
    }

    async _autoDetectSettings() {
        try {
            this._showLoading('Detecting best camera settings...');

            const result = await this.cameraManager.autoDetectBestSettings();

            if (result.success && result.recommendations.device) {
                // Apply recommendations
                this.elements.cameraSelect.value = result.recommendations.device.deviceId;

                if (result.recommendations.resolution) {
                    const resValue = `${result.recommendations.resolution.width}x${result.recommendations.resolution.height}`;
                    this.elements.resolutionSelect.value = resValue;
                }

                this._onCameraChange();
                this._onResolutionChange();

                this.feedbackDisplay.showFeedback('success',
                    `Best settings detected: ${result.recommendations.device.label}`
                );
            } else {
                this.feedbackDisplay.showFeedback('warning',
                    'Auto-detection completed. Please verify the selected settings.'
                );
            }

            this._hideLoading();

        } catch (error) {
            this._hideLoading();
            this.feedbackDisplay.showFeedback('error', 'Auto-detection failed');
        }
    }

    async _startCamera() {
        try {
            this._showLoading('Starting camera...');

            const deviceId = this.elements.cameraSelect.value;
            const resolution = this._getSelectedResolution();

            const result = await this.cameraManager.startCamera(deviceId, resolution);

            if (result.success) {
                // Set up video stream
                this.elements.cameraVideo.srcObject = result.stream;

                // Initialize camera calibrator
                this.cameraCalibrator = new CameraCalibrator(
                    this.elements.cameraVideo,
                    this.elements.cameraCanvas,
                    (type, message, progress) => this._onCalibrationFeedback(type, message, progress)
                );

                await this.cameraCalibrator.initialize({
                    width: resolution.width,
                    height: resolution.height,
                    deviceId: deviceId
                });

                // Show calibration section
                this._showCalibrationSection();

                this.feedbackDisplay.showInstructions(1, 'Camera Ready!',
                    'Your camera is now active. We\'ll help you capture calibration images step by step.',
                    [
                        'Make sure you have a printed checkerboard pattern ready',
                        'Good lighting is important for accurate detection',
                        'We need 10-20 images from different angles and distances'
                    ]
                );

                // Enable calibration controls
                this._enableCalibrationControls();

            } else {
                this.feedbackDisplay.showFeedback('error', result.userMessage || result.error);
            }

            this._hideLoading();

        } catch (error) {
            this._hideLoading();
            this.feedbackDisplay.showFeedback('error', 'Failed to start camera');
        }
    }

    // Calibration methods

    async _captureImage() {
        if (!this.cameraCalibrator) {
            this.feedbackDisplay.showFeedback('error', 'Camera calibrator not initialized');
            return;
        }

        const result = await this.cameraCalibrator.captureCalibrationImage();

        if (result.success) {
            const status = this.cameraCalibrator.getCalibrationStatus();

            // Update capture counter
            this.feedbackDisplay.updateCaptureCounter(
                status.capturedImages,
                status.requiredImages
            );

            // Show encouragement based on progress
            if (status.capturedImages === 1) {
                this.feedbackDisplay.showEncouragement('first_capture');
            } else if (status.capturedImages === Math.floor(status.requiredImages / 2)) {
                this.feedbackDisplay.showEncouragement('halfway');
            } else if (status.capturedImages >= status.requiredImages - 2) {
                this.feedbackDisplay.showEncouragement('almost_done');
            }

            // Auto-start calibration processing if enough images
            if (status.capturedImages >= status.requiredImages) {
                setTimeout(() => this._processCalibration(), 2000);
            }

        } else {
            // Provide specific guidance based on failure reason
            this._provideCapturingGuidance(result.reason);
        }
    }

    _toggleAutoCapture() {
        if (this.autoCaptureEnabled) {
            // Stop auto capture
            this._stopAutoCapture();
        } else {
            // Start auto capture
            this._startAutoCapture();
        }
    }

    _startAutoCapture() {
        this.autoCaptureEnabled = true;
        this.elements.autoCaptureBtn.textContent = '🛑 Stop Auto Capture';
        this.elements.autoCaptureBtn.classList.add('btn-secondary');
        this.elements.autoCaptureBtn.classList.remove('btn-outline');

        this.feedbackDisplay.showFeedback('info',
            '🤖 Auto capture started! Move the pattern around - I\'ll capture good images automatically.'
        );

        // Start auto capture loop
        this.autoCaptureInterval = setInterval(() => {
            if (this.cameraCalibrator) {
                const feedback = this.cameraCalibrator.getPositioningFeedback();
                if (feedback && feedback.patternVisible && feedback.quality.isGood) {
                    // Only auto-capture if pattern is in a good position
                    const status = this.cameraCalibrator.getCalibrationStatus();
                    if (status.capturedImages < status.requiredImages) {
                        this._captureImage();
                    } else {
                        this._stopAutoCapture();
                    }
                }
            }
        }, 3000); // Try to capture every 3 seconds
    }

    _stopAutoCapture() {
        this.autoCaptureEnabled = false;
        this.elements.autoCaptureBtn.textContent = '🤖 Auto Capture';
        this.elements.autoCaptureBtn.classList.remove('btn-secondary');
        this.elements.autoCaptureBtn.classList.add('btn-outline');

        if (this.autoCaptureInterval) {
            clearInterval(this.autoCaptureInterval);
            this.autoCaptureInterval = null;
        }

        this.feedbackDisplay.showFeedback('info', 'Auto capture stopped');
    }

    async _processCalibration() {
        try {
            this._showLoading('Processing calibration data...');

            if (!this.cameraCalibrator) {
                throw new Error('Camera calibrator not initialized');
            }

            const result = await this.cameraCalibrator.startCalibration();

            if (result.success) {
                this._showCalibrationResults(result.calibrationData);
                this.feedbackDisplay.showEncouragement('completed');
            } else {
                this.feedbackDisplay.showFeedback('error',
                    `Calibration failed: ${result.error}`
                );
            }

            this._hideLoading();

        } catch (error) {
            this._hideLoading();
            this.feedbackDisplay.showFeedback('error', 'Calibration processing failed');
        }
    }

    _resetCalibration() {
        if (this.cameraCalibrator) {
            this.cameraCalibrator.stopCalibration();
        }

        this._stopAutoCapture();
        this.elements.calibrationResults.style.display = 'none';
        this.feedbackDisplay.clearFeedback();
        this.feedbackDisplay.updateCaptureCounter(0, 10);

        this.feedbackDisplay.showFeedback('info',
            'Calibration reset. You can start capturing images again.'
        );
    }

    // Results methods

    async _saveCalibration() {
        if (!this.isSignedIn) {
            this.feedbackDisplay.showFeedback('warning',
                'Please sign in to save your calibration data'
            );
            return;
        }

        try {
            this._showLoading('Saving calibration...');

            const calibrationData = this.cameraCalibrator.getCalibrationData();
            const result = await this.calibrationManager.saveCalibration(this.currentUser.uid);

            if (result.success) {
                this.feedbackDisplay.showFeedback('success',
                    '💾 Calibration saved successfully! You can use it in other applications.'
                );
            } else {
                this.feedbackDisplay.showFeedback('error',
                    `Failed to save calibration: ${result.error}`
                );
            }

            this._hideLoading();

        } catch (error) {
            this._hideLoading();
            this.feedbackDisplay.showFeedback('error', 'Failed to save calibration');
        }
    }

    _testCalibration() {
        // Show test interface (future implementation)
        this.feedbackDisplay.showFeedback('info',
            'Calibration testing interface coming soon!'
        );
    }

    _startNewCalibration() {
        this._resetCalibration();

        if (this.cameraCalibrator) {
            this.cameraCalibrator.initialize();
        }

        this.feedbackDisplay.showFeedback('info',
            'Ready for new calibration! Position your checkerboard pattern and start capturing.'
        );
    }

    // UI helper methods

    _showAuthSection() {
        this.currentStep = 'auth';
        this.elements.authSection.style.display = 'block';
        this.elements.cameraSetupSection.style.display = 'none';
        this.elements.calibrationSection.style.display = 'none';
    }

    _showCameraSetupSection() {
        this.currentStep = 'camera-setup';
        this.elements.authSection.style.display = 'none';
        this.elements.cameraSetupSection.style.display = 'block';
        this.elements.calibrationSection.style.display = 'none';
    }

    _showCalibrationSection() {
        this.currentStep = 'calibration';
        this.elements.authSection.style.display = 'none';
        this.elements.cameraSetupSection.style.display = 'none';
        this.elements.calibrationSection.style.display = 'block';

        // Start real-time feedback
        this._startRealTimeFeedback();
    }

    _resetToAuth() {
        this._stopAutoCapture();

        if (this.cameraManager.isActive) {
            this.cameraManager.stopCamera();
        }

        this._showAuthSection();
    }

    _showLoading(message = 'Loading...') {
        this.elements.loadingOverlay.style.display = 'flex';
        this.elements.loadingOverlay.querySelector('.loading-text').textContent = message;
    }

    _hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
    }

    _showError(message) {
        this.feedbackDisplay.showFeedback('error', message);
    }

    _getSelectedResolution() {
        const value = this.elements.resolutionSelect.value;
        const [width, height] = value.split('x').map(Number);
        return { width, height };
    }

    _updateCameraStatus(status, message) {
        this.elements.cameraStatus.style.display = 'block';
        this.elements.cameraStatusContent.innerHTML = `
            <div class="status-item">
                <strong>Status:</strong> ${status}
            </div>
            <div class="status-item">
                <strong>Message:</strong> ${message}
            </div>
        `;
    }

    _showCameraTestResults(results) {
        let html = '<h4>Camera Test Results</h4>';
        html += `<p><strong>Device Access:</strong> ${results.deviceAccess ? '✅ Success' : '❌ Failed'}</p>`;
        html += `<p><strong>Resolution Supported:</strong> ${results.resolutionSupported ? '✅ Yes' : '❌ No'}</p>`;

        if (results.recommendations.length > 0) {
            html += '<h5>Recommendations:</h5><ul>';
            results.recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul>';
        }

        this.elements.cameraStatusContent.innerHTML = html;
    }

    _enableCalibrationControls() {
        this.elements.captureBtn.disabled = false;
        this.elements.autoCaptureBtn.disabled = false;
    }

    _showCalibrationResults(calibrationData) {
        this.elements.calibrationResults.style.display = 'block';

        const quality = calibrationData.quality;
        let qualityText = quality.overall;
        let qualityIcon = '✅';

        if (quality.overall === 'excellent') {
            qualityIcon = '🌟';
        } else if (quality.overall === 'good') {
            qualityIcon = '✅';
        } else if (quality.overall === 'fair') {
            qualityIcon = '⚠️';
        } else {
            qualityIcon = '❌';
        }

        this.elements.resultsContent.innerHTML = `
            <div class="result-summary">
                <div class="result-item">
                    <span class="result-label">Quality:</span>
                    <span class="result-value">${qualityIcon} ${qualityText}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Reprojection Error:</span>
                    <span class="result-value">${calibrationData.calibrationError.toFixed(2)} pixels</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Images Used:</span>
                    <span class="result-value">${calibrationData.capturedImages}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Resolution:</span>
                    <span class="result-value">${calibrationData.resolution.width}×${calibrationData.resolution.height}</span>
                </div>
            </div>
        `;
    }

    _startRealTimeFeedback() {
        // Start providing real-time feedback during calibration
        const feedbackInterval = setInterval(() => {
            if (this.currentStep !== 'calibration' || !this.cameraCalibrator) {
                clearInterval(feedbackInterval);
                return;
            }

            const feedback = this.cameraCalibrator.getPositioningFeedback();
            if (feedback) {
                // Update quality indicators
                this.feedbackDisplay.showQualityFeedback({
                    brightness: feedback.quality.scores.brightness >= 50 && feedback.quality.scores.brightness <= 200 ? 'good' : 'warning',
                    contrast: feedback.quality.scores.contrast >= 30 ? 'good' : 'warning',
                    sharpness: feedback.quality.scores.sharpness >= 0.1 ? 'good' : 'warning',
                    pattern: feedback.patternVisible ? 'good' : 'poor'
                });

                // Show recommendations
                if (feedback.recommendations.length > 0) {
                    const recommendation = feedback.recommendations[0];
                    this.feedbackDisplay.showFeedback('info', recommendation, 3000);
                }
            }
        }, 2000);
    }

    _provideCapturingGuidance(reason) {
        const guidanceMessages = {
            'Pattern not detected': '🔍 Make sure the entire checkerboard pattern is visible and well-lit',
            'Image too dark': '💡 Increase lighting or move to a brighter area',
            'Image too bright': '🔆 Reduce lighting or move away from bright light sources',
            'Image blurry': '🎯 Hold the camera steady and ensure the pattern is in focus',
            'Low contrast': '📊 Ensure good contrast between black and white squares'
        };

        const message = guidanceMessages[reason] || '❓ Try adjusting the pattern position and lighting';
        this.feedbackDisplay.showFeedback('info', message);
    }

    _onCalibrationFeedback(type, message, progress) {
        if (progress !== undefined) {
            // This is a progress update
            this.feedbackDisplay.showProgress(
                Math.round(progress * 5), 5, message, progress * 100
            );
        } else {
            // This is regular feedback
            this.feedbackDisplay.showFeedback(type, message);
        }
    }

    _downloadPattern() {
        // Generate and download calibration pattern
        this.feedbackDisplay.showFeedback('info',
            'Pattern download coming soon! For now, you can print any standard 9×6 checkerboard pattern.'
        );
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for OpenCV to load
    function initializeApp() {
        if (typeof cv !== 'undefined') {
            new CameraCalibrationApp();
        } else {
            setTimeout(initializeApp, 100);
        }
    }

    initializeApp();
});