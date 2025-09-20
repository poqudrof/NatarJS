/**
 * ModeSelector - Calibration mode selection interface
 * Allows users to choose between different calibration modes and configurations
 */

export class ModeSelector {
    constructor(container) {
        this.container = container;
        this.selectedMode = null;
        this.selectedOptions = {};
        this.onModeSelect = null;
        this.onOptionsChange = null;

        // Available calibration modes
        this.modes = {
            quick: {
                id: 'quick',
                title: 'Quick Calibration',
                description: 'Fast setup for basic applications',
                icon: '⚡',
                estimatedTime: '5-8 minutes',
                difficulty: 'Beginner',
                features: [
                    'Basic camera calibration',
                    'Simple 4-point projection mapping',
                    'Automatic parameter optimization',
                    'Good for testing and demos'
                ],
                requirements: [
                    'Flat projection surface',
                    'Fixed camera/projector setup'
                ],
                accuracy: 'Good',
                recommended: false
            },

            guided: {
                id: 'guided',
                title: 'Guided Calibration',
                description: 'Step-by-step comprehensive calibration',
                icon: '🎯',
                estimatedTime: '10-15 minutes',
                difficulty: 'Beginner-Friendly',
                features: [
                    'Full camera calibration with quality assessment',
                    'Projector setup and resolution optimization',
                    '4-point quad calibration with validation',
                    'Real-time quality feedback',
                    'Detailed explanations and tips'
                ],
                requirements: [
                    'Printed checkerboard pattern',
                    'Good lighting conditions',
                    'Stable setup'
                ],
                accuracy: 'Excellent',
                recommended: true
            },

            expert: {
                id: 'expert',
                title: 'Expert Mode',
                description: 'Advanced calibration with full control',
                icon: '🔬',
                estimatedTime: '15-25 minutes',
                difficulty: 'Advanced',
                features: [
                    'All guided mode features',
                    'Manual parameter adjustment',
                    'Multiple calibration patterns',
                    'Advanced quality metrics',
                    'Custom validation procedures',
                    'Calibration data export'
                ],
                requirements: [
                    'Understanding of calibration principles',
                    'Multiple calibration patterns',
                    'Precision measurement tools'
                ],
                accuracy: 'Maximum',
                recommended: false
            },

            custom: {
                id: 'custom',
                title: 'Custom Setup',
                description: 'Configure your own calibration workflow',
                icon: '⚙️',
                estimatedTime: 'Variable',
                difficulty: 'Expert',
                features: [
                    'Choose specific calibration steps',
                    'Configure quality thresholds',
                    'Select calibration patterns',
                    'Custom validation criteria',
                    'Advanced debugging tools'
                ],
                requirements: [
                    'Expert knowledge required',
                    'Custom calibration patterns',
                    'Manual quality assessment'
                ],
                accuracy: 'User-dependent',
                recommended: false
            }
        };

        // Mode-specific options
        this.modeOptions = {
            quick: {
                skipCameraCalibration: {
                    type: 'checkbox',
                    label: 'Skip camera calibration (use existing)',
                    default: false,
                    description: 'Use previously saved camera calibration'
                },
                autoCapture: {
                    type: 'checkbox',
                    label: 'Enable auto-capture',
                    default: true,
                    description: 'Automatically capture images when pattern is detected'
                }
            },

            guided: {
                detailedFeedback: {
                    type: 'checkbox',
                    label: 'Show detailed feedback',
                    default: true,
                    description: 'Display comprehensive quality metrics and tips'
                },
                autoCapture: {
                    type: 'checkbox',
                    label: 'Enable auto-capture',
                    default: false,
                    description: 'Automatically capture when quality is good'
                },
                minImages: {
                    type: 'select',
                    label: 'Minimum calibration images',
                    options: [
                        { value: 10, text: '10 images (Fast)' },
                        { value: 15, text: '15 images (Recommended)' },
                        { value: 20, text: '20 images (High Quality)' }
                    ],
                    default: 15,
                    description: 'More images improve calibration accuracy'
                }
            },

            expert: {
                calibrationPattern: {
                    type: 'select',
                    label: 'Calibration pattern',
                    options: [
                        { value: 'checkerboard_9x6', text: 'Checkerboard 9×6' },
                        { value: 'checkerboard_7x5', text: 'Checkerboard 7×5' },
                        { value: 'circles_4x11', text: 'Asymmetric Circles' },
                        { value: 'custom', text: 'Custom Pattern' }
                    ],
                    default: 'checkerboard_9x6',
                    description: 'Choose calibration pattern type'
                },
                qualityThreshold: {
                    type: 'range',
                    label: 'Quality threshold',
                    min: 0.5,
                    max: 0.95,
                    step: 0.05,
                    default: 0.8,
                    description: 'Minimum quality required for image acceptance'
                },
                advancedValidation: {
                    type: 'checkbox',
                    label: 'Enable advanced validation',
                    default: true,
                    description: 'Additional quality checks and metrics'
                },
                exportData: {
                    type: 'checkbox',
                    label: 'Export calibration data',
                    default: false,
                    description: 'Save detailed calibration data for analysis'
                }
            },

            custom: {
                enableCameraCalibration: {
                    type: 'checkbox',
                    label: 'Include camera calibration',
                    default: true,
                    description: 'Perform camera intrinsic calibration'
                },
                enableProjectorSetup: {
                    type: 'checkbox',
                    label: 'Include projector setup',
                    default: true,
                    description: 'Configure projector display settings'
                },
                enableQuadCalibration: {
                    type: 'checkbox',
                    label: 'Include quad calibration',
                    default: true,
                    description: 'Perform 4-point spatial mapping'
                },
                enableValidation: {
                    type: 'checkbox',
                    label: 'Include validation tests',
                    default: true,
                    description: 'Test calibration accuracy'
                },
                debugMode: {
                    type: 'checkbox',
                    label: 'Enable debug mode',
                    default: false,
                    description: 'Show detailed technical information'
                }
            }
        };

        this.setup();
    }

