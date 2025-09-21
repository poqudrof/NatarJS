/**
 * Camera Setup and Configuration System
 * Handles camera detection, resolution testing, and configuration management
 */

export class CameraSetup {
    constructor() {
        this.availableDevices = [];
        this.currentStream = null;
        this.testResults = {};
        this.isTestActive = false;
        this.callbacks = {
            onDevicesChanged: null,
            onTestComplete: null,
            onError: null
        };
    }

    /**
     * Initialize camera setup system
     */
    async initialize() {
        try {
            await this.requestPermissions();
            await this.detectDevices();
            this.setupDeviceChangeListener();
            return { success: true };
        } catch (error) {
            console.error('Camera setup initialization failed:', error);
            return {
                success: false,
                error: error.message,
                userMessage: this.getUserFriendlyError(error)
            };
        }
    }

    /**
     * Request camera permissions
     */
    async requestPermissions() {
        try {
            // Request minimal permission first
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240 }
            });

            // Stop the stream immediately - we just needed permission
            stream.getTracks().forEach(track => track.stop());

            return true;
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Camera permission denied. Please allow camera access and refresh the page.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No camera found. Please connect a camera and refresh the page.');
            } else {
                throw new Error(`Camera access failed: ${error.message}`);
            }
        }
    }

    /**
     * Detect all available camera devices
     */
    async detectDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            this.availableDevices = await Promise.all(
                videoDevices.map(async (device, index) => {
                    const capabilities = await this.getDeviceCapabilities(device.deviceId);
                    return {
                        deviceId: device.deviceId,
                        groupId: device.groupId,
                        label: device.label || `Camera ${index + 1}`,
                        capabilities,
                        isRecommended: index === 0, // First camera as default
                        description: this.generateDeviceDescription(capabilities)
                    };
                })
            );

            if (this.callbacks.onDevicesChanged) {
                this.callbacks.onDevicesChanged(this.availableDevices);
            }

            return this.availableDevices;
        } catch (error) {
            console.error('Device detection failed:', error);
            throw new Error('Failed to detect camera devices');
        }
    }

    /**
     * Get device capabilities including supported resolutions
     */
    async getDeviceCapabilities(deviceId) {
        try {
            // Test stream to get capabilities
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } }
            });

            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            const settings = track.getSettings();

            // Stop test stream
            stream.getTracks().forEach(track => track.stop());

            // Generate supported resolutions
            const supportedResolutions = this.generateSupportedResolutions(capabilities);

            return {
                width: capabilities.width || { min: 320, max: 1920 },
                height: capabilities.height || { min: 240, max: 1080 },
                frameRate: capabilities.frameRate || { min: 15, max: 60 },
                supportedResolutions,
                currentSettings: settings,
                facingMode: capabilities.facingMode,
                deviceId: capabilities.deviceId
            };
        } catch (error) {
            console.warn(`Could not get capabilities for device ${deviceId}:`, error);
            // Return default capabilities
            return {
                width: { min: 320, max: 1920 },
                height: { min: 240, max: 1080 },
                frameRate: { min: 15, max: 30 },
                supportedResolutions: this.getDefaultResolutions(),
                facingMode: ['user']
            };
        }
    }

    /**
     * Generate supported resolution list based on capabilities
     */
    generateSupportedResolutions(capabilities) {
        const standardResolutions = [
            { name: '480p', width: 640, height: 480, quality: 'Standard' },
            { name: '720p', width: 1280, height: 720, quality: 'HD' },
            { name: '1080p', width: 1920, height: 1080, quality: 'Full HD' },
            { name: '4K', width: 3840, height: 2160, quality: 'Ultra HD' }
        ];

        const maxWidth = capabilities.width?.max || 1920;
        const maxHeight = capabilities.height?.max || 1080;

        return standardResolutions.filter(res =>
            res.width <= maxWidth && res.height <= maxHeight
        ).map(res => ({
            ...res,
            recommended: res.width === 1280 && res.height === 720,
            performance: this.getPerformanceRating(res.width * res.height)
        }));
    }

    /**
     * Get default resolutions for fallback
     */
    getDefaultResolutions() {
        return [
            { name: '480p', width: 640, height: 480, quality: 'Standard', performance: 'Fast' },
            { name: '720p', width: 1280, height: 720, quality: 'HD', performance: 'Balanced', recommended: true },
            { name: '1080p', width: 1920, height: 1080, quality: 'Full HD', performance: 'Slow' }
        ];
    }

    /**
     * Get performance rating based on resolution
     */
    getPerformanceRating(pixels) {
        if (pixels <= 640 * 480) return 'Fast';
        if (pixels <= 1280 * 720) return 'Balanced';
        if (pixels <= 1920 * 1080) return 'Slow';
        return 'Very Slow';
    }

    /**
     * Generate device description
     */
    generateDeviceDescription(capabilities) {
        const maxRes = Math.max(capabilities.width?.max || 0, capabilities.height?.max || 0);
        if (maxRes >= 3840) return 'Ultra HD camera with 4K support';
        if (maxRes >= 1920) return 'Full HD camera with 1080p support';
        if (maxRes >= 1280) return 'HD camera with 720p support';
        return 'Standard definition camera';
    }

    /**
     * Test camera configuration
     */
    async testConfiguration(deviceId, resolution) {
        try {
            this.isTestActive = true;
            const startTime = performance.now();

            // Stop any existing stream
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }

            // Start new stream with specified configuration
            const constraints = {
                video: {
                    deviceId: { exact: deviceId },
                    width: { exact: resolution.width },
                    height: { exact: resolution.height },
                    frameRate: { ideal: 30 }
                }
            };

            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            const track = this.currentStream.getVideoTracks()[0];
            const settings = track.getSettings();

            // Measure initialization time
            const initTime = performance.now() - startTime;

            // Create video element for testing
            const video = document.createElement('video');
            video.srcObject = this.currentStream;
            video.play();

            // Wait for video to load and measure
            await new Promise((resolve, reject) => {
                video.onloadedmetadata = () => {
                    const metrics = this.measureStreamQuality(video, track);

                    this.testResults = {
                        success: true,
                        deviceId,
                        resolution,
                        actualSettings: settings,
                        metrics: {
                            ...metrics,
                            initTime: Math.round(initTime),
                            timestamp: new Date().toISOString()
                        },
                        stream: this.currentStream,
                        recommendations: this.generateRecommendations(settings, metrics)
                    };

                    if (this.callbacks.onTestComplete) {
                        this.callbacks.onTestComplete(this.testResults);
                    }

                    resolve(this.testResults);
                };

                video.onerror = () => {
                    reject(new Error('Video stream failed to load'));
                };

                // Timeout after 10 seconds
                setTimeout(() => {
                    reject(new Error('Video stream test timeout'));
                }, 10000);
            });

            return this.testResults;

        } catch (error) {
            console.error('Camera test failed:', error);

            const failureResult = {
                success: false,
                error: error.message,
                userMessage: this.getUserFriendlyError(error),
                deviceId,
                resolution
            };

            if (this.callbacks.onTestComplete) {
                this.callbacks.onTestComplete(failureResult);
            }

            return failureResult;
        } finally {
            this.isTestActive = false;
        }
    }

    /**
     * Measure stream quality metrics
     */
    measureStreamQuality(video, track) {
        const settings = track.getSettings();

        return {
            actualWidth: settings.width,
            actualHeight: settings.height,
            actualFrameRate: settings.frameRate,
            aspectRatio: (settings.width / settings.height).toFixed(2),
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            buffered: video.buffered.length > 0 ? video.buffered.end(0) : 0
        };
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations(settings, metrics) {
        const recommendations = [];

        // Resolution recommendations
        if (settings.width !== metrics.videoWidth || settings.height !== metrics.videoHeight) {
            recommendations.push('Actual resolution differs from requested. Camera may not support exact resolution.');
        }

        // Frame rate recommendations
        if (settings.frameRate < 25) {
            recommendations.push('Frame rate is low. Consider reducing resolution for better performance.');
        }

        // Performance recommendations
        const pixels = settings.width * settings.height;
        if (pixels > 1920 * 1080 && settings.frameRate < 30) {
            recommendations.push('High resolution detected with low frame rate. Consider 1080p for better performance.');
        }

        if (recommendations.length === 0) {
            recommendations.push('Configuration looks good! Ready for calibration.');
        }

        return recommendations;
    }

    /**
     * Get current camera stream
     */
    getCurrentStream() {
        return this.currentStream;
    }

    /**
     * Stop current camera stream
     */
    stopCurrentStream() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        this.isTestActive = false;
    }

    /**
     * Check if camera test is currently running
     */
    isTestRunning() {
        return this.isTestActive;
    }

    /**
     * Set up device change listener
     */
    setupDeviceChangeListener() {
        navigator.mediaDevices.addEventListener('devicechange', async () => {
            console.log('Camera devices changed, re-detecting...');
            await this.detectDevices();
        });
    }

    /**
     * Set callbacks
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Get available devices
     */
    getAvailableDevices() {
        return this.availableDevices;
    }

    /**
     * Get test results
     */
    getTestResults() {
        return this.testResults;
    }

    /**
     * Convert technical errors to user-friendly messages
     */
    getUserFriendlyError(error) {
        const errorMap = {
            'NotAllowedError': 'Camera access was denied. Please allow camera access and refresh the page.',
            'NotFoundError': 'No camera was found. Please connect a camera and try again.',
            'NotReadableError': 'Camera is already in use by another application.',
            'OverconstrainedError': 'Camera does not support the requested resolution.',
            'SecurityError': 'Camera access blocked due to security settings.',
            'AbortError': 'Camera operation was cancelled.',
            'TypeError': 'Camera configuration error. Please try different settings.'
        };

        return errorMap[error.name] || `Camera error: ${error.message}`;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopCurrentStream();
        this.availableDevices = [];
        this.testResults = {};
    }
}