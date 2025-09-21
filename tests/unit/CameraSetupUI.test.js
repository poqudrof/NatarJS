/**
 * Unit Tests for Camera Setup UI
 * Tests user interface interactions, button states, and form handling
 */

import { CameraSetupUI } from '../../src/ui/CameraSetupUI.js';

// Mock DOM elements
const createMockElement = (id) => ({
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    style: { display: 'none' },
    addEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => [])
});

// Mock container
const mockContainer = createMockElement('camera-setup-container');
Object.assign(mockContainer, {
    insertBefore: jest.fn(),
    querySelector: jest.fn((selector) => {
        // Map selectors to mock elements
        const selectorMap = {
            '#camera-select': createMockElement('camera-select'),
            '#resolution-select': createMockElement('resolution-select'),
            '#test-camera': createMockElement('test-camera'),
            '#stop-test': createMockElement('stop-test'),
            '#save-config': createMockElement('save-config'),
            '#config-name': createMockElement('config-name'),
            '#camera-preview': createMockElement('camera-preview'),
            '#test-results': createMockElement('test-results'),
            '#saved-configs': createMockElement('saved-configs'),
            '#loading-overlay': createMockElement('loading-overlay'),
            '#error-message': createMockElement('error-message'),
            '#success-message': createMockElement('success-message'),
            '#warning-message': createMockElement('warning-message')
        };
        return selectorMap[selector] || createMockElement('default');
    })
});

// Mock document
Object.defineProperty(global, 'document', {
    value: {
        getElementById: jest.fn((id) => createMockElement(id)),
        createElement: jest.fn(() => createMockElement('div')),
        querySelectorAll: jest.fn(() => [])
    },
    writable: true
});

// Mock CameraSetup
const mockCameraSetup = {
    initialize: jest.fn(),
    detectDevices: jest.fn(),
    testConfiguration: jest.fn(),
    stopCurrentStream: jest.fn(),
    isTestRunning: jest.fn(),
    getAvailableDevices: jest.fn(() => []),
    getTestResults: jest.fn(() => ({})),
    cleanup: jest.fn()
};

// Mock SetupStorage
const mockStorage = {
    initialize: jest.fn(),
    signInWithGoogle: jest.fn(),
    signOut: jest.fn(),
    saveConfiguration: jest.fn(),
    loadUserConfigurations: jest.fn(),
    deleteConfiguration: jest.fn(),
    getCurrentUser: jest.fn(),
    isSignedIn: jest.fn(),
    setCallbacks: jest.fn()
};

// Mock module imports
jest.mock('../../src/setup/CameraSetup.js', () => ({
    CameraSetup: jest.fn(() => mockCameraSetup)
}));

jest.mock('../../src/storage/SetupStorage.js', () => ({
    SetupStorage: jest.fn(() => mockStorage)
}));

