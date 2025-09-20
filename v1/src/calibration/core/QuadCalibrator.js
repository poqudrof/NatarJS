/**
 * QuadCalibrator - Quad-based flat projection calibration
 * Implements 4-point homography calibration for flat projection surfaces
 */

import { ValidationUtils } from '../../utils/ValidationUtils.js';

export class QuadCalibrator {
    constructor(cameraCalibration = null, feedbackDisplay = null) {
        this.cameraCalibration = cameraCalibration;
        this.feedbackDisplay = feedbackDisplay;

        // Calibration state
        this.isInitialized = false;
        this.isCalibrating = false;
        this.calibrationData = null;

        // Corner detection
        this.detectedCorners = [];
        this.projectedCorners = [];
        this.homographyMatrix = null;

        // Quality assessment
        this.calibrationQuality = null;
        this.reprojectionError = null;

        // User feedback
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;

        // Detection settings
        this.detectionSettings = {
            markerSize: 100,
            expectedMarkers: 4,
            minMarkerArea: 1000,
            maxMarkerArea: 50000,
            cornerRefinement: true,
            qualityThreshold: 0.7
        };
    }

    /**
     * Initialize quad calibrator
     */
    async initialize(options = {}) {
        try {
            const defaultOptions = {
                useExistingCamera: true,
                requireCameraCalibration: true,
                projectionSurface: 'flat',
                markerType: 'qr_like'
            };

            const settings = { ...defaultOptions, ...options };

            // Validate camera calibration if required
            if (settings.requireCameraCalibration && !this.cameraCalibration) {
                throw new Error('Camera calibration required for quad calibration');
            }

            // Validate camera calibration quality
            if (this.cameraCalibration) {
                const cameraValidation = this._validateCameraCalibration();
                if (!cameraValidation.isValid) {
                    this._provideFeedback('warning', 'Camera calibration quality is poor. Consider recalibrating camera first.');
                }
            }

            this.isInitialized = true;
            this._provideFeedback('success', 'Quad calibrator initialized successfully');

            return {
                success: true,
                message: 'Quad calibrator ready for corner detection',
                cameraCalibrationStatus: this.cameraCalibration ? 'available' : 'not_available',
                recommendations: this._getInitializationRecommendations()
            };

        } catch (error) {
            this._provideFeedback('error', `Initialization failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                message: 'Failed to initialize quad calibrator'
            };
        }
    }

    /**
     * Start quad calibration process
     */
    async startCalibration(videoElement, projectorManager) {
        if (!this.isInitialized) {
            throw new Error('QuadCalibrator not initialized');
        }

        if (this.isCalibrating) {
            return {
                success: false,
                message: 'Calibration already in progress'
            };
        }

        try {
            this.isCalibrating = true;
            this.detectedCorners = [];
            this.projectedCorners = [];
            this.homographyMatrix = null;

            this._provideFeedback('info', 'Starting quad calibration process...');
            this._notifyProgress('started', 0);

            // Step 1: Display corner markers on projector
            const markerResult = await this._displayCornerMarkers(projectorManager);
            if (!markerResult.success) {
                throw new Error(markerResult.message);
            }

            this._notifyProgress('markers_displayed', 25);

            // Step 2: Detect markers in camera feed
            const detectionResult = await this._detectMarkersInCamera(videoElement);
            if (!detectionResult.success) {
                throw new Error(detectionResult.message);
            }

            this._notifyProgress('markers_detected', 50);

            // Step 3: Calculate homography transformation
            const homographyResult = this._calculateHomography();
            if (!homographyResult.success) {
                throw new Error(homographyResult.message);
            }

            this._notifyProgress('homography_calculated', 75);

            // Step 4: Validate calibration quality
            const validationResult = this._validateCalibration();
            if (!validationResult.success) {
                this._provideFeedback('warning', `Calibration quality: ${validationResult.quality}`);
            }

            this._notifyProgress('validation_complete', 100);

            // Store calibration data
            this.calibrationData = {
                type: 'quad',
                timestamp: new Date().toISOString(),
                homographyMatrix: this.homographyMatrix,
                detectedCorners: this.detectedCorners,
                projectedCorners: this.projectedCorners,
                quality: validationResult.quality,
                reprojectionError: this.reprojectionError,
                cameraCalibration: this.cameraCalibration
            };

            this.isCalibrating = false;
            this._provideFeedback('success', 'Quad calibration completed successfully!');
            this._notifyComplete(this.calibrationData);

            return {
                success: true,
                calibrationData: this.calibrationData,
                quality: validationResult.quality,
                message: 'Quad calibration completed successfully'
            };

        } catch (error) {
            this.isCalibrating = false;
            this._provideFeedback('error', `Calibration failed: ${error.message}`);
            this._notifyError(error);

            return {
                success: false,
                error: error.message,
                message: 'Quad calibration failed',
                troubleshooting: this._getTroubleshootingTips(error)
            };
        }
    }

    /**
     * Transform point from camera coordinates to projector coordinates
     */
    transformPoint(cameraPoint) {
        if (!this.homographyMatrix) {
            throw new Error('No calibration data available');
        }

        try {
            // Create OpenCV matrices
            const srcPoint = cv.matFromArray(1, 1, cv.CV_32FC2, [cameraPoint.x, cameraPoint.y]);
            const dstPoint = new cv.Mat();

            // Apply homography transformation
            cv.perspectiveTransform(srcPoint, dstPoint, this.homographyMatrix);

            const result = {
                x: dstPoint.data32F[0],
                y: dstPoint.data32F[1]
            };

            // Clean up
            srcPoint.delete();
            dstPoint.delete();

            return result;

        } catch (error) {
            throw new Error(`Point transformation failed: ${error.message}`);
        }
    }

    /**
     * Transform multiple points
     */
    transformPoints(cameraPoints) {
        return cameraPoints.map(point => this.transformPoint(point));
    }

    /**
     * Get calibration quality assessment
     */
    getQualityAssessment() {
        if (!this.calibrationData) {
            return {
                isValid: false,
                message: 'No calibration data available'
            };
        }

        return {
            isValid: true,
            quality: this.calibrationData.quality,
            reprojectionError: this.calibrationData.reprojectionError,
            timestamp: this.calibrationData.timestamp,
            recommendations: this._getQualityRecommendations()
        };
    }

    /**
     * Save calibration data
     */
    async saveCalibration(storage, userId = null) {
        if (!this.calibrationData) {
            throw new Error('No calibration data to save');
        }

        try {
            const saveData = {
                ...this.calibrationData,
                userId: userId,
                version: '1.0',
                deviceInfo: this._getDeviceInfo()
            };

            const result = await storage.saveCalibration('quad', saveData);

            this._provideFeedback('success', 'Calibration saved successfully');
            return result;

        } catch (error) {
            this._provideFeedback('error', `Failed to save calibration: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load calibration data
     */
    async loadCalibration(storage, calibrationId) {
        try {
            const data = await storage.loadCalibration(calibrationId);

            if (data.type !== 'quad') {
                throw new Error('Invalid calibration type');
            }

            // Recreate OpenCV matrix from saved data
            this.homographyMatrix = cv.matFromArray(3, 3, cv.CV_64F, data.homographyMatrix.data);
            this.calibrationData = data;
            this.detectedCorners = data.detectedCorners;
            this.projectedCorners = data.projectedCorners;

            this._provideFeedback('success', 'Calibration loaded successfully');

            return {
                success: true,
                calibrationData: this.calibrationData,
                message: 'Calibration loaded and ready to use'
            };

        } catch (error) {
            this._provideFeedback('error', `Failed to load calibration: ${error.message}`);
            throw error;
        }
    }

    // Private methods

    async _displayCornerMarkers(projectorManager) {
        try {
            // Generate QR marker pattern for corners
            const structuredLight = projectorManager.structuredLight;
            const markerPattern = structuredLight.generateQRMarkers(this.detectionSettings.markerSize);

            // Display pattern on projector
            const displayResult = projectorManager.windowManager.displayPattern(markerPattern);

            if (!displayResult.success) {
                throw new Error(displayResult.message);
            }

            // Store projected corner positions (in projector coordinates)
            this.projectedCorners = markerPattern.positions.map(pos => ({
                id: pos.id,
                x: pos.x + this.detectionSettings.markerSize / 2,
                y: pos.y + this.detectionSettings.markerSize / 2,
                projectorCoord: true
            }));

            this._provideFeedback('info', 'Corner markers displayed on projector');

            return {
                success: true,
                markerCount: this.projectedCorners.length,
                message: 'Corner markers ready for detection'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to display corner markers'
            };
        }
    }

    async _detectMarkersInCamera(videoElement) {
        return new Promise((resolve) => {
            const maxAttempts = 100; // 10 seconds at 10 FPS
            let attempts = 0;

            const detectFrame = () => {
                try {
                    attempts++;

                    // Capture current frame
                    const frame = this._captureVideoFrame(videoElement);
                    if (!frame) {
                        if (attempts < maxAttempts) {
                            setTimeout(detectFrame, 100);
                            return;
                        } else {
                            resolve({
                                success: false,
                                message: 'Failed to capture video frame'
                            });
                            return;
                        }
                    }

                    // Detect QR-like markers
                    const detectionResult = this._detectQRLikeMarkers(frame);

                    if (detectionResult.success && detectionResult.markers.length >= 4) {
                        // Found sufficient markers
                        this.detectedCorners = detectionResult.markers;

                        // Clean up
                        frame.delete();

                        this._provideFeedback('success', `Detected ${detectionResult.markers.length} corner markers`);
                        resolve({
                            success: true,
                            markers: this.detectedCorners,
                            attempts: attempts,
                            message: 'Corner markers detected successfully'
                        });
                        return;
                    }

                    // Clean up frame
                    frame.delete();

                    // Provide progress feedback
                    if (attempts % 10 === 0) {
                        const detected = detectionResult.markers?.length || 0;
                        this._provideFeedback('info', `Detecting corners... found ${detected}/4 markers (attempt ${attempts}/${maxAttempts})`);
                    }

                    // Continue detection if not maxed out
                    if (attempts < maxAttempts) {
                        setTimeout(detectFrame, 100);
                    } else {
                        resolve({
                            success: false,
                            message: 'Timeout: Could not detect all corner markers',
                            detectedCount: detectionResult.markers?.length || 0,
                            troubleshooting: [
                                'Ensure projector is displaying corner markers clearly',
                                'Check lighting conditions',
                                'Verify camera can see the full projection area',
                                'Try adjusting projector focus and position'
                            ]
                        });
                    }

                } catch (error) {
                    resolve({
                        success: false,
                        error: error.message,
                        message: 'Marker detection failed'
                    });
                }
            };

            // Start detection
            detectFrame();
        });
    }

    _detectQRLikeMarkers(frame) {
        try {
            const gray = new cv.Mat();
            const binary = new cv.Mat();
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();

            // Convert to grayscale
            cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY);

            // Adaptive threshold for better marker detection
            cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

            // Find contours
            cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            const markers = [];
            const minArea = this.detectionSettings.minMarkerArea;
            const maxArea = this.detectionSettings.maxMarkerArea;

            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);

                // Filter by area
                if (area < minArea || area > maxArea) {
                    contour.delete();
                    continue;
                }

                // Approximate contour to polygon
                const epsilon = 0.02 * cv.arcLength(contour, true);
                const approx = new cv.Mat();
                cv.approxPolyDP(contour, approx, epsilon, true);

                // Check if it's roughly rectangular (4 corners)
                if (approx.rows >= 4 && approx.rows <= 6) {
                    // Calculate bounding box
                    const rect = cv.boundingRect(contour);

                    // Check aspect ratio (should be roughly square for QR markers)
                    const aspectRatio = rect.width / rect.height;
                    if (aspectRatio > 0.7 && aspectRatio < 1.3) {

                        // Calculate center point
                        const centerX = rect.x + rect.width / 2;
                        const centerY = rect.y + rect.height / 2;

                        // Determine marker ID based on position
                        const markerId = this._determineMarkerId(centerX, centerY, frame.cols, frame.rows);

                        markers.push({
                            id: markerId,
                            x: centerX,
                            y: centerY,
                            area: area,
                            boundingRect: rect,
                            confidence: this._calculateMarkerConfidence(contour, rect)
                        });
                    }
                }

                approx.delete();
                contour.delete();
            }

            // Clean up
            gray.delete();
            binary.delete();
            contours.delete();
            hierarchy.delete();

            // Sort markers by confidence and return best 4
            markers.sort((a, b) => b.confidence - a.confidence);
            const bestMarkers = markers.slice(0, 4);

            return {
                success: bestMarkers.length >= 4,
                markers: bestMarkers,
                totalFound: markers.length
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                markers: []
            };
        }
    }

