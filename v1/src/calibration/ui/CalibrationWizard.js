/**
 * CalibrationWizard - Step-by-step calibration workflow manager
 * Provides guided user experience for complete camera/projector calibration
 */

import { CalibrationManager } from '../core/CalibrationManager.js';
import { CameraCalibrator } from '../core/CameraCalibrator.js';
import { QuadCalibrator } from '../core/QuadCalibrator.js';
import { ProjectorManager } from '../../projector/ProjectorManager.js';
import { CalibrationStorage } from '../storage/CalibrationStorage.js';
import { FeedbackDisplay } from './FeedbackDisplay.js';

export class CalibrationWizard {
    constructor() {
        // Core components
        this.calibrationManager = null;
        this.cameraCalibrator = null;
        this.quadCalibrator = null;
        this.projectorManager = null;
        this.storage = null;
        this.feedbackDisplay = null;

        // Wizard state
        this.currentStep = 0;
        this.completedSteps = new Set();
        this.calibrationData = {
            camera: null,
            projector: null,
            quad: null
        };

        // User preferences
        this.userPreferences = {
            calibrationMode: 'guided', // guided, expert, quick
            skipOptionalSteps: false,
            saveAutomatically: true,
            showDetailedFeedback: true
        };

        // Step definitions
        this.steps = [
            {
                id: 'welcome',
                title: 'Welcome to Calibration',
                description: 'Get started with camera and projector calibration',
                component: 'welcome',
                required: true,
                estimatedTime: '1 min'
            },
            {
                id: 'setup',
                title: 'System Setup',
                description: 'Configure your hardware and software environment',
                component: 'setup',
                required: true,
                estimatedTime: '2-3 min'
            },
            {
                id: 'camera-calibration',
                title: 'Camera Calibration',
                description: 'Calibrate your camera for accurate measurements',
                component: 'camera',
                required: true,
                estimatedTime: '5-10 min'
            },
            {
                id: 'projector-setup',
                title: 'Projector Setup',
                description: 'Configure projector display and resolution',
                component: 'projector',
                required: true,
                estimatedTime: '3-5 min'
            },
            {
                id: 'calibration-mode',
                title: 'Calibration Mode',
                description: 'Choose between quad or full geometric calibration',
                component: 'mode-selection',
                required: true,
                estimatedTime: '1 min'
            },
            {
                id: 'quad-calibration',
                title: 'Quad Calibration',
                description: 'Perform 4-point flat surface calibration',
                component: 'quad',
                required: false, // Depends on mode selection
                estimatedTime: '3-5 min'
            },
            {
                id: 'validation',
                title: 'Calibration Validation',
                description: 'Test and verify your calibration results',
                component: 'validation',
                required: true,
                estimatedTime: '2-3 min'
            },
            {
                id: 'save-results',
                title: 'Save Calibration',
                description: 'Save your calibration for future use',
                component: 'save',
                required: false,
                estimatedTime: '1 min'
            },
            {
                id: 'completion',
                title: 'Calibration Complete',
                description: 'Your system is now calibrated and ready to use',
                component: 'completion',
                required: true,
                estimatedTime: '1 min'
            }
        ];

        // Event handlers
        this.onStepChange = null;
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
    }

