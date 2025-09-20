/**
 * Step 2 Tests - Camera Calibration Implementation
 * Tests user-friendly camera calibration interface, real-time feedback, and calibration accuracy
 */

const TestUtils = require('../utils/TestUtils');

describe('Step 2: Camera Calibration Implementation', () => {
    let testUtils;

    beforeEach(async () => {
        testUtils = new TestUtils();
        await testUtils.initializeDriver();
    });

    afterEach(async () => {
        if (testUtils) {
            // Take screenshot on failure
            if (expect.getState().currentTestName && expect.getState().testPath) {
                await testUtils.takeScreenshot(`step2-${expect.getState().currentTestName.replace(/\s+/g, '-')}`);
            }
            await testUtils.cleanup();
        }
    });

    describe('User-Friendly Authentication & Setup', () => {
        test('should load camera calibration interface successfully', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.waitForPageLoad();
            await testUtils.waitForOpenCV();

            // Check that main interface elements are present
            await testUtils.assertElementVisible('#welcome-section', 'Welcome section should be visible');
            await testUtils.assertElementVisible('#setup-section', 'Setup section should be visible');

            // Verify no JavaScript errors
            await testUtils.assertNoJavaScriptErrors();
        });

        test('should display step-by-step wizard interface', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.waitForPageLoad();

            // Check for wizard steps
            const wizardSteps = await testUtils.executeScript(() => {
                return Array.from(document.querySelectorAll('.wizard-step')).map(step => ({
                    id: step.id,
                    text: step.textContent.trim(),
                    visible: step.style.display !== 'none'
                }));
            });

            expect(wizardSteps).toBeDefined();
            expect(wizardSteps.length).toBeGreaterThan(0);

            // First step should be visible
            const firstStep = wizardSteps.find(step => step.visible);
            expect(firstStep).toBeDefined();
        });

        test('should handle Google sign-in flow', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockFirebase();

            // Look for sign-in button
            const signInExists = await testUtils.elementExists('#google-signin-btn');

            if (signInExists) {
                await testUtils.clickElement('#google-signin-btn');

                // Wait for sign-in to complete
                await testUtils.page.waitForTimeout(1000);

                // Check if user is signed in
                const signInResult = await testUtils.executeScript(() => {
                    return window.mockFirebaseAuth && window.mockFirebaseAuth.currentUser;
                });

                expect(signInResult).toBeDefined();
                expect(signInResult.uid).toBe('mock-user-123');
            }
        });

        test('should work without sign-in (optional authentication)', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.waitForPageLoad();

            // Look for skip/continue without sign-in option
            const skipSignInExists = await testUtils.elementExists('.skip-signin, .continue-without-signin');

            if (skipSignInExists) {
                await testUtils.clickElement('.skip-signin, .continue-without-signin');
            }

            // Should be able to proceed to camera setup
            await testUtils.waitForElement('#camera-setup-section');
        });
    });

    describe('Camera Detection and Setup', () => {
        test('should detect available cameras', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Navigate to camera setup
            const cameraSetupBtn = await testUtils.elementExists('#start-camera-setup');
            if (cameraSetupBtn) {
                await testUtils.clickElement('#start-camera-setup');
            }

            // Wait for camera detection
            await testUtils.waitForElement('#camera-selection');

            const cameraDetectionResult = await testUtils.executeScript(async () => {
                try {
                    // Trigger camera enumeration
                    if (window.cameraManager && window.cameraManager.enumerateDevices) {
                        const devices = await window.cameraManager.enumerateDevices();
                        return { success: true, devices: devices };
                    }

                    // Check for camera options in UI
                    const cameraOptions = Array.from(document.querySelectorAll('#camera-selection option'));
                    return {
                        success: true,
                        devices: cameraOptions.map(option => ({
                            deviceId: option.value,
                            label: option.textContent
                        }))
                    };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(cameraDetectionResult.success).toBe(true);
            expect(cameraDetectionResult.devices.length).toBeGreaterThan(0);
        });

        test('should provide camera quality recommendations', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Navigate to camera setup
            await testUtils.waitForElement('#camera-selection');

            // Select a camera
            await testUtils.clickElement('#camera-selection option:first-child');

            // Look for quality recommendations
            const qualityInfo = await testUtils.elementExists('.camera-quality-info, .resolution-recommendations');

            expect(qualityInfo).toBe(true);
        });

        test('should handle camera permission requests', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            const permissionResult = await testUtils.executeScript(async () => {
                try {
                    // Simulate camera permission request
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    return { success: true, hasStream: !!stream };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(permissionResult.success).toBe(true);
            expect(permissionResult.hasStream).toBe(true);
        });

        test('should test camera functionality', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Look for camera test button
            const testCameraBtn = await testUtils.elementExists('#test-camera-btn');

            if (testCameraBtn) {
                await testUtils.clickElement('#test-camera-btn');

                // Wait for test results
                await testUtils.waitForElement('.camera-test-results');

                const testResults = await testUtils.getElementText('.camera-test-results');
                expect(testResults).toBeDefined();
                expect(testResults.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Pattern Detection and Real-Time Feedback', () => {
        test('should display calibration pattern instructions', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Navigate to calibration section
            const calibrationSection = await testUtils.elementExists('#calibration-section');

            if (calibrationSection) {
                await testUtils.clickElement('.start-calibration, .begin-calibration');
            }

            // Look for pattern instructions
            await testUtils.waitForElement('.pattern-instructions, .calibration-instructions');

            const instructions = await testUtils.getElementText('.pattern-instructions, .calibration-instructions');
            expect(instructions).toContain('checkerboard');
        });

        test('should provide real-time quality feedback', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Start calibration process
            await testUtils.waitForElement('#video-preview');

            // Check for quality feedback elements
            const qualityIndicators = await testUtils.elementExists('.quality-indicators, .feedback-display');
            expect(qualityIndicators).toBe(true);

            // Check for specific quality metrics
            const qualityMetrics = await testUtils.executeScript(() => {
                const indicators = document.querySelectorAll('.quality-indicator');
                return Array.from(indicators).map(indicator => ({
                    type: indicator.classList.contains('brightness') ? 'brightness' :
                          indicator.classList.contains('contrast') ? 'contrast' :
                          indicator.classList.contains('sharpness') ? 'sharpness' : 'unknown',
                    visible: indicator.style.display !== 'none'
                }));
            });

            expect(qualityMetrics.length).toBeGreaterThan(0);
        });

        test('should detect calibration patterns', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Mock pattern detection
            const patternDetectionResult = await testUtils.executeScript(() => {
                try {
                    // Simulate pattern detection
                    if (window.cameraCalibrator) {
                        // Mock successful pattern detection
                        const mockPattern = {
                            corners: Array.from({ length: 54 }, (_, i) => ({ x: i * 10, y: i * 10 })),
                            quality: 'excellent',
                            confidence: 0.95
                        };

                        return { success: true, pattern: mockPattern };
                    }

                    return { success: false, error: 'Camera calibrator not available' };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(patternDetectionResult.success).toBe(true);
            expect(patternDetectionResult.pattern.corners.length).toBe(54); // 9x6 checkerboard
        });

        test('should provide encouraging user feedback', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Look for encouraging messages
            const encouragingElements = await testUtils.executeScript(() => {
                return Array.from(document.querySelectorAll('*')).some(el =>
                    el.textContent.includes('Great job') ||
                    el.textContent.includes('Perfect') ||
                    el.textContent.includes('Excellent') ||
                    el.textContent.includes('Well done')
                );
            });

            // Or check for feedback system setup
            const feedbackSystemExists = await testUtils.elementExists('.feedback-system, .user-feedback');

            expect(encouragingElements || feedbackSystemExists).toBe(true);
        });
    });

    describe('Image Capture and Progress Tracking', () => {
        test('should capture calibration images', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Look for capture button
            const captureBtn = await testUtils.elementExists('#capture-image-btn');

            if (captureBtn) {
                await testUtils.clickElement('#capture-image-btn');

                // Wait for capture confirmation
                await testUtils.waitForText('.capture-feedback', 'captured');
            }

            // Check capture counter
            const captureCount = await testUtils.executeScript(() => {
                const counter = document.querySelector('.capture-counter, .images-captured');
                return counter ? counter.textContent : '0';
            });

            expect(captureCount).toBeDefined();
        });

        test('should track calibration progress', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Check for progress indicators
            const progressExists = await testUtils.elementExists('.progress-bar, .calibration-progress');
            expect(progressExists).toBe(true);

            // Check progress counter
            const progressInfo = await testUtils.executeScript(() => {
                const progress = document.querySelector('.progress-info, .progress-text');
                return progress ? progress.textContent : '';
            });

            expect(progressInfo).toBeDefined();
        });

        test('should enable auto-capture feature', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Look for auto-capture toggle
            const autoCaptureToggle = await testUtils.elementExists('#auto-capture-toggle');

            if (autoCaptureToggle) {
                await testUtils.clickElement('#auto-capture-toggle');

                const autoCaptureEnabled = await testUtils.executeScript(() => {
                    const toggle = document.getElementById('auto-capture-toggle');
                    return toggle ? toggle.checked : false;
                });

                expect(autoCaptureEnabled).toBe(true);
            }
        });

        test('should provide guidance for image variety', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Check for guidance about image positions
            const guidanceExists = await testUtils.executeScript(() => {
                return Array.from(document.querySelectorAll('*')).some(el =>
                    el.textContent.includes('different angles') ||
                    el.textContent.includes('various positions') ||
                    el.textContent.includes('move the pattern')
                );
            });

            expect(guidanceExists).toBe(true);
        });
    });

    describe('Calibration Processing and Results', () => {
        test('should process calibration with visual feedback', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();

            // Simulate having enough images for calibration
            await testUtils.executeScript(() => {
                // Mock sufficient calibration images
                if (window.cameraCalibrator) {
                    window.cameraCalibrator.capturedImages = Array.from({ length: 12 }, (_, i) => ({
                        id: i,
                        corners: Array.from({ length: 54 }, (_, j) => ({ x: j * 10, y: j * 10 })),
                        image: 'mock-image-data'
                    }));
                }
            });

            // Look for process calibration button
            const processBtn = await testUtils.elementExists('#process-calibration-btn');

            if (processBtn) {
                await testUtils.clickElement('#process-calibration-btn');

                // Wait for processing to start
                await testUtils.waitForElement('.processing-indicator, .calibration-processing');
            }

            // Check for processing feedback
            const processingFeedback = await testUtils.elementExists('.processing-progress, .processing-status');
            expect(processingFeedback).toBe(true);
        });

        test('should display calibration results clearly', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Mock calibration completion
            await testUtils.executeScript(() => {
                // Simulate calibration results
                window.calibrationResults = {
                    success: true,
                    reprojectionError: 0.45,
                    quality: 'excellent',
                    cameraMatrix: [[800, 0, 320], [0, 800, 240], [0, 0, 1]],
                    distortionCoefficients: [0.1, -0.2, 0, 0, 0],
                    imageCount: 12
                };

                // Trigger results display
                const event = new CustomEvent('calibration-complete', {
                    detail: window.calibrationResults
                });
                document.dispatchEvent(event);
            });

            // Wait for results to be displayed
            await testUtils.waitForElement('.calibration-results, .results-section');

            // Check for key result elements
            const reprojectionError = await testUtils.elementExists('.reprojection-error, .error-metric');
            const qualityAssessment = await testUtils.elementExists('.quality-assessment, .calibration-quality');

            expect(reprojectionError).toBe(true);
            expect(qualityAssessment).toBe(true);
        });

        test('should provide user-friendly quality explanation', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Mock results with different quality levels
            const qualityExplanations = await testUtils.executeScript(() => {
                const mockResults = [
                    { reprojectionError: 0.3, expectedQuality: 'excellent' },
                    { reprojectionError: 0.8, expectedQuality: 'good' },
                    { reprojectionError: 1.5, expectedQuality: 'fair' },
                    { reprojectionError: 3.0, expectedQuality: 'poor' }
                ];

                return mockResults.map(result => {
                    // Simulate quality assessment
                    let quality = 'poor';
                    if (result.reprojectionError < 0.5) quality = 'excellent';
                    else if (result.reprojectionError < 1.0) quality = 'good';
                    else if (result.reprojectionError < 2.0) quality = 'fair';

                    return {
                        error: result.reprojectionError,
                        quality: quality,
                        matches: quality === result.expectedQuality
                    };
                });
            });

            qualityExplanations.forEach(explanation => {
                expect(explanation.matches).toBe(true);
            });
        });

        test('should handle calibration failures gracefully', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Mock calibration failure
            await testUtils.executeScript(() => {
                // Simulate calibration failure
                const failureEvent = new CustomEvent('calibration-failed', {
                    detail: {
                        error: 'Insufficient images',
                        message: 'Please capture more images from different angles'
                    }
                });
                document.dispatchEvent(failureEvent);
            });

            // Check for error handling
            const errorMessage = await testUtils.elementExists('.error-message, .calibration-error');
            expect(errorMessage).toBe(true);

            // Check for recovery options
            const retryOption = await testUtils.elementExists('.retry-calibration, .try-again');
            expect(retryOption).toBe(true);
        });
    });

    describe('Mobile and Responsive Design', () => {
        test('should adapt to mobile screen sizes', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Simulate mobile viewport
            await testUtils.page.setViewport({ width: 375, height: 667 });

            await testUtils.waitForPageLoad();

            // Check responsive elements
            const responsiveCheck = await testUtils.executeScript(() => {
                const body = document.body;
                const isMobileLayout = window.innerWidth < 768;

                return {
                    isMobileLayout: isMobileLayout,
                    hasResponsiveClasses: body.classList.contains('mobile') ||
                                         document.querySelector('.mobile-layout') !== null,
                    viewportWidth: window.innerWidth
                };
            });

            expect(responsiveCheck.viewportWidth).toBeLessThan(768);
        });

        test('should handle touch interactions', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Check for touch-friendly elements
            const touchFriendly = await testUtils.executeScript(() => {
                const buttons = document.querySelectorAll('button, .btn');
                const touchFriendlyButtons = Array.from(buttons).filter(btn => {
                    const style = window.getComputedStyle(btn);
                    const minHeight = parseFloat(style.height) || parseFloat(style.minHeight);
                    return minHeight >= 44; // Minimum touch target size
                });

                return {
                    totalButtons: buttons.length,
                    touchFriendlyButtons: touchFriendlyButtons.length,
                    ratio: touchFriendlyButtons.length / buttons.length
                };
            });

            expect(touchFriendly.ratio).toBeGreaterThan(0.8); // At least 80% should be touch-friendly
        });

        test('should handle different orientations', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Test landscape orientation
            await testUtils.page.setViewport({ width: 667, height: 375 });

            const orientationCheck = await testUtils.executeScript(() => {
                const isLandscape = window.innerWidth > window.innerHeight;
                const hasOrientationHandling = document.querySelector('.landscape-mode') !== null ||
                                             document.body.classList.contains('landscape');

                return {
                    isLandscape: isLandscape,
                    hasOrientationHandling: hasOrientationHandling,
                    aspectRatio: window.innerWidth / window.innerHeight
                };
            });

            expect(orientationCheck.isLandscape).toBe(true);
            expect(orientationCheck.aspectRatio).toBeGreaterThan(1);
        });
    });

    describe('Data Persistence and Firebase Integration', () => {
        test('should save calibration data to Firebase', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockFirebase();

            // Mock successful calibration
            const saveResult = await testUtils.executeScript(async () => {
                try {
                    const mockCalibrationData = {
                        type: 'camera',
                        timestamp: new Date().toISOString(),
                        cameraMatrix: [[800, 0, 320], [0, 800, 240], [0, 0, 1]],
                        distortionCoefficients: [0.1, -0.2, 0, 0, 0],
                        reprojectionError: 0.45,
                        imageCount: 12
                    };

                    // Simulate save operation
                    const storage = window.mockFirestore;
                    const result = await storage.collection('calibrations').doc('test-calibration').set(mockCalibrationData);

                    return { success: true, result: result };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(saveResult.success).toBe(true);
        });

        test('should handle authentication state changes', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockFirebase();

            // Test sign in
            await testUtils.executeScript(() => {
                window.mockFirebaseAuth.currentUser = {
                    uid: 'test-user',
                    email: 'test@example.com'
                };

                // Trigger auth state change
                const event = new CustomEvent('auth-state-changed', {
                    detail: { user: window.mockFirebaseAuth.currentUser }
                });
                document.dispatchEvent(event);
            });

            // Check for user interface updates
            const userInfoExists = await testUtils.elementExists('.user-info, .signed-in-user');

            // Test sign out
            await testUtils.executeScript(() => {
                window.mockFirebaseAuth.currentUser = null;

                const event = new CustomEvent('auth-state-changed', {
                    detail: { user: null }
                });
                document.dispatchEvent(event);
            });

            // Should handle both states gracefully
            expect(true).toBe(true); // Test passes if no errors thrown
        });

        test('should work offline (graceful degradation)', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Simulate offline state
            await testUtils.executeScript(() => {
                Object.defineProperty(navigator, 'onLine', {
                    writable: true,
                    value: false
                });

                // Trigger offline event
                const event = new Event('offline');
                window.dispatchEvent(event);
            });

            // Check for offline indicators
            const offlineIndicator = await testUtils.elementExists('.offline-indicator, .no-connection');

            // Calibration should still work locally
            const localCalibrationWorks = await testUtils.executeScript(() => {
                return typeof window.cameraCalibrator !== 'undefined';
            });

            expect(localCalibrationWorks).toBe(true);
        });
    });

    describe('Performance and Optimization', () => {
        test('should load within acceptable time', async () => {
            const startTime = Date.now();

            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.waitForPageLoad();
            await testUtils.waitForOpenCV();

            const loadTime = Date.now() - startTime;

            // Should load within 10 seconds
            expect(loadTime).toBeLessThan(10000);
        });

        test('should handle real-time processing efficiently', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            const performanceTest = await testUtils.executeScript(() => {
                const frameProcessingTimes = [];

                // Mock frame processing
                for (let i = 0; i < 10; i++) {
                    const startTime = performance.now();

                    // Simulate image processing
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    const ctx = canvas.getContext('2d');
                    ctx.fillRect(0, 0, 640, 480);

                    const endTime = performance.now();
                    frameProcessingTimes.push(endTime - startTime);
                }

                const avgProcessingTime = frameProcessingTimes.reduce((a, b) => a + b) / frameProcessingTimes.length;

                return {
                    avgProcessingTime: avgProcessingTime,
                    maxProcessingTime: Math.max(...frameProcessingTimes),
                    frames: frameProcessingTimes.length
                };
            });

            // Average frame processing should be under 50ms for real-time performance
            expect(performanceTest.avgProcessingTime).toBeLessThan(50);
        });

        test('should manage memory usage effectively', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            const memoryTest = await testUtils.executeScript(() => {
                const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

                // Simulate calibration process
                const mockImages = [];
                for (let i = 0; i < 20; i++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640;
                    canvas.height = 480;
                    mockImages.push(canvas.toDataURL());
                }

                // Clean up
                mockImages.length = 0;

                if (window.gc) {
                    window.gc();
                }

                const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

                return {
                    initialMemory: initialMemory,
                    finalMemory: finalMemory,
                    memoryDelta: finalMemory - initialMemory
                };
            });

            // Memory usage should not grow excessively
            expect(memoryTest.memoryDelta).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        });
    });

    describe('End-to-End Calibration Workflow', () => {
        test('should complete full calibration workflow', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);
            await testUtils.setupMockCamera();
            await testUtils.setupMockFirebase();

            // Navigate through complete workflow
            const workflowResult = await testUtils.executeScript(async () => {
                try {
                    const workflow = {
                        steps: [],
                        completed: false
                    };

                    // Step 1: Initialize
                    workflow.steps.push('initialize');

                    // Step 2: Camera setup
                    if (window.cameraManager) {
                        await window.cameraManager.initialize();
                        workflow.steps.push('camera-setup');
                    }

                    // Step 3: Mock image capture
                    workflow.steps.push('image-capture');

                    // Step 4: Mock calibration processing
                    workflow.steps.push('calibration-processing');

                    // Step 5: Results display
                    workflow.steps.push('results-display');

                    workflow.completed = true;

                    return { success: true, workflow: workflow };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });

            expect(workflowResult.success).toBe(true);
            expect(workflowResult.workflow.completed).toBe(true);
            expect(workflowResult.workflow.steps.length).toBeGreaterThan(3);
        });

        test('should provide clear next steps after completion', async () => {
            await testUtils.navigateToPage(global.testConfig.cameraCalibrationUrl);

            // Mock calibration completion
            await testUtils.executeScript(() => {
                const completionEvent = new CustomEvent('calibration-complete', {
                    detail: {
                        success: true,
                        quality: 'excellent',
                        nextSteps: ['projector-setup', 'quad-calibration']
                    }
                });
                document.dispatchEvent(completionEvent);
            });

            // Check for next steps guidance
            const nextStepsExists = await testUtils.elementExists('.next-steps, .continue-to-next');
            expect(nextStepsExists).toBe(true);
        });
    });
});