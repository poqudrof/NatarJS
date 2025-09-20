/**
 * ResolutionDetector - Auto-detection for projector resolution
 * Provides multiple methods to detect optimal projector resolution
 */

export class ResolutionDetector {
    constructor() {
        this.detectedResolutions = [];
        this.recommendedResolution = null;
        this.supportedResolutions = [
            // 4K resolutions
            { width: 3840, height: 2160, name: '4K UHD', category: 'ultra-high' },
            { width: 4096, height: 2160, name: '4K Cinema', category: 'ultra-high' },

            // 2K resolutions
            { width: 2560, height: 1440, name: '2K QHD', category: 'high' },
            { width: 2048, height: 1080, name: '2K Cinema', category: 'high' },

            // Full HD
            { width: 1920, height: 1080, name: 'Full HD 1080p', category: 'standard' },
            { width: 1920, height: 1200, name: 'WUXGA', category: 'standard' },

            // HD
            { width: 1680, height: 1050, name: 'WSXGA+', category: 'standard' },
            { width: 1600, height: 1200, name: 'UXGA', category: 'standard' },
            { width: 1440, height: 900, name: 'WXGA+', category: 'standard' },
            { width: 1366, height: 768, name: 'HD 768p', category: 'basic' },
            { width: 1280, height: 1024, name: 'SXGA', category: 'basic' },
            { width: 1280, height: 800, name: 'WXGA', category: 'basic' },
            { width: 1280, height: 720, name: 'HD 720p', category: 'basic' },

            // Standard resolutions
            { width: 1024, height: 768, name: 'XGA', category: 'legacy' },
            { width: 800, height: 600, name: 'SVGA', category: 'legacy' },
            { width: 640, height: 480, name: 'VGA', category: 'legacy' }
        ];
    }

    /**
     * Perform comprehensive resolution detection
     */
    async detectOptimalResolution(projectorWindow = null) {
        const results = {
            success: false,
            detectedResolutions: [],
            recommendedResolution: null,
            detectionMethods: [],
            confidence: 'unknown',
            message: ''
        };

        try {
            // Method 1: Screen API detection
            const screenResults = await this._detectUsingScreenAPI();
            if (screenResults.success) {
                results.detectionMethods.push(screenResults);
                results.detectedResolutions.push(...screenResults.resolutions);
            }

            // Method 2: Projector window detection
            if (projectorWindow && !projectorWindow.closed) {
                const windowResults = this._detectUsingWindow(projectorWindow);
                if (windowResults.success) {
                    results.detectionMethods.push(windowResults);
                    results.detectedResolutions.push(...windowResults.resolutions);
                }
            }

            // Method 3: CSS media query detection
            const mediaResults = this._detectUsingMediaQueries();
            if (mediaResults.success) {
                results.detectionMethods.push(mediaResults);
                results.detectedResolutions.push(...mediaResults.resolutions);
            }

            // Method 4: Browser capability detection
            const capabilityResults = this._detectUsingCapabilities();
            if (capabilityResults.success) {
                results.detectionMethods.push(capabilityResults);
                results.detectedResolutions.push(...capabilityResults.resolutions);
            }

            // Analyze results and recommend best resolution
            if (results.detectedResolutions.length > 0) {
                const analysis = this._analyzeDetectedResolutions(results.detectedResolutions);
                results.recommendedResolution = analysis.recommended;
                results.confidence = analysis.confidence;
                results.success = true;
                results.message = `Detected ${results.detectedResolutions.length} resolution(s), recommended: ${analysis.recommended.name}`;
            } else {
                // Fallback to safe defaults
                results.recommendedResolution = this.supportedResolutions.find(r => r.name === 'Full HD 1080p');
                results.confidence = 'low';
                results.success = true;
                results.message = 'No specific resolution detected, using safe default: Full HD 1080p';
            }

            this.detectedResolutions = results.detectedResolutions;
            this.recommendedResolution = results.recommendedResolution;

            return results;

        } catch (error) {
            results.error = error.message;
            results.message = 'Resolution detection failed, using fallback';
            results.recommendedResolution = this.supportedResolutions.find(r => r.name === 'HD 720p');
            return results;
        }
    }

    /**
     * Get user-friendly resolution recommendations
     */
    getResolutionRecommendations() {
        const recommendations = {
            optimal: [],
            alternative: [],
            notRecommended: []
        };

        this.supportedResolutions.forEach(resolution => {
            const analysis = this._analyzeResolution(resolution);

            if (analysis.score >= 0.8) {
                recommendations.optimal.push({
                    ...resolution,
                    ...analysis,
                    description: this._getResolutionDescription(resolution)
                });
            } else if (analysis.score >= 0.5) {
                recommendations.alternative.push({
                    ...resolution,
                    ...analysis,
                    description: this._getResolutionDescription(resolution)
                });
            } else {
                recommendations.notRecommended.push({
                    ...resolution,
                    ...analysis,
                    description: this._getResolutionDescription(resolution)
                });
            }
        });

        return recommendations;
    }