    /**
     * Initialize the calibration wizard
     */
    async initialize(container) {
        try {
            this.container = container;

            // Initialize core components
            this.calibrationManager = new CalibrationManager();
            await this.calibrationManager.initialize();

            this.storage = new CalibrationStorage();
            await this.storage.initialize();

            this.feedbackDisplay = new FeedbackDisplay();
            this.feedbackDisplay.initialize(container.querySelector('.feedback-container'));

            // Initialize calibrators
            this.cameraCalibrator = new CameraCalibrator(this.feedbackDisplay);
            this.projectorManager = new ProjectorManager();
            this.quadCalibrator = new QuadCalibrator(null, this.feedbackDisplay);

            // Setup wizard UI
            this._setupWizardUI();

            // Load user preferences
            this._loadUserPreferences();

            // Setup event listeners
            this._setupEventListeners();

            this._provideFeedback('success', 'Calibration wizard initialized successfully');

            return {
                success: true,
                message: 'Wizard ready for calibration process'
            };

        } catch (error) {
            this._provideFeedback('error', `Initialization failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                message: 'Failed to initialize calibration wizard'
            };
        }
    }

    /**
     * Start the calibration wizard
     */
    async startWizard(options = {}) {
        try {
            // Apply options
            Object.assign(this.userPreferences, options);

            // Reset wizard state
            this.currentStep = 0;
            this.completedSteps.clear();
            this.calibrationData = { camera: null, projector: null, quad: null };

            // Show welcome step
            await this._showStep(0);

            this._notifyProgress('wizard-started', 0);
            this._provideFeedback('info', 'Welcome! Let\'s get your system calibrated.');

            return {
                success: true,
                currentStep: this.steps[0],
                totalSteps: this.steps.length,
                message: 'Calibration wizard started'
            };

        } catch (error) {
            this._provideFeedback('error', `Failed to start wizard: ${error.message}`);
            return {
                success: false,
                error: error.message,
                message: 'Could not start calibration wizard'
            };
        }
    }

    /**
     * Navigate to next step
     */
    async nextStep() {
        try {
            // Validate current step before proceeding
            const validation = await this._validateCurrentStep();
            if (!validation.success) {
                this._provideFeedback('warning', validation.message);
                return validation;
            }

            // Mark current step as completed
            this.completedSteps.add(this.steps[this.currentStep].id);

            // Find next step
            const nextStepIndex = this._getNextStepIndex();

            if (nextStepIndex === -1) {
                // Wizard complete
                return await this._completeWizard();
            }

            // Move to next step
            this.currentStep = nextStepIndex;
            await this._showStep(this.currentStep);

            const progress = ((this.completedSteps.size) / this.steps.length) * 100;
            this._notifyProgress('step-completed', progress);

            return {
                success: true,
                currentStep: this.steps[this.currentStep],
                progress: progress,
                message: `Moved to step: ${this.steps[this.currentStep].title}`
            };

        } catch (error) {
            this._provideFeedback('error', `Failed to proceed to next step: ${error.message}`);
            return {
                success: false,
                error: error.message,
                message: 'Could not advance to next step'
            };
        }
    }

    /**
     * Navigate to previous step
     */
    async previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            await this._showStep(this.currentStep);

            this._notifyProgress('step-back', (this.currentStep / this.steps.length) * 100);

            return {
                success: true,
                currentStep: this.steps[this.currentStep],
                message: `Moved back to step: ${this.steps[this.currentStep].title}`
            };
        }

        return {
            success: false,
            message: 'Already at first step'
        };
    }

    /**
     * Jump to specific step
     */
    async goToStep(stepId) {
        const stepIndex = this.steps.findIndex(step => step.id === stepId);

        if (stepIndex === -1) {
            return {
                success: false,
                message: `Step not found: ${stepId}`
            };
        }

        // Check if step is accessible
        if (stepIndex > this.currentStep + 1 && !this.userPreferences.skipValidation) {
            return {
                success: false,
                message: 'Cannot skip ahead - complete current step first'
            };
        }

        this.currentStep = stepIndex;
        await this._showStep(this.currentStep);

        return {
            success: true,
            currentStep: this.steps[this.currentStep],
            message: `Jumped to step: ${this.steps[this.currentStep].title}`
        };
    }

    /**
     * Get current wizard status
     */
    getStatus() {
        return {
            currentStep: this.steps[this.currentStep],
            currentStepIndex: this.currentStep,
            totalSteps: this.steps.length,
            completedSteps: Array.from(this.completedSteps),
            progress: (this.completedSteps.size / this.steps.length) * 100,
            calibrationData: this.calibrationData,
            userPreferences: this.userPreferences,
            estimatedTimeRemaining: this._calculateRemainingTime()
        };
    }

    /**
     * Save current progress
     */
    async saveProgress() {
        try {
            const progressData = {
                currentStep: this.currentStep,
                completedSteps: Array.from(this.completedSteps),
                calibrationData: this.calibrationData,
                userPreferences: this.userPreferences,
                timestamp: new Date().toISOString()
            };

            await this.storage.saveProgress('wizard', progressData);

            this._provideFeedback('success', 'Progress saved successfully');

            return {
                success: true,
                message: 'Wizard progress saved'
            };

        } catch (error) {
            this._provideFeedback('error', `Failed to save progress: ${error.message}`);
            return {
                success: false,
                error: error.message,
                message: 'Could not save wizard progress'
            };
        }
    }

    /**
     * Load saved progress
     */
    async loadProgress() {
        try {
            const progressData = await this.storage.loadProgress('wizard');

            if (progressData) {
                this.currentStep = progressData.currentStep || 0;
                this.completedSteps = new Set(progressData.completedSteps || []);
                this.calibrationData = progressData.calibrationData || { camera: null, projector: null, quad: null };
                this.userPreferences = { ...this.userPreferences, ...progressData.userPreferences };

                await this._showStep(this.currentStep);

                this._provideFeedback('success', 'Progress restored successfully');

                return {
                    success: true,
                    message: 'Wizard progress restored',
                    currentStep: this.steps[this.currentStep]
                };
            }

            return {
                success: false,
                message: 'No saved progress found'
            };

        } catch (error) {
            this._provideFeedback('error', `Failed to load progress: ${error.message}`);
            return {
                success: false,
                error: error.message,
                message: 'Could not load wizard progress'
            };
        }
    }

    // Private methods

    /**
     * Setup wizard UI structure
     */
    _setupWizardUI() {
        this.container.innerHTML = `
            <div class="calibration-wizard">
                <!-- Header -->
                <header class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div class="progress-text" id="progress-text">Step 1 of ${this.steps.length}</div>
                    </div>

                    <div class="wizard-title">
                        <h1 id="step-title">Camera/Projector Calibration</h1>
                        <p id="step-description">Follow the guided steps to calibrate your system</p>
                    </div>
                </header>

                <!-- Step Navigation -->
                <nav class="step-navigation">
                    <div class="step-indicators">
                        ${this.steps.map((step, index) => `
                            <div class="step-indicator" data-step="${index}" id="indicator-${index}">
                                <div class="step-number">${index + 1}</div>
                                <div class="step-label">${step.title}</div>
                            </div>
                        `).join('')}
                    </div>
                </nav>

                <!-- Main Content Area -->
                <main class="wizard-content">
                    <div class="step-container" id="step-container">
                        <!-- Step content will be dynamically loaded here -->
                    </div>
                </main>

                <!-- Feedback Container -->
                <div class="feedback-container" id="feedback-container">
                    <!-- Feedback messages will be displayed here -->
                </div>

                <!-- Action Buttons -->
                <footer class="wizard-actions">
                    <div class="action-buttons">
                        <button class="btn btn-secondary" id="prev-btn" disabled>
                            ← Previous
                        </button>

                        <div class="middle-actions">
                            <button class="btn btn-outline" id="save-progress-btn">
                                💾 Save Progress
                            </button>
                            <button class="btn btn-outline" id="help-btn">
                                ❓ Help
                            </button>
                        </div>

                        <button class="btn btn-primary" id="next-btn">
                            Next →
                        </button>
                    </div>

                    <div class="step-info">
                        <span class="estimated-time" id="estimated-time">Estimated time: 5-10 min</span>
                    </div>
                </footer>

                <!-- Help Modal -->
                <div class="modal" id="help-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Help & Tips</h3>
                            <button class="modal-close" id="help-modal-close">×</button>
                        </div>
                        <div class="modal-body" id="help-content">
                            <!-- Help content will be loaded dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Navigation buttons
        this.container.querySelector('#next-btn').addEventListener('click', () => this.nextStep());
        this.container.querySelector('#prev-btn').addEventListener('click', () => this.previousStep());

        // Save progress
        this.container.querySelector('#save-progress-btn').addEventListener('click', () => this.saveProgress());

        // Help modal
        this.container.querySelector('#help-btn').addEventListener('click', () => this._showHelp());
        this.container.querySelector('#help-modal-close').addEventListener('click', () => this._hideHelp());

        // Step indicators (allow jumping to accessible steps)
        this.container.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                if (index <= this.currentStep + 1 || this.completedSteps.has(this.steps[index].id)) {
                    this.goToStep(this.steps[index].id);
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.target.closest('.calibration-wizard')) {
                switch (event.key) {
                    case 'ArrowRight':
                    case 'Enter':
                        if (event.ctrlKey || event.metaKey) {
                            this.nextStep();
                            event.preventDefault();
                        }
                        break;
                    case 'ArrowLeft':
                        if (event.ctrlKey || event.metaKey) {
                            this.previousStep();
                            event.preventDefault();
                        }
                        break;
                    case 'F1':
                        this._showHelp();
                        event.preventDefault();
                        break;
                    case 'Escape':
                        this._hideHelp();
                        break;
                }
            }
        });
    }

