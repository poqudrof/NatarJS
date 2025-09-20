/**
 * CornerDetector - Advanced corner detection for calibration markers
 * Provides robust detection of QR/ArUco markers and corner points
 */

export class CornerDetector {
    constructor() {
        this.detectionMethods = ['contour', 'harris', 'template'];
        this.currentMethod = 'contour';

        // Detection parameters
        this.params = {
            // Contour detection
            contour: {
                minArea: 500,
                maxArea: 50000,
                aspectRatioRange: [0.7, 1.3],
                solidity: 0.6,
                adaptiveThresholdBlockSize: 11,
                adaptiveThresholdC: 2
            },

            // Harris corner detection
            harris: {
                blockSize: 2,
                ksize: 3,
                k: 0.04,
                threshold: 0.01,
                minDistance: 30
            },

            // Template matching
            template: {
                templateSize: 50,
                matchThreshold: 0.7,
                scaleRange: [0.5, 2.0],
                scaleSteps: 10
            }
        };

        // Quality assessment
        this.qualityMetrics = {
            sharpness: 0,
            contrast: 0,
            brightness: 0,
            noiseLevel: 0
        };
    }

    /**
     * Detect corner markers in image using multiple methods
     */
    detectCorners(imageData, expectedCorners = 4, markerType = 'qr_like') {
        const result = {
            success: false,
            corners: [],
            method: this.currentMethod,
            quality: 'unknown',
            confidence: 0,
            processingTime: 0
        };

        const startTime = performance.now();

        try {
            // Convert input to OpenCV Mat if needed
            const image = this._prepareImage(imageData);

            // Assess image quality first
            this.qualityMetrics = this._assessImageQuality(image);

            // Try detection methods in order of preference
            let detectionResult = null;

            for (const method of this.detectionMethods) {
                this.currentMethod = method;
                detectionResult = this._detectWithMethod(image, method, markerType);

                if (detectionResult.success && detectionResult.corners.length >= expectedCorners) {
                    break;
                }
            }

            if (detectionResult && detectionResult.success) {
                // Post-process and validate corners
                const processedCorners = this._postProcessCorners(detectionResult.corners, image);

                // Calculate overall confidence
                const confidence = this._calculateOverallConfidence(processedCorners, image);

                result.success = true;
                result.corners = processedCorners;
                result.confidence = confidence;
                result.quality = this._determineQuality(confidence, this.qualityMetrics);
            }

            // Clean up
            if (image && image.delete) {
                image.delete();
            }

            result.processingTime = performance.now() - startTime;
            return result;

        } catch (error) {
            result.error = error.message;
            result.processingTime = performance.now() - startTime;
            return result;
        }
    }

    /**
     * Detect corners using contour-based method (most reliable for QR-like markers)
     */
    _detectWithContours(image, markerType) {
        const result = { success: false, corners: [] };

        try {
            const gray = new cv.Mat();
            const binary = new cv.Mat();
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();

            // Convert to grayscale if needed
            if (image.channels() > 1) {
                cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
            } else {
                gray = image.clone();
            }

            // Apply adaptive threshold for better marker detection
            cv.adaptiveThreshold(
                gray,
                binary,
                255,
                cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv.THRESH_BINARY,
                this.params.contour.adaptiveThresholdBlockSize,
                this.params.contour.adaptiveThresholdC
            );

            // Find contours
            cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            const candidates = [];

            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);

                // Filter by area
                if (area < this.params.contour.minArea || area > this.params.contour.maxArea) {
                    contour.delete();
                    continue;
                }

                // Get bounding rectangle
                const rect = cv.boundingRect(contour);
                const aspectRatio = rect.width / rect.height;

                // Check aspect ratio (should be roughly square for QR markers)
                if (aspectRatio < this.params.contour.aspectRatioRange[0] ||
                    aspectRatio > this.params.contour.aspectRatioRange[1]) {
                    contour.delete();
                    continue;
                }

                // Calculate solidity (area / convex hull area)
                const hullPoints = new cv.Mat();
                cv.convexHull(contour, hullPoints);
                const hullArea = cv.contourArea(hullPoints);
                const solidity = area / hullArea;
                hullPoints.delete();

                if (solidity < this.params.contour.solidity) {
                    contour.delete();
                    continue;
                }

                // Calculate corner quality metrics
                const cornerMetrics = this._analyzeCornerQuality(contour, gray);

                candidates.push({
                    center: {
                        x: rect.x + rect.width / 2,
                        y: rect.y + rect.height / 2
                    },
                    boundingRect: rect,
                    area: area,
                    aspectRatio: aspectRatio,
                    solidity: solidity,
                    confidence: cornerMetrics.confidence,
                    sharpness: cornerMetrics.sharpness,
                    contrast: cornerMetrics.contrast,
                    id: this._determineMarkerId(rect.x + rect.width / 2, rect.y + rect.height / 2, image.cols, image.rows)
                });

                contour.delete();
            }