describe('CameraSetupUI', () => {
    let cameraSetupUI;
    let mockElements;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Set up mock elements
        mockElements = {
            testCamera: createMockElement('test-camera'),
            stopTest: createMockElement('stop-test'),
            saveConfig: createMockElement('save-config'),
            configName: createMockElement('config-name'),
            cameraSelect: createMockElement('camera-select'),
            resolutionSelect: createMockElement('resolution-select'),
            testResults: createMockElement('test-results'),
            cameraPreview: createMockElement('camera-preview'),
            savedConfigs: createMockElement('saved-configs'),
            loading: createMockElement('loading-overlay'),
            error: createMockElement('error-message'),
            success: createMockElement('success-message'),
            warning: createMockElement('warning-message')
        };

        // Mock getElementById to return our mock elements
        document.getElementById.mockImplementation((id) => mockElements[id.replace('-', '')] || createMockElement(id));

        cameraSetupUI = new CameraSetupUI(mockContainer);
    });

    describe('Initialization', () => {
        test('should initialize with container element', () => {
            expect(cameraSetupUI.container).toBe(mockContainer);
            expect(cameraSetupUI.currentConfig).toEqual({});
        });

        test('should create HTML template', () => {
            expect(mockContainer.innerHTML).toContain('Camera Setup');
            expect(mockContainer.innerHTML).toContain('Test Camera');
            expect(mockContainer.innerHTML).toContain('Stop Test');
        });

        test('should initialize camera setup and storage', () => {
            expect(mockCameraSetup.initialize).toHaveBeenCalled();
            expect(mockStorage.initialize).toHaveBeenCalled();
        });
    });

    describe('Button States', () => {
        test('should enable stop button when test starts', () => {
            cameraSetupUI.currentConfig = {
                deviceId: 'camera1',
                resolution: { width: 1280, height: 720 }
            };

            mockCameraSetup.testConfiguration.mockResolvedValue({
                success: true,
                stream: {},
                metrics: {}
            });

            cameraSetupUI.testCamera();

            expect(mockElements.stopTest.disabled).toBe(false);
        });

        test('should disable stop button when test completes', async () => {
            cameraSetupUI.currentConfig = {
                deviceId: 'camera1',
                resolution: { width: 1280, height: 720 }
            };

            mockCameraSetup.testConfiguration.mockResolvedValue({
                success: true,
                stream: {},
                metrics: {}
            });
            mockCameraSetup.isTestRunning.mockReturnValue(false);

            await cameraSetupUI.testCamera();

            expect(mockElements.stopTest.disabled).toBe(true);
        });

        test('should enable stop button when camera test succeeds', () => {
            const mockResults = {
                success: true,
                stream: {},
                metrics: {
                    actualWidth: 1280,
                    actualHeight: 720,
                    actualFrameRate: 30,
                    aspectRatio: '1.78',
                    initTime: 100
                },
                recommendations: []
            };

            cameraSetupUI.displayTestResults(mockResults);

            expect(mockElements.stopTest.disabled).toBe(false);
            expect(mockElements.saveConfig.disabled).toBe(false);
        });
    });

    describe('Camera Testing', () => {
        test('should show error when no camera selected', async () => {
            cameraSetupUI.currentConfig = {};

            await cameraSetupUI.testCamera();

            expect(mockElements.error.textContent).toContain('Please select a camera');
        });

        test('should call camera setup test configuration', async () => {
            cameraSetupUI.currentConfig = {
                deviceId: 'camera1',
                resolution: { width: 1280, height: 720 }
            };

            mockCameraSetup.testConfiguration.mockResolvedValue({
                success: true,
                stream: {},
                metrics: {}
            });

            await cameraSetupUI.testCamera();

            expect(mockCameraSetup.testConfiguration).toHaveBeenCalledWith('camera1', { width: 1280, height: 720 });
        });

        test('should handle test errors gracefully', async () => {
            cameraSetupUI.currentConfig = {
                deviceId: 'camera1',
                resolution: { width: 1280, height: 720 }
            };

            mockCameraSetup.testConfiguration.mockRejectedValue(new Error('Test failed'));

            await cameraSetupUI.testCamera();

            expect(mockElements.error.textContent).toContain('Test failed');
        });
    });

    describe('Stop Test Functionality', () => {
        test('should stop camera stream and update UI', () => {
            cameraSetupUI.stopTest();

            expect(mockCameraSetup.stopCurrentStream).toHaveBeenCalled();
            expect(mockElements.testResults.style.display).toBe('none');
            expect(mockElements.testCamera.disabled).toBe(false);
            expect(mockElements.stopTest.disabled).toBe(true);
            expect(mockElements.saveConfig.disabled).toBe(true);
        });

        test('should show success message when stopping test', () => {
            cameraSetupUI.stopTest();

            expect(mockElements.success.textContent).toContain('Camera test stopped successfully');
        });
    });

    describe('Configuration Management', () => {
        test('should save configuration with valid name', async () => {
            mockElements.configName.value = 'Test Config';
            cameraSetupUI.currentConfig = {
                deviceId: 'camera1',
                resolution: { width: 1280, height: 720 }
            };

            mockCameraSetup.getAvailableDevices.mockReturnValue([
                { deviceId: 'camera1', label: 'Test Camera' }
            ]);
            mockStorage.saveConfiguration.mockResolvedValue({ success: true });

            await cameraSetupUI.saveConfiguration();

            expect(mockStorage.saveConfiguration).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Test Config',
                    camera: expect.objectContaining({
                        deviceId: 'camera1',
                        label: 'Test Camera'
                    })
                })
            );
        });

        test('should show error when saving without name', async () => {
            mockElements.configName.value = '';

            await cameraSetupUI.saveConfiguration();

            expect(mockElements.error.textContent).toContain('Please enter a configuration name');
        });

        test('should delete configuration with confirmation', async () => {
            // Mock confirm dialog
            global.confirm = jest.fn(() => true);

            mockStorage.deleteConfiguration.mockResolvedValue({ success: true });
            mockStorage.loadUserConfigurations.mockResolvedValue({ success: true });

            const mockButton = createMockElement('delete-btn');
            await cameraSetupUI.deleteSavedConfiguration('config-id', mockButton);

            expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this configuration?');
            expect(mockStorage.deleteConfiguration).toHaveBeenCalledWith('config-id');
        });

        test('should not delete when confirmation is cancelled', async () => {
            global.confirm = jest.fn(() => false);

            const mockButton = createMockElement('delete-btn');
            await cameraSetupUI.deleteSavedConfiguration('config-id', mockButton);

            expect(mockStorage.deleteConfiguration).not.toHaveBeenCalled();
        });
    });

    describe('Authentication', () => {
        test('should sign in with Google', async () => {
            mockStorage.signInWithGoogle.mockResolvedValue({
                success: true,
                user: { displayName: 'Test User' }
            });

            const mockSignInBtn = createMockElement('sign-in');
            mockElements.signInBtn = mockSignInBtn;

            await cameraSetupUI.signIn();

            expect(mockStorage.signInWithGoogle).toHaveBeenCalled();
            expect(mockElements.success.textContent).toContain('Successfully signed in');
        });

        test('should handle sign in errors', async () => {
            mockStorage.signInWithGoogle.mockResolvedValue({
                success: false,
                userMessage: 'Sign-in failed'
            });

            await cameraSetupUI.signIn();

            expect(mockElements.error.textContent).toContain('Sign-in failed');
        });

        test('should sign out successfully', async () => {
            mockStorage.signOut.mockResolvedValue({ success: true });

            await cameraSetupUI.signOut();

            expect(mockStorage.signOut).toHaveBeenCalled();
            expect(mockElements.success.textContent).toContain('Successfully signed out');
        });
    });

    describe('Message Display', () => {
        test('should show and auto-hide error messages', (done) => {
            cameraSetupUI.showError('Test error message');

            expect(mockElements.error.textContent).toBe('Test error message');
            expect(mockElements.error.style.display).toBe('block');

            // Check that it auto-hides after timeout
            setTimeout(() => {
                expect(mockElements.error.style.display).toBe('none');
                done();
            }, 5100);
        });

        test('should show and auto-hide success messages', (done) => {
            cameraSetupUI.showSuccess('Test success message');

            expect(mockElements.success.textContent).toBe('Test success message');
            expect(mockElements.success.style.display).toBe('block');

            setTimeout(() => {
                expect(mockElements.success.style.display).toBe('none');
                done();
            }, 3100);
        });

        test('should show and auto-hide warning messages', (done) => {
            cameraSetupUI.showWarning('Test warning message');

            expect(mockElements.warning.textContent).toBe('Test warning message');
            expect(mockElements.warning.style.display).toBe('block');

            setTimeout(() => {
                expect(mockElements.warning.style.display).toBe('none');
                done();
            }, 5100);
        });

        test('should hide all messages', () => {
            cameraSetupUI.hideAllMessages();

            expect(mockElements.error.style.display).toBe('none');
            expect(mockElements.success.style.display).toBe('none');
            expect(mockElements.warning.style.display).toBe('none');
        });
    });

    describe('Device Management', () => {
        test('should update device list', async () => {
            const mockDevices = [
                { deviceId: 'camera1', label: 'Test Camera 1' },
                { deviceId: 'camera2', label: 'Test Camera 2' }
            ];

            await cameraSetupUI.updateDeviceList(mockDevices);

            expect(mockElements.cameraSelect.innerHTML).toContain('Test Camera 1');
            expect(mockElements.cameraSelect.innerHTML).toContain('Test Camera 2');
        });

        test('should handle empty device list', async () => {
            await cameraSetupUI.updateDeviceList([]);

            expect(mockElements.cameraSelect.innerHTML).toContain('No cameras found');
        });
    });

    describe('Cleanup', () => {
        test('should cleanup camera setup on destroy', () => {
            cameraSetupUI.cleanup();

            expect(mockCameraSetup.cleanup).toHaveBeenCalled();
        });
    });
});