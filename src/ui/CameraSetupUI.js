/**
 * Camera Setup User Interface
 * Provides interactive UI for camera selection, resolution configuration, and testing
 */

import { CameraSetup } from '../setup/CameraSetup.js';
import { SetupStorage } from '../storage/SetupStorage.js';

export class CameraSetupUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cameraSetup = new CameraSetup();
        this.storage = new SetupStorage();
        this.currentConfig = {
            deviceId: null,
            resolution: null
        };
        this.elements = {};
        this.savedConfigurations = [];
        this.currentUser = null;

        this.initialize();
    }

    async initialize() {
        this.createUI();
        this.setupEventListeners();

        // Set up camera setup callbacks
        this.cameraSetup.setCallbacks({
            onDevicesChanged: (devices) => this.updateDeviceList(devices),
            onTestComplete: (results) => this.displayTestResults(results),
            onError: (error) => this.showError(error)
        });

        // Set up storage callbacks
        this.storage.setCallbacks({
            onAuthChanged: (user) => this.onAuthChanged(user),
            onConfigLoaded: (configs) => this.onConfigurationsLoaded(configs),
            onError: (error) => this.showError(error)
        });

        // Initialize systems
        this.showLoading('Initializing camera system...');

        // Initialize storage first
        const storageResult = await this.storage.initialize();
        if (!storageResult.success) {
            console.warn('Firebase initialization failed:', storageResult.error);
            this.showWarning(storageResult.userMessage);
        }

        // Initialize camera system
        const cameraResult = await this.cameraSetup.initialize();

        if (cameraResult.success) {
            this.hideLoading();
            this.updateDeviceList(this.cameraSetup.getAvailableDevices());
            this.updateAuthUI();
        } else {
            this.hideLoading();
            this.showError(cameraResult.userMessage || cameraResult.error);
        }
    }

    createUI() {
        this.container.innerHTML = `
            <div class="camera-setup-container">
                <!-- Loading Overlay -->
                <div id="camera-loading" class="loading-overlay" style="display: none;">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading...</div>
                    </div>
                </div>

                <!-- Header -->
                <div class="setup-header">
                    <h2>📷 Camera Setup</h2>
                    <p>Configure your camera for optimal calibration performance</p>

                    <!-- Authentication Section -->
                    <div id="auth-section" class="auth-section">
                        <div id="signed-out" class="auth-state">
                            <p>💾 Sign in to save configurations to the cloud</p>
                            <button id="sign-in-btn" class="btn btn-primary">
                                <span class="btn-icon">🔐</span>
                                <span class="btn-text">Sign in with Google</span>
                                <span class="btn-spinner" style="display: none;">⟳</span>
                            </button>
                        </div>
                        <div id="signed-in" class="auth-state" style="display: none;">
                            <div class="user-info">
                                <img id="user-avatar" class="user-avatar" src="" alt="User">
                                <div class="user-details">
                                    <div id="user-name" class="user-name"></div>
                                    <div class="user-status">✅ Connected to cloud storage</div>
                                </div>
                                <button id="sign-out-btn" class="btn btn-outline btn-sm">
                                    <span class="btn-text">Sign Out</span>
                                    <span class="btn-spinner" style="display: none;">⟳</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Messages Display -->
                <div id="camera-error" class="error-message" style="display: none;"></div>
                <div id="camera-warning" class="warning-message" style="display: none;"></div>
                <div id="camera-success" class="success-message" style="display: none;"></div>

                <!-- Camera Selection -->
                <div class="setup-section">
                    <h3>1. Select Camera</h3>
                    <div class="form-group">
                        <label for="camera-select">Available Cameras:</label>
                        <div class="select-container">
                            <select id="camera-select" class="form-select">
                                <option value="">Loading cameras...</option>
                            </select>
                            <button id="refresh-cameras" class="btn btn-outline btn-sm">
                                🔄 Refresh
                            </button>
                        </div>
                        <div id="camera-description" class="form-description"></div>
                    </div>
                </div>

                <!-- Resolution Selection -->
                <div class="setup-section">
                    <h3>2. Choose Resolution</h3>
                    <div class="form-group">
                        <label for="resolution-select">Resolution Quality:</label>
                        <select id="resolution-select" class="form-select">
                            <option value="">Select a camera first</option>
                        </select>
                        <div id="resolution-description" class="form-description"></div>
                    </div>
                    <div id="resolution-grid" class="resolution-grid"></div>
                </div>

                <!-- Camera Testing -->
                <div class="setup-section">
                    <h3>3. Test Configuration</h3>
                    <div class="test-controls">
                        <button id="test-camera" class="btn btn-primary" disabled>
                            🧪 Test Camera
                        </button>
                        <button id="stop-test" class="btn btn-secondary" disabled>
                            ⏹️ Stop Test
                        </button>
                    </div>

                    <!-- Test Results -->
                    <div id="test-results" class="test-results" style="display: none;">
                        <div class="test-preview">
                            <video id="camera-preview" autoplay muted playsinline></video>
                        </div>
                        <div class="test-metrics">
                            <h4>Test Results</h4>
                            <div id="metrics-content"></div>
                            <div id="recommendations"></div>
                        </div>
                    </div>
                </div>

                <!-- Configuration Actions -->
                <div class="setup-section">
                    <h3>4. Save Configuration</h3>
                    <div class="config-actions">
                        <input type="text" id="config-name" class="form-input" placeholder="Configuration name (e.g., 'My Laptop Camera')">
                        <button id="save-config" class="btn btn-success" disabled>
                            💾 Save Configuration
                        </button>
                    </div>
                    <div id="saved-configs" class="saved-configs"></div>
                </div>
            </div>
        `;

        this.cacheElements();
    }

    cacheElements() {
        this.elements = {
            loading: document.getElementById('camera-loading'),
            loadingText: this.container.querySelector('.loading-text'),
            error: document.getElementById('camera-error'),
            warning: document.getElementById('camera-warning'),
            success: document.getElementById('camera-success'),
            // Authentication elements
            signedOut: document.getElementById('signed-out'),
            signedIn: document.getElementById('signed-in'),
            signInBtn: document.getElementById('sign-in-btn'),
            signOutBtn: document.getElementById('sign-out-btn'),
            userAvatar: document.getElementById('user-avatar'),
            userName: document.getElementById('user-name'),
            // Camera elements
            cameraSelect: document.getElementById('camera-select'),
            refreshCameras: document.getElementById('refresh-cameras'),
            cameraDescription: document.getElementById('camera-description'),
            resolutionSelect: document.getElementById('resolution-select'),
            resolutionDescription: document.getElementById('resolution-description'),
            resolutionGrid: document.getElementById('resolution-grid'),
            testCamera: document.getElementById('test-camera'),
            stopTest: document.getElementById('stop-test'),
            testResults: document.getElementById('test-results'),
            cameraPreview: document.getElementById('camera-preview'),
            metricsContent: document.getElementById('metrics-content'),
            recommendations: document.getElementById('recommendations'),
            configName: document.getElementById('config-name'),
            saveConfig: document.getElementById('save-config'),
            savedConfigs: document.getElementById('saved-configs')
        };
    }

    setupEventListeners() {
        // Authentication
        this.elements.signInBtn.addEventListener('click', () => {
            this.signIn();
        });

        this.elements.signOutBtn.addEventListener('click', () => {
            this.signOut();
        });

        // Camera selection
        this.elements.cameraSelect.addEventListener('change', (e) => {
            this.onCameraSelected(e.target.value);
        });

        // Refresh cameras
        this.elements.refreshCameras.addEventListener('click', () => {
            this.refreshCameras();
        });

        // Resolution selection
        this.elements.resolutionSelect.addEventListener('change', (e) => {
            this.onResolutionSelected(e.target.value);
        });

        // Camera testing
        this.elements.testCamera.addEventListener('click', () => {
            this.testCamera();
        });

        this.elements.stopTest.addEventListener('click', () => {
            this.stopTest();
        });

        // Configuration management
        this.elements.saveConfig.addEventListener('click', () => {
            this.saveConfiguration();
        });

    }

    async updateDeviceList(devices) {
        this.elements.cameraSelect.innerHTML = '';

        if (devices.length === 0) {
            this.elements.cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            this.elements.cameraDescription.textContent = 'Please connect a camera and click refresh.';
            return;
        }

        // Add default option
        this.elements.cameraSelect.innerHTML = '<option value="">Select a camera...</option>';

        // Add each device
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label + (device.isRecommended ? ' (Recommended)' : '');
            this.elements.cameraSelect.appendChild(option);
        });

        // Auto-select recommended camera
        const recommended = devices.find(d => d.isRecommended);
        if (recommended) {
            this.elements.cameraSelect.value = recommended.deviceId;
            this.onCameraSelected(recommended.deviceId);
        }
    }

    onCameraSelected(deviceId) {
        if (!deviceId) {
            this.clearResolutions();
            return;
        }

        const devices = this.cameraSetup.getAvailableDevices();
        const selectedDevice = devices.find(d => d.deviceId === deviceId);

        if (selectedDevice) {
            this.currentConfig.deviceId = deviceId;
            this.elements.cameraDescription.textContent = selectedDevice.description;
            this.updateResolutionList(selectedDevice.capabilities.supportedResolutions);
        }
    }

    updateResolutionList(resolutions) {
        this.elements.resolutionSelect.innerHTML = '<option value="">Select resolution...</option>';

        resolutions.forEach((res, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${res.name} (${res.width}×${res.height}) - ${res.quality}`;
            if (res.recommended) {
                option.textContent += ' - Recommended';
            }
            this.elements.resolutionSelect.appendChild(option);
        });

        // Create resolution grid
        this.createResolutionGrid(resolutions);

        // Auto-select recommended resolution
        const recommendedIndex = resolutions.findIndex(r => r.recommended);
        if (recommendedIndex !== -1) {
            this.elements.resolutionSelect.value = recommendedIndex;
            this.onResolutionSelected(recommendedIndex);
        }
    }

    createResolutionGrid(resolutions) {
        this.elements.resolutionGrid.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'resolution-options';

        resolutions.forEach((res, index) => {
            const card = document.createElement('div');
            card.className = `resolution-card ${res.recommended ? 'recommended' : ''}`;
            card.innerHTML = `
                <div class="resolution-name">${res.name}</div>
                <div class="resolution-size">${res.width}×${res.height}</div>
                <div class="resolution-quality">${res.quality}</div>
                <div class="resolution-performance">Performance: ${res.performance}</div>
                ${res.recommended ? '<div class="recommended-badge">Recommended</div>' : ''}
            `;

            card.addEventListener('click', () => {
                this.elements.resolutionSelect.value = index;
                this.onResolutionSelected(index);

                // Update visual selection
                document.querySelectorAll('.resolution-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });

            grid.appendChild(card);
        });

        this.elements.resolutionGrid.appendChild(grid);
    }

    onResolutionSelected(resolutionIndex) {
        if (!resolutionIndex || !this.currentConfig.deviceId) {
            this.elements.testCamera.disabled = true;
            return;
        }

        const devices = this.cameraSetup.getAvailableDevices();
        const selectedDevice = devices.find(d => d.deviceId === this.currentConfig.deviceId);
        const resolution = selectedDevice.capabilities.supportedResolutions[resolutionIndex];

        this.currentConfig.resolution = resolution;
        this.elements.resolutionDescription.textContent =
            `${resolution.quality} quality with ${resolution.performance.toLowerCase()} performance`;

        this.elements.testCamera.disabled = false;

        // Update grid selection
        document.querySelectorAll('.resolution-card').forEach((card, index) => {
            card.classList.toggle('selected', index == resolutionIndex);
        });
    }

    clearResolutions() {
        this.elements.resolutionSelect.innerHTML = '<option value="">Select a camera first</option>';
        this.elements.resolutionGrid.innerHTML = '';
        this.elements.resolutionDescription.textContent = '';
        this.elements.testCamera.disabled = true;
    }


    displayTestResults(results) {
        if (!results.success) {
            this.showError(results.userMessage || results.error);
            return;
        }

        // Show test results section
        this.elements.testResults.style.display = 'block';

        // Set up video preview
        this.elements.cameraPreview.srcObject = results.stream;

        // Display metrics
        const metrics = results.metrics;
        this.elements.metricsContent.innerHTML = `
            <div class="metric-grid">
                <div class="metric-item">
                    <span class="metric-label">Resolution:</span>
                    <span class="metric-value">${metrics.actualWidth}×${metrics.actualHeight}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Frame Rate:</span>
                    <span class="metric-value">${metrics.actualFrameRate} fps</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Aspect Ratio:</span>
                    <span class="metric-value">${metrics.aspectRatio}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Init Time:</span>
                    <span class="metric-value">${metrics.initTime}ms</span>
                </div>
            </div>
        `;

        // Display recommendations
        if (results.recommendations.length > 0) {
            this.elements.recommendations.innerHTML = `
                <h5>Recommendations:</h5>
                <ul>
                    ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            `;
        }

        // Enable save configuration and keep stop button enabled
        this.elements.saveConfig.disabled = false;
        this.elements.stopTest.disabled = false;
    }

    // Enhanced stop test method with proper feedback
    stopTest() {
        this.cameraSetup.stopCurrentStream();
        this.elements.testResults.style.display = 'none';
        this.elements.testCamera.disabled = false;
        this.elements.stopTest.disabled = true;
        this.elements.saveConfig.disabled = true;
        this.showSuccess('Camera test stopped successfully.');
    }


    showLoading(message) {
        this.elements.loadingText.textContent = message;
        this.elements.loading.style.display = 'flex';
    }

    hideLoading() {
        this.elements.loading.style.display = 'none';
    }

    // Authentication methods

    async signIn() {
        this.setButtonLoading(this.elements.signInBtn, true);

        try {
            const result = await this.storage.signInWithGoogle();

            if (result.success) {
                this.showSuccess('Successfully signed in! Your configurations will be saved to the cloud.');
            } else {
                this.showError(result.userMessage || 'Sign-in failed');
            }
        } catch (error) {
            this.showError('Sign-in failed: ' + error.message);
        } finally {
            this.setButtonLoading(this.elements.signInBtn, false);
        }
    }

    async signOut() {
        this.setButtonLoading(this.elements.signOutBtn, true);

        try {
            const result = await this.storage.signOut();

            if (result.success) {
                this.showSuccess('Successfully signed out.');
            } else {
                this.showError(result.userMessage || 'Sign-out failed');
            }
        } catch (error) {
            this.showError('Sign-out failed: ' + error.message);
        } finally {
            this.setButtonLoading(this.elements.signOutBtn, false);
        }
    }

    onAuthChanged(user) {
        this.currentUser = user;
        this.updateAuthUI();

        if (user) {
            this.showSuccess(`Welcome back, ${user.displayName}! Loading your configurations...`);
            // Auto-load configurations will be triggered by the storage callback
        }
    }

    updateAuthUI() {
        if (this.currentUser) {
            this.elements.signedOut.style.display = 'none';
            this.elements.signedIn.style.display = 'block';
            this.elements.userName.textContent = this.currentUser.displayName || this.currentUser.email;
            this.elements.userAvatar.src = this.currentUser.photoURL || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="%23999"%3E%3Crect width="32" height="32" rx="50%25"/%3E%3C/svg%3E';
        } else {
            this.elements.signedOut.style.display = 'block';
            this.elements.signedIn.style.display = 'none';
        }
    }

    onConfigurationsLoaded(configurations) {
        this.savedConfigurations = configurations;
        this.displaySavedConfigurations();

        // Auto-load the most recent configuration for this device
        if (configurations.length > 0) {
            const deviceFingerprint = this.storage.getDeviceFingerprint();
            const deviceConfig = configurations.find(config =>
                config.deviceFingerprint === deviceFingerprint
            );

            if (deviceConfig) {
                this.autoLoadConfiguration(deviceConfig);
            }
        }
    }

    async autoLoadConfiguration(config) {
        try {
            this.showSuccess(`Auto-loading configuration: ${config.name}`);

            // Apply configuration
            if (config.camera.deviceId) {
                // Find matching camera
                const devices = this.cameraSetup.getAvailableDevices();
                const matchingDevice = devices.find(d => d.deviceId === config.camera.deviceId);

                if (matchingDevice) {
                    this.elements.cameraSelect.value = config.camera.deviceId;
                    this.onCameraSelected(config.camera.deviceId);

                    // Apply resolution if available
                    if (config.camera.resolution) {
                        // Find matching resolution index
                        const resolutionIndex = matchingDevice.capabilities.supportedResolutions.findIndex(r =>
                            r.width === config.camera.resolution.width &&
                            r.height === config.camera.resolution.height
                        );

                        if (resolutionIndex !== -1) {
                            this.elements.resolutionSelect.value = resolutionIndex;
                            this.onResolutionSelected(resolutionIndex);
                        }
                    }

                    // Pre-fill configuration name
                    this.elements.configName.value = config.name;

                    this.showSuccess(`Configuration "${config.name}" loaded successfully!`);
                } else {
                    this.showWarning(`Camera from saved configuration "${config.name}" is not currently connected.`);
                }
            }

        } catch (error) {
            console.error('Failed to auto-load configuration:', error);
            this.showWarning('Failed to auto-load saved configuration.');
        }
    }

    displaySavedConfigurations() {
        if (this.savedConfigurations.length === 0) {
            this.elements.savedConfigs.innerHTML = '<p class="no-configs">No saved configurations found.</p>';
            return;
        }

        const configsHtml = this.savedConfigurations.map(config => `
            <div class="saved-config-item" data-config-id="${config.id}">
                <div class="config-info">
                    <div class="config-name">${config.name}</div>
                    <div class="config-details">
                        Camera: ${config.camera.label || 'Unknown'} |
                        Resolution: ${config.camera.resolution?.width}×${config.camera.resolution?.height} |
                        ${config.source === 'local' ? '💾 Local' : '☁️ Cloud'} |
                        ${config.lastUsed ? new Date(config.lastUsed).toLocaleDateString() : 'Never used'}
                    </div>
                </div>
                <div class="config-actions">
                    <button class="btn btn-sm btn-outline load-config-btn" data-config-id="${config.id}">
                        <span class="btn-text">Load</span>
                        <span class="btn-spinner" style="display: none;">⟳</span>
                    </button>
                    <button class="btn btn-sm btn-secondary delete-config-btn" data-config-id="${config.id}">
                        <span class="btn-text">Delete</span>
                        <span class="btn-spinner" style="display: none;">⟳</span>
                    </button>
                </div>
            </div>
        `).join('');

        this.elements.savedConfigs.innerHTML = configsHtml;

        // Add event listeners for load and delete buttons
        this.elements.savedConfigs.querySelectorAll('.load-config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const configId = e.target.closest('button').dataset.configId;
                this.loadSavedConfiguration(configId, btn);
            });
        });

        this.elements.savedConfigs.querySelectorAll('.delete-config-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const configId = e.target.closest('button').dataset.configId;
                this.deleteSavedConfiguration(configId, btn);
            });
        });
    }

    async loadSavedConfiguration(configId, button) {
        this.setButtonLoading(button, true);

        try {
            const config = this.savedConfigurations.find(c => c.id === configId);
            if (config) {
                await this.autoLoadConfiguration(config);
            }
        } catch (error) {
            this.showError('Failed to load configuration');
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async deleteSavedConfiguration(configId, button) {
        if (!confirm('Are you sure you want to delete this configuration?')) {
            return;
        }

        this.setButtonLoading(button, true);

        try {
            const result = await this.storage.deleteConfiguration(configId);

            if (result.success) {
                this.showSuccess('Configuration deleted successfully');
                // Reload configurations
                await this.storage.loadUserConfigurations();
            } else {
                this.showError(result.userMessage || 'Failed to delete configuration');
            }
        } catch (error) {
            this.showError('Failed to delete configuration');
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    // Enhanced save configuration with better feedback
    async saveConfiguration() {
        const name = this.elements.configName.value.trim();
        if (!name) {
            this.showError('Please enter a configuration name');
            return;
        }

        if (!this.currentConfig.deviceId || !this.currentConfig.resolution) {
            this.showError('Please test your camera configuration first');
            return;
        }

        this.setButtonLoading(this.elements.saveConfig, true);

        try {
            const devices = this.cameraSetup.getAvailableDevices();
            const selectedDevice = devices.find(d => d.deviceId === this.currentConfig.deviceId);
            const testResults = this.cameraSetup.getTestResults();

            const config = {
                name,
                camera: {
                    deviceId: this.currentConfig.deviceId,
                    label: selectedDevice?.label || 'Unknown Camera',
                    resolution: this.currentConfig.resolution,
                    settings: testResults?.actualSettings || {}
                },
                testResults: testResults?.metrics || null
            };

            const result = await this.storage.saveConfiguration(config);

            if (result.success) {
                this.showSuccess(`Configuration "${name}" saved successfully!`);
                this.elements.configName.value = '';

                // Reload configurations to show the new one
                await this.storage.loadUserConfigurations();
            } else {
                if (result.fallbackResult?.success) {
                    this.showWarning(result.userMessage);
                } else {
                    this.showError(result.userMessage || 'Failed to save configuration');
                }
            }

        } catch (error) {
            this.showError('Failed to save configuration: ' + error.message);
        } finally {
            this.setButtonLoading(this.elements.saveConfig, false);
        }
    }

    // Enhanced button loading states
    setButtonLoading(button, loading) {
        if (!button) return;

        const icon = button.querySelector('.btn-icon');
        const text = button.querySelector('.btn-text');
        const spinner = button.querySelector('.btn-spinner');

        if (loading) {
            button.disabled = true;
            if (icon) icon.style.display = 'none';
            if (text) text.style.opacity = '0.7';
            if (spinner) {
                spinner.style.display = 'inline';
                spinner.style.animation = 'spin 1s linear infinite';
            }
        } else {
            button.disabled = false;
            if (icon) icon.style.display = 'inline';
            if (text) text.style.opacity = '1';
            if (spinner) {
                spinner.style.display = 'none';
                spinner.style.animation = 'none';
            }
        }
    }

    // Enhanced message display methods
    showWarning(message) {
        this.hideAllMessages();
        this.elements.warning.textContent = message;
        this.elements.warning.style.display = 'block';

        setTimeout(() => {
            this.elements.warning.style.display = 'none';
        }, 5000);
    }

    showError(message) {
        this.hideAllMessages();
        this.elements.error.textContent = message;
        this.elements.error.style.display = 'block';

        setTimeout(() => {
            this.elements.error.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        this.hideAllMessages();
        this.elements.success.textContent = message;
        this.elements.success.style.display = 'block';

        setTimeout(() => {
            this.elements.success.style.display = 'none';
        }, 3000);
    }

    hideAllMessages() {
        this.elements.error.style.display = 'none';
        this.elements.warning.style.display = 'none';
        this.elements.success.style.display = 'none';
    }

    // Enhanced refresh with feedback
    async refreshCameras() {
        this.setButtonLoading(this.elements.refreshCameras, true);

        try {
            await this.cameraSetup.detectDevices();
            this.showSuccess('Camera list refreshed successfully!');
        } catch (error) {
            this.showError('Failed to refresh cameras');
        } finally {
            this.setButtonLoading(this.elements.refreshCameras, false);
        }
    }

    // Enhanced test camera with feedback
    async testCamera() {
        if (!this.currentConfig.deviceId || !this.currentConfig.resolution) {
            this.showError('Please select a camera and resolution first');
            return;
        }

        this.setButtonLoading(this.elements.testCamera, true);
        this.elements.stopTest.disabled = false;

        try {
            this.showLoading('Testing camera configuration...');

            const result = await this.cameraSetup.testConfiguration(
                this.currentConfig.deviceId,
                this.currentConfig.resolution
            );

            this.hideLoading();
            this.displayTestResults(result);

            if (result.success) {
                this.showSuccess('Camera test completed successfully!');
            }

        } catch (error) {
            this.hideLoading();
            this.showError(`Test failed: ${error.message}`);
        } finally {
            this.setButtonLoading(this.elements.testCamera, false);
            // Only disable stop button if test failed or stream is not running
            if (!this.cameraSetup.isTestRunning()) {
                this.elements.stopTest.disabled = true;
            }
        }
    }

    cleanup() {
        this.cameraSetup.cleanup();
    }
}