    _calculateHomography() {
        try {
            if (this.detectedCorners.length < 4 || this.projectedCorners.length < 4) {
                throw new Error('Insufficient corner points for homography calculation');
            }

            // Match detected corners with projected corners by ID
            const matchedPairs = this._matchCornerPairs();

            if (matchedPairs.length < 4) {
                throw new Error('Could not match detected corners with projected corners');
            }

            // Prepare point arrays for OpenCV
            const srcPoints = []; // Camera coordinates
            const dstPoints = []; // Projector coordinates

            matchedPairs.forEach(pair => {
                srcPoints.push(pair.detected.x, pair.detected.y);
                dstPoints.push(pair.projected.x, pair.projected.y);
            });

            // Create OpenCV matrices
            const srcMat = cv.matFromArray(4, 1, cv.CV_32FC2, srcPoints);
            const dstMat = cv.matFromArray(4, 1, cv.CV_32FC2, dstPoints);

            // Calculate homography using RANSAC for robustness
            this.homographyMatrix = cv.findHomography(srcMat, dstMat, cv.RANSAC, 3.0);

            // Calculate reprojection error
            this.reprojectionError = this._calculateReprojectionError(matchedPairs);

            // Clean up
            srcMat.delete();
            dstMat.delete();

            this._provideFeedback('success', `Homography calculated with ${this.reprojectionError.toFixed(2)} pixel error`);

            return {
                success: true,
                homographyMatrix: this.homographyMatrix,
                reprojectionError: this.reprojectionError,
                matchedPairs: matchedPairs.length,
                message: 'Homography transformation calculated successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to calculate homography transformation'
            };
        }
    }

