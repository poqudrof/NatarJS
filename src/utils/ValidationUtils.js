/**
 * ValidationUtils - Utility functions for validation and quality assessment
 * Provides user-friendly validation helpers for the calibration system
 */

export class ValidationUtils {
    /**
     * Validate camera resolution
     */
    static validateResolution(width, height) {
        const result = {
            isValid: false,
            level: 'unknown',
            message: '',
            recommendations: []
        };

        if (!width || !height || width <= 0 || height <= 0) {
            result.message = 'Invalid resolution values';
            return result;
        }

        result.isValid = true;

        // Determine quality level
        if (width >= 1920 && height >= 1080) {
            result.level = 'excellent';
            result.message = 'Excellent resolution for high-precision calibration';
        } else if (width >= 1280 && height >= 720) {
            result.level = 'good';
            result.message = 'Good resolution - recommended for most calibrations';
            result.recommendations.push('This resolution provides a good balance of quality and speed');
        } else if (width >= 640 && height >= 480) {
            result.level = 'fair';
            result.message = 'Fair resolution - adequate for basic calibration';
            result.recommendations.push('Consider using higher resolution for better accuracy');
        } else {
            result.level = 'poor';
            result.message = 'Low resolution - may affect calibration accuracy';
            result.recommendations.push('Use at least 640×480 resolution for reliable calibration');
        }

        // Additional recommendations based on aspect ratio
        const aspectRatio = width / height;
        if (Math.abs(aspectRatio - 16/9) < 0.1) {
            result.recommendations.push('16:9 aspect ratio is ideal for calibration');
        } else if (Math.abs(aspectRatio - 4/3) < 0.1) {
            result.recommendations.push('4:3 aspect ratio works well for calibration');
        }

        return result;
    }

    /**
     * Validate image quality metrics
     */
    static validateImageQuality(brightness, contrast, sharpness) {
        const result = {
            overall: 'unknown',
            issues: [],
            recommendations: [],
            scores: {
                brightness: this._scoreValue(brightness, 50, 200, 'brightness'),
                contrast: this._scoreValue(contrast, 30, Infinity, 'contrast'),
                sharpness: this._scoreValue(sharpness, 0.1, Infinity, 'sharpness')
            }
        };

        // Check brightness
        if (brightness < 50) {
            result.issues.push('Image too dark');
            result.recommendations.push('💡 Increase lighting or move to a brighter area');
        } else if (brightness > 200) {
            result.issues.push('Image too bright');
            result.recommendations.push('🔆 Reduce lighting or move away from direct light sources');
        }

        // Check contrast
        if (contrast < 30) {
            result.issues.push('Low contrast');
            result.recommendations.push('📊 Ensure good contrast between black and white pattern squares');
        }

        // Check sharpness
        if (sharpness < 0.1) {
            result.issues.push('Image blurry');
            result.recommendations.push('🎯 Hold camera steady and ensure pattern is in focus');
        }

        // Determine overall quality
        const scores = Object.values(result.scores);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        if (averageScore >= 0.8) {
            result.overall = 'excellent';
        } else if (averageScore >= 0.6) {
            result.overall = 'good';
        } else if (averageScore >= 0.4) {
            result.overall = 'fair';
        } else {
            result.overall = 'poor';
        }

        return result;
    }

    /**
     * Validate calibration pattern detection
     */
    static validatePatternDetection(corners, imageWidth, imageHeight, expectedPattern = { width: 9, height: 6 }) {
        const result = {
            isValid: false,
            quality: 'unknown',
            issues: [],
            recommendations: []
        };

        if (!corners || corners.length === 0) {
            result.issues.push('No pattern detected');
            result.recommendations.push('📐 Ensure the entire checkerboard pattern is visible');
            result.recommendations.push('💡 Check lighting - pattern needs good contrast');
            return result;
        }

        const expectedCorners = expectedPattern.width * expectedPattern.height;
        if (corners.length !== expectedCorners * 2) { // x, y pairs
            result.issues.push(`Incorrect number of corners detected: ${corners.length/2}/${expectedCorners}`);
            result.recommendations.push('🔍 Make sure the entire pattern is visible in the camera view');
            return result;
        }

        result.isValid = true;

        // Analyze pattern geometry
        const geometryResult = this._analyzePatternGeometry(corners, imageWidth, imageHeight);
        result.quality = geometryResult.quality;
        result.issues.push(...geometryResult.issues);
        result.recommendations.push(...geometryResult.recommendations);

        return result;
    }

    /**
     * Validate calibration results
     */
    static validateCalibrationResults(reprojectionError, imageCount, minImages = 10) {
        const result = {
            isValid: false,
            quality: 'unknown',
            issues: [],
            recommendations: []
        };

        // Check image count
        if (imageCount < minImages) {
            result.issues.push(`Insufficient images: ${imageCount}/${minImages}`);
            result.recommendations.push(`📸 Capture at least ${minImages} images for reliable calibration`);
            return result;
        }

        // Check reprojection error
        if (reprojectionError > 2.0) {
            result.issues.push('High reprojection error');
            result.recommendations.push('🔄 Consider recalibrating with better image quality');
        }

        result.isValid = true;

        // Determine quality based on reprojection error
        if (reprojectionError < 0.5) {
            result.quality = 'excellent';
            result.recommendations.push('🌟 Excellent calibration quality - perfect for precision work');
        } else if (reprojectionError < 1.0) {
            result.quality = 'good';
            result.recommendations.push('✅ Good calibration quality - suitable for most applications');
        } else if (reprojectionError < 2.0) {
            result.quality = 'fair';
            result.recommendations.push('⚠️ Fair calibration quality - may want to improve for critical applications');
        } else {
            result.quality = 'poor';
            result.recommendations.push('❌ Poor calibration quality - recommend recalibrating');
        }

        // Additional recommendations based on image count
        if (imageCount >= 20) {
            result.recommendations.push('📊 Excellent image count - should provide robust calibration');
        } else if (imageCount >= 15) {
            result.recommendations.push('📈 Good image count for accurate calibration');
        }

        return result;
    }

