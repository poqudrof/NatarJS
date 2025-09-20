/**
 * RealTimeFeedback - Advanced real-time feedback system for calibration
 * Provides comprehensive user guidance with visual and textual feedback
 */

export class RealTimeFeedback {
    constructor(container) {
        this.container = container;
        this.isActive = false;
        this.currentMetrics = {};
        this.feedbackHistory = [];
        this.animations = new Map();

        // Feedback configuration
        this.config = {
            updateInterval: 100, // ms
            historyLength: 50,
            smoothingFactor: 0.3,
            thresholds: {
                brightness: { min: 50, max: 200, optimal: 120 },
                contrast: { min: 30, good: 60, excellent: 100 },
                sharpness: { min: 0.1, good: 0.3, excellent: 0.5 },
                patternDetection: { min: 0.7, good: 0.85, excellent: 0.95 }
            }
        };

        // Feedback templates
        this.feedbackTemplates = {
            brightness: {
                low: { message: "💡 Too dark - increase lighting", priority: 'high', action: 'increase_lighting' },
                high: { message: "☀️ Too bright - reduce lighting", priority: 'high', action: 'reduce_lighting' },
                good: { message: "✨ Perfect lighting!", priority: 'low', action: 'maintain' }
            },
            contrast: {
                low: { message: "📊 Low contrast - adjust lighting angle", priority: 'medium', action: 'adjust_angle' },
                good: { message: "📈 Good contrast", priority: 'low', action: 'maintain' },
                excellent: { message: "🎯 Excellent contrast!", priority: 'low', action: 'maintain' }
            },
            sharpness: {
                low: { message: "🎯 Hold steady - image is blurry", priority: 'high', action: 'hold_steady' },
                good: { message: "📷 Good focus", priority: 'low', action: 'maintain' },
                excellent: { message: "🔍 Crystal clear!", priority: 'low', action: 'maintain' }
            },
            patternDetection: {
                none: { message: "📐 Pattern not visible - show full checkerboard", priority: 'critical', action: 'show_pattern' },
                partial: { message: "🔍 Pattern partially detected - center in view", priority: 'high', action: 'center_pattern' },
                good: { message: "✅ Pattern detected!", priority: 'low', action: 'capture_ready' },
                excellent: { message: "🌟 Perfect pattern detection! Ready to capture", priority: 'low', action: 'capture_now' }
            },
            progress: {
                starting: { message: "🚀 Starting calibration...", priority: 'info', action: 'continue' },
                capturing: { message: "📸 Capturing images...", priority: 'info', action: 'continue' },
                processing: { message: "⚙️ Processing calibration...", priority: 'info', action: 'wait' },
                complete: { message: "🎉 Calibration complete!", priority: 'success', action: 'finished' }
            }
        };

        this.setup();
    }

    /**
     * Setup feedback system
     */
    setup() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="real-time-feedback">
                <!-- Overall Status -->
                <div class="feedback-status" id="feedback-status">
                    <div class="status-indicator" id="status-indicator">
                        <div class="status-light" id="status-light"></div>
                        <span class="status-text" id="status-text">Initializing...</span>
                    </div>
                </div>

                <!-- Quality Metrics -->
                <div class="quality-metrics" id="quality-metrics">
                    <div class="metric-item" id="brightness-metric">
                        <div class="metric-header">
                            <span class="metric-icon">💡</span>
                            <span class="metric-label">Brightness</span>
                            <span class="metric-value" id="brightness-value">--</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill" id="brightness-fill"></div>
                            <div class="metric-target" id="brightness-target"></div>
                        </div>
                    </div>

                    <div class="metric-item" id="contrast-metric">
                        <div class="metric-header">
                            <span class="metric-icon">📊</span>
                            <span class="metric-label">Contrast</span>
                            <span class="metric-value" id="contrast-value">--</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill" id="contrast-fill"></div>
                            <div class="metric-target" id="contrast-target"></div>
                        </div>
                    </div>

