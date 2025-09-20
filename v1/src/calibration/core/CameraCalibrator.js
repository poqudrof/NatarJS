/**
 * CameraCalibrator - Handle camera intrinsic calibration with user-friendly interface
 * Designed for novice users with step-by-step guidance and real-time feedback
 */

import { ErrorHandler } from '../../utils/ErrorHandler.js';
import { ValidationUtils } from '../../utils/ValidationUtils.js';

export class CameraCalibrator {
    constructor(videoElement, canvasElement, feedbackCallback = null) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.feedbackCallback = feedbackCallback;
        this.errorHandler = new ErrorHandler();

        // Calibration state
        this.isCalibrating = false;
        this.isInitialized = false;
        this.currentStep = 0;
        this.totalSteps = 5;

        // Camera parameters
        this.cameraWidth = 640;
        this.cameraHeight = 480;
        this.deviceId = null;
        this.stream = null;

        // Calibration data
        this.capturedImages = [];
        this.calibrationPoints = [];
        this.intrinsicMatrix = null;
        this.distortionCoefficients = null;
        this.calibrationError = null;

        // Pattern detection settings
        this.patternSize = { width: 9, height: 6 }; // Checkerboard inner corners
        this.squareSize = 25; // mm
        this.minCapturedImages = 10;
        this.maxCapturedImages = 20;

        // Quality thresholds for novice users
        this.qualityThresholds = {
            minBrightness: 50,
            maxBrightness: 200,
            minContrast: 30,
            minSharpness: 0.1,
            maxReprojectionError: 1.0
        };