    /**
     * Show specific step
     */
    async _showStep(stepIndex) {
        const step = this.steps[stepIndex];
        const stepContainer = this.container.querySelector('#step-container');

        // Update header
        this.container.querySelector('#step-title').textContent = step.title;
        this.container.querySelector('#step-description').textContent = step.description;
        this.container.querySelector('#estimated-time').textContent = `Estimated time: ${step.estimatedTime}`;

        // Update progress
        const progress = (stepIndex / this.steps.length) * 100;
        this.container.querySelector('#progress-fill').style.width = `${progress}%`;
        this.container.querySelector('#progress-text').textContent = `Step ${stepIndex + 1} of ${this.steps.length}`;

        // Update step indicators
        this.container.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');

            if (index === stepIndex) {
                indicator.classList.add('active');
            } else if (this.completedSteps.has(this.steps[index].id)) {
                indicator.classList.add('completed');
            }
        });

        // Update navigation buttons
        this.container.querySelector('#prev-btn').disabled = stepIndex === 0;
        const nextBtn = this.container.querySelector('#next-btn');

        if (stepIndex === this.steps.length - 1) {
            nextBtn.textContent = '🎉 Complete';
            nextBtn.classList.add('btn-success');
        } else {
            nextBtn.textContent = 'Next →';
            nextBtn.classList.remove('btn-success');
        }

        // Load step component
        await this._loadStepComponent(step, stepContainer);

        // Notify step change
        this._notifyStepChange(step, stepIndex);
    }

    /**
     * Load step component content
     */
    async _loadStepComponent(step, container) {
        switch (step.component) {
            case 'welcome':
                await this._loadWelcomeStep(container);
                break;
            case 'setup':
                await this._loadSetupStep(container);
                break;
            case 'camera':
                await this._loadCameraStep(container);
                break;
            case 'projector':
                await this._loadProjectorStep(container);
                break;
            case 'mode-selection':
                await this._loadModeSelectionStep(container);
                break;
            case 'quad':
                await this._loadQuadStep(container);
                break;
            case 'validation':
                await this._loadValidationStep(container);
                break;
            case 'save':
                await this._loadSaveStep(container);
                break;
            case 'completion':
                await this._loadCompletionStep(container);
                break;
            default:
                container.innerHTML = `<div class="step-content">
                    <p>Step component not implemented: ${step.component}</p>
                </div>`;
        }
    }

    /**
     * Load welcome step
     */
    async _loadWelcomeStep(container) {
        container.innerHTML = `
            <div class="step-content welcome-step">
                <div class="welcome-header">
                    <div class="welcome-icon">🎯</div>
                    <h2>Welcome to Camera/Projector Calibration</h2>
                    <p class="welcome-subtitle">Get accurate spatial tracking for your applications</p>
                </div>

                <div class="calibration-benefits">
                    <h3>What you'll achieve:</h3>
                    <div class="benefits-grid">
                        <div class="benefit-item">
                            <div class="benefit-icon">📷</div>
                            <div class="benefit-text">
                                <strong>Accurate Camera Calibration</strong>
                                <p>Precise intrinsic parameters for distortion correction</p>
                            </div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-icon">📽️</div>
                            <div class="benefit-text">
                                <strong>Projector Alignment</strong>
                                <p>Perfect mapping between camera and projector coordinates</p>
                            </div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-icon">📐</div>
                            <div class="benefit-text">
                                <strong>Spatial Precision</strong>
                                <p>Sub-pixel accuracy for AR and tracking applications</p>
                            </div>
                        </div>
                        <div class="benefit-item">
                            <div class="benefit-icon">⚡</div>
                            <div class="benefit-text">
                                <strong>Easy Integration</strong>
                                <p>Ready-to-use calibration data for your projects</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="time-estimate">
                    <h3>Time Estimate</h3>
                    <div class="time-breakdown">
                        <div class="time-item">
                            <span class="time-step">Camera Calibration:</span>
                            <span class="time-duration">5-10 minutes</span>
                        </div>
                        <div class="time-item">
                            <span class="time-step">Projector Setup:</span>
                            <span class="time-duration">3-5 minutes</span>
                        </div>
                        <div class="time-item">
                            <span class="time-step">Spatial Mapping:</span>
                            <span class="time-duration">3-5 minutes</span>
                        </div>
                        <div class="time-total">
                            <span class="time-step">Total Time:</span>
                            <span class="time-duration">10-20 minutes</span>
                        </div>
                    </div>
                </div>

                <div class="requirements-check">
                    <h3>Before we begin, make sure you have:</h3>
                    <div class="requirements-list">
                        <label class="requirement-item">
                            <input type="checkbox" id="req-camera">
                            <span class="checkmark">✓</span>
                            <span class="requirement-text">Camera connected and working</span>
                        </label>
                        <label class="requirement-item">
                            <input type="checkbox" id="req-projector">
                            <span class="checkmark">✓</span>
                            <span class="requirement-text">Projector connected to computer</span>
                        </label>
                        <label class="requirement-item">
                            <input type="checkbox" id="req-surface">
                            <span class="checkmark">✓</span>
                            <span class="requirement-text">Flat projection surface (wall/screen)</span>
                        </label>
                        <label class="requirement-item">
                            <input type="checkbox" id="req-pattern">
                            <span class="checkmark">✓</span>
                            <span class="requirement-text">Printed checkerboard pattern</span>
                        </label>
                        <label class="requirement-item">
                            <input type="checkbox" id="req-lighting">
                            <span class="checkmark">✓</span>
                            <span class="requirement-text">Good lighting conditions</span>
                        </label>
                    </div>
                </div>

                <div class="user-mode-selection">
                    <h3>Choose your experience level:</h3>
                    <div class="mode-options">
                        <label class="mode-option">
                            <input type="radio" name="userMode" value="guided" checked>
                            <div class="mode-card">
                                <div class="mode-icon">🎓</div>
                                <h4>Guided Mode</h4>
                                <p>Step-by-step instructions with detailed explanations</p>
                                <span class="mode-time">Recommended for beginners</span>
                            </div>
                        </label>
                        <label class="mode-option">
                            <input type="radio" name="userMode" value="expert">
                            <div class="mode-card">
                                <div class="mode-icon">⚡</div>
                                <h4>Expert Mode</h4>
                                <p>Streamlined process with minimal guidance</p>
                                <span class="mode-time">For experienced users</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        `;

        // Setup mode selection
        container.querySelectorAll('input[name="userMode"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.userPreferences.calibrationMode = e.target.value;
                this._updateWizardForMode();
            });
        });

        // Auto-check requirements that can be detected
        this._autoCheckRequirements();
    }

    /**
     * Validate current step before proceeding
     */
    async _validateCurrentStep() {
        const step = this.steps[this.currentStep];

        switch (step.id) {
            case 'welcome':
                return this._validateWelcomeStep();
            case 'setup':
                return this._validateSetupStep();
            case 'camera-calibration':
                return this._validateCameraStep();
            case 'projector-setup':
                return this._validateProjectorStep();
            case 'calibration-mode':
                return this._validateModeSelectionStep();
            case 'quad-calibration':
                return this._validateQuadStep();
            case 'validation':
                return this._validateValidationStep();
            default:
                return { success: true };
        }
    }

    /**
     * Validate welcome step
     */
    _validateWelcomeStep() {
        const requirements = this.container.querySelectorAll('.requirement-item input[type="checkbox"]');
        const checkedCount = Array.from(requirements).filter(req => req.checked).length;

        if (checkedCount < requirements.length) {
            return {
                success: false,
                message: 'Please ensure all requirements are met before proceeding'
            };
        }

        return { success: true };
    }

    /**
     * Get next step index
     */
    _getNextStepIndex() {
        for (let i = this.currentStep + 1; i < this.steps.length; i++) {
            const step = this.steps[i];

            // Check if step is required based on current configuration
            if (step.id === 'quad-calibration' && this.userPreferences.calibrationMode === 'quick') {
                continue; // Skip quad calibration in quick mode
            }

            return i;
        }

        return -1; // No more steps
    }

    /**
     * Complete wizard
     */
    async _completeWizard() {
        try {
            // Final validation
            const finalValidation = await this._performFinalValidation();

            if (!finalValidation.success) {
                return finalValidation;
            }

            // Auto-save if enabled
            if (this.userPreferences.saveAutomatically) {
                await this._autoSaveCalibration();
            }

            // Mark wizard as complete
            this.completedSteps.add('completion');

            this._notifyComplete(this.calibrationData);
            this._provideFeedback('success', '🎉 Calibration completed successfully!');

            return {
                success: true,
                calibrationData: this.calibrationData,
                message: 'Calibration wizard completed successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to complete calibration wizard'
            };
        }
    }

    // Helper methods for user preferences and state management

    _loadUserPreferences() {
        try {
            const saved = localStorage.getItem('calibration-wizard-preferences');
            if (saved) {
                Object.assign(this.userPreferences, JSON.parse(saved));
            }
        } catch (error) {
            console.warn('Could not load user preferences:', error);
        }
    }

    _saveUserPreferences() {
        try {
            localStorage.setItem('calibration-wizard-preferences', JSON.stringify(this.userPreferences));
        } catch (error) {
            console.warn('Could not save user preferences:', error);
        }
    }

    _updateWizardForMode() {
        // Adjust wizard behavior based on user mode
        if (this.userPreferences.calibrationMode === 'expert') {
            this.userPreferences.showDetailedFeedback = false;
            this.userPreferences.skipOptionalSteps = true;
        } else {
            this.userPreferences.showDetailedFeedback = true;
            this.userPreferences.skipOptionalSteps = false;
        }

        this._saveUserPreferences();
    }

    _calculateRemainingTime() {
        const remainingSteps = this.steps.slice(this.currentStep + 1);
        // Simple estimation based on average step times
        return remainingSteps.length * 3; // 3 minutes average per step
    }

    async _autoCheckRequirements() {
        // Check camera availability
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(device => device.kind === 'videoinput');
            if (hasCamera) {
                const cameraReq = this.container.querySelector('#req-camera');
                if (cameraReq) cameraReq.checked = true;
            }
        } catch (error) {
            console.warn('Could not check camera availability:', error);
        }

        // Check for multiple displays (potential projector)
        try {
            if (screen.availWidth > 1920 || window.screen.width > 1920) {
                const projectorReq = this.container.querySelector('#req-projector');
                if (projectorReq) projectorReq.checked = true;
            }
        } catch (error) {
            console.warn('Could not check display configuration:', error);
        }
    }

    _showHelp() {
        const modal = this.container.querySelector('#help-modal');
        const helpContent = this.container.querySelector('#help-content');

        const currentStep = this.steps[this.currentStep];
        helpContent.innerHTML = this._getHelpContent(currentStep);

        modal.style.display = 'flex';
    }

    _hideHelp() {
        const modal = this.container.querySelector('#help-modal');
        modal.style.display = 'none';
    }

    _getHelpContent(step) {
        const helpTexts = {
            welcome: `
                <h4>Getting Started</h4>
                <p>This wizard will guide you through calibrating your camera and projector system.</p>
                <ul>
                    <li>Make sure all hardware is connected before starting</li>
                    <li>Choose guided mode if you're new to calibration</li>
                    <li>Expert mode skips detailed explanations</li>
                </ul>
            `,
            setup: `
                <h4>System Setup</h4>
                <p>Configure your hardware and test connections.</p>
                <ul>
                    <li>Camera permissions are required for calibration</li>
                    <li>Projector should be connected and detected</li>
                    <li>Good lighting helps with pattern detection</li>
                </ul>
            `,
            'camera-calibration': `
                <h4>Camera Calibration</h4>
                <p>Capture images of the checkerboard pattern from different angles.</p>
                <ul>
                    <li>Print the checkerboard pattern on regular paper</li>
                    <li>Hold the pattern steady and flat</li>
                    <li>Capture from various angles and distances</li>
                    <li>Need at least 10 good quality images</li>
                </ul>
            `
        };

        return helpTexts[step.id] || `
            <h4>${step.title}</h4>
            <p>${step.description}</p>
            <p>Follow the on-screen instructions to complete this step.</p>
        `;
    }

    // Event notification methods

    _notifyStepChange(step, index) {
        if (this.onStepChange) {
            this.onStepChange({ step, index, wizard: this });
        }
    }

    _notifyProgress(stage, percentage) {
        if (this.onProgress) {
            this.onProgress({ stage, percentage, wizard: this });
        }
    }

    _notifyComplete(calibrationData) {
        if (this.onComplete) {
            this.onComplete({ calibrationData, wizard: this });
        }
    }

    _notifyError(error) {
        if (this.onError) {
            this.onError({ error, wizard: this });
        }
    }

    _provideFeedback(type, message) {
        if (this.feedbackDisplay) {
            this.feedbackDisplay.show(type, message);
        }
        console.log(`CalibrationWizard ${type}: ${message}`);
    }

    // Event listener setters
    setStepChangeCallback(callback) {
        this.onStepChange = callback;
    }

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