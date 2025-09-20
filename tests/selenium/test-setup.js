/**
 * Jest test setup for Puppeteer tests
 */

// Increase timeout for browser operations
jest.setTimeout(60000);

// Global test configuration
global.testConfig = {
    // Test URLs
    baseUrl: 'http://localhost:8080/v1/public',
    cameraCalibrationUrl: 'http://localhost:8080/v1/public/camera-calibration.html',

    // Browser configuration
    browser: {
        headless: false, // Set to true for CI
        windowSize: { width: 1920, height: 1080 },
        implicitWait: 10000,
        pageLoadTimeout: 30000
    },

    // Test data paths
    testData: {
        mockImages: './test-data/mock-images',
        calibrationPatterns: './test-data/calibration-patterns',
        expectedResults: './test-data/expected-results'
    },

    // Timing configuration
    timeouts: {
        elementWait: 10000,
        calibrationProcess: 120000, // 2 minutes for full calibration
        patternDetection: 30000,
        firebase: 15000
    },

    // Feature flags for testing
    features: {
        mockCamera: true, // Use mock camera for consistent testing
        mockFirebase: false, // Use real Firebase for integration tests
        skipUserInteraction: false, // For headless testing
        enableDebugLogs: true
    }
};

// Console configuration for test output
if (global.testConfig.features.enableDebugLogs) {
    console.log('🧪 Test configuration loaded:', {
        baseUrl: global.testConfig.baseUrl,
        headless: global.testConfig.browser.headless,
        features: global.testConfig.features
    });
}

// Global error handler for uncaught exceptions in tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Cleanup function for after all tests
global.afterAll(async () => {
    console.log('🧹 Cleaning up test environment...');
});