    /**
     * Setup mode selector interface
     */
    setup() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="mode-selector">
                <div class="mode-selector-header">
                    <h2>Choose Your Calibration Mode</h2>
                    <p>Select the calibration approach that best fits your experience level and requirements.</p>
                </div>

                <div class="modes-grid" id="modes-grid">
                    ${Object.values(this.modes).map(mode => this._generateModeCard(mode)).join('')}
                </div>

                <div class="mode-details" id="mode-details" style="display: none;">
                    <div class="mode-info">
                        <div class="mode-header">
                            <span class="mode-icon" id="selected-mode-icon"></span>
                            <div class="mode-title-section">
                                <h3 id="selected-mode-title"></h3>
                                <p id="selected-mode-description"></p>
                            </div>
                        </div>

                        <div class="mode-metadata">
                            <div class="metadata-item">
                                <span class="metadata-label">Estimated Time:</span>
                                <span class="metadata-value" id="selected-mode-time"></span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Difficulty:</span>
                                <span class="metadata-value" id="selected-mode-difficulty"></span>
                            </div>
                            <div class="metadata-item">
                                <span class="metadata-label">Accuracy:</span>
                                <span class="metadata-value" id="selected-mode-accuracy"></span>
                            </div>
                        </div>

                        <div class="mode-features">
                            <h4>Features</h4>
                            <ul id="selected-mode-features"></ul>
                        </div>

                        <div class="mode-requirements">
                            <h4>Requirements</h4>
                            <ul id="selected-mode-requirements"></ul>
                        </div>
                    </div>

                    <div class="mode-options" id="mode-options">
                        <h4>Configuration Options</h4>
                        <div class="options-container" id="options-container">
                            <!-- Dynamic options will be loaded here -->
                        </div>
                    </div>
                </div>

