/**
 * Step 1 Tests - Core Infrastructure Setup
 * Tests CalibrationManager, CalibrationStorage, Firebase integration, and error handling
 */

const TestUtils = require('../utils/TestUtils');

describe('Step 1: Core Infrastructure Setup', () => {
    let testUtils;

    beforeEach(async () => {
        testUtils = new TestUtils();
        await testUtils.initializeDriver();
    });

    afterEach(async () => {
        if (testUtils) {
            // Take screenshot on failure
            if (expect.getState().currentTestName && expect.getState().testPath) {
                await testUtils.takeScreenshot(`step1-${expect.getState().currentTestName.replace(/\s+/g, '-')}`);
            }
            await testUtils.cleanup();
        }
    });

    describe('CalibrationManager Initialization', () => {
        test('should initialize CalibrationManager without errors', async () => {
            // Navigate to a test page that initializes CalibrationManager
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            // Wait for page to load
            await testUtils.waitForPageLoad();

            // Check that CalibrationManager is initialized
            const managerInitialized = await testUtils.executeScript(() => {
                return window.CalibrationManager &&
                       typeof window.CalibrationManager.initialize === 'function';
            });

            expect(managerInitialized).toBe(true);

            // Initialize CalibrationManager
            const initResult = await testUtils.executeScript(async () => {
                try {
                    const manager = new window.CalibrationManager();
                    const result = await manager.initialize();
                    return { success: true, result: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(initResult.success).toBe(true);
            expect(initResult.result).toBeDefined();
        });

        test('should handle missing dependencies gracefully', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            // Simulate missing OpenCV
            await testUtils.executeScript(() => {
                window.cv = undefined;
            });

            const initResult = await testUtils.executeScript(async () => {
                try {
                    const manager = new window.CalibrationManager();
                    const result = await manager.initialize();
                    return { success: true, result: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(initResult.success).toBe(false);
            expect(initResult.error).toContain('OpenCV');
        });

        test('should register calibration components correctly', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const registrationResult = await testUtils.executeScript(async () => {
                try {
                    const manager = new window.CalibrationManager();
                    await manager.initialize();

                    // Try to register a mock component
                    const mockComponent = {
                        name: 'TestComponent',
                        initialize: async () => ({ success: true }),
                        calibrate: async () => ({ success: true })
                    };

                    manager.registerComponent('test', mockComponent);
                    const components = manager.getRegisteredComponents();

                    return { success: true, components: components };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(registrationResult.success).toBe(true);
            expect(registrationResult.components).toContain('test');
        });
    });

    describe('CalibrationStorage Integration', () => {
        test('should initialize storage interface', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);
            await testUtils.setupMockFirebase();

            const storageResult = await testUtils.executeScript(async () => {
                try {
                    const storage = new window.CalibrationStorage();
                    const initialized = await storage.initialize();
                    return { success: true, initialized: initialized };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(storageResult.success).toBe(true);
            expect(storageResult.initialized).toBe(true);
        });

        test('should handle storage operations with validation', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);
            await testUtils.setupMockFirebase();

            const storageOperationResult = await testUtils.executeScript(async () => {
                try {
                    const storage = new window.CalibrationStorage();
                    await storage.initialize();

                    // Test data validation
                    const validData = {
                        type: 'camera',
                        timestamp: new Date().toISOString(),
                        cameraMatrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
                        distortionCoefficients: [0, 0, 0, 0, 0],
                        reprojectionError: 0.5
                    };

                    const saveResult = await storage.saveCalibration('camera', validData);
                    return { success: true, saveResult: saveResult };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(storageOperationResult.success).toBe(true);
            expect(storageOperationResult.saveResult).toBeDefined();
        });

        test('should reject invalid calibration data', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);
            await testUtils.setupMockFirebase();

            const invalidDataResult = await testUtils.executeScript(async () => {
                try {
                    const storage = new window.CalibrationStorage();
                    await storage.initialize();

                    // Test with invalid data
                    const invalidData = {
                        type: 'invalid',
                        // Missing required fields
                    };

                    const saveResult = await storage.saveCalibration('camera', invalidData);
                    return { success: true, saveResult: saveResult };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(invalidDataResult.success).toBe(false);
            expect(invalidDataResult.error).toContain('validation');
        });
    });

    describe('Firebase Integration', () => {
        test('should connect to Firebase successfully', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const firebaseResult = await testUtils.executeScript(() => {
                try {
                    // Check if Firebase config is loaded
                    const configLoaded = window.firebaseConfig &&
                                       window.firebaseConfig.projectId === 'natariojs';

                    return { success: true, configLoaded: configLoaded };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(firebaseResult.success).toBe(true);
            expect(firebaseResult.configLoaded).toBe(true);
        });

        test('should handle Firebase authentication flow', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);
            await testUtils.setupMockFirebase();

            const authResult = await testUtils.executeScript(async () => {
                try {
                    // Simulate authentication
                    const auth = window.mockFirebaseAuth;
                    const provider = {}; // Mock provider

                    const signInResult = await auth.signInWithPopup(provider);
                    auth.currentUser = signInResult.user;

                    return {
                        success: true,
                        user: signInResult.user,
                        isSignedIn: !!auth.currentUser
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(authResult.success).toBe(true);
            expect(authResult.user).toBeDefined();
            expect(authResult.user.uid).toBe('mock-user-123');
            expect(authResult.isSignedIn).toBe(true);
        });

        test('should handle Firebase connection errors', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const connectionErrorResult = await testUtils.executeScript(async () => {
                try {
                    // Simulate connection failure
                    const storage = new window.CalibrationStorage();

                    // Mock failed Firebase initialization
                    window.firebase = undefined;

                    const result = await storage.initialize();
                    return { success: true, result: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(connectionErrorResult.success).toBe(false);
            expect(connectionErrorResult.error).toMatch(/firebase|connection/i);
        });
    });

    describe('Error Handling and Logging', () => {
        test('should capture and log JavaScript errors', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            // Setup error tracking
            await testUtils.executeScript(() => {
                window.jsErrors = [];
                window.addEventListener('error', (event) => {
                    window.jsErrors.push({
                        message: event.message,
                        filename: event.filename,
                        lineno: event.lineno,
                        timestamp: Date.now()
                    });
                });
            });

            // Trigger an intentional error
            await testUtils.executeScript(() => {
                setTimeout(() => {
                    throw new Error('Test error for error handling validation');
                }, 100);
            });

            // Wait for error to be captured
            await testUtils.page.waitForTimeout(500);

            const errorResult = await testUtils.executeScript(() => {
                return {
                    errorCount: window.jsErrors.length,
                    errors: window.jsErrors
                };
            });

            expect(errorResult.errorCount).toBeGreaterThan(0);
            expect(errorResult.errors[0].message).toContain('Test error');
        });

        test('should provide user-friendly error messages', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const userFriendlyErrorResult = await testUtils.executeScript(() => {
                try {
                    const errorHandler = new window.ErrorHandler();

                    // Test various error types
                    const errors = [
                        new Error('PERMISSION_DENIED'),
                        new Error('NETWORK_ERROR'),
                        new Error('INVALID_CONFIGURATION')
                    ];

                    const friendlyMessages = errors.map(error =>
                        errorHandler.getUserFriendlyMessage(error)
                    );

                    return { success: true, messages: friendlyMessages };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(userFriendlyErrorResult.success).toBe(true);
            expect(userFriendlyErrorResult.messages).toHaveLength(3);
            expect(userFriendlyErrorResult.messages[0]).not.toContain('PERMISSION_DENIED');
        });

        test('should handle network connectivity issues', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const networkErrorResult = await testUtils.executeScript(async () => {
                try {
                    // Simulate network offline
                    Object.defineProperty(navigator, 'onLine', {
                        writable: true,
                        value: false
                    });

                    const storage = new window.CalibrationStorage();
                    const result = await storage.initialize();

                    return { success: true, result: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(networkErrorResult.success).toBe(false);
            expect(networkErrorResult.error).toMatch(/network|offline|connection/i);
        });
    });

    describe('Data Validation System', () => {
        test('should validate calibration data structure', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const validationResult = await testUtils.executeScript(() => {
                try {
                    const validator = new window.DataValidator();

                    const testData = {
                        type: 'camera',
                        timestamp: new Date().toISOString(),
                        cameraMatrix: [[800, 0, 320], [0, 800, 240], [0, 0, 1]],
                        distortionCoefficients: [0.1, -0.2, 0, 0, 0],
                        reprojectionError: 0.8,
                        imageCount: 15
                    };

                    const validation = validator.validateCalibrationData(testData);
                    return { success: true, validation: validation };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(validationResult.success).toBe(true);
            expect(validationResult.validation.isValid).toBe(true);
        });

        test('should detect and report validation errors', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const invalidationResult = await testUtils.executeScript(() => {
                try {
                    const validator = new window.DataValidator();

                    const invalidData = {
                        type: 'camera',
                        // Missing required fields
                        cameraMatrix: 'invalid', // Wrong type
                        reprojectionError: -1 // Invalid value
                    };

                    const validation = validator.validateCalibrationData(invalidData);
                    return { success: true, validation: validation };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(invalidationResult.success).toBe(true);
            expect(invalidationResult.validation.isValid).toBe(false);
            expect(invalidationResult.validation.errors).toBeDefined();
            expect(invalidationResult.validation.errors.length).toBeGreaterThan(0);
        });

        test('should provide specific validation error messages', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const specificErrorResult = await testUtils.executeScript(() => {
                try {
                    const validator = new window.DataValidator();

                    const dataWithErrors = {
                        type: 'camera',
                        cameraMatrix: null,
                        distortionCoefficients: [1, 2], // Too few coefficients
                        reprojectionError: 'high' // Wrong type
                    };

                    const validation = validator.validateCalibrationData(dataWithErrors);
                    return { success: true, validation: validation };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(specificErrorResult.success).toBe(true);
            expect(specificErrorResult.validation.isValid).toBe(false);

            const errors = specificErrorResult.validation.errors;
            expect(errors.some(error => error.includes('cameraMatrix'))).toBe(true);
            expect(errors.some(error => error.includes('distortionCoefficients'))).toBe(true);
            expect(errors.some(error => error.includes('reprojectionError'))).toBe(true);
        });
    });

    describe('Performance and Memory Management', () => {
        test('should not leak memory during initialization', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const memoryResult = await testUtils.executeScript(async () => {
                // Get initial memory usage
                const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

                try {
                    // Initialize multiple managers to test for leaks
                    const managers = [];
                    for (let i = 0; i < 10; i++) {
                        const manager = new window.CalibrationManager();
                        await manager.initialize();
                        managers.push(manager);
                    }

                    // Clean up
                    managers.forEach(manager => {
                        if (manager.cleanup) {
                            manager.cleanup();
                        }
                    });

                    // Force garbage collection if available
                    if (window.gc) {
                        window.gc();
                    }

                    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                    const memoryDelta = finalMemory - initialMemory;

                    return {
                        success: true,
                        initialMemory: initialMemory,
                        finalMemory: finalMemory,
                        memoryDelta: memoryDelta
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(memoryResult.success).toBe(true);
            // Memory delta should be reasonable (less than 10MB for this test)
            expect(memoryResult.memoryDelta).toBeLessThan(10 * 1024 * 1024);
        });

        test('should initialize within acceptable time limits', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const performanceResult = await testUtils.executeScript(async () => {
                try {
                    const startTime = performance.now();

                    const manager = new window.CalibrationManager();
                    await manager.initialize();

                    const endTime = performance.now();
                    const initializationTime = endTime - startTime;

                    return {
                        success: true,
                        initializationTime: initializationTime
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(performanceResult.success).toBe(true);
            // Initialization should complete within 5 seconds
            expect(performanceResult.initializationTime).toBeLessThan(5000);
        });
    });

    describe('Integration Readiness', () => {
        test('should be ready for Step 2 integration', async () => {
            await testUtils.navigateToPage(`${global.testConfig.baseUrl}/test-infrastructure.html`);

            const integrationReadinessResult = await testUtils.executeScript(async () => {
                try {
                    // Check all required components for Step 2
                    const requiredComponents = [
                        'CalibrationManager',
                        'CalibrationStorage',
                        'DataValidator',
                        'ErrorHandler'
                    ];

                    const componentStatus = {};
                    let allComponentsReady = true;

                    for (const component of requiredComponents) {
                        const isAvailable = typeof window[component] === 'function';
                        componentStatus[component] = isAvailable;
                        if (!isAvailable) {
                            allComponentsReady = false;
                        }
                    }

                    // Test basic integration
                    const manager = new window.CalibrationManager();
                    await manager.initialize();

                    const storage = new window.CalibrationStorage();
                    await storage.initialize();

                    return {
                        success: true,
                        allComponentsReady: allComponentsReady,
                        componentStatus: componentStatus
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(integrationReadinessResult.success).toBe(true);
            expect(integrationReadinessResult.allComponentsReady).toBe(true);
        });
    });
});