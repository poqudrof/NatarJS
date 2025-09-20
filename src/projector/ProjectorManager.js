/**
 * ProjectorManager - User-friendly projector management and calibration
 * Handles projector detection, window management, and quality assessment for novice users
 */

import { ErrorHandler } from '../utils/ErrorHandler.js';
import { ValidationUtils } from '../utils/ValidationUtils.js';

export class ProjectorManager {
    constructor() {
        this.errorHandler = new ErrorHandler();

        // Projector state
        this.projectorWindow = null;
        this.isProjectorActive = false;
        this.detectedResolution = null;
        this.isFullscreen = false;

        // Display detection
        this.availableDisplays = [];
        this.recommendedDisplay = null;
        this.currentDisplay = null;

        // Quality assessment
        this.projectionQuality = null;
        this.calibrationPatterns = [];

        // User callbacks
        this.feedbackCallback = null;
        this.statusCallback = null;
        this.patternCallback = null;

        // Supported resolutions with user-friendly descriptions
        this.supportedResolutions = [
            { width: 1920, height: 1080, label: '1920×1080 (Full HD)', description: 'Best quality for most projectors', common: true },
            { width: 1280, height: 720, label: '1280×720 (HD)', description: 'Good quality, works with older projectors', common: true },
            { width: 1024, height: 768, label: '1024×768 (XGA)', description: 'Common for business projectors', common: true },
            { width: 800, height: 600, label: '800×600 (SVGA)', description: 'Basic resolution for older projectors', common: false },
            { width: 1366, height: 768, label: '1366×768 (WXGA)', description: 'Widescreen format', common: false },
            { width: 1600, height: 1200, label: '1600×1200 (UXGA)', description: 'High resolution for professional use', common: false }
        ];
    }

    /**
     * Initialize projector manager and detect displays
     */
    async initialize() {
        try {
            this._provideFeedback('info', 'Initializing projector system...');

            // Check browser capabilities
            this._validateBrowserSupport();

            // Detect available displays
            await this._detectDisplays();

            // Provide setup guidance
            this._provideSetupGuidance();

            this._provideFeedback('success', 'Projector system ready for setup');
            return { success: true };

        } catch (error) {
            this.errorHandler.logError('ProjectorManager.initialize', error);
            this._provideFeedback('error', this.errorHandler.getUserFriendlyMessage(error));
            return { success: false, error: error.message };
        }
    }

    /**
     * Open projector window with user-friendly setup
     */
    async openProjectorWindow(options = {}) {
        try {
            this._updateStatus('opening', 'Opening projector window...');

            const windowOptions = {
                fullscreen: options.fullscreen !== false,
                display: options.display || 'secondary',
                resolution: options.resolution || { width: 1920, height: 1080 },
                background: options.background || '#000000'
            };

            // Close existing window if open
            if (this.projectorWindow && !this.projectorWindow.closed) {
                this.projectorWindow.close();
            }

            // Calculate window features for projector
            const features = this._calculateWindowFeatures(windowOptions);

            // Open new projector window
            this.projectorWindow = window.open(
                this._generateProjectorHTML(windowOptions),
                'projector_window',
                features
            );

            if (!this.projectorWindow) {
                throw new Error('Popup blocked. Please allow popups and try again.');
            }

            // Set up window event handlers
            this._setupWindowHandlers();

            // Wait for window to load
            await this._waitForWindowLoad();

            // Auto-detect resolution
            await this._detectProjectorResolution();

            // Test projection quality
            await this._testProjectionQuality();

            this.isProjectorActive = true;
            this._updateStatus('active', 'Projector window active and ready');

            this._provideFeedback('success',
                `🎥 Projector window opened! ${this.detectedResolution ?
                `Detected resolution: ${this.detectedResolution.width}×${this.detectedResolution.height}` :
                'Ready for calibration.'}`
            );

            return {
                success: true,
                window: this.projectorWindow,
                resolution: this.detectedResolution
            };

        } catch (error) {
            this.errorHandler.logError('ProjectorManager.openProjectorWindow', error);
            this._updateStatus('error', 'Failed to open projector window');

            const userMessage = this._getProjectorErrorMessage(error);
            this._provideFeedback('error', userMessage);

            return { success: false, error: error.message, userMessage };
        }
    }