    /**
     * Test if specific resolution is supported
     */
    async testResolution(width, height, projectorWindow) {
        const testResult = {
            resolution: { width, height },
            supported: false,
            actualSize: null,
            quality: 'unknown',
            issues: []
        };

        try {
            if (!projectorWindow || projectorWindow.closed) {
                testResult.issues.push('No projector window available for testing');
                return testResult;
            }

            // Store original size
            const originalWidth = projectorWindow.innerWidth;
            const originalHeight = projectorWindow.innerHeight;

            // Try to resize to test resolution
            projectorWindow.resizeTo(width, height);

            // Wait for resize to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check actual resulting size
            const actualWidth = projectorWindow.innerWidth;
            const actualHeight = projectorWindow.innerHeight;

            testResult.actualSize = { width: actualWidth, height: actualHeight };

            // Check if resize was successful
            const widthMatch = Math.abs(actualWidth - width) <= 10;
            const heightMatch = Math.abs(actualHeight - height) <= 10;

            if (widthMatch && heightMatch) {
                testResult.supported = true;
                testResult.quality = 'excellent';
            } else if (actualWidth >= width * 0.9 && actualHeight >= height * 0.9) {
                testResult.supported = true;
                testResult.quality = 'good';
                testResult.issues.push('Resolution approximately supported');
            } else {
                testResult.supported = false;
                testResult.quality = 'poor';
                testResult.issues.push('Resolution not supported or restricted');
            }

            // Restore original size
            projectorWindow.resizeTo(originalWidth, originalHeight);

        } catch (error) {
            testResult.issues.push(`Test failed: ${error.message}`);
        }

        return testResult;
    }

    /**
     * Get resolution by name
     */
    getResolutionByName(name) {
        return this.supportedResolutions.find(r => r.name === name);
    }

    /**
     * Get resolutions by category
     */
    getResolutionsByCategory(category) {
        return this.supportedResolutions.filter(r => r.category === category);
    }

    // Private detection methods

