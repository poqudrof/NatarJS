/**
 * TestUtils - Utility functions for Puppeteer tests
 */

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

class TestUtils {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testStartTime = null;
    }

    /**
     * Initialize Puppeteer browser and page with test configuration
     */
    async initializeDriver() {
        const launchOptions = {
            headless: global.testConfig.browser.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                `--window-size=${global.testConfig.browser.windowSize.width},${global.testConfig.browser.windowSize.height}`,
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream',
                '--allow-running-insecure-content',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        };

        // Add fake video capture for testing
        const mockVideoPath = path.resolve(__dirname, '../test-data/mock-video.y4m');
        if (await fs.pathExists(mockVideoPath)) {
            launchOptions.args.push(`--use-file-for-fake-video-capture=${mockVideoPath}`);
        }

        this.browser = await puppeteer.launch(launchOptions);
        this.page = await this.browser.newPage();

        // Set viewport
        await this.page.setViewport({
            width: global.testConfig.browser.windowSize.width,
            height: global.testConfig.browser.windowSize.height
        });

        // Set default timeout
        this.page.setDefaultTimeout(global.testConfig.browser.pageLoadTimeout);

        // Enable request interception if needed
        await this.page.setRequestInterception(false);

        this.testStartTime = Date.now();
        console.log('🚀 Puppeteer browser initialized');

        return this.page;
    }

    /**
     * Navigate to test page and wait for load
     */
    async navigateToPage(url) {
        console.log(`📍 Navigating to: ${url}`);
        await this.page.goto(url, { waitUntil: 'networkidle0' });

        // Wait for JavaScript to initialize
        await this.page.waitForTimeout(1000);

        // Check for any JavaScript errors
        const errors = await this.page.evaluate(() => {
            return window.jsErrors || [];
        });

        if (errors.length > 0) {
            console.warn('⚠️ JavaScript errors detected:', errors);
        }
    }

    /**
     * Wait for element to be present and visible
     */
    async waitForElement(selector, timeout = global.testConfig.timeouts.elementWait) {
        console.log(`⏳ Waiting for element: ${selector}`);

        await this.page.waitForSelector(selector, {
            visible: true,
            timeout: timeout
        });

        return await this.page.$(selector);
    }

    /**
     * Wait for element to be clickable and click it
     */
    async clickElement(selector, timeout = global.testConfig.timeouts.elementWait) {
        console.log(`👆 Clicking element: ${selector}`);

        await this.waitForElement(selector, timeout);

        // Scroll into view
        await this.page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, selector);

        await this.page.waitForTimeout(500);
        await this.page.click(selector);
    }

    /**
     * Enter text into an input field
     */
    async enterText(selector, text, timeout = global.testConfig.timeouts.elementWait) {
        console.log(`⌨️ Entering text into: ${selector}`);

        await this.waitForElement(selector, timeout);
        await this.page.focus(selector);
        await this.page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) {
                element.value = '';
            }
        }, selector);
        await this.page.type(selector, text);

        // Verify text was entered
        const value = await this.page.$eval(selector, el => el.value);
        if (value !== text) {
            throw new Error(`Text not entered correctly. Expected: ${text}, Got: ${value}`);
        }
    }

    /**
     * Wait for text to appear in element
     */
    async waitForText(selector, expectedText, timeout = global.testConfig.timeouts.elementWait) {
        console.log(`📝 Waiting for text "${expectedText}" in: ${selector}`);

        await this.page.waitForFunction(
            (sel, text) => {
                const element = document.querySelector(sel);
                return element && element.textContent.includes(text);
            },
            { timeout: timeout },
            selector,
            expectedText
        );
    }

    /**
     * Check if element exists without throwing error
     */
    async elementExists(selector) {
        try {
            const element = await this.page.$(selector);
            return element !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get element text content
     */
    async getElementText(selector) {
        await this.waitForElement(selector);
        return await this.page.$eval(selector, el => el.textContent);
    }

    /**
     * Get element attribute value
     */
    async getElementAttribute(selector, attribute) {
        await this.waitForElement(selector);
        return await this.page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
    }

    /**
     * Execute JavaScript in browser
     */
    async executeScript(script, ...args) {
        return await this.page.evaluate(script, ...args);
    }

    /**
     * Take screenshot for debugging
     */
    async takeScreenshot(filename) {
        const screenshotDir = path.join(__dirname, '../screenshots');
        await fs.ensureDir(screenshotDir);

        const filepath = path.join(screenshotDir, `${filename}-${Date.now()}.png`);
        await this.page.screenshot({
            path: filepath,
            fullPage: true
        });

        console.log(`📸 Screenshot saved: ${filepath}`);
        return filepath;
    }

    /**
     * Wait for page to load completely
     */
    async waitForPageLoad() {
        await this.page.waitForFunction(() => document.readyState === 'complete');
    }

    /**
     * Wait for OpenCV.js to load
     */
    async waitForOpenCV() {
        console.log('📚 Waiting for OpenCV.js to load...');

        await this.page.waitForFunction(
            () => {
                return typeof cv !== 'undefined' && cv.Mat;
            },
            { timeout: 30000 }
        );

        console.log('✅ OpenCV.js loaded successfully');
    }

    /**
     * Mock camera permissions and media stream
     */
    async setupMockCamera() {
        if (!global.testConfig.features.mockCamera) {
            return;
        }

        console.log('📹 Setting up mock camera...');

        await this.page.evaluateOnNewDocument(() => {
            // Mock getUserMedia for testing
            const mockStream = {
                getVideoTracks: () => [{
                    label: 'Mock Camera',
                    enabled: true,
                    stop: () => {}
                }],
                getTracks: () => [{
                    label: 'Mock Camera',
                    enabled: true,
                    stop: () => {}
                }],
                addTrack: () => {},
                removeTrack: () => {},
                clone: () => mockStream
            };

            Object.defineProperty(navigator, 'mediaDevices', {
                value: {
                    getUserMedia: async (constraints) => {
                        console.log('Mock getUserMedia called with:', constraints);
                        return mockStream;
                    },
                    enumerateDevices: async () => {
                        return [
                            {
                                deviceId: 'mock-camera-1',
                                kind: 'videoinput',
                                label: 'Mock Camera 1',
                                groupId: 'mock-group-1'
                            },
                            {
                                deviceId: 'mock-camera-2',
                                kind: 'videoinput',
                                label: 'Mock Camera 2 (HD)',
                                groupId: 'mock-group-2'
                            }
                        ];
                    }
                },
                configurable: true
            });

            window.mockCameraSetup = true;
        });

        console.log('✅ Mock camera setup complete');
    }

    /**
     * Setup mock Firebase for testing
     */
    async setupMockFirebase() {
        if (!global.testConfig.features.mockFirebase) {
            return;
        }

        console.log('🔥 Setting up mock Firebase...');

        await this.page.evaluateOnNewDocument(() => {
            // Mock Firebase Auth
            window.mockFirebaseAuth = {
                currentUser: null,
                signInWithPopup: async (provider) => {
                    return {
                        user: {
                            uid: 'mock-user-123',
                            email: 'test@example.com',
                            displayName: 'Test User'
                        }
                    };
                },
                signOut: async () => {
                    window.mockFirebaseAuth.currentUser = null;
                }
            };

            // Mock Firestore
            window.mockFirestore = {
                collection: (path) => ({
                    doc: (id) => ({
                        set: async (data) => {
                            console.log('Mock Firestore set:', path, id, data);
                            return { id: id };
                        },
                        get: async () => ({
                            exists: true,
                            data: () => ({ mockData: true })
                        })
                    })
                })
            };

            window.mockFirebaseSetup = true;
        });

        console.log('✅ Mock Firebase setup complete');
    }

    /**
     * Wait for calibration process to complete
     */
    async waitForCalibrationComplete(timeout = global.testConfig.timeouts.calibrationProcess) {
        console.log('⏳ Waiting for calibration to complete...');

        const startTime = Date.now();

        await this.page.waitForFunction(
            () => {
                // Check for completion indicators
                const progressElement = document.querySelector('.progress-indicator');
                const resultElement = document.querySelector('.calibration-results');
                const successMessage = document.querySelector('.success-message');
                const errorElement = document.querySelector('.error-message, .alert-danger');

                if (errorElement && errorElement.textContent.trim().length > 0) {
                    throw new Error(`Calibration failed: ${errorElement.textContent}`);
                }

                return !!(resultElement || successMessage ||
                         (progressElement && progressElement.textContent.includes('100%')));
            },
            { timeout: timeout }
        );

        const duration = Date.now() - startTime;
        console.log(`⏱️ Calibration completed in ${duration}ms`);
    }

    /**
     * Get calibration results
     */
    async getCalibrationResults() {
        console.log('📊 Retrieving calibration results...');

        return await this.page.evaluate(() => {
            // Try to get calibration results from various possible sources
            if (window.calibrationResults) {
                return window.calibrationResults;
            }

            if (window.cameraCalibrator && window.cameraCalibrator.getCalibrationData) {
                return window.cameraCalibrator.getCalibrationData();
            }

            // Try to extract from UI
            const resultElements = document.querySelectorAll('.calibration-result-item');
            const results = {};

            resultElements.forEach(element => {
                const label = element.querySelector('.result-label');
                const value = element.querySelector('.result-value');
                if (label && value) {
                    results[label.textContent.trim()] = value.textContent.trim();
                }
            });

            return Object.keys(results).length > 0 ? results : null;
        });
    }

    /**
     * Clean up browser and resources
     */
    async cleanup() {
        const duration = this.testStartTime ? Date.now() - this.testStartTime : 0;
        console.log(`🧹 Cleaning up test (duration: ${duration}ms)`);

        if (this.page) {
            try {
                await this.page.close();
            } catch (error) {
                console.warn('Warning during page cleanup:', error.message);
            }
            this.page = null;
        }

        if (this.browser) {
            try {
                await this.browser.close();
            } catch (error) {
                console.warn('Warning during browser cleanup:', error.message);
            }
            this.browser = null;
        }
    }

    /**
     * Assert element is visible
     */
    async assertElementVisible(selector, message = 'Element should be visible') {
        const element = await this.waitForElement(selector);
        const isVisible = await this.page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el && el.offsetParent !== null;
        }, selector);

        if (!isVisible) {
            throw new Error(`${message}: ${selector}`);
        }
    }

    /**
     * Assert element contains text
     */
    async assertElementContainsText(selector, expectedText, message = 'Element should contain text') {
        const actualText = await this.getElementText(selector);

        if (!actualText.includes(expectedText)) {
            throw new Error(`${message}. Expected: "${expectedText}", Got: "${actualText}"`);
        }
    }

    /**
     * Assert no JavaScript errors
     */
    async assertNoJavaScriptErrors() {
        const errors = await this.page.evaluate(() => {
            return window.jsErrors || [];
        });

        if (errors.length > 0) {
            throw new Error(`JavaScript errors found: ${JSON.stringify(errors)}`);
        }
    }
}

module.exports = TestUtils;