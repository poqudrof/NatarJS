/**
 * FeedbackDisplay - User-friendly feedback and guidance system
 * Provides clear, encouraging feedback for novice users during calibration
 */

export class FeedbackDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.feedbackHistory = [];
        this.currentFeedback = null;

        this._createFeedbackUI();
    }

    /**
     * Display feedback message with appropriate styling and icons
     */
    showFeedback(type, message, duration = null) {
        const feedback = {
            type,
            message,
            timestamp: Date.now(),
            id: this._generateId()
        };

        this.currentFeedback = feedback;
        this.feedbackHistory.push(feedback);

        // Keep history manageable
        if (this.feedbackHistory.length > 20) {
            this.feedbackHistory.shift();
        }

        this._updateFeedbackDisplay(feedback);

        // Auto-hide certain types of messages
        if (duration !== null) {
            setTimeout(() => {
                if (this.currentFeedback?.id === feedback.id) {
                    this._clearFeedback();
                }
            }, duration);
        } else if (type === 'success') {
            setTimeout(() => {
                if (this.currentFeedback?.id === feedback.id) {
                    this._clearFeedback();
                }
            }, 5000);
        }

        return feedback.id;
    }

    /**
     * Show progress with visual progress bar
     */
    showProgress(step, totalSteps, message, percentage = null) {
        const progressInfo = {
            step,
            totalSteps,
            message,
            percentage: percentage !== null ? percentage : (step / totalSteps) * 100
        };

        this._updateProgressDisplay(progressInfo);
    }

    /**
     * Show step-by-step instructions
     */
    showInstructions(stepNumber, title, instructions, tips = []) {
        const instructionData = {
            stepNumber,
            title,
            instructions,
            tips
        };

        this._updateInstructionsDisplay(instructionData);
    }

    /**
     * Show quality assessment feedback
     */
    showQualityFeedback(qualityData) {
        this._updateQualityDisplay(qualityData);
    }

    /**
     * Show encouraging messages for novice users
     */
    showEncouragement(type = 'general') {
        const encouragements = {
            general: [
                "You're doing great! Take your time with each step.",
                "Remember, good calibration takes patience - you've got this!",
                "Each image brings you closer to perfect calibration.",
                "Your careful work will pay off with accurate results."
            ],
            first_capture: [
                "Excellent! You captured your first calibration image!",
                "Great start! That pattern detection looks perfect.",
                "Perfect! You're getting the hang of this."
            ],
            halfway: [
                "Halfway there! Your calibration is looking good.",
                "Great progress! Keep varying the angles and distances.",
                "You're doing excellent work - keep it up!"
            ],
            almost_done: [
                "Almost finished! Just a few more images needed.",
                "You're so close! These final images will make the calibration even better.",
                "Excellent work so far - nearly there!"
            ],
            completed: [
                "Congratulations! You've completed the camera calibration!",
                "Fantastic work! Your camera is now perfectly calibrated.",
                "Well done! Your patience has paid off with excellent results."
            ]
        };

        const messages = encouragements[type] || encouragements.general;
        const message = messages[Math.floor(Math.random() * messages.length)];

        this.showFeedback('success', `🎉 ${message}`, 4000);
    }

    /**
     * Clear all feedback
     */
    clearFeedback() {
        this._clearFeedback();
        this._clearProgress();
        this._clearInstructions();
        this._clearQuality();
    }

    /**
     * Get feedback history for debugging
     */
    getFeedbackHistory() {
        return this.feedbackHistory;
    }

    // Private methods

    _createFeedbackUI() {
        this.container.innerHTML = `
            <div class="feedback-system">
                <!-- Progress Section -->
                <div id="progress-section" class="feedback-section" style="display: none;">
                    <div class="progress-header">
                        <h3 id="progress-title">Calibration Progress</h3>
                        <span id="progress-steps" class="progress-steps">Step 1 of 5</span>
                    </div>
                    <div class="progress-bar-container">
                        <div id="progress-bar" class="progress-bar"></div>
                        <div id="progress-percentage" class="progress-percentage">0%</div>
                    </div>
                    <p id="progress-message" class="progress-message">Initializing...</p>
                </div>

                <!-- Instructions Section -->
                <div id="instructions-section" class="feedback-section" style="display: none;">
                    <div class="instructions-header">
                        <span id="instruction-step" class="step-number">1</span>
                        <h3 id="instruction-title">Step Title</h3>
                    </div>
                    <div id="instruction-content" class="instruction-content">
                        <p id="instruction-text">Instructions will appear here...</p>
                        <div id="instruction-tips" class="instruction-tips"></div>
                    </div>
                </div>

                <!-- Quality Feedback Section -->
                <div id="quality-section" class="feedback-section" style="display: none;">
                    <h4>🎯 Image Quality</h4>
                    <div id="quality-indicators" class="quality-indicators">
                        <div class="quality-item">
                            <span class="quality-label">Brightness:</span>
                            <span id="brightness-status" class="quality-status">⚪</span>
                        </div>
                        <div class="quality-item">
                            <span class="quality-label">Contrast:</span>
                            <span id="contrast-status" class="quality-status">⚪</span>
                        </div>
                        <div class="quality-item">
                            <span class="quality-label">Sharpness:</span>
                            <span id="sharpness-status" class="quality-status">⚪</span>
                        </div>
                        <div class="quality-item">
                            <span class="quality-label">Pattern:</span>
                            <span id="pattern-status" class="quality-status">⚪</span>
                        </div>
                    </div>
                </div>

                <!-- Main Feedback Section -->
                <div id="main-feedback" class="feedback-section">
                    <div id="feedback-message" class="feedback-message">
                        <div id="feedback-icon" class="feedback-icon">ℹ️</div>
                        <div id="feedback-text" class="feedback-text">
                            Welcome! Let's calibrate your camera step by step.
                        </div>
                    </div>
                </div>

                <!-- Captured Images Counter -->
                <div id="capture-counter" class="feedback-section" style="display: none;">
                    <div class="capture-info">
                        <span class="capture-count">
                            📸 Captured: <span id="captured-count">0</span>/<span id="required-count">10</span>
                        </span>
                        <div class="capture-progress-mini">
                            <div id="capture-progress-bar" class="capture-progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this._addStyles();
    }

    _updateFeedbackDisplay(feedback) {
        const messageEl = document.getElementById('feedback-message');
        const iconEl = document.getElementById('feedback-icon');
        const textEl = document.getElementById('feedback-text');

        if (!messageEl || !iconEl || !textEl) return;

        // Set icon based on feedback type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            progress: '⏳'
        };

        iconEl.textContent = icons[feedback.type] || icons.info;
        textEl.textContent = feedback.message;

        // Update styling
        messageEl.className = `feedback-message ${feedback.type}`;

        // Add animation
        messageEl.style.animation = 'feedbackSlideIn 0.3s ease-out';
        setTimeout(() => {
            if (messageEl.style.animation) {
                messageEl.style.animation = '';
            }
        }, 300);
    }

    _updateProgressDisplay(progressInfo) {
        const progressSection = document.getElementById('progress-section');
        const progressBar = document.getElementById('progress-bar');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressMessage = document.getElementById('progress-message');
        const progressSteps = document.getElementById('progress-steps');

        if (!progressSection) return;

        progressSection.style.display = 'block';

        if (progressBar) {
            progressBar.style.width = `${progressInfo.percentage}%`;
        }

        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(progressInfo.percentage)}%`;
        }

        if (progressMessage) {
            progressMessage.textContent = progressInfo.message;
        }

        if (progressSteps) {
            progressSteps.textContent = `Step ${progressInfo.step} of ${progressInfo.totalSteps}`;
        }
    }

    _updateInstructionsDisplay(instructionData) {
        const instructionsSection = document.getElementById('instructions-section');
        const stepEl = document.getElementById('instruction-step');
        const titleEl = document.getElementById('instruction-title');
        const textEl = document.getElementById('instruction-text');
        const tipsEl = document.getElementById('instruction-tips');

        if (!instructionsSection) return;

        instructionsSection.style.display = 'block';

        if (stepEl) stepEl.textContent = instructionData.stepNumber;
        if (titleEl) titleEl.textContent = instructionData.title;
        if (textEl) textEl.textContent = instructionData.instructions;

        if (tipsEl && instructionData.tips.length > 0) {
            tipsEl.innerHTML = '<h5>💡 Tips:</h5>' +
                instructionData.tips.map(tip => `<li>${tip}</li>`).join('');
        }
    }

    _updateQualityDisplay(qualityData) {
        const qualitySection = document.getElementById('quality-section');
        if (!qualitySection) return;

        qualitySection.style.display = 'block';

        const statusMap = {
            good: '✅',
            warning: '⚠️',
            poor: '❌',
            unknown: '⚪'
        };

        // Update individual quality indicators
        if (qualityData.brightness !== undefined) {
            const el = document.getElementById('brightness-status');
            if (el) el.textContent = statusMap[qualityData.brightness] || '⚪';
        }

        if (qualityData.contrast !== undefined) {
            const el = document.getElementById('contrast-status');
            if (el) el.textContent = statusMap[qualityData.contrast] || '⚪';
        }

        if (qualityData.sharpness !== undefined) {
            const el = document.getElementById('sharpness-status');
            if (el) el.textContent = statusMap[qualityData.sharpness] || '⚪';
        }

        if (qualityData.pattern !== undefined) {
            const el = document.getElementById('pattern-status');
            if (el) el.textContent = statusMap[qualityData.pattern] || '⚪';
        }
    }

    updateCaptureCounter(captured, required) {
        const counterSection = document.getElementById('capture-counter');
        const capturedEl = document.getElementById('captured-count');
        const requiredEl = document.getElementById('required-count');
        const progressBarEl = document.getElementById('capture-progress-bar');

        if (!counterSection) return;

        counterSection.style.display = 'block';

        if (capturedEl) capturedEl.textContent = captured;
        if (requiredEl) requiredEl.textContent = required;

        if (progressBarEl) {
            const percentage = (captured / required) * 100;
            progressBarEl.style.width = `${Math.min(100, percentage)}%`;
        }
    }

    _clearFeedback() {
        const messageEl = document.getElementById('feedback-message');
        if (messageEl) {
            messageEl.className = 'feedback-message';
            const textEl = document.getElementById('feedback-text');
            if (textEl) textEl.textContent = '';
        }
    }

    _clearProgress() {
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }

    _clearInstructions() {
        const instructionsSection = document.getElementById('instructions-section');
        if (instructionsSection) {
            instructionsSection.style.display = 'none';
        }
    }

    _clearQuality() {
        const qualitySection = document.getElementById('quality-section');
        if (qualitySection) {
            qualitySection.style.display = 'none';
        }
    }

    _generateId() {
        return `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    _addStyles() {
        // Add CSS styles if not already present
        if (document.getElementById('feedback-display-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'feedback-display-styles';
        style.textContent = `
            .feedback-system {
                max-width: 600px;
                margin: 0 auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .feedback-section {
                margin-bottom: 20px;
                padding: 15px;
                border-radius: 8px;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .progress-header h3 {
                margin: 0;
                color: #2c3e50;
            }

            .progress-steps {
                color: #6c757d;
                font-weight: 500;
            }

            .progress-bar-container {
                position: relative;
                height: 20px;
                background: #e9ecef;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                transition: width 0.5s ease;
                border-radius: 10px;
            }

            .progress-percentage {
                position: absolute;
                top: 50%;
                right: 10px;
                transform: translateY(-50%);
                color: #495057;
                font-weight: 600;
                font-size: 12px;
            }

            .progress-message {
                margin: 0;
                color: #6c757d;
                font-style: italic;
            }

            .instructions-header {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
            }

            .step-number {
                background: #007bff;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                margin-right: 15px;
            }

            .instructions-header h3 {
                margin: 0;
                color: #2c3e50;
            }

            .instruction-content p {
                margin-bottom: 15px;
                line-height: 1.6;
                color: #495057;
            }

            .instruction-tips {
                background: #e3f2fd;
                padding: 15px;
                border-radius: 6px;
                border-left: 4px solid #2196f3;
            }

            .instruction-tips h5 {
                margin: 0 0 10px 0;
                color: #1976d2;
            }

            .instruction-tips li {
                margin-bottom: 8px;
                color: #424242;
            }

            .quality-indicators {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
            }

            .quality-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: white;
                border-radius: 6px;
                border: 1px solid #dee2e6;
            }

            .quality-label {
                font-weight: 500;
                color: #495057;
            }

            .quality-status {
                font-size: 18px;
            }

            .feedback-message {
                display: flex;
                align-items: flex-start;
                padding: 15px;
                border-radius: 8px;
                background: #f8f9fa;
                border-left: 4px solid #6c757d;
            }

            .feedback-message.success {
                background: #d4edda;
                border-left-color: #28a745;
                color: #155724;
            }

            .feedback-message.error {
                background: #f8d7da;
                border-left-color: #dc3545;
                color: #721c24;
            }

            .feedback-message.warning {
                background: #fff3cd;
                border-left-color: #ffc107;
                color: #856404;
            }

            .feedback-message.info {
                background: #cce7ff;
                border-left-color: #007bff;
                color: #084298;
            }

            .feedback-icon {
                font-size: 20px;
                margin-right: 12px;
                margin-top: 2px;
            }

            .feedback-text {
                flex: 1;
                line-height: 1.5;
                font-weight: 500;
            }

            .capture-info {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .capture-count {
                font-weight: 600;
                color: #495057;
            }

            .capture-progress-mini {
                width: 100px;
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
            }

            .capture-progress-fill {
                height: 100%;
                background: #28a745;
                transition: width 0.3s ease;
                border-radius: 4px;
            }

            @keyframes feedbackSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media (max-width: 768px) {
                .feedback-system {
                    margin: 0 10px;
                }

                .quality-indicators {
                    grid-template-columns: 1fr;
                }

                .capture-info {
                    flex-direction: column;
                    gap: 10px;
                }
            }
        `;

        document.head.appendChild(style);
    }
}