    async _detectUsingScreenAPI() {
        const result = {
            method: 'Screen API',
            success: false,
            resolutions: [],
            details: {}
        };

        try {
            // Basic screen detection
            const basicResolution = {
                width: screen.width,
                height: screen.height,
                source: 'screen.width/height',
                confidence: 0.7
            };
            result.resolutions.push(basicResolution);

            // Advanced Screen API if available
            if ('getScreenDetails' in window) {
                const screenDetails = await window.getScreenDetails();
                screenDetails.screens.forEach((screen, index) => {
                    result.resolutions.push({
                        width: screen.width,
                        height: screen.height,
                        source: `Screen API - Display ${index + 1}`,
                        confidence: 0.9,
                        isPrimary: screen.isPrimary,
                        label: screen.label
                    });
                });
            }

            result.success = true;
            result.details.screenCount = result.resolutions.length;

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    _detectUsingWindow(projectorWindow) {
        const result = {
            method: 'Window Detection',
            success: false,
            resolutions: [],
            details: {}
        };

        try {
            // Current window size
            const currentResolution = {
                width: projectorWindow.innerWidth,
                height: projectorWindow.innerHeight,
                source: 'projector window',
                confidence: 0.8
            };
            result.resolutions.push(currentResolution);

            // Available space
            const availableResolution = {
                width: projectorWindow.screen.availWidth,
                height: projectorWindow.screen.availHeight,
                source: 'available screen space',
                confidence: 0.7
            };
            result.resolutions.push(availableResolution);

            result.success = true;
            result.details.windowPosition = {
                x: projectorWindow.screenX,
                y: projectorWindow.screenY
            };

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    _detectUsingMediaQueries() {
        const result = {
            method: 'CSS Media Queries',
            success: false,
            resolutions: [],
            details: {}
        };

        try {
            const testQueries = [
                { query: '(min-width: 3840px)', width: 3840, height: 2160 },
                { query: '(min-width: 2560px)', width: 2560, height: 1440 },
                { query: '(min-width: 1920px)', width: 1920, height: 1080 },
                { query: '(min-width: 1680px)', width: 1680, height: 1050 },
                { query: '(min-width: 1366px)', width: 1366, height: 768 },
                { query: '(min-width: 1280px)', width: 1280, height: 720 }
            ];

            testQueries.forEach(test => {
                if (window.matchMedia(test.query).matches) {
                    result.resolutions.push({
                        width: test.width,
                        height: test.height,
                        source: 'CSS media query',
                        confidence: 0.6,
                        query: test.query
                    });
                }
            });

            result.success = result.resolutions.length > 0;
            result.details.queriesMatched = result.resolutions.length;

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    _detectUsingCapabilities() {
        const result = {
            method: 'Browser Capabilities',
            success: false,
            resolutions: [],
            details: {}
        };

        try {
            // Device pixel ratio considerations
            const dpr = window.devicePixelRatio || 1;
            const logicalWidth = screen.width / dpr;
            const logicalHeight = screen.height / dpr;

            if (logicalWidth !== screen.width || logicalHeight !== screen.height) {
                result.resolutions.push({
                    width: Math.round(logicalWidth),
                    height: Math.round(logicalHeight),
                    source: 'logical resolution (DPR adjusted)',
                    confidence: 0.7,
                    devicePixelRatio: dpr
                });
            }

            // Browser viewport
            result.resolutions.push({
                width: window.innerWidth,
                height: window.innerHeight,
                source: 'browser viewport',
                confidence: 0.5
            });

            result.success = true;
            result.details.devicePixelRatio = dpr;

        } catch (error) {
            result.error = error.message;
        }

        return result;
    }

    _analyzeDetectedResolutions(detectedResolutions) {
        // Find the most common resolution
        const resolutionCounts = new Map();

        detectedResolutions.forEach(res => {
            const key = `${res.width}x${res.height}`;
            const current = resolutionCounts.get(key) || { count: 0, confidence: 0, resolution: res };
            current.count += 1;
            current.confidence += res.confidence;
            resolutionCounts.set(key, current);
        });

        // Find best match from supported resolutions
        let bestMatch = null;
        let bestScore = 0;

        this.supportedResolutions.forEach(supported => {
            const key = `${supported.width}x${supported.height}`;
            const detected = resolutionCounts.get(key);

            if (detected) {
                const score = detected.confidence / detected.count;
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = supported;
                }
            }
        });

        // If no exact match, find closest
        if (!bestMatch && detectedResolutions.length > 0) {
            const avgResolution = detectedResolutions.reduce((acc, res) => ({
                width: acc.width + res.width / detectedResolutions.length,
                height: acc.height + res.height / detectedResolutions.length
            }), { width: 0, height: 0 });

            bestMatch = this._findClosestResolution(avgResolution.width, avgResolution.height);
        }

        return {
            recommended: bestMatch || this.supportedResolutions.find(r => r.name === 'Full HD 1080p'),
            confidence: bestScore > 0.7 ? 'high' : bestScore > 0.4 ? 'medium' : 'low',
            analysisDetails: {
                detectionsCount: detectedResolutions.length,
                bestScore: bestScore
            }
        };
    }

    _analyzeResolution(resolution) {
        const totalPixels = resolution.width * resolution.height;
        const aspectRatio = resolution.width / resolution.height;

        let score = 0;

        // Pixel count scoring
        if (totalPixels >= 8294400) score += 0.4; // 4K
        else if (totalPixels >= 2073600) score += 0.3; // 1080p+
        else if (totalPixels >= 921600) score += 0.2; // 720p+
        else score += 0.1;

        // Aspect ratio scoring (16:9 is ideal)
        const idealAspectRatio = 16/9;
        const aspectDiff = Math.abs(aspectRatio - idealAspectRatio);
        if (aspectDiff < 0.1) score += 0.3;
        else if (aspectDiff < 0.3) score += 0.2;
        else score += 0.1;

        // Modern resolution scoring
        const modernResolutions = ['Full HD 1080p', '2K QHD', '4K UHD'];
        if (modernResolutions.includes(resolution.name)) score += 0.3;

        return {
            score: Math.min(score, 1.0),
            totalPixels,
            aspectRatio,
            isWidescreen: aspectRatio > 1.5
        };
    }

    _findClosestResolution(targetWidth, targetHeight) {
        let closest = null;
        let minDistance = Infinity;

        this.supportedResolutions.forEach(resolution => {
            const distance = Math.sqrt(
                Math.pow(resolution.width - targetWidth, 2) +
                Math.pow(resolution.height - targetHeight, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closest = resolution;
            }
        });

        return closest;
    }

    _getResolutionDescription(resolution) {
        const descriptions = {
            'ultra-high': 'Best quality for high-precision calibration, requires powerful hardware',
            'high': 'Excellent quality for professional applications',
            'standard': 'Good quality for most calibration needs',
            'basic': 'Adequate quality for basic calibration',
            'legacy': 'Minimal quality, only for legacy equipment'
        };

        return descriptions[resolution.category] || 'Unknown quality level';
    }
}