        // User guidance state
        this.lastFeedback = null;
        this.feedbackHistory = [];
        this.autoProgressEnabled = true;
    }

    /**
     * Initialize camera calibrator with user-friendly setup
     */
    async initialize(cameraConfig = {}) {
        try {
            this._updateProgress(0, 'Initializing camera calibration...');

            // Set camera parameters
            this.cameraWidth = cameraConfig.width || 1280;
            this.cameraHeight = cameraConfig.height || 720;
            this.deviceId = cameraConfig.deviceId || null;

            // Validate browser capabilities
            await this._validateBrowserSupport();

            // Initialize OpenCV if not already loaded
            await this._initializeOpenCV();

            this.isInitialized = true;
            this._updateProgress(1, 'Camera calibration ready');

            return {
                success: true,
                message: 'Camera calibrator initialized successfully'
            };

        } catch (error) {
            this.errorHandler.logError('CameraCalibrator.initialize', error);
            this._provideFeedback('error', this.errorHandler.getUserFriendlyMessage(error));
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Start the camera calibration process with guided workflow
     */
    async startCalibration() {
        try {
            if (!this.isInitialized) {
                throw new Error('Camera calibrator not initialized');
            }

            this.isCalibrating = true;
            this.currentStep = 1;
            this.capturedImages = [];
            this.calibrationPoints = [];

            this._updateProgress(1, 'Starting camera calibration...');

            // Step 1: Setup camera
            await this._setupCamera();

            // Step 2: Guide user through pattern capture
            await this._guidedPatternCapture();

            // Step 3: Process calibration
            await this._processCalibration();

            // Step 4: Validate results
            await this._validateCalibration();

            // Step 5: Complete
            this._completeCalibration();

            return {
                success: true,
                calibrationData: this.getCalibrationData()
            };

        } catch (error) {
            this.isCalibrating = false;
            this.errorHandler.logError('CameraCalibrator.startCalibration', error);
            this._provideFeedback('error', this.errorHandler.getUserFriendlyMessage(error));
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Capture a single calibration image with quality validation
     */
    async captureCalibrationImage() {
        try {
            if (!this.isCalibrating) {
                throw new Error('Calibration not started');
            }

            // Capture current frame
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

            // Convert to OpenCV format
            const mat = cv.matFromImageData(imageData);
            const gray = new cv.Mat();
            cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

            // Check image quality first
            const qualityCheck = this._assessImageQuality(gray);
            if (!qualityCheck.isGood) {
                this._provideFeedback('warning', qualityCheck.message);
                mat.delete();
                gray.delete();
                return { success: false, reason: qualityCheck.message };
            }

            // Detect checkerboard pattern
            const corners = new cv.Mat();
            const patternFound = cv.findChessboardCorners(
                gray,
                new cv.Size(this.patternSize.width, this.patternSize.height),
                corners,
                cv.CALIB_CB_ADAPTIVE_THRESH | cv.CALIB_CB_NORMALIZE_IMAGE
            );

            if (patternFound) {
                // Refine corner positions for better accuracy
                const criteria = new cv.TermCriteria(
                    cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_MAX_ITER,
                    30,
                    0.1
                );
                cv.cornerSubPix(gray, corners, new cv.Size(11, 11), new cv.Size(-1, -1), criteria);

                // Store calibration data
                this.capturedImages.push({
                    imageData: imageData,
                    corners: this._matToArray(corners),
                    timestamp: Date.now(),
                    quality: qualityCheck.scores
                });

                // Visual feedback - draw detected corners
                this._drawDetectedPattern(corners);

                const progress = this.capturedImages.length / this.minCapturedImages;
                const remaining = Math.max(0, this.minCapturedImages - this.capturedImages.length);

                this._provideFeedback('success',
                    `✅ Pattern detected! Captured ${this.capturedImages.length}/${this.minCapturedImages} images. ${remaining > 0 ? `${remaining} more needed.` : 'Ready to calibrate!'}`
                );

                // Auto-progress if enough images captured
                if (this.capturedImages.length >= this.minCapturedImages && this.autoProgressEnabled) {
                    setTimeout(() => this._processCalibration(), 2000);
                }

                corners.delete();
                mat.delete();
                gray.delete();

                return { success: true, captured: this.capturedImages.length };

            } else {
                this._provideFeedback('info',
                    '❌ No checkerboard pattern detected. Make sure the pattern is fully visible and well-lit.'
                );

                corners.delete();
                mat.delete();
                gray.delete();

                return { success: false, reason: 'Pattern not detected' };
            }

        } catch (error) {
            this.errorHandler.logError('CameraCalibrator.captureCalibrationImage', error);
            this._provideFeedback('error', 'Failed to capture calibration image');
            return { success: false, error: error.message };
        }
    }

    /**
     * Get real-time feedback for pattern positioning
     */
    getPositioningFeedback() {
        try {
            if (!this.video || !this.canvas) {
                return null;
            }

            // Capture current frame for analysis
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

            const mat = cv.matFromImageData(imageData);
            const gray = new cv.Mat();
            cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

            // Check image quality
            const qualityCheck = this._assessImageQuality(gray);

            // Try to detect pattern
            const corners = new cv.Mat();
            const patternFound = cv.findChessboardCorners(
                gray,
                new cv.Size(this.patternSize.width, this.patternSize.height),
                corners,
                cv.CALIB_CB_ADAPTIVE_THRESH | cv.CALIB_CB_NORMALIZE_IMAGE
            );

            let feedback = {
                quality: qualityCheck,
                patternVisible: patternFound,
                recommendations: []
            };

            // Generate recommendations for novice users
            if (!qualityCheck.isGood) {
                if (qualityCheck.scores.brightness < this.qualityThresholds.minBrightness) {
                    feedback.recommendations.push('💡 Increase lighting - the image is too dark');
                }
                if (qualityCheck.scores.brightness > this.qualityThresholds.maxBrightness) {
                    feedback.recommendations.push('🔆 Reduce lighting - the image is too bright');
                }
                if (qualityCheck.scores.contrast < this.qualityThresholds.minContrast) {
                    feedback.recommendations.push('📊 Improve contrast - ensure good lighting difference between black and white squares');
                }
                if (qualityCheck.scores.sharpness < this.qualityThresholds.minSharpness) {
                    feedback.recommendations.push('🎯 Hold the camera steady and ensure the pattern is in focus');
                }
            }

            if (!patternFound) {
                feedback.recommendations.push('📐 Make sure the entire checkerboard pattern is visible in the camera');
                feedback.recommendations.push('📏 Hold the pattern flat and parallel to the camera');
                feedback.recommendations.push('🎯 Ensure the pattern is clearly visible with good contrast');
            } else {
                // Pattern found - provide positioning guidance
                const cornerArray = this._matToArray(corners);
                const patternInfo = this._analyzePatternPosition(cornerArray);

                if (patternInfo.tooClose) {
                    feedback.recommendations.push('↔️ Move the pattern further away from the camera');
                } else if (patternInfo.tooFar) {
                    feedback.recommendations.push('↔️ Move the pattern closer to the camera');
                }

                if (patternInfo.needsRotation) {
                    feedback.recommendations.push('🔄 Try capturing the pattern from different angles');
                }

                if (patternInfo.isGoodPosition) {
                    feedback.recommendations.push('✅ Perfect! Press capture when ready');
                }
            }

            corners.delete();
            mat.delete();
            gray.delete();

            return feedback;

        } catch (error) {
            this.errorHandler.logError('CameraCalibrator.getPositioningFeedback', error);
            return null;
        }
    }

    /**
     * Get calibration progress and status
     */
    getCalibrationStatus() {
        return {
            isCalibrating: this.isCalibrating,
            currentStep: this.currentStep,
            totalSteps: this.totalSteps,
            capturedImages: this.capturedImages.length,
            requiredImages: this.minCapturedImages,
            progress: this.capturedImages.length / this.minCapturedImages,
            isComplete: this.intrinsicMatrix !== null,
            lastFeedback: this.lastFeedback,
            calibrationError: this.calibrationError
        };
    }

    /**
     * Get calibration results
     */
    getCalibrationData() {
        if (!this.intrinsicMatrix) {
            return null;
        }

        return {
            intrinsicMatrix: this.intrinsicMatrix,
            distortionCoefficients: this.distortionCoefficients,
            resolution: {
                width: this.cameraWidth,
                height: this.cameraHeight
            },
            deviceId: this.deviceId,
            calibrationError: this.calibrationError,
            capturedImages: this.capturedImages.length,
            timestamp: new Date().toISOString(),
            quality: this._assessCalibrationQuality()
        };
    }

    /**
     * Stop calibration process
     */
    stopCalibration() {
        this.isCalibrating = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this._provideFeedback('info', 'Calibration stopped');
    }

    // Private methods

    async _validateBrowserSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access not supported in this browser');
        }

        if (typeof cv === 'undefined') {
            throw new Error('OpenCV.js not loaded');
        }
    }

    async _initializeOpenCV() {
        // Ensure OpenCV is ready
        if (typeof cv !== 'undefined' && cv.Mat) {
            return; // Already loaded
        }

        // Wait for OpenCV to load
        return new Promise((resolve, reject) => {
            const checkOpenCV = () => {
                if (typeof cv !== 'undefined' && cv.Mat) {
                    resolve();
                } else {
                    setTimeout(checkOpenCV, 100);
                }
            };

            setTimeout(() => reject(new Error('OpenCV.js loading timeout')), 10000);
            checkOpenCV();
        });
    }

    async _setupCamera() {
        this.currentStep = 1;
        this._updateProgress(1, 'Setting up camera...');

        const constraints = {
            video: {
                width: { ideal: this.cameraWidth },
                height: { ideal: this.cameraHeight },
                facingMode: 'environment'
            }
        };

        if (this.deviceId) {
            constraints.video.deviceId = { exact: this.deviceId };
        }

        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.stream;

        return new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                this.video.play();
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.cameraWidth = this.video.videoWidth;
                this.cameraHeight = this.video.videoHeight;

                this._provideFeedback('success', 'Camera setup complete! Now we\'ll guide you through capturing calibration images.');
                resolve();
            };
        });
    }

    async _guidedPatternCapture() {
        this.currentStep = 2;
        this._updateProgress(2, 'Capturing calibration patterns...');

        this._provideFeedback('info',
            `📐 Hold a printed checkerboard pattern (${this.patternSize.width}x${this.patternSize.height} inner corners) in front of the camera. We need ${this.minCapturedImages} good images from different angles and positions.`
        );

        // Start real-time feedback loop
        this._startRealTimeFeedback();
    }

    async _processCalibration() {
        this.currentStep = 3;
        this._updateProgress(3, 'Processing calibration data...');

        if (this.capturedImages.length < this.minCapturedImages) {
            throw new Error(`Need at least ${this.minCapturedImages} calibration images`);
        }

        // Prepare object points (3D points of the checkerboard pattern)
        const objectPoints = [];
        const imagePoints = [];

        for (let i = 0; i < this.capturedImages.length; i++) {
            // 3D object points (assuming Z=0 for calibration pattern)
            const objPts = [];
            for (let j = 0; j < this.patternSize.height; j++) {
                for (let k = 0; k < this.patternSize.width; k++) {
                    objPts.push(k * this.squareSize, j * this.squareSize, 0);
                }
            }
            objectPoints.push(objPts);
            imagePoints.push(this.capturedImages[i].corners);
        }

        // Convert to OpenCV format
        const objectPointsMat = this._arrayToMatVector(objectPoints, cv.CV_32FC3, 3);
        const imagePointsMat = this._arrayToMatVector(imagePoints, cv.CV_32FC2, 2);

        // Calibrate camera
        const cameraMatrix = new cv.Mat(3, 3, cv.CV_64F);
        const distCoeffs = new cv.Mat(4, 1, cv.CV_64F);
        const rvecs = new cv.MatVector();
        const tvecs = new cv.MatVector();

        const rms = cv.calibrateCamera(
            objectPointsMat,
            imagePointsMat,
            new cv.Size(this.cameraWidth, this.cameraHeight),
            cameraMatrix,
            distCoeffs,
            rvecs,
            tvecs
        );

        // Store results
        this.intrinsicMatrix = this._matToArray(cameraMatrix);
        this.distortionCoefficients = this._matToArray(distCoeffs);
        this.calibrationError = rms;

        // Cleanup
        objectPointsMat.delete();
        imagePointsMat.delete();
        cameraMatrix.delete();
        distCoeffs.delete();
        rvecs.delete();
        tvecs.delete();

        this._provideFeedback('success', `✅ Calibration computed! Reprojection error: ${rms.toFixed(2)} pixels`);
    }

    async _validateCalibration() {
        this.currentStep = 4;
        this._updateProgress(4, 'Validating calibration quality...');

        const quality = this._assessCalibrationQuality();

        if (quality.overall === 'excellent') {
            this._provideFeedback('success', '🎉 Excellent calibration quality! Your camera is ready for precise measurements.');
        } else if (quality.overall === 'good') {
            this._provideFeedback('success', '✅ Good calibration quality! This will work well for most applications.');
        } else if (quality.overall === 'fair') {
            this._provideFeedback('warning', '⚠️ Fair calibration quality. Consider recalibrating for better accuracy.');
        } else {
            this._provideFeedback('warning', '❌ Poor calibration quality. Please recalibrate with better lighting and more varied positions.');
        }
    }

    _completeCalibration() {
        this.currentStep = 5;
        this._updateProgress(5, 'Calibration complete!');
        this.isCalibrating = false;

        this._provideFeedback('success',
            '🎉 Camera calibration complete! Your calibration data has been saved and is ready to use.'
        );
    }

    _assessImageQuality(grayMat) {
        try {
            // Calculate brightness (mean intensity)
            const mean = cv.mean(grayMat);
            const brightness = mean[0];

            // Calculate contrast (standard deviation)
            const meanMat = new cv.Mat();
            const stdMat = new cv.Mat();
            cv.meanStdDev(grayMat, meanMat, stdMat);
            const contrast = stdMat.data64F[0];

            // Calculate sharpness (Laplacian variance)
            const laplacian = new cv.Mat();
            cv.Laplacian(grayMat, laplacian, cv.CV_64F);
            const sharpnessMean = new cv.Mat();
            const sharpnessStd = new cv.Mat();
            cv.meanStdDev(laplacian, sharpnessMean, sharpnessStd);
            const sharpness = Math.pow(sharpnessStd.data64F[0], 2);

            // Cleanup
            meanMat.delete();
            stdMat.delete();
            laplacian.delete();
            sharpnessMean.delete();
            sharpnessStd.delete();

            const scores = { brightness, contrast, sharpness };

            const isGood = brightness >= this.qualityThresholds.minBrightness &&
                          brightness <= this.qualityThresholds.maxBrightness &&
                          contrast >= this.qualityThresholds.minContrast &&
                          sharpness >= this.qualityThresholds.minSharpness;

            let message = '';
            if (!isGood) {
                if (brightness < this.qualityThresholds.minBrightness) {
                    message = 'Image too dark - increase lighting';
                } else if (brightness > this.qualityThresholds.maxBrightness) {
                    message = 'Image too bright - reduce lighting';
                } else if (contrast < this.qualityThresholds.minContrast) {
                    message = 'Low contrast - ensure clear black and white pattern';
                } else if (sharpness < this.qualityThresholds.minSharpness) {
                    message = 'Image blurry - hold camera steady and focus';
                }
            }

            return { isGood, scores, message };

        } catch (error) {
            return { isGood: false, scores: {}, message: 'Quality assessment failed' };
        }
    }

    _analyzePatternPosition(corners) {
        if (!corners || corners.length < 4) {
            return { isGoodPosition: false };
        }

        // Analyze pattern size and position
        const minX = Math.min(...corners.filter((_, i) => i % 2 === 0));
        const maxX = Math.max(...corners.filter((_, i) => i % 2 === 0));
        const minY = Math.min(...corners.filter((_, i) => i % 2 === 1));
        const maxY = Math.max(...corners.filter((_, i) => i % 2 === 1));

        const patternWidth = maxX - minX;
        const patternHeight = maxY - minY;
        const patternArea = patternWidth * patternHeight;
        const imageArea = this.cameraWidth * this.cameraHeight;
        const areaRatio = patternArea / imageArea;

        return {
            tooClose: areaRatio > 0.8,
            tooFar: areaRatio < 0.1,
            needsRotation: this.capturedImages.length > 0 && this.capturedImages.length % 3 === 0,
            isGoodPosition: areaRatio >= 0.2 && areaRatio <= 0.6
        };
    }

    _assessCalibrationQuality() {
        if (!this.calibrationError || !this.intrinsicMatrix) {
            return { overall: 'unknown' };
        }

        let overall = 'poor';
        if (this.calibrationError < 0.5) {
            overall = 'excellent';
        } else if (this.calibrationError < 1.0) {
            overall = 'good';
        } else if (this.calibrationError < 2.0) {
            overall = 'fair';
        }

        return {
            overall,
            reprojectionError: this.calibrationError,
            imageCount: this.capturedImages.length,
            recommendations: this._getQualityRecommendations(overall)
        };
    }

    _getQualityRecommendations(quality) {
        switch (quality) {
            case 'poor':
                return [
                    'Use better lighting conditions',
                    'Capture more images from different angles',
                    'Ensure the checkerboard pattern is printed clearly',
                    'Hold the camera steady during capture'
                ];
            case 'fair':
                return [
                    'Consider capturing a few more images',
                    'Try different distances and angles'
                ];
            case 'good':
                return ['Calibration is suitable for most applications'];
            case 'excellent':
                return ['Perfect calibration for precision applications'];
            default:
                return [];
        }
    }

    _drawDetectedPattern(corners) {
        // Draw detected corners on the canvas for visual feedback
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#00FF00';

        const cornerArray = this._matToArray(corners);
        for (let i = 0; i < cornerArray.length; i += 2) {
            const x = cornerArray[i];
            const y = cornerArray[i + 1];

            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        }
    }

    _startRealTimeFeedback() {
        const feedbackInterval = setInterval(() => {
            if (!this.isCalibrating) {
                clearInterval(feedbackInterval);
                return;
            }

            const feedback = this.getPositioningFeedback();
            if (feedback && feedback.recommendations.length > 0) {
                this._provideFeedback('info', feedback.recommendations[0]);
            }
        }, 2000); // Update every 2 seconds
    }

    _provideFeedback(type, message) {
        this.lastFeedback = { type, message, timestamp: Date.now() };
        this.feedbackHistory.push(this.lastFeedback);

        // Keep only recent feedback
        if (this.feedbackHistory.length > 10) {
            this.feedbackHistory.shift();
        }

        if (this.feedbackCallback) {
            this.feedbackCallback(type, message);
        }
    }

    _updateProgress(step, message) {
        this.currentStep = step;
        if (this.feedbackCallback) {
            this.feedbackCallback('progress', message, step / this.totalSteps);
        }
    }

    // Utility methods for OpenCV data conversion

    _matToArray(mat) {
        const array = [];
        for (let i = 0; i < mat.rows; i++) {
            for (let j = 0; j < mat.cols; j++) {
                if (mat.type() === cv.CV_64F) {
                    array.push(mat.doubleAt(i, j));
                } else {
                    array.push(mat.floatAt(i, j));
                }
            }
        }
        return array;
    }

    _arrayToMatVector(arrays, type, channels) {
        const matVector = new cv.MatVector();

        for (const array of arrays) {
            const mat = cv.matFromArray(array.length / channels, 1, type, array);
            matVector.push_back(mat);
        }

        return matVector;
    }
}