                    <div class="metric-item" id="sharpness-metric">
                        <div class="metric-header">
                            <span class="metric-icon">🎯</span>
                            <span class="metric-label">Sharpness</span>
                            <span class="metric-value" id="sharpness-value">--</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill" id="sharpness-fill"></div>
                            <div class="metric-target" id="sharpness-target"></div>
                        </div>
                    </div>

                    <div class="metric-item" id="pattern-metric">
                        <div class="metric-header">
                            <span class="metric-icon">📐</span>
                            <span class="metric-label">Pattern Detection</span>
                            <span class="metric-value" id="pattern-value">--</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill" id="pattern-fill"></div>
                            <div class="metric-target" id="pattern-target"></div>
                        </div>
                    </div>
                </div>

                <!-- Active Feedback Messages -->
                <div class="active-feedback" id="active-feedback">
                    <div class="feedback-message" id="primary-message">
                        <span class="message-icon" id="message-icon">ℹ️</span>
                        <span class="message-text" id="message-text">System ready</span>
                    </div>
                    <div class="feedback-suggestions" id="feedback-suggestions">
                        <!-- Dynamic suggestions will appear here -->
                    </div>
                </div>

                <!-- Progress Indicators -->
                <div class="progress-section" id="progress-section" style="display: none;">
                    <div class="progress-header">
                        <span class="progress-label" id="progress-label">Progress</span>
                        <span class="progress-percentage" id="progress-percentage">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-details" id="progress-details">
                        <!-- Dynamic progress details -->
                    </div>
                </div>

                <!-- Capture Readiness -->
                <div class="capture-readiness" id="capture-readiness">
                    <div class="readiness-indicator" id="readiness-indicator">
                        <div class="readiness-circle" id="readiness-circle">
                            <span class="readiness-text" id="readiness-text">Not Ready</span>
                        </div>
                    </div>
                    <div class="capture-action" id="capture-action" style="display: none;">
                        <button class="btn btn-primary btn-lg" id="auto-capture-btn">
                            📸 Auto Capture
                        </button>
                    </div>
                </div>