            // Sort by confidence and select best candidates
            candidates.sort((a, b) => b.confidence - a.confidence);

            // Clean up
            gray.delete();
            binary.delete();
            contours.delete();
            hierarchy.delete();

            result.success = candidates.length > 0;
            result.corners = candidates;

            return result;

        } catch (error) {
            result.error = error.message;
            return result;
        }
    }

    /**
     * Detect corners using Harris corner detection
     */
    _detectWithHarris(image) {
        const result = { success: false, corners: [] };

        try {
            const gray = new cv.Mat();
            const harrisResponse = new cv.Mat();

            // Convert to grayscale
            if (image.channels() > 1) {
                cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
            } else {
                gray = image.clone();
            }

            // Apply Harris corner detection
            cv.cornerHarris(
                gray,
                harrisResponse,
                this.params.harris.blockSize,
                this.params.harris.ksize,
                this.params.harris.k
            );

            // Find corner points
            const corners = [];
            const threshold = this.params.harris.threshold * 255;
            const minDistance = this.params.harris.minDistance;

            for (let y = 0; y < harrisResponse.rows; y++) {
                for (let x = 0; x < harrisResponse.cols; x++) {
                    const response = harrisResponse.floatAt(y, x);

                    if (response > threshold) {
                        // Check minimum distance to existing corners
                        let tooClose = false;
                        for (const existing of corners) {
                            const dx = x - existing.x;
                            const dy = y - existing.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            if (distance < minDistance) {
                                tooClose = true;
                                break;
                            }
                        }

                        if (!tooClose) {
                            corners.push({
                                x: x,
                                y: y,
                                response: response,
                                confidence: Math.min(response / threshold, 1.0),
                                id: this._determineMarkerId(x, y, image.cols, image.rows)
                            });
                        }
                    }
                }
            }

            // Sort by response strength
            corners.sort((a, b) => b.response - a.response);

            // Clean up
            gray.delete();
            harrisResponse.delete();

            result.success = corners.length > 0;
            result.corners = corners.map(corner => ({
                center: { x: corner.x, y: corner.y },
                confidence: corner.confidence,
                id: corner.id,
                method: 'harris'
            }));

            return result;

        } catch (error) {
            result.error = error.message;
            return result;
        }
    }

    /**
     * Detect corners using template matching
     */
    _detectWithTemplate(image, markerType) {
        const result = { success: false, corners: [] };

        try {
            // Generate template based on marker type
            const template = this._generateTemplate(markerType);
            if (!template) {
                result.error = 'Failed to generate template';
                return result;
            }

            const gray = new cv.Mat();
            const matchResult = new cv.Mat();

            // Convert to grayscale
            if (image.channels() > 1) {
                cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
            } else {
                gray = image.clone();
            }

            // Perform template matching at multiple scales
            const matches = [];
            const scaleRange = this.params.template.scaleRange;
            const scaleSteps = this.params.template.scaleSteps;

            for (let i = 0; i < scaleSteps; i++) {
                const scale = scaleRange[0] + (scaleRange[1] - scaleRange[0]) * i / (scaleSteps - 1);

                // Resize template
                const scaledTemplate = new cv.Mat();
                const dsize = new cv.Size(
                    Math.round(template.cols * scale),
                    Math.round(template.rows * scale)
                );
                cv.resize(template, scaledTemplate, dsize);

                // Perform template matching
                cv.matchTemplate(gray, scaledTemplate, matchResult, cv.TM_CCOEFF_NORMED);

                // Find matches above threshold
                const threshold = this.params.template.matchThreshold;
                const minMaxLoc = cv.minMaxLoc(matchResult);

                if (minMaxLoc.maxVal > threshold) {
                    matches.push({
                        location: minMaxLoc.maxLoc,
                        confidence: minMaxLoc.maxVal,
                        scale: scale,
                        templateSize: {
                            width: scaledTemplate.cols,
                            height: scaledTemplate.rows
                        }
                    });
                }

                scaledTemplate.delete();
            }

            // Clean up
            gray.delete();
            matchResult.delete();
            template.delete();

            // Process matches
            if (matches.length > 0) {
                // Remove overlapping matches
                const filteredMatches = this._filterOverlappingMatches(matches);

                result.success = true;
                result.corners = filteredMatches.map((match, index) => ({
                    center: {
                        x: match.location.x + match.templateSize.width / 2,
                        y: match.location.y + match.templateSize.height / 2
                    },
                    confidence: match.confidence,
                    scale: match.scale,
                    id: this._determineMarkerId(
                        match.location.x + match.templateSize.width / 2,
                        match.location.y + match.templateSize.height / 2,
                        image.cols,
                        image.rows
                    ),
                    method: 'template'
                }));
            }

            return result;

        } catch (error) {
            result.error = error.message;
            return result;
        }
    }

    /**
     * Assess image quality for corner detection
     */
    _assessImageQuality(image) {
        const metrics = {
            sharpness: 0,
            contrast: 0,
            brightness: 0,
            noiseLevel: 0
        };

        try {
            const gray = new cv.Mat();

            // Convert to grayscale if needed
            if (image.channels() > 1) {
                cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
            } else {
                gray = image.clone();
            }

            // Calculate sharpness using Laplacian variance
            const laplacian = new cv.Mat();
            cv.Laplacian(gray, laplacian, cv.CV_64F);
            const mean = new cv.Mat();
            const stddev = new cv.Mat();
            cv.meanStdDev(laplacian, mean, stddev);
            metrics.sharpness = stddev.doubleAt(0, 0) * stddev.doubleAt(0, 0);

            // Calculate contrast using standard deviation
            cv.meanStdDev(gray, mean, stddev);
            metrics.contrast = stddev.doubleAt(0, 0);

            // Calculate brightness using mean
            metrics.brightness = mean.doubleAt(0, 0);

            // Estimate noise level using high-frequency content
            const blurred = new cv.Mat();
            cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
            const noise = new cv.Mat();
            cv.absdiff(gray, blurred, noise);
            cv.meanStdDev(noise, mean, stddev);
            metrics.noiseLevel = mean.doubleAt(0, 0);

            // Clean up
            gray.delete();
            laplacian.delete();
            mean.delete();
            stddev.delete();
            blurred.delete();
            noise.delete();

        } catch (error) {
            console.warn('Quality assessment failed:', error.message);
        }

        return metrics;
    }

    // Helper methods

    _prepareImage(imageData) {
        if (imageData instanceof cv.Mat) {
            return imageData;
        }

        if (imageData instanceof HTMLCanvasElement) {
            return cv.imread(imageData);
        }

        if (imageData instanceof HTMLVideoElement) {
            const canvas = document.createElement('canvas');
            canvas.width = imageData.videoWidth;
            canvas.height = imageData.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageData, 0, 0);
            return cv.imread(canvas);
        }

        throw new Error('Unsupported image data type');
    }

    _detectWithMethod(image, method, markerType) {
        switch (method) {
            case 'contour':
                return this._detectWithContours(image, markerType);
            case 'harris':
                return this._detectWithHarris(image);
            case 'template':
                return this._detectWithTemplate(image, markerType);
            default:
                throw new Error(`Unknown detection method: ${method}`);
        }
    }

    _analyzeCornerQuality(contour, grayImage) {
        try {
            const rect = cv.boundingRect(contour);

            // Extract region of interest
            const roi = grayImage.roi(rect);

            // Calculate sharpness in ROI
            const laplacian = new cv.Mat();
            cv.Laplacian(roi, laplacian, cv.CV_64F);
            const mean = new cv.Mat();
            const stddev = new cv.Mat();
            cv.meanStdDev(laplacian, mean, stddev);
            const sharpness = stddev.doubleAt(0, 0) * stddev.doubleAt(0, 0);

            // Calculate contrast in ROI
            cv.meanStdDev(roi, mean, stddev);
            const contrast = stddev.doubleAt(0, 0);

            // Combine metrics for confidence
            const confidence = Math.min((sharpness / 1000 + contrast / 100) / 2, 1.0);

            // Clean up
            roi.delete();
            laplacian.delete();
            mean.delete();
            stddev.delete();

            return {
                sharpness: sharpness,
                contrast: contrast,
                confidence: confidence
            };

        } catch (error) {
            return {
                sharpness: 0,
                contrast: 0,
                confidence: 0.5
            };
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

    _postProcessCorners(corners, image) {
        // Refine corner positions using sub-pixel accuracy
        return corners.map(corner => {
            if (corner.center) {
                const refined = this._refineCornerPosition(corner.center, image);
                return {
                    ...corner,
                    center: refined,
                    refined: true
                };
            }
            return corner;
        });
    }

    _refineCornerPosition(corner, image) {
        try {
            const gray = new cv.Mat();

            // Convert to grayscale if needed
            if (image.channels() > 1) {
                cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
            } else {
                gray = image.clone();
            }

            // Use cornerSubPix for sub-pixel accuracy
            const corners = cv.matFromArray(1, 1, cv.CV_32FC2, [corner.x, corner.y]);
            const criteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS + cv.TERM_CRITERIA_COUNT, 40, 0.001);

            cv.cornerSubPix(gray, corners, new cv.Size(5, 5), new cv.Size(-1, -1), criteria);

            const refined = {
                x: corners.data32F[0],
                y: corners.data32F[1]
            };

            // Clean up
            gray.delete();
            corners.delete();

            return refined;

        } catch (error) {
            // Return original position if refinement fails
            return corner;
        }
    }

    _calculateOverallConfidence(corners, image) {
        if (corners.length === 0) return 0;

        // Average individual corner confidences
        const avgConfidence = corners.reduce((sum, corner) => sum + (corner.confidence || 0.5), 0) / corners.length;

        // Bonus for having expected number of corners
        const completenessBonus = corners.length >= 4 ? 0.2 : 0;

        // Quality bonus based on image metrics
        const qualityBonus = (this.qualityMetrics.sharpness / 1000 + this.qualityMetrics.contrast / 100) * 0.1;

        return Math.min(avgConfidence + completenessBonus + qualityBonus, 1.0);
    }

    _determineQuality(confidence, metrics) {
        if (confidence > 0.8 && metrics.sharpness > 500) return 'excellent';
        if (confidence > 0.6 && metrics.sharpness > 200) return 'good';
        if (confidence > 0.4) return 'fair';
        return 'poor';
    }

    _generateTemplate(markerType) {
        // Generate a simple template for QR-like markers
        const size = this.params.template.templateSize;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Draw QR-like pattern
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = 'black';

        // Outer border
        ctx.fillRect(0, 0, size, size / 8);
        ctx.fillRect(0, 0, size / 8, size);
        ctx.fillRect(size - size / 8, 0, size / 8, size);
        ctx.fillRect(0, size - size / 8, size, size / 8);

        // Inner pattern
        const innerSize = size * 0.4;
        const innerX = (size - innerSize) / 2;
        const innerY = (size - innerSize) / 2;
        ctx.fillRect(innerX, innerY, innerSize, innerSize);

        return cv.imread(canvas);
    }

    _filterOverlappingMatches(matches) {
        const filtered = [];
        const overlapThreshold = 0.5;

        matches.sort((a, b) => b.confidence - a.confidence);

        for (const match of matches) {
            let overlapping = false;

            for (const existing of filtered) {
                const dx = Math.abs(match.location.x - existing.location.x);
                const dy = Math.abs(match.location.y - existing.location.y);
                const avgSize = (match.templateSize.width + existing.templateSize.width) / 2;

                if (dx < avgSize * overlapThreshold && dy < avgSize * overlapThreshold) {
                    overlapping = true;
                    break;
                }
            }

            if (!overlapping) {
                filtered.push(match);
            }
        }

        return filtered;
    }

    // Configuration methods

    setDetectionMethod(method) {
        if (this.detectionMethods.includes(method)) {
            this.currentMethod = method;
            return true;
        }
        return false;
    }

    setParameters(method, params) {
        if (this.params[method]) {
            Object.assign(this.params[method], params);
            return true;
        }
        return false;
    }

    getQualityMetrics() {
        return { ...this.qualityMetrics };
    }
}