                <div class="mode-actions" id="mode-actions" style="display: none;">
                    <button class="btn btn-secondary" id="change-mode-btn">
                        ← Change Mode
                    </button>
                    <button class="btn btn-primary" id="start-calibration-btn">
                        Start Calibration →
                    </button>
                </div>

                <div class="mode-comparison" id="mode-comparison">
                    <button class="btn btn-outline" id="compare-modes-btn">
                        📊 Compare Modes
                    </button>
                </div>
            </div>

            <!-- Mode Comparison Modal -->
            <div id="comparison-modal" class="modal" style="display: none;">
                <div class="modal-content modal-wide">
                    <div class="modal-header">
                        <h3>Mode Comparison</h3>
                        <button class="modal-close" id="comparison-modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="comparison-table" id="comparison-table">
                            <!-- Comparison table will be generated here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="comparison-close">Close</button>
                    </div>
                </div>
            </div>
        `;

        this._setupEventListeners();
        this._setupStyles();
    }

    /**
     * Get selected mode and options
     */
    getSelection() {
        return {
            mode: this.selectedMode,
            options: this.selectedOptions
        };
    }

    /**
     * Set mode selection programmatically
     */
    setMode(modeId, options = {}) {
        if (this.modes[modeId]) {
            this.selectedMode = modeId;
            this.selectedOptions = { ...options };
            this._showModeDetails(this.modes[modeId]);
            this._updateModeCardStates();
        }
    }

    /**
     * Reset selection
     */
    reset() {
        this.selectedMode = null;
        this.selectedOptions = {};
        this._hideModeDetails();
        this._updateModeCardStates();
    }

    // Private methods

    /**
     * Generate mode card HTML
     */
    _generateModeCard(mode) {
        const recommendedBadge = mode.recommended ? '<span class="mode-badge recommended">Recommended</span>' : '';

        return `
            <div class="mode-card" data-mode="${mode.id}">
                <div class="mode-card-header">
                    <span class="mode-card-icon">${mode.icon}</span>
                    <h3 class="mode-card-title">${mode.title}</h3>
                    ${recommendedBadge}
                </div>

                <div class="mode-card-body">
                    <p class="mode-card-description">${mode.description}</p>

                    <div class="mode-card-metadata">
                        <div class="metadata-row">
                            <span class="metadata-icon">⏱️</span>
                            <span>${mode.estimatedTime}</span>
                        </div>
                        <div class="metadata-row">
                            <span class="metadata-icon">📈</span>
                            <span>${mode.difficulty}</span>
                        </div>
                        <div class="metadata-row">
                            <span class="metadata-icon">🎯</span>
                            <span>${mode.accuracy} accuracy</span>
                        </div>
                    </div>
                </div>

                <div class="mode-card-footer">
                    <button class="btn btn-primary mode-select-btn" data-mode="${mode.id}">
                        Select Mode
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Mode selection
        this.container.addEventListener('click', (e) => {
            if (e.target.matches('.mode-select-btn') || e.target.closest('.mode-card')) {
                const modeId = e.target.dataset.mode || e.target.closest('.mode-card')?.dataset.mode;
                if (modeId && this.modes[modeId]) {
                    this._selectMode(modeId);
                }
            }
        });

        // Change mode button
        this.container.querySelector('#change-mode-btn')?.addEventListener('click', () => {
            this._hideModeDetails();
        });

        // Start calibration button
        this.container.querySelector('#start-calibration-btn')?.addEventListener('click', () => {
            this._startCalibration();
        });

        // Compare modes button
        this.container.querySelector('#compare-modes-btn')?.addEventListener('click', () => {
            this._showComparison();
        });

        // Comparison modal
        this.container.querySelector('#comparison-modal-close')?.addEventListener('click', () => {
            this._hideComparison();
        });