                <!-- Historical Trends -->
                <div class="quality-trends" id="quality-trends" style="display: none;">
                    <h4>Quality Trends</h4>
                    <canvas id="trends-canvas" width="300" height="100"></canvas>
                </div>
            </div>
        `;

        this._setupStyles();
        this._initializeMetrics();
    }

    /**
     * Start real-time feedback
     */
    start() {
        this.isActive = true;
        this._updateStatus('active', 'Real-time feedback active');
        this._startUpdateLoop();
    }

    /**
     * Stop real-time feedback
     */
    stop() {
        this.isActive = false;
        this._updateStatus('inactive', 'Feedback paused');
        this._stopUpdateLoop();
    }

    /**
     * Update feedback with new metrics
     */
    updateMetrics(metrics) {
        if (!this.isActive) return;

        // Smooth metrics using exponential moving average
        this.currentMetrics = this._smoothMetrics(metrics);

        // Store in history
        this.feedbackHistory.push({
            timestamp: Date.now(),
            metrics: { ...this.currentMetrics }
        });

        // Trim history
        if (this.feedbackHistory.length > this.config.historyLength) {
            this.feedbackHistory.shift();
        }

        // Update UI
        this._updateMetricsDisplay();
        this._updateFeedbackMessages();
        this._updateCaptureReadiness();
        this._updateQualityTrends();
    }

    /**
     * Show progress feedback
     */
    showProgress(stage, percentage, details = '') {
        const progressSection = this.container.querySelector('#progress-section');
        progressSection.style.display = 'block';

        this.container.querySelector('#progress-label').textContent = stage;
        this.container.querySelector('#progress-percentage').textContent = `${Math.round(percentage)}%`;
        this.container.querySelector('#progress-fill').style.width = `${percentage}%`;
        this.container.querySelector('#progress-details').textContent = details;

        // Update primary message
        const template = this.feedbackTemplates.progress[stage.toLowerCase()] ||
                        { message: `${stage}... ${Math.round(percentage)}%`, priority: 'info' };
        this._showPrimaryMessage(template.message, template.priority);
    }

    /**
     * Hide progress feedback
     */
    hideProgress() {
        const progressSection = this.container.querySelector('#progress-section');
        progressSection.style.display = 'none';
    }

    /**
     * Show specific feedback message
     */
    showMessage(message, type = 'info', duration = 5000) {
        this._showPrimaryMessage(message, type);

        if (duration > 0) {
            setTimeout(() => {
                this._clearPrimaryMessage();
            }, duration);
        }
    }

    /**
     * Add suggestion to feedback
     */
    addSuggestion(text, action = null) {
        const suggestionsContainer = this.container.querySelector('#feedback-suggestions');

        const suggestion = document.createElement('div');
        suggestion.className = 'feedback-suggestion';
        suggestion.innerHTML = `
            <span class="suggestion-text">${text}</span>
            ${action ? `<button class="suggestion-action" data-action="${action}">Apply</button>` : ''}
        `;

        if (action) {
            suggestion.querySelector('.suggestion-action').addEventListener('click', () => {
                this._handleSuggestionAction(action);
                suggestion.remove();
            });
        }

        suggestionsContainer.appendChild(suggestion);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (suggestion.parentNode) {
                suggestion.remove();
            }
        }, 10000);
    }

    /**
     * Clear all suggestions
     */
    clearSuggestions() {
        const suggestionsContainer = this.container.querySelector('#feedback-suggestions');
        suggestionsContainer.innerHTML = '';
    }

    /**
     * Set capture readiness state
     */
    setCaptureReadiness(ready, autoCapture = false) {
        const readinessCircle = this.container.querySelector('#readiness-circle');
        const readinessText = this.container.querySelector('#readiness-text');
        const captureAction = this.container.querySelector('#capture-action');

        if (ready) {
            readinessCircle.className = 'readiness-circle ready';
            readinessText.textContent = 'Ready';

            if (autoCapture) {
                captureAction.style.display = 'block';
                this._pulseElement(captureAction);
            }
        } else {
            readinessCircle.className = 'readiness-circle not-ready';
            readinessText.textContent = 'Not Ready';
            captureAction.style.display = 'none';
        }
    }

    /**
     * Show quality trends chart
     */
    showQualityTrends(show = true) {
        const trendsSection = this.container.querySelector('#quality-trends');
        trendsSection.style.display = show ? 'block' : 'none';

        if (show) {
            this._drawQualityTrends();
        }
    }

    // Private methods

    /**
     * Setup CSS styles
     */
    _setupStyles() {
        if (document.getElementById('feedback-styles')) return;

        const style = document.createElement('style');
        style.id = 'feedback-styles';
        style.textContent = `
            .real-time-feedback {
                background: var(--bg-card, #ffffff);
                border-radius: 12px;
                padding: 1rem;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            .feedback-status {
                margin-bottom: 1rem;
                text-align: center;
            }

            .status-indicator {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .status-light {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #6b7280;
                transition: background 0.3s ease;
            }

            .status-light.active { background: #10b981; }
            .status-light.warning { background: #f59e0b; }
            .status-light.error { background: #ef4444; }

            .quality-metrics {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .metric-item {
                background: #f8fafc;
                border-radius: 8px;
                padding: 0.75rem;
                border: 1px solid #e5e7eb;
            }

            .metric-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }

            .metric-label {
                font-weight: 500;
                color: #374151;
                font-size: 0.875rem;
            }

            .metric-value {
                font-weight: 600;
                color: #1f2937;
                font-size: 0.875rem;
            }

            .metric-bar {
                height: 6px;
                background: #e5e7eb;
                border-radius: 3px;
                position: relative;
                overflow: hidden;
            }

            .metric-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 0.3s ease, background 0.3s ease;
                background: #6b7280;
            }

            .metric-fill.excellent { background: #10b981; }
            .metric-fill.good { background: #3b82f6; }
            .metric-fill.fair { background: #f59e0b; }
            .metric-fill.poor { background: #ef4444; }

            .metric-target {
                position: absolute;
                top: 0;
                bottom: 0;
                width: 2px;
                background: #374151;
                opacity: 0.5;
            }

            .active-feedback {
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
            }

            .feedback-message {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }

            .message-icon {
                font-size: 1.25rem;
            }

            .message-text {
                font-weight: 500;
                color: #0c4a6e;
            }

            .feedback-suggestions {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .feedback-suggestion {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(59, 130, 246, 0.1);
                padding: 0.5rem;
                border-radius: 6px;
                font-size: 0.875rem;
            }

            .suggestion-action {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                font-size: 0.75rem;
                cursor: pointer;
            }

            .progress-section {
                background: #fefce8;
                border: 1px solid #fbbf24;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .progress-label {
                font-weight: 500;
                color: #92400e;
            }

            .progress-percentage {
                font-weight: 600;
                color: #92400e;
            }

            .progress-bar {
                height: 8px;
                background: #fef3c7;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            }

            .progress-fill {
                height: 100%;
                background: #f59e0b;
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .progress-details {
                font-size: 0.875rem;
                color: #92400e;
            }

            .capture-readiness {
                text-align: center;
                margin-bottom: 1rem;
            }

            .readiness-circle {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem;
                border: 3px solid #e5e7eb;
                transition: all 0.3s ease;
            }

            .readiness-circle.ready {
                border-color: #10b981;
                background: #ecfdf5;
                animation: pulse-ready 2s infinite;
            }

            .readiness-circle.not-ready {
                border-color: #ef4444;
                background: #fef2f2;
            }

            @keyframes pulse-ready {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            }

            .readiness-text {
                font-weight: 600;
                font-size: 0.875rem;
            }

            .capture-action {
                animation: bounce 1s infinite;
            }

            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-5px); }
                60% { transform: translateY(-3px); }
            }

            .quality-trends {
                background: #f8fafc;
                border-radius: 8px;
                padding: 1rem;
                text-align: center;
            }

            .quality-trends h4 {
                margin: 0 0 1rem;
                font-size: 1rem;
                color: #374151;
            }

            @media (max-width: 640px) {
                .quality-metrics {
                    grid-template-columns: 1fr;
                }

                .metric-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.25rem;
                }

                .feedback-suggestion {
                    flex-direction: column;
                    gap: 0.5rem;
                    align-items: stretch;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Initialize metrics
     */
    _initializeMetrics() {
        // Set target indicators
        const targets = {
            brightness: 60, // percentage of optimal
            contrast: 60,
            sharpness: 60,
            pattern: 85
        };

        Object.entries(targets).forEach(([metric, percentage]) => {
            const target = this.container.querySelector(`#${metric}-target`);
            if (target) {
                target.style.left = `${percentage}%`;
            }
        });
    }

    /**
     * Start update loop
     */
    _startUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            if (this.isActive) {
                this._updateAnimations();
            }
        }, this.config.updateInterval);
    }

    /**
     * Stop update loop
     */
    _stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Smooth metrics using exponential moving average
     */
    _smoothMetrics(newMetrics) {
        const smoothed = {};
        const factor = this.config.smoothingFactor;

        Object.entries(newMetrics).forEach(([key, value]) => {
            if (this.currentMetrics[key] !== undefined) {
                smoothed[key] = this.currentMetrics[key] * (1 - factor) + value * factor;
            } else {
                smoothed[key] = value;
            }
        });

        return smoothed;
    }

    /**
     * Update metrics display
     */
    _updateMetricsDisplay() {
        Object.entries(this.currentMetrics).forEach(([metric, value]) => {
            const valueElement = this.container.querySelector(`#${metric}-value`);
            const fillElement = this.container.querySelector(`#${metric}-fill`);

            if (valueElement && fillElement) {
                // Format value
                let displayValue = '--';
                let percentage = 0;
                let quality = 'poor';

                if (value !== undefined && value !== null) {
                    if (metric === 'brightness') {
                        displayValue = Math.round(value);
                        percentage = Math.min(100, (value / 255) * 100);
                        quality = this._getQualityLevel(value, this.config.thresholds.brightness);
                    } else if (metric === 'contrast') {
                        displayValue = Math.round(value);
                        percentage = Math.min(100, (value / 150) * 100);
                        quality = this._getQualityLevel(value, this.config.thresholds.contrast);
                    } else if (metric === 'sharpness') {
                        displayValue = value.toFixed(2);
                        percentage = Math.min(100, (value / 1.0) * 100);
                        quality = this._getQualityLevel(value, this.config.thresholds.sharpness);
                    } else if (metric === 'patternDetection') {
                        displayValue = Math.round(value * 100) + '%';
                        percentage = value * 100;
                        quality = this._getQualityLevel(value, this.config.thresholds.patternDetection);
                    }
                }

                valueElement.textContent = displayValue;
                fillElement.style.width = `${percentage}%`;
                fillElement.className = `metric-fill ${quality}`;
            }
        });
    }

    /**
     * Update feedback messages
     */
    _updateFeedbackMessages() {
        const primaryFeedback = this._getPrimaryFeedback();

        if (primaryFeedback) {
            this._showPrimaryMessage(primaryFeedback.message, primaryFeedback.priority);

            // Generate suggestions based on current state
            const suggestions = this._generateSuggestions();
            this._updateSuggestions(suggestions);
        }
    }

    /**
     * Get primary feedback message
     */
    _getPrimaryFeedback() {
        const metrics = this.currentMetrics;

        // Priority order: pattern detection > brightness > sharpness > contrast
        if (metrics.patternDetection !== undefined) {
            if (metrics.patternDetection < 0.3) {
                return this.feedbackTemplates.patternDetection.none;
            } else if (metrics.patternDetection < 0.7) {
                return this.feedbackTemplates.patternDetection.partial;
            } else if (metrics.patternDetection < 0.9) {
                return this.feedbackTemplates.patternDetection.good;
            } else {
                return this.feedbackTemplates.patternDetection.excellent;
            }
        }

        if (metrics.brightness !== undefined) {
            const threshold = this.config.thresholds.brightness;
            if (metrics.brightness < threshold.min) {
                return this.feedbackTemplates.brightness.low;
            } else if (metrics.brightness > threshold.max) {
                return this.feedbackTemplates.brightness.high;
            } else {
                return this.feedbackTemplates.brightness.good;
            }
        }

        return null;
    }

    /**
     * Generate suggestions based on current metrics
     */
    _generateSuggestions() {
        const suggestions = [];
        const metrics = this.currentMetrics;

        if (metrics.sharpness !== undefined && metrics.sharpness < this.config.thresholds.sharpness.min) {
            suggestions.push({
                text: "Try holding the camera/pattern more steadily",
                action: "hold_steady"
            });
        }

        if (metrics.contrast !== undefined && metrics.contrast < this.config.thresholds.contrast.min) {
            suggestions.push({
                text: "Adjust the lighting angle for better contrast",
                action: "adjust_lighting"
            });
        }

        return suggestions;
    }

    /**
     * Update suggestions display
     */
    _updateSuggestions(suggestions) {
        const container = this.container.querySelector('#feedback-suggestions');
        const existingCount = container.children.length;

        // Only update if suggestions changed
        if (suggestions.length !== existingCount) {
            container.innerHTML = '';

            suggestions.forEach(suggestion => {
                this.addSuggestion(suggestion.text, suggestion.action);
            });
        }
    }

    /**
     * Update capture readiness
     */
    _updateCaptureReadiness() {
        const metrics = this.currentMetrics;

        let ready = true;
        let reasons = [];

        // Check each metric
        if (metrics.patternDetection !== undefined && metrics.patternDetection < 0.8) {
            ready = false;
            reasons.push('Pattern not clearly detected');
        }

        if (metrics.brightness !== undefined) {
            const threshold = this.config.thresholds.brightness;
            if (metrics.brightness < threshold.min || metrics.brightness > threshold.max) {
                ready = false;
                reasons.push('Lighting needs adjustment');
            }
        }

        if (metrics.sharpness !== undefined && metrics.sharpness < this.config.thresholds.sharpness.min) {
            ready = false;
            reasons.push('Image too blurry');
        }

        this.setCaptureReadiness(ready, ready);

        // Update readiness tooltip with reasons
        const readinessIndicator = this.container.querySelector('#readiness-indicator');
        if (reasons.length > 0) {
            readinessIndicator.title = 'Not ready: ' + reasons.join(', ');
        } else {
            readinessIndicator.title = 'Ready to capture!';
        }
    }

    /**
     * Update quality trends chart
     */
    _updateQualityTrends() {
        if (this.feedbackHistory.length < 2) return;

        const canvas = this.container.querySelector('#trends-canvas');
        if (!canvas || canvas.style.display === 'none') return;

        this._drawQualityTrends();
    }

    /**
     * Draw quality trends chart
     */
    _drawQualityTrends() {
        const canvas = this.container.querySelector('#trends-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (this.feedbackHistory.length < 2) return;

        const metrics = ['brightness', 'contrast', 'sharpness', 'patternDetection'];
        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

        // Draw grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw metric lines
        metrics.forEach((metric, index) => {
            const color = colors[index];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            let hasData = false;

            this.feedbackHistory.forEach((entry, i) => {
                if (entry.metrics[metric] !== undefined) {
                    const x = (width / (this.feedbackHistory.length - 1)) * i;
                    const y = height - (entry.metrics[metric] * height);

                    if (!hasData) {
                        ctx.moveTo(x, y);
                        hasData = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });

            if (hasData) {
                ctx.stroke();
            }
        });
    }

    /**
     * Get quality level for a metric
     */
    _getQualityLevel(value, thresholds) {
        if (thresholds.excellent && value >= thresholds.excellent) return 'excellent';
        if (thresholds.good && value >= thresholds.good) return 'good';
        if (thresholds.min && value >= thresholds.min) return 'fair';
        return 'poor';
    }

    /**
     * Update status display
     */
    _updateStatus(status, text) {
        const statusLight = this.container.querySelector('#status-light');
        const statusText = this.container.querySelector('#status-text');

        if (statusLight) {
            statusLight.className = `status-light ${status}`;
        }

        if (statusText) {
            statusText.textContent = text;
        }
    }

    /**
     * Show primary message
     */
    _showPrimaryMessage(message, priority) {
        const messageIcon = this.container.querySelector('#message-icon');
        const messageText = this.container.querySelector('#message-text');

        const icons = {
            critical: '🚨',
            high: '⚠️',
            medium: 'ℹ️',
            low: '✅',
            info: 'ℹ️',
            success: '🎉'
        };

        if (messageIcon) {
            messageIcon.textContent = icons[priority] || 'ℹ️';
        }

        if (messageText) {
            messageText.textContent = message;
        }

        // Add visual emphasis for high priority messages
        const activeContainer = this.container.querySelector('.active-feedback');
        if (priority === 'critical' || priority === 'high') {
            this._pulseElement(activeContainer);
        }
    }

    /**
     * Clear primary message
     */
    _clearPrimaryMessage() {
        this._showPrimaryMessage('System ready', 'info');
    }

    /**
     * Handle suggestion action
     */
    _handleSuggestionAction(action) {
        // Emit custom event for parent components to handle
        const event = new CustomEvent('feedback-action', {
            detail: { action }
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Pulse element animation
     */
    _pulseElement(element) {
        if (!element) return;

        element.style.animation = 'none';
        setTimeout(() => {
            element.style.animation = 'pulse 1s ease-in-out';
        }, 10);
    }

    /**
     * Update animations
     */
    _updateAnimations() {
        // Update any running animations
        this.animations.forEach((animation, element) => {
            // Animation logic here
        });
    }
}

export default RealTimeFeedback;