    /**
     * Get user-friendly calibration advice
     */
    static getCalibrationAdvice(step, context = {}) {
        const advice = {
            setup: {
                title: 'Camera Setup Tips',
                tips: [
                    '📱 Use the back-facing camera if available (better for calibration)',
                    '🎯 Choose HD resolution (1280×720) for best balance of quality and speed',
                    '💡 Ensure good lighting in your workspace',
                    '🖥️ Use a stable surface or tripod if possible'
                ]
            },
            capture: {
                title: 'Image Capture Tips',
                tips: [
                    '📐 Print the checkerboard pattern on regular paper',
                    '📏 Mount the pattern on cardboard for easier handling',
                    '🔄 Capture from various angles (straight on, tilted, rotated)',
                    '📏 Vary the distance (close, medium, far)',
                    '⚡ Move slowly to avoid motion blur',
                    '🎯 Ensure the entire pattern is visible in each shot'
                ]
            },
            quality: {
                title: 'Quality Improvement Tips',
                tips: [
                    '💡 If too dark: move to brighter area or add lighting',
                    '🔆 If too bright: move away from direct light or close curtains',
                    '📊 If low contrast: check pattern quality and lighting angle',
                    '🎯 If blurry: hold camera steady and wait for autofocus',
                    '🔍 If pattern not detected: ensure full pattern is visible'
                ]
            },
            results: {
                title: 'Understanding Results',
                tips: [
                    '🌟 Reprojection error < 0.5 pixels = Excellent',
                    '✅ Reprojection error < 1.0 pixels = Good',
                    '⚠️ Reprojection error < 2.0 pixels = Fair',
                    '❌ Reprojection error > 2.0 pixels = Poor (recalibrate)',
                    '📸 More images (15-20) generally improve accuracy',
                    '🔄 If results are poor, try with better lighting and more varied positions'
                ]
            }
        };

        return advice[step] || { title: 'General Tips', tips: [] };
    }

    /**
     * Check if device/browser is suitable for calibration
     */
    static validateEnvironment() {
        const result = {
            isSupported: true,
            issues: [],
            recommendations: []
        };

        // Check browser capabilities
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            result.isSupported = false;
            result.issues.push('Camera access not supported');
            result.recommendations.push('Use a modern browser like Chrome, Firefox, or Safari');
        }

        if (typeof cv === 'undefined') {
            result.isSupported = false;
            result.issues.push('OpenCV.js not loaded');
            result.recommendations.push('Ensure internet connection and reload the page');
        }

        // Check device type
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        if (isMobile) {
            result.recommendations.push('📱 Mobile detected - use landscape orientation for better results');
            result.recommendations.push('🔋 Ensure good battery level for extended calibration session');
        }

        // Check screen size
        if (window.innerWidth < 768) {
            result.recommendations.push('📺 Small screen detected - consider using a larger device if possible');
        }

        return result;
    }

    // Private helper methods

    static _scoreValue(value, min, max, type) {
        if (value < min) return 0;
        if (max !== Infinity && value > max) return type === 'brightness' ? 0 : 1;

        if (type === 'brightness') {
            // Brightness has an optimal range
            const optimal = (min + Math.min(max, 200)) / 2;
            const distance = Math.abs(value - optimal);
            const range = optimal - min;
            return Math.max(0, 1 - distance / range);
        } else {
            // For contrast and sharpness, more is generally better
            return Math.min(1, (value - min) / (min * 2));
        }
    }

    static _analyzePatternGeometry(corners, imageWidth, imageHeight) {
        const result = {
            quality: 'unknown',
            issues: [],
            recommendations: []
        };

        // Calculate pattern bounding box
        const xCoords = corners.filter((_, i) => i % 2 === 0);
        const yCoords = corners.filter((_, i) => i % 2 === 1);

        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);

        const patternWidth = maxX - minX;
        const patternHeight = maxY - minY;
        const patternArea = patternWidth * patternHeight;
        const imageArea = imageWidth * imageHeight;
        const areaRatio = patternArea / imageArea;

        // Analyze size
        if (areaRatio < 0.1) {
            result.issues.push('Pattern too small');
            result.recommendations.push('📏 Move the pattern closer to the camera');
        } else if (areaRatio > 0.8) {
            result.issues.push('Pattern too large');
            result.recommendations.push('📏 Move the pattern further from the camera');
        }

        // Analyze position
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const imageCenterX = imageWidth / 2;
        const imageCenterY = imageHeight / 2;

        const offsetX = Math.abs(centerX - imageCenterX) / imageWidth;
        const offsetY = Math.abs(centerY - imageCenterY) / imageHeight;

        if (offsetX > 0.3 || offsetY > 0.3) {
            result.recommendations.push('🎯 Try centering the pattern in the camera view');
        }

        // Determine overall quality
        if (areaRatio >= 0.2 && areaRatio <= 0.6 && offsetX <= 0.2 && offsetY <= 0.2) {
            result.quality = 'excellent';
        } else if (areaRatio >= 0.15 && areaRatio <= 0.7 && offsetX <= 0.3 && offsetY <= 0.3) {
            result.quality = 'good';
        } else if (areaRatio >= 0.1 && areaRatio <= 0.8) {
            result.quality = 'fair';
        } else {
            result.quality = 'poor';
        }

        return result;
    }
}