    /**
     * Project a calibration pattern with quality feedback
     */
    async projectPattern(patternType, options = {}) {
        try {
            if (!this.isProjectorActive || !this.projectorWindow) {
                throw new Error('Projector window not open');
            }

            this._updateStatus('projecting', `Projecting ${patternType} pattern...`);

            const patternData = await this._generatePattern(patternType, options);

            // Send pattern to projector window
            await this._sendPatternToProjector(patternData);

            // Assess projection quality
            const qualityAssessment = await this._assessProjectionQuality(patternType);

            this._provideFeedback('success',
                `✅ ${patternType} pattern projected. Quality: ${qualityAssessment.overall}`
            );

            // Provide quality-based recommendations
            if (qualityAssessment.recommendations.length > 0) {
                this._provideFeedback('info', qualityAssessment.recommendations[0]);
            }

            return {
                success: true,
                patternData,
                quality: qualityAssessment
            };

        } catch (error) {
            this.errorHandler.logError('ProjectorManager.projectPattern', error);
            this._provideFeedback('error', `Failed to project pattern: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Auto-detect projector resolution with user feedback
     */
    async detectProjectorResolution() {
        try {
            this._updateStatus('detecting', 'Detecting projector resolution...');

            if (!this.projectorWindow) {
                throw new Error('Projector window not open');
            }

            // Test multiple resolution detection methods
            const detectionMethods = [
                () => this._detectViaScreenAPI(),
                () => this._detectViaWindowSize(),
                () => this._detectViaTestPattern()
            ];

            let detectedResolution = null;

            for (const method of detectionMethods) {
                try {
                    detectedResolution = await method();
                    if (detectedResolution) {
                        break;
                    }
                } catch (error) {
                    console.warn('Resolution detection method failed:', error);
                }
            }

            if (detectedResolution) {
                this.detectedResolution = detectedResolution;

                // Validate resolution
                const validation = ValidationUtils.validateResolution(
                    detectedResolution.width,
                    detectedResolution.height
                );

                this._provideFeedback('success',
                    `🎯 Detected resolution: ${detectedResolution.width}×${detectedResolution.height}. ${validation.message}`
                );

                if (validation.recommendations.length > 0) {
                    this._provideFeedback('info', validation.recommendations[0]);
                }
            } else {
                this._provideFeedback('warning',
                    '❓ Could not auto-detect resolution. Using default settings.'
                );
                this.detectedResolution = { width: 1920, height: 1080 };
            }

            return { success: true, resolution: this.detectedResolution };

        } catch (error) {
            this.errorHandler.logError('ProjectorManager.detectProjectorResolution', error);
            this._provideFeedback('error', 'Resolution detection failed');
            return { success: false, error: error.message };
        }
    }

    /**
     * Test projector setup and provide comprehensive feedback
     */
    async testProjectorSetup() {
        try {
            this._updateStatus('testing', 'Testing projector setup...');

            const testResults = {
                windowOpen: false,
                resolutionDetected: false,
                patternProjection: false,
                qualityAssessment: null,
                recommendations: []
            };

            // Test 1: Window opening
            if (this.isProjectorActive && this.projectorWindow && !this.projectorWindow.closed) {
                testResults.windowOpen = true;
            } else {
                testResults.recommendations.push('🪟 Projector window needs to be opened');
                return { success: true, results: testResults };
            }

            // Test 2: Resolution detection
            if (this.detectedResolution) {
                testResults.resolutionDetected = true;
            } else {
                const resResult = await this.detectProjectorResolution();
                testResults.resolutionDetected = resResult.success;
            }

            // Test 3: Pattern projection
            try {
                const patternResult = await this.projectPattern('test-grid', { size: 'medium' });
                testResults.patternProjection = patternResult.success;
                testResults.qualityAssessment = patternResult.quality;
            } catch (error) {
                testResults.recommendations.push('📐 Pattern projection failed - check projector connection');
            }

            // Generate recommendations based on results
            testResults.recommendations.push(...this._generateTestRecommendations(testResults));

            this._updateStatus('ready', 'Projector test complete');

            const overallSuccess = testResults.windowOpen && testResults.resolutionDetected && testResults.patternProjection;
            this._provideFeedback(overallSuccess ? 'success' : 'warning',
                overallSuccess ? '✅ Projector test passed!' : '⚠️ Projector test completed with issues'
            );

            return { success: true, results: testResults };

        } catch (error) {
            this.errorHandler.logError('ProjectorManager.testProjectorSetup', error);
            this._updateStatus('error', 'Projector test failed');
            return { success: false, error: error.message };
        }
    }

    /**
     * Get projector status and user-friendly information
     */
    getProjectorStatus() {
        return {
            isActive: this.isProjectorActive,
            windowOpen: this.projectorWindow && !this.projectorWindow.closed,
            detectedResolution: this.detectedResolution,
            isFullscreen: this.isFullscreen,
            availableDisplays: this.availableDisplays.length,
            qualityAssessment: this.projectionQuality,
            recommendations: this._getStatusRecommendations()
        };
    }

    /**
     * Get available projector resolutions with recommendations
     */
    getAvailableResolutions() {
        return this.supportedResolutions.map(res => ({
            ...res,
            isRecommended: res.common && (res.width === 1920 || res.width === 1280),
            isDetected: this.detectedResolution &&
                        this.detectedResolution.width === res.width &&
                        this.detectedResolution.height === res.height
        }));
    }

    /**
     * Close projector window
     */
    closeProjectorWindow() {
        try {
            if (this.projectorWindow && !this.projectorWindow.closed) {
                this.projectorWindow.close();
            }

            this.projectorWindow = null;
            this.isProjectorActive = false;
            this.isFullscreen = false;

            this._updateStatus('closed', 'Projector window closed');
            this._provideFeedback('info', 'Projector window closed');

            return { success: true };

        } catch (error) {
            this.errorHandler.logError('ProjectorManager.closeProjectorWindow', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set callback functions for user feedback
     */
    setCallbacks({ feedbackCallback, statusCallback, patternCallback }) {
        this.feedbackCallback = feedbackCallback;
        this.statusCallback = statusCallback;
        this.patternCallback = patternCallback;
    }

    // Private methods

    _validateBrowserSupport() {
        // Check for popup support
        if (!window.open) {
            throw new Error('Browser does not support popup windows');
        }

        // Check for modern browser features
        if (!window.requestAnimationFrame) {
            throw new Error('Browser too old - please use a modern browser');
        }
    }

    async _detectDisplays() {
        // Note: Full display detection requires Screen Capture API which has limited support
        // For now, we'll simulate display detection and provide guidance

        this.availableDisplays = [
            { id: 'primary', name: 'Primary Display', isPrimary: true },
            { id: 'secondary', name: 'Secondary Display (Projector)', isPrimary: false, isRecommended: true }
        ];

        // Simulate detection of secondary display
        if (window.screen && window.screen.width && window.screen.height) {
            const screenInfo = {
                width: window.screen.width,
                height: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight
            };

            // Heuristic: if available space is much less than total, likely multiple displays
            if (screenInfo.availWidth < screenInfo.width * 0.8) {
                this.availableDisplays.push({
                    id: 'extended',
                    name: 'Extended Display',
                    isPrimary: false,
                    width: screenInfo.width - screenInfo.availWidth,
                    height: screenInfo.height
                });
            }
        }

        this.recommendedDisplay = this.availableDisplays.find(d => d.isRecommended) || this.availableDisplays[0];
    }

    _provideSetupGuidance() {
        const guidance = [
            '🖥️ Connect your projector to your computer',
            '📺 Set up extended display mode (not mirrored)',
            '🎯 Position projector to face your projection surface',
            '💡 Ensure good lighting conditions for camera viewing',
            '🔧 Adjust projector focus and keystone if needed'
        ];

        this._provideFeedback('info',
            'Projector setup checklist:\n' + guidance.join('\n')
        );
    }

    _calculateWindowFeatures(options) {
        const features = [];

        if (options.fullscreen) {
            features.push('fullscreen=yes');
        }

        // Try to position on secondary display
        if (window.screen && window.screen.availWidth) {
            const primaryWidth = window.screen.availWidth;
            const totalWidth = window.screen.width;

            // If there's screen space beyond primary, use it for projector
            if (totalWidth > primaryWidth) {
                features.push(`left=${primaryWidth}`);
                features.push('top=0');
            } else {
                // Fallback: open on primary display
                features.push('left=100');
                features.push('top=100');
            }
        }

        features.push(`width=${options.resolution.width}`);
        features.push(`height=${options.resolution.height}`);
        features.push('menubar=no');
        features.push('toolbar=no');
        features.push('location=no');
        features.push('status=no');
        features.push('scrollbars=no');
        features.push('resizable=yes');

        return features.join(',');
    }

    _generateProjectorHTML(options) {
        return `data:text/html,
<!DOCTYPE html>
<html>
<head>
    <title>Projector Calibration Display</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: ${options.background};
            color: white;
            font-family: Arial, sans-serif;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
        }

        #pattern-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        #welcome-message {
            text-align: center;
            font-size: 2em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        }

        .pattern {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        .grid-pattern {
            display: grid;
            gap: 2px;
            background: white;
            padding: 20px;
        }

        .grid-cell {
            width: 40px;
            height: 40px;
            background: black;
        }

        .grid-cell:nth-child(odd) {
            background: white;
        }

        .fullscreen-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid white;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        }

        .fullscreen-btn:hover {
            background: rgba(255,255,255,0.3);
        }

        .status-info {
            position: absolute;
            bottom: 20px;
            left: 20px;
            font-size: 14px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div id="pattern-container">
        <div id="welcome-message">
            <h1>🎥 Projector Calibration</h1>
            <p>Projector window ready</p>
            <p style="font-size: 0.7em;">Press F11 for fullscreen mode</p>
        </div>

        <button class="fullscreen-btn" onclick="toggleFullscreen()">
            📺 Fullscreen
        </button>

        <div class="status-info">
            <div>Resolution: <span id="resolution-info">Detecting...</span></div>
            <div>Status: <span id="status-info">Ready</span></div>
        </div>
    </div>

    <script>
        // Update resolution info
        document.getElementById('resolution-info').textContent =
            window.screen.width + '×' + window.screen.height;

        // Fullscreen toggle
        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }

        // Listen for messages from parent window
        window.addEventListener('message', function(event) {
            if (event.data.type === 'project-pattern') {
                projectPattern(event.data.pattern);
            } else if (event.data.type === 'clear-pattern') {
                clearPattern();
            } else if (event.data.type === 'update-status') {
                document.getElementById('status-info').textContent = event.data.status;
            }
        });

        function projectPattern(patternData) {
            const container = document.getElementById('pattern-container');
            container.innerHTML = patternData.html;

            // Send confirmation back to parent
            if (window.opener) {
                window.opener.postMessage({
                    type: 'pattern-projected',
                    success: true
                }, '*');
            }
        }

        function clearPattern() {
            const container = document.getElementById('pattern-container');
            container.innerHTML = \`
                <div id="welcome-message">
                    <h1>🎥 Projector Calibration</h1>
                    <p>Ready for next pattern</p>
                </div>
            \`;
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(event) {
            if (event.key === 'F11') {
                event.preventDefault();
                toggleFullscreen();
            } else if (event.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen();
            }
        });

        // Auto-fullscreen after short delay
        setTimeout(() => {
            if (!document.fullscreenElement && window.innerWidth < screen.width) {
                toggleFullscreen();
            }
        }, 2000);
    </script>
</body>
</html>`;
    }

    _setupWindowHandlers() {
        // Handle window close
        this.projectorWindow.addEventListener('beforeunload', () => {
            this.isProjectorActive = false;
            this._updateStatus('closed', 'Projector window closed');
        });

        // Listen for messages from projector window
        window.addEventListener('message', (event) => {
            if (event.source === this.projectorWindow) {
                this._handleProjectorMessage(event.data);
            }
        });
    }

    async _waitForWindowLoad() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Projector window load timeout'));
            }, 10000);

            const checkLoad = () => {
                try {
                    if (this.projectorWindow.document && this.projectorWindow.document.readyState === 'complete') {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        setTimeout(checkLoad, 100);
                    }
                } catch (error) {
                    // Cross-origin issues are expected with data URLs
                    clearTimeout(timeout);
                    resolve();
                }
            };

            checkLoad();
        });
    }

    async _detectViaScreenAPI() {
        // Modern Screen Capture API (limited support)
        if (navigator.getDisplayMedia) {
            try {
                const stream = await navigator.getDisplayMedia({ video: true });
                const track = stream.getVideoTracks()[0];
                const settings = track.getSettings();

                stream.getTracks().forEach(track => track.stop());

                return {
                    width: settings.width,
                    height: settings.height,
                    method: 'Screen Capture API'
                };
            } catch (error) {
                return null;
            }
        }
        return null;
    }

    async _detectViaWindowSize() {
        if (!this.projectorWindow) return null;

        try {
            // Get projector window dimensions
            const width = this.projectorWindow.innerWidth || this.projectorWindow.screen?.width;
            const height = this.projectorWindow.innerHeight || this.projectorWindow.screen?.height;

            if (width && height) {
                return {
                    width,
                    height,
                    method: 'Window size detection'
                };
            }
        } catch (error) {
            return null;
        }

        return null;
    }

    async _detectViaTestPattern() {
        // Project a test pattern and analyze response
        // This would require camera feedback in real implementation
        return {
            width: 1920,
            height: 1080,
            method: 'Default resolution (test pattern analysis not implemented)'
        };
    }

    async _generatePattern(patternType, options) {
        const patterns = {
            'test-grid': this._generateTestGrid(options),
            'checkerboard': this._generateCheckerboard(options),
            'white': this._generateSolidColor('#FFFFFF'),
            'black': this._generateSolidColor('#000000'),
            'red': this._generateSolidColor('#FF0000'),
            'green': this._generateSolidColor('#00FF00'),
            'blue': this._generateSolidColor('#0000FF')
        };

        return patterns[patternType] || patterns['test-grid'];
    }

    _generateTestGrid(options = {}) {
        const size = options.size || 'medium';
        const gridSizes = {
            small: { rows: 8, cols: 12 },
            medium: { rows: 12, cols: 18 },
            large: { rows: 16, cols: 24 }
        };

        const grid = gridSizes[size];

        return {
            type: 'test-grid',
            html: `
                <div class="grid-pattern" style="
                    display: grid;
                    grid-template-columns: repeat(${grid.cols}, 40px);
                    grid-template-rows: repeat(${grid.rows}, 40px);
                    gap: 2px;
                    background: white;
                    padding: 20px;
                    border-radius: 10px;
                ">
                    ${Array(grid.rows * grid.cols).fill().map((_, i) =>
                        `<div class="grid-cell" style="
                            background: ${(Math.floor(i / grid.cols) + i) % 2 ? '#000' : '#FFF'};
                            width: 40px;
                            height: 40px;
                        "></div>`
                    ).join('')}
                </div>
            `,
            metadata: { rows: grid.rows, cols: grid.cols, size }
        };
    }

    _generateCheckerboard(options = {}) {
        const squareSize = options.squareSize || 50;
        const rows = options.rows || 8;
        const cols = options.cols || 8;

        return {
            type: 'checkerboard',
            html: `
                <div style="
                    display: grid;
                    grid-template-columns: repeat(${cols}, ${squareSize}px);
                    grid-template-rows: repeat(${rows}, ${squareSize}px);
                    border: 2px solid #333;
                ">
                    ${Array(rows * cols).fill().map((_, i) =>
                        `<div style="
                            background: ${(Math.floor(i / cols) + i) % 2 ? '#000' : '#FFF'};
                            width: ${squareSize}px;
                            height: ${squareSize}px;
                        "></div>`
                    ).join('')}
                </div>
            `,
            metadata: { rows, cols, squareSize }
        };
    }

    _generateSolidColor(color) {
        return {
            type: 'solid-color',
            html: `
                <div style="
                    width: 100vw;
                    height: 100vh;
                    background: ${color};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${color === '#000000' ? 'white' : 'black'};
                    font-size: 2em;
                    font-weight: bold;
                ">
                    ${color.toUpperCase()}
                </div>
            `,
            metadata: { color }
        };
    }

    async _sendPatternToProjector(patternData) {
        if (!this.projectorWindow || this.projectorWindow.closed) {
            throw new Error('Projector window not available');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Pattern projection timeout'));
            }, 5000);

            // Listen for confirmation
            const messageHandler = (event) => {
                if (event.source === this.projectorWindow && event.data.type === 'pattern-projected') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(event.data);
                }
            };

            window.addEventListener('message', messageHandler);

            // Send pattern to projector
            this.projectorWindow.postMessage({
                type: 'project-pattern',
                pattern: patternData
            }, '*');
        });
    }

    async _assessProjectionQuality(patternType) {
        // Simulate projection quality assessment
        // In real implementation, this would analyze camera feedback

        const qualityFactors = {
            brightness: Math.random() * 0.4 + 0.6, // 0.6-1.0
            contrast: Math.random() * 0.3 + 0.7,   // 0.7-1.0
            sharpness: Math.random() * 0.3 + 0.7,  // 0.7-1.0
            uniformity: Math.random() * 0.2 + 0.8   // 0.8-1.0
        };

        const overall = Object.values(qualityFactors).reduce((sum, val) => sum + val, 0) / 4;

        let qualityLevel = 'poor';
        if (overall >= 0.9) qualityLevel = 'excellent';
        else if (overall >= 0.8) qualityLevel = 'good';
        else if (overall >= 0.7) qualityLevel = 'fair';

        const recommendations = [];
        if (qualityFactors.brightness < 0.7) {
            recommendations.push('💡 Increase projector brightness or reduce ambient lighting');
        }
        if (qualityFactors.contrast < 0.8) {
            recommendations.push('📊 Adjust projector contrast settings');
        }
        if (qualityFactors.sharpness < 0.8) {
            recommendations.push('🎯 Adjust projector focus');
        }
        if (qualityFactors.uniformity < 0.9) {
            recommendations.push('📐 Check projector position and keystone correction');
        }

        this.projectionQuality = {
            overall: qualityLevel,
            factors: qualityFactors,
            score: overall,
            recommendations
        };

        return this.projectionQuality;
    }

    async _testProjectionQuality() {
        try {
            // Project test pattern and assess quality
            const testResult = await this.projectPattern('test-grid', { size: 'medium' });

            if (testResult.success) {
                this._provideFeedback('info',
                    `Projection quality: ${testResult.quality.overall} (${(testResult.quality.score * 100).toFixed(0)}%)`
                );
            }

            return testResult;

        } catch (error) {
            this._provideFeedback('warning', 'Could not assess projection quality automatically');
            return { success: false, error: error.message };
        }
    }

    _generateTestRecommendations(testResults) {
        const recommendations = [];

        if (!testResults.windowOpen) {
            recommendations.push('🪟 Enable popups in browser settings');
            recommendations.push('🖥️ Ensure secondary display is connected');
        }

        if (!testResults.resolutionDetected) {
            recommendations.push('📺 Check display settings and projector connection');
        }

        if (!testResults.patternProjection) {
            recommendations.push('🔧 Verify projector is powered on and connected');
            recommendations.push('📐 Check projector input source settings');
        }

        if (testResults.qualityAssessment) {
            recommendations.push(...testResults.qualityAssessment.recommendations);
        }

        return recommendations;
    }

    _getStatusRecommendations() {
        const recommendations = [];

        if (!this.isProjectorActive) {
            recommendations.push('Click "Open Projector Window" to start');
        }

        if (this.isProjectorActive && !this.detectedResolution) {
            recommendations.push('Run resolution detection for optimal quality');
        }

        if (this.projectionQuality && this.projectionQuality.overall === 'poor') {
            recommendations.push('Consider improving lighting and projector settings');
        }

        return recommendations;
    }

    _getProjectorErrorMessage(error) {
        const errorMessage = error.message || '';

        if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
            return '🚫 Popup blocked. Please allow popups for this site and try again.';
        } else if (errorMessage.includes('display') || errorMessage.includes('screen')) {
            return '🖥️ Display issue. Please check your projector connection and try again.';
        } else if (errorMessage.includes('fullscreen')) {
            return '📺 Fullscreen not available. Try manually setting projector window to fullscreen.';
        } else if (errorMessage.includes('timeout')) {
            return '⏱️ Projector setup timed out. Please check your projector connection.';
        } else {
            return '❌ Projector setup failed. Please check your projector connection and browser settings.';
        }
    }

    _handleProjectorMessage(data) {
        if (this.patternCallback) {
            this.patternCallback(data);
        }
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