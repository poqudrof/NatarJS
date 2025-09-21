/**
 * Unit Tests for Camera Setup System
 * Tests camera detection, configuration, and stream management
 */

import { CameraSetup } from '../../src/setup/CameraSetup.js';

// Mock MediaDevices API
const mockMediaDevices = {
    getUserMedia: jest.fn(),
    enumerateDevices: jest.fn(),
    addEventListener: jest.fn(),
};

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        mediaDevices: mockMediaDevices,
        userAgent: 'test-agent',
        platform: 'test-platform'
    },
    writable: true
});

// Mock screen object
Object.defineProperty(global, 'screen', {
    value: {
        width: 1920,
        height: 1080
    },
    writable: true
});

// Mock Intl.DateTimeFormat
Object.defineProperty(global, 'Intl', {
    value: {
        DateTimeFormat: () => ({
            resolvedOptions: () => ({ timeZone: 'UTC' })
        })
    },
    writable: true
});

describe('CameraSetup', () => {
    let cameraSetup;
    let mockStream;
    let mockTrack;

    beforeEach(() => {
        cameraSetup = new CameraSetup();

        // Create mock track
        mockTrack = {
            stop: jest.fn(),
            getSettings: jest.fn(() => ({
                width: 1280,
                height: 720,
                frameRate: 30
            })),
            getCapabilities: jest.fn(() => ({
                width: { min: 320, max: 1920 },
                height: { min: 240, max: 1080 },
                frameRate: { min: 15, max: 60 }
            }))
        };

        // Create mock stream
        mockStream = {
            getTracks: jest.fn(() => [mockTrack]),
            getVideoTracks: jest.fn(() => [mockTrack])
        };

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default values', () => {
            expect(cameraSetup.availableDevices).toEqual([]);
            expect(cameraSetup.currentStream).toBeNull();
            expect(cameraSetup.testResults).toEqual({});
            expect(cameraSetup.isTestActive).toBe(false);
        });

        test('should initialize successfully with permissions', async () => {
            mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
            mockMediaDevices.enumerateDevices.mockResolvedValue([
                { kind: 'videoinput', deviceId: 'camera1', label: 'Test Camera 1' }
            ]);

            const result = await cameraSetup.initialize();

            expect(result.success).toBe(true);
            expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
            expect(mockTrack.stop).toHaveBeenCalled(); // Permission test stream stopped
        });

        test('should handle permission denied', async () => {
            mockMediaDevices.getUserMedia.mockRejectedValue(
                new Error('NotAllowedError')
            );

            const result = await cameraSetup.initialize();

            expect(result.success).toBe(false);
            expect(result.userMessage).toContain('Camera permission denied');
        });
    });

    describe('Device Detection', () => {
        test('should detect available cameras', async () => {
            const mockDevices = [
                { kind: 'videoinput', deviceId: 'camera1', label: 'Test Camera 1' },
                { kind: 'videoinput', deviceId: 'camera2', label: 'Test Camera 2' },
                { kind: 'audioinput', deviceId: 'mic1', label: 'Test Microphone' }
            ];

            mockMediaDevices.enumerateDevices.mockResolvedValue(mockDevices);
            mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);

            await cameraSetup.detectDevices();

            expect(cameraSetup.availableDevices).toHaveLength(2); // Only video devices
            expect(cameraSetup.availableDevices[0].deviceId).toBe('camera1');
            expect(cameraSetup.availableDevices[1].deviceId).toBe('camera2');
        });

        test('should handle empty device list', async () => {
            mockMediaDevices.enumerateDevices.mockResolvedValue([]);

            await cameraSetup.detectDevices();

            expect(cameraSetup.availableDevices).toHaveLength(0);
        });
    });

    describe('Configuration Testing', () => {
        beforeEach(() => {
            cameraSetup.availableDevices = [
                {
                    deviceId: 'camera1',
                    label: 'Test Camera',
                    capabilities: {
                        supportedResolutions: [
                            { width: 1280, height: 720, quality: 'HD', performance: 'Balanced' }
                        ]
                    }
                }
            ];
        });

        test('should test camera configuration successfully', async () => {
            mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);

            // Mock video element
            const mockVideo = {
                srcObject: null,
                addEventListener: jest.fn(),
                videoWidth: 1280,
                videoHeight: 720,
                readyState: 4,
                buffered: { length: 1, end: () => 1 }
            };

            // Mock video load success
            setTimeout(() => {
                const loadedHandler = mockVideo.addEventListener.mock.calls
                    .find(call => call[0] === 'loadedmetadata')?.[1];
                if (loadedHandler) loadedHandler();
            }, 0);

            const result = await cameraSetup.testConfiguration('camera1', { width: 1280, height: 720 });

            expect(result.success).toBe(true);
            expect(result.stream).toBe(mockStream);
            expect(result.metrics).toBeDefined();
            expect(cameraSetup.isTestActive).toBe(false); // Should be false after test
        });

        test('should handle camera test failure', async () => {
            mockMediaDevices.getUserMedia.mockRejectedValue(
                new Error('NotReadableError')
            );

            const result = await cameraSetup.testConfiguration('camera1', { width: 1280, height: 720 });

            expect(result.success).toBe(false);
            expect(result.userMessage).toContain('already in use');
        });

        test('should track test active state', async () => {
            mockMediaDevices.getUserMedia.mockImplementation(() => {
                expect(cameraSetup.isTestActive).toBe(true);
                return Promise.resolve(mockStream);
            });

            await cameraSetup.testConfiguration('camera1', { width: 1280, height: 720 });
        });
    });

    describe('Stream Management', () => {
        test('should stop current stream', () => {
            cameraSetup.currentStream = mockStream;
            cameraSetup.isTestActive = true;

            cameraSetup.stopCurrentStream();

            expect(mockTrack.stop).toHaveBeenCalled();
            expect(cameraSetup.currentStream).toBeNull();
            expect(cameraSetup.isTestActive).toBe(false);
        });

        test('should check if test is running', () => {
            expect(cameraSetup.isTestRunning()).toBe(false);

            cameraSetup.isTestActive = true;
            expect(cameraSetup.isTestRunning()).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should convert technical errors to user-friendly messages', () => {
            const errors = [
                { name: 'NotAllowedError', expected: 'Camera access was denied' },
                { name: 'NotFoundError', expected: 'No camera was found' },
                { name: 'NotReadableError', expected: 'already in use' },
                { name: 'OverconstrainedError', expected: 'does not support' }
            ];

            errors.forEach(({ name, expected }) => {
                const error = new Error('test');
                error.name = name;
                const message = cameraSetup.getUserFriendlyError(error);
                expect(message).toContain(expected);
            });
        });
    });

    describe('Utility Methods', () => {
        test('should get available devices', () => {
            const devices = [{ deviceId: 'test' }];
            cameraSetup.availableDevices = devices;

            expect(cameraSetup.getAvailableDevices()).toBe(devices);
        });

        test('should get test results', () => {
            const results = { success: true };
            cameraSetup.testResults = results;

            expect(cameraSetup.getTestResults()).toBe(results);
        });

        test('should cleanup resources', () => {
            cameraSetup.currentStream = mockStream;
            cameraSetup.availableDevices = [{ deviceId: 'test' }];
            cameraSetup.testResults = { success: true };

            cameraSetup.cleanup();

            expect(mockTrack.stop).toHaveBeenCalled();
            expect(cameraSetup.availableDevices).toEqual([]);
            expect(cameraSetup.testResults).toEqual({});
        });
    });
});