    _validateCalibration() {
        try {
            if (!this.homographyMatrix || this.reprojectionError === null) {
                throw new Error('No calibration data to validate');
            }

            // Determine quality based on reprojection error
            let quality, qualityScore;

            if (this.reprojectionError < 2.0) {
                quality = 'excellent';
                qualityScore = 0.9;
            } else if (this.reprojectionError < 5.0) {
                quality = 'good';
                qualityScore = 0.7;
            } else if (this.reprojectionError < 10.0) {
                quality = 'fair';
                qualityScore = 0.5;
            } else {
                quality = 'poor';
                qualityScore = 0.3;
            }

            // Additional validation checks
            const validationChecks = this._performAdditionalValidation();

            this.calibrationQuality = {
                quality: quality,
                score: qualityScore,
                reprojectionError: this.reprojectionError,
                additionalChecks: validationChecks,
                isUsable: qualityScore >= 0.5
            };

            return {
                success: this.calibrationQuality.isUsable,
                quality: quality,
                score: qualityScore,
                checks: validationChecks,
                message: `Calibration quality: ${quality} (${this.reprojectionError.toFixed(2)}px error)`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Calibration validation failed'
            };
        }
    }

    // Helper methods

    _captureVideoFrame(videoElement) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0);

            return cv.imread(canvas);
        } catch (error) {
            return null;
        }
    }

    _determineMarkerId(x, y, frameWidth, frameHeight) {
        const centerX = frameWidth / 2;
        const centerY = frameHeight / 2;

        // Determine quadrant
        if (x < centerX && y < centerY) return 'TL'; // Top-left
        if (x >= centerX && y < centerY) return 'TR'; // Top-right
        if (x >= centerX && y >= centerY) return 'BR'; // Bottom-right
        if (x < centerX && y >= centerY) return 'BL'; // Bottom-left

        return 'C'; // Center (fallback)
    }

    _calculateMarkerConfidence(contour, rect) {
        try {
            // Factor 1: Area ratio (how close to square)
            const areaRatio = cv.contourArea(contour) / (rect.width * rect.height);

            // Factor 2: Aspect ratio (how square-like)
            const aspectRatio = Math.min(rect.width, rect.height) / Math.max(rect.width, rect.height);

            // Factor 3: Solidity (how filled the shape is)
            const hullPoints = new cv.Mat();
            cv.convexHull(contour, hullPoints);
            const hullArea = cv.contourArea(hullPoints);
            const solidity = cv.contourArea(contour) / hullArea;
            hullPoints.delete();

            // Combine factors
            const confidence = (areaRatio * 0.4) + (aspectRatio * 0.4) + (solidity * 0.2);

            return Math.min(confidence, 1.0);
        } catch (error) {
            return 0.5; // Default confidence if calculation fails
        }
    }

    _matchCornerPairs() {
        const matchedPairs = [];

        this.detectedCorners.forEach(detected => {
            const projected = this.projectedCorners.find(p => p.id === detected.id);
            if (projected) {
                matchedPairs.push({
                    detected: detected,
                    projected: projected
                });
            }
        });

        return matchedPairs;
    }

    _calculateReprojectionError(matchedPairs) {
        let totalError = 0;

        matchedPairs.forEach(pair => {
            const transformed = this.transformPoint(pair.detected);
            const dx = transformed.x - pair.projected.x;
            const dy = transformed.y - pair.projected.y;
            const error = Math.sqrt(dx * dx + dy * dy);
            totalError += error;
        });

        return totalError / matchedPairs.length;
    }

    _performAdditionalValidation() {
        const checks = {
            homographyCondition: this._checkHomographyCondition(),
            cornerDistribution: this._checkCornerDistribution(),
            transformationStability: this._checkTransformationStability()
        };

        return checks;
    }

    _checkHomographyCondition() {
        // Check if homography matrix is well-conditioned
        try {
            const det = cv.determinant(this.homographyMatrix);
            return {
                passed: Math.abs(det) > 1e-7,
                value: det,
                description: 'Homography matrix condition number'
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                description: 'Failed to check homography condition'
            };
        }
    }

    _checkCornerDistribution() {
        // Check if corners are well-distributed
        const corners = this.detectedCorners;
        if (corners.length < 4) {
            return {
                passed: false,
                description: 'Insufficient corners detected'
            };
        }

        // Calculate corner spread
        const xCoords = corners.map(c => c.x);
        const yCoords = corners.map(c => c.y);

        const xSpread = Math.max(...xCoords) - Math.min(...xCoords);
        const ySpread = Math.max(...yCoords) - Math.min(...yCoords);

        // Good distribution should cover significant portion of frame
        const frameArea = 1920 * 1080; // Estimate
        const cornerArea = xSpread * ySpread;
        const coverage = cornerArea / frameArea;

        return {
            passed: coverage > 0.1, // At least 10% coverage
            value: coverage,
            description: 'Corner distribution coverage'
        };
    }

    _checkTransformationStability() {
        // Test transformation with corner points
        try {
            const testPoints = [
                { x: 0, y: 0 },
                { x: 100, y: 100 },
                { x: 200, y: 200 }
            ];

            let stable = true;
            testPoints.forEach(point => {
                try {
                    const transformed = this.transformPoint(point);
                    if (!isFinite(transformed.x) || !isFinite(transformed.y)) {
                        stable = false;
                    }
                } catch (error) {
                    stable = false;
                }
            });

            return {
                passed: stable,
                description: 'Transformation numerical stability'
            };
        } catch (error) {
            return {
                passed: false,
                error: error.message,
                description: 'Failed to check transformation stability'
            };
        }
    }

    _validateCameraCalibration() {
        if (!this.cameraCalibration) {
            return { isValid: false, message: 'No camera calibration available' };
        }

        const reprojError = this.cameraCalibration.reprojectionError || Infinity;

        return ValidationUtils.validateCalibrationResults(reprojError,
            this.cameraCalibration.imageCount || 0);
    }

    _getInitializationRecommendations() {
        const recommendations = [
            '📐 Ensure projector displays clear, sharp corner markers',
            '📷 Position camera to see entire projection area',
            '💡 Use consistent lighting without shadows on projection surface',
            '📏 Keep projection surface flat and perpendicular to projector'
        ];

        if (!this.cameraCalibration) {
            recommendations.unshift('⚠️ Camera calibration recommended for better accuracy');
        }

        return recommendations;
    }

    _getQualityRecommendations() {
        const recommendations = [];

        if (this.reprojectionError > 5.0) {
            recommendations.push('🔄 Consider recalibrating with better lighting conditions');
            recommendations.push('📐 Ensure projection surface is completely flat');
            recommendations.push('🎯 Check camera and projector focus');
        }

        if (this.detectedCorners.length === 4) {
            recommendations.push('✅ All corner markers detected successfully');
        }

        return recommendations;
    }

    _getTroubleshootingTips(error) {
        const tips = [
            '💡 Ensure good lighting on projection surface',
            '📐 Verify all corner markers are visible in camera view',
            '🎯 Check projector focus and image sharpness',
            '📏 Ensure projection surface is flat and stable'
        ];

        if (error.message.includes('marker')) {
            tips.unshift('🔍 Try adjusting camera position to see all corners');
        }

        return tips;
    }

    _getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString()
        };
    }

    // Feedback and event methods

    _provideFeedback(type, message) {
        if (this.feedbackDisplay) {
            this.feedbackDisplay.show(type, message);
        }
        console.log(`QuadCalibrator ${type}: ${message}`);
    }

    _notifyProgress(stage, percentage) {
        if (this.onProgress) {
            this.onProgress({ stage, percentage });
        }
    }

    _notifyComplete(calibrationData) {
        if (this.onComplete) {
            this.onComplete(calibrationData);
        }
    }

    _notifyError(error) {
        if (this.onError) {
            this.onError(error);
        }
    }

    // Event listener setters
    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    setCompleteCallback(callback) {
        this.onComplete = callback;
    }

    setErrorCallback(callback) {
        this.onError = callback;
    }
}