        this.container.querySelector('#comparison-close')?.addEventListener('click', () => {
            this._hideComparison();
        });

        // Options change events
        this.container.addEventListener('change', (e) => {
            if (e.target.matches('.mode-option-input')) {
                this._handleOptionChange(e.target);
            }
        });
    }

    /**
     * Select a mode
     */
    _selectMode(modeId) {
        this.selectedMode = modeId;
        this.selectedOptions = this._getDefaultOptions(modeId);

        const mode = this.modes[modeId];
        this._showModeDetails(mode);
        this._updateModeCardStates();

        // Notify parent component
        if (this.onModeSelect) {
            this.onModeSelect({
                mode: modeId,
                options: this.selectedOptions
            });
        }
    }

    /**
     * Show mode details
     */
    _showModeDetails(mode) {
        const detailsContainer = this.container.querySelector('#mode-details');
        const actionsContainer = this.container.querySelector('#mode-actions');
        const comparisonContainer = this.container.querySelector('#mode-comparison');

        // Update mode information
        this.container.querySelector('#selected-mode-icon').textContent = mode.icon;
        this.container.querySelector('#selected-mode-title').textContent = mode.title;
        this.container.querySelector('#selected-mode-description').textContent = mode.description;
        this.container.querySelector('#selected-mode-time').textContent = mode.estimatedTime;
        this.container.querySelector('#selected-mode-difficulty').textContent = mode.difficulty;
        this.container.querySelector('#selected-mode-accuracy').textContent = mode.accuracy;

        // Update features list
        const featuresList = this.container.querySelector('#selected-mode-features');
        featuresList.innerHTML = mode.features.map(feature => `<li>${feature}</li>`).join('');

        // Update requirements list
        const requirementsList = this.container.querySelector('#selected-mode-requirements');
        requirementsList.innerHTML = mode.requirements.map(req => `<li>${req}</li>`).join('');

        // Load mode options
        this._loadModeOptions(mode.id);

        // Show details and hide comparison
        detailsContainer.style.display = 'block';
        actionsContainer.style.display = 'flex';
        comparisonContainer.style.display = 'none';

        // Smooth scroll to details
        detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Hide mode details
     */
    _hideModeDetails() {
        this.selectedMode = null;
        this.selectedOptions = {};

        const detailsContainer = this.container.querySelector('#mode-details');
        const actionsContainer = this.container.querySelector('#mode-actions');
        const comparisonContainer = this.container.querySelector('#mode-comparison');

        detailsContainer.style.display = 'none';
        actionsContainer.style.display = 'none';
        comparisonContainer.style.display = 'block';

        this._updateModeCardStates();
    }

    /**
     * Update mode card visual states
     */
    _updateModeCardStates() {
        const cards = this.container.querySelectorAll('.mode-card');

        cards.forEach(card => {
            const modeId = card.dataset.mode;
            const isSelected = modeId === this.selectedMode;

            card.classList.toggle('selected', isSelected);

            const button = card.querySelector('.mode-select-btn');
            if (button) {
                button.textContent = isSelected ? 'Selected' : 'Select Mode';
                button.disabled = isSelected;
            }
        });
    }

    /**
     * Load mode-specific options
     */
    _loadModeOptions(modeId) {
        const optionsContainer = this.container.querySelector('#options-container');
        const options = this.modeOptions[modeId] || {};

        if (Object.keys(options).length === 0) {
            optionsContainer.innerHTML = '<p class="no-options">No additional configuration needed.</p>';
            return;
        }

        const optionsHTML = Object.entries(options).map(([key, option]) => {
            return this._generateOptionInput(key, option);
        }).join('');

        optionsContainer.innerHTML = optionsHTML;

        // Initialize option values
        Object.entries(options).forEach(([key, option]) => {
            const input = optionsContainer.querySelector(`[data-option="${key}"]`);
            if (input) {
                if (option.type === 'checkbox') {
                    input.checked = this.selectedOptions[key] ?? option.default;
                } else {
                    input.value = this.selectedOptions[key] ?? option.default;
                }
            }
        });
    }

    /**
     * Generate option input HTML
     */
    _generateOptionInput(key, option) {
        const value = this.selectedOptions[key] ?? option.default;

        switch (option.type) {
            case 'checkbox':
                return `
                    <div class="option-item">
                        <label class="checkbox-label">
                            <input type="checkbox" class="mode-option-input" data-option="${key}" ${value ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            <span class="option-label">${option.label}</span>
                        </label>
                        <p class="option-description">${option.description}</p>
                    </div>
                `;

            case 'select':
                const optionsHTML = option.options.map(opt =>
                    `<option value="${opt.value}" ${opt.value == value ? 'selected' : ''}>${opt.text}</option>`
                ).join('');

                return `
                    <div class="option-item">
                        <label class="option-label">${option.label}</label>
                        <select class="mode-option-input option-select" data-option="${key}">
                            ${optionsHTML}
                        </select>
                        <p class="option-description">${option.description}</p>
                    </div>
                `;

            case 'range':
                return `
                    <div class="option-item">
                        <label class="option-label">${option.label}</label>
                        <div class="range-input-container">
                            <input type="range" class="mode-option-input option-range" data-option="${key}"
                                   min="${option.min}" max="${option.max}" step="${option.step}" value="${value}">
                            <span class="range-value" id="range-${key}-value">${value}</span>
                        </div>
                        <p class="option-description">${option.description}</p>
                    </div>
                `;

            default:
                return `
                    <div class="option-item">
                        <label class="option-label">${option.label}</label>
                        <input type="text" class="mode-option-input option-text" data-option="${key}" value="${value}">
                        <p class="option-description">${option.description}</p>
                    </div>
                `;
        }
    }

    /**
     * Handle option change
     */
    _handleOptionChange(input) {
        const key = input.dataset.option;
        let value;

        if (input.type === 'checkbox') {
            value = input.checked;
        } else if (input.type === 'range') {
            value = parseFloat(input.value);
            // Update range display
            const rangeValue = this.container.querySelector(`#range-${key}-value`);
            if (rangeValue) {
                rangeValue.textContent = value;
            }
        } else if (input.type === 'number') {
            value = parseFloat(input.value);
        } else {
            value = input.value;
        }

        this.selectedOptions[key] = value;

        // Notify parent component
        if (this.onOptionsChange) {
            this.onOptionsChange({
                key,
                value,
                options: this.selectedOptions
            });
        }
    }

    /**
     * Get default options for a mode
     */
    _getDefaultOptions(modeId) {
        const options = this.modeOptions[modeId] || {};
        const defaults = {};

        Object.entries(options).forEach(([key, option]) => {
            defaults[key] = option.default;
        });

        return defaults;
    }

    /**
     * Start calibration with selected mode
     */
    _startCalibration() {
        if (!this.selectedMode) return;

        // Emit start event
        const event = new CustomEvent('calibration-start', {
            detail: {
                mode: this.selectedMode,
                options: this.selectedOptions
            }
        });

        this.container.dispatchEvent(event);
    }

    /**
     * Show mode comparison
     */
    _showComparison() {
        const modal = this.container.querySelector('#comparison-modal');
        const table = this.container.querySelector('#comparison-table');

        table.innerHTML = this._generateComparisonTable();
        modal.style.display = 'flex';
    }

    /**
     * Hide mode comparison
     */
    _hideComparison() {
        const modal = this.container.querySelector('#comparison-modal');
        modal.style.display = 'none';
    }

    /**
     * Generate comparison table
     */
    _generateComparisonTable() {
        const modes = Object.values(this.modes);
        const attributes = [
            { key: 'estimatedTime', label: 'Time Required' },
            { key: 'difficulty', label: 'Difficulty Level' },
            { key: 'accuracy', label: 'Accuracy Level' },
            { key: 'features', label: 'Key Features' },
            { key: 'requirements', label: 'Requirements' }
        ];

        let html = `
            <table class="comparison-table-grid">
                <thead>
                    <tr>
                        <th>Feature</th>
                        ${modes.map(mode => `<th>${mode.title}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        attributes.forEach(attr => {
            html += `<tr><td class="attribute-label">${attr.label}</td>`;

            modes.forEach(mode => {
                let cellContent = mode[attr.key];

                if (Array.isArray(cellContent)) {
                    cellContent = `<ul>${cellContent.map(item => `<li>${item}</li>`).join('')}</ul>`;
                }

                html += `<td>${cellContent}</td>`;
            });

            html += '</tr>';
        });

        html += '</tbody></table>';

        return html;
    }

    /**
     * Setup styles
     */
    _setupStyles() {
        if (document.getElementById('mode-selector-styles')) return;

        const style = document.createElement('style');
        style.id = 'mode-selector-styles';
        style.textContent = `
            .mode-selector {
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem;
            }

            .mode-selector-header {
                text-align: center;
                margin-bottom: 2rem;
            }

            .mode-selector-header h2 {
                margin: 0 0 0.5rem;
                font-size: 2rem;
                color: var(--text-primary, #1f2937);
            }

            .mode-selector-header p {
                margin: 0;
                font-size: 1.125rem;
                color: var(--text-secondary, #6b7280);
            }

            .modes-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 1.5rem;
                margin-bottom: 2rem;
            }

            .mode-card {
                background: var(--bg-card, #ffffff);
                border: 2px solid var(--border-light, #e5e7eb);
                border-radius: 12px;
                padding: 1.5rem;
                transition: all 0.3s ease;
                cursor: pointer;
                position: relative;
            }

            .mode-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                border-color: var(--primary-color, #3b82f6);
            }

            .mode-card.selected {
                border-color: var(--primary-color, #3b82f6);
                background: var(--primary-light, #eff6ff);
            }

            .mode-card-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1rem;
                position: relative;
            }

            .mode-card-icon {
                font-size: 2rem;
            }

            .mode-card-title {
                margin: 0;
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }

            .mode-badge {
                position: absolute;
                top: -0.5rem;
                right: -0.5rem;
                background: var(--success-color, #10b981);
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .mode-badge.recommended {
                background: var(--warning-color, #f59e0b);
            }

            .mode-card-description {
                margin: 0 0 1rem;
                color: var(--text-secondary, #6b7280);
                line-height: 1.5;
            }

            .mode-card-metadata {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                margin-bottom: 1.5rem;
            }

            .metadata-row {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
            }

            .metadata-icon {
                width: 1rem;
                text-align: center;
            }

            .mode-card-footer {
                text-align: center;
            }

            .mode-select-btn {
                width: 100%;
                padding: 0.75rem 1rem;
                background: var(--primary-color, #3b82f6);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.3s ease;
            }

            .mode-select-btn:hover:not(:disabled) {
                background: var(--primary-hover, #2563eb);
            }

            .mode-select-btn:disabled {
                background: var(--success-color, #10b981);
            }

            .mode-details {
                background: var(--bg-card, #ffffff);
                border-radius: 12px;
                padding: 2rem;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                margin-bottom: 2rem;
            }

            .mode-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 2rem;
            }

            .mode-icon {
                font-size: 3rem;
            }

            .mode-title-section h3 {
                margin: 0 0 0.5rem;
                font-size: 1.5rem;
                color: var(--text-primary, #1f2937);
            }

            .mode-title-section p {
                margin: 0;
                color: var(--text-secondary, #6b7280);
            }

            .mode-metadata {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
                padding: 1rem;
                background: var(--bg-secondary, #f8fafc);
                border-radius: 8px;
            }

            .metadata-item {
                text-align: center;
            }

            .metadata-label {
                display: block;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
                margin-bottom: 0.25rem;
            }

            .metadata-value {
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }

            .mode-features,
            .mode-requirements {
                margin-bottom: 2rem;
            }

            .mode-features h4,
            .mode-requirements h4,
            .mode-options h4 {
                margin: 0 0 1rem;
                font-size: 1.125rem;
                color: var(--text-primary, #1f2937);
            }

            .mode-features ul,
            .mode-requirements ul {
                margin: 0;
                padding-left: 1.5rem;
                color: var(--text-secondary, #6b7280);
            }

            .mode-features li,
            .mode-requirements li {
                margin-bottom: 0.5rem;
            }

            .options-container {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }

            .option-item {
                background: var(--bg-secondary, #f8fafc);
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid var(--border-light, #e5e7eb);
            }

            .option-label {
                display: block;
                font-weight: 500;
                color: var(--text-primary, #1f2937);
                margin-bottom: 0.5rem;
            }

            .option-description {
                margin: 0.5rem 0 0;
                font-size: 0.875rem;
                color: var(--text-secondary, #6b7280);
            }

            .no-options {
                text-align: center;
                color: var(--text-secondary, #6b7280);
                font-style: italic;
                margin: 0;
            }

            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
            }

            .checkbox-label input[type="checkbox"] {
                display: none;
            }

            .checkmark {
                width: 20px;
                height: 20px;
                border: 2px solid var(--border-medium, #d1d5db);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .checkbox-label input[type="checkbox"]:checked + .checkmark {
                background: var(--primary-color, #3b82f6);
                border-color: var(--primary-color, #3b82f6);
            }

            .checkbox-label input[type="checkbox"]:checked + .checkmark::after {
                content: "✓";
                color: white;
                font-size: 0.875rem;
                font-weight: bold;
            }

            .option-select {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid var(--border-medium, #d1d5db);
                border-radius: 6px;
                background: var(--bg-card, #ffffff);
                color: var(--text-primary, #1f2937);
            }

            .range-input-container {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .option-range {
                flex: 1;
                height: 6px;
                background: var(--border-light, #e5e7eb);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }

            .option-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--primary-color, #3b82f6);
                cursor: pointer;
            }

            .range-value {
                min-width: 3rem;
                text-align: center;
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }

            .mode-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
                margin-bottom: 2rem;
            }

            .mode-comparison {
                text-align: center;
            }

            .modal-wide .modal-content {
                max-width: 90vw;
            }

            .comparison-table-grid {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.875rem;
            }

            .comparison-table-grid th,
            .comparison-table-grid td {
                padding: 1rem;
                text-align: left;
                border-bottom: 1px solid var(--border-light, #e5e7eb);
                vertical-align: top;
            }

            .comparison-table-grid th {
                background: var(--bg-secondary, #f8fafc);
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }

            .attribute-label {
                font-weight: 500;
                color: var(--text-primary, #1f2937);
                background: var(--bg-tertiary, #e2e8f0);
            }

            .comparison-table-grid ul {
                margin: 0;
                padding-left: 1rem;
            }

            .comparison-table-grid li {
                margin-bottom: 0.25rem;
            }

            @media (max-width: 768px) {
                .mode-selector {
                    padding: 1rem;
                }

                .modes-grid {
                    grid-template-columns: 1fr;
                }

                .mode-metadata {
                    grid-template-columns: 1fr;
                }

                .mode-header {
                    flex-direction: column;
                    text-align: center;
                }

                .mode-actions {
                    flex-direction: column;
                }

                .comparison-table-grid {
                    font-size: 0.75rem;
                }

                .comparison-table-grid th,
                .comparison-table-grid td {
                    padding: 0.5rem;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Event setter methods
    setModeSelectCallback(callback) {
        this.onModeSelect = callback;
    }

    setOptionsChangeCallback(callback) {
        this.onOptionsChange = callback;
    }
}

export default ModeSelector;