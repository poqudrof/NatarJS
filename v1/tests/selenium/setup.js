/**
 * Setup script for Selenium tests
 * Installs dependencies and prepares test environment
 */

const fs = require('fs-extra');
const path = require('path');

async function setupTestEnvironment() {
    console.log('🚀 Setting up test environment...');

    try {
        // Create required directories
        const directories = [
            'screenshots',
            'test-data/mock-images',
            'test-data/calibration-patterns',
            'test-data/expected-results',
            'coverage'
        ];

        for (const dir of directories) {
            const dirPath = path.join(__dirname, dir);
            await fs.ensureDir(dirPath);
            console.log(`📁 Created directory: ${dir}`);
        }

        // Create test HTML files for infrastructure testing
        await createTestInfrastructureHTML();

        // Create mock calibration patterns
        await createMockCalibrationPatterns();

        // Create expected test results
        await createExpectedResults();

        console.log('✅ Test environment setup complete!');
        console.log('\n📋 Next steps:');
        console.log('1. Install dependencies: npm install');
        console.log('2. Start local server for testing');
        console.log('3. Run tests: npm test');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

async function createTestInfrastructureHTML() {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Infrastructure</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .error-message { color: red; }
        .success-message { color: green; }
    </style>
</head>
<body>
    <h1>Test Infrastructure Page</h1>

    <div class="test-section" id="calibration-manager-test">
        <h2>CalibrationManager Test</h2>
        <button id="test-manager-init">Test Manager Initialization</button>
        <div id="manager-result"></div>
    </div>

    <div class="test-section" id="storage-test">
        <h2>Storage Test</h2>
        <button id="test-storage">Test Storage Operations</button>
        <div id="storage-result"></div>
    </div>

    <div class="test-section" id="firebase-test">
        <h2>Firebase Test</h2>
        <button id="test-firebase">Test Firebase Connection</button>
        <div id="firebase-result"></div>
    </div>

    <!-- Include calibration system files -->
    <script src="../src/calibration/core/CalibrationManager.js" type="module"></script>
    <script src="../src/calibration/storage/CalibrationStorage.js" type="module"></script>
    <script src="../src/calibration/storage/DataValidator.js" type="module"></script>
    <script src="../src/utils/ErrorHandler.js" type="module"></script>
    <script src="../config/firebase.config.js" type="module"></script>

    <script type="module">
        // Make classes globally available for testing
        import { CalibrationManager } from '../src/calibration/core/CalibrationManager.js';
        import { CalibrationStorage } from '../src/calibration/storage/CalibrationStorage.js';
        import { DataValidator } from '../src/calibration/storage/DataValidator.js';
        import { ErrorHandler } from '../src/utils/ErrorHandler.js';

        window.CalibrationManager = CalibrationManager;
        window.CalibrationStorage = CalibrationStorage;
        window.DataValidator = DataValidator;
        window.ErrorHandler = ErrorHandler;

        // Mock OpenCV for testing
        window.cv = {
            Mat: function() { return {}; },
            imread: function() { return {}; },
            calibrateCamera: function() { return { returnValue: [[1,0,0],[0,1,0],[0,0,1]] }; }
        };

        console.log('Test infrastructure loaded');
    </script>
</body>
</html>`;

    const filePath = path.join(__dirname, '../../public/test-infrastructure.html');
    await fs.writeFile(filePath, htmlContent);
    console.log('📄 Created test infrastructure HTML');
}

async function createMockCalibrationPatterns() {
    const patterns = {
        checkerboard_9x6: {
            type: 'checkerboard',
            width: 9,
            height: 6,
            squareSize: 25.0,
            description: 'Standard 9x6 checkerboard pattern for camera calibration'
        },
        checkerboard_7x5: {
            type: 'checkerboard',
            width: 7,
            height: 5,
            squareSize: 30.0,
            description: 'Alternative 7x5 checkerboard pattern'
        },
        circles_4x11: {
            type: 'circles',
            width: 4,
            height: 11,
            spacing: 20.0,
            description: 'Asymmetric circles pattern'
        }
    };

    for (const [name, pattern] of Object.entries(patterns)) {
        const filePath = path.join(__dirname, 'test-data/calibration-patterns', `${name}.json`);
        await fs.writeFile(filePath, JSON.stringify(pattern, null, 2));
    }

    console.log('🎯 Created mock calibration patterns');
}

async function createExpectedResults() {
    const expectedResults = {
        camera_calibration_excellent: {
            reprojectionError: 0.3,
            quality: 'excellent',
            cameraMatrix: [
                [800.5, 0, 320.5],
                [0, 800.5, 240.5],
                [0, 0, 1]
            ],
            distortionCoefficients: [0.1, -0.2, 0.001, 0.002, 0.05],
            imageCount: 15
        },
        camera_calibration_good: {
            reprojectionError: 0.8,
            quality: 'good',
            cameraMatrix: [
                [790.2, 0, 315.8],
                [0, 795.1, 235.2],
                [0, 0, 1]
            ],
            distortionCoefficients: [0.15, -0.25, 0.002, 0.001, 0.08],
            imageCount: 12
        },
        quad_calibration_excellent: {
            reprojectionError: 1.2,
            quality: 'excellent',
            homographyMatrix: [
                [0.95, 0.02, 50.5],
                [-0.01, 1.02, 30.2],
                [0.0001, 0.0002, 1]
            ],
            cornerCount: 4
        }
    };

    for (const [name, result] of Object.entries(expectedResults)) {
        const filePath = path.join(__dirname, 'test-data/expected-results', `${name}.json`);
        await fs.writeFile(filePath, JSON.stringify(result, null, 2));
    }

    console.log('📊 Created expected test results');
}

// Run setup if called directly
if (require.main === module) {
    setupTestEnvironment();
}

module.exports = { setupTestEnvironment };