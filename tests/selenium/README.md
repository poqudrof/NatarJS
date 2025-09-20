# Automated Frontend Tests for Camera/Projector Calibration

This test suite provides comprehensive automated testing for the camera/projector calibration system using Selenium WebDriver and Jest.

## 🎯 Test Coverage

### Step 1: Core Infrastructure Tests
- ✅ CalibrationManager initialization and component registration
- ✅ CalibrationStorage interface and data validation
- ✅ Firebase integration and authentication flow
- ✅ Error handling and logging systems
- ✅ Data validation and integrity checks
- ✅ Performance and memory management
- ✅ Integration readiness validation

### Step 2: Camera Calibration Tests
- ✅ User-friendly authentication and setup flow
- ✅ Camera detection and quality recommendations
- ✅ Pattern detection and real-time feedback
- ✅ Image capture and progress tracking
- ✅ Calibration processing and results display
- ✅ Mobile/responsive design validation
- ✅ Firebase data persistence
- ✅ End-to-end workflow completion

## 🚀 Quick Start

### Prerequisites
```bash
# Install Node.js dependencies
npm install

# Install Chrome browser (if not already installed)
# Download ChromeDriver (handled automatically by chromedriver package)
```

### Setup Test Environment
```bash
# Run setup script to create test directories and files
npm run setup
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific step tests
npm run test:step1
npm run test:step2

# Run tests in watch mode for development
npm run test:watch

# Run tests for CI with coverage
npm run test:ci

# Debug tests with additional logging
npm run test:debug
```

## 📁 Test Structure

```
tests/selenium/
├── package.json           # Test dependencies and scripts
├── test-setup.js          # Global Jest configuration
├── setup.js              # Test environment setup script
├── utils/
│   └── TestUtils.js      # Selenium helper utilities
├── tests/
│   ├── step1.test.js     # Core infrastructure tests
│   └── step2.test.js     # Camera calibration tests
├── test-data/
│   ├── mock-images/      # Mock image data for testing
│   ├── calibration-patterns/ # Test calibration patterns
│   └── expected-results/ # Expected test outcomes
└── screenshots/          # Test failure screenshots
```

## 🛠️ Configuration

### Test Configuration (`test-setup.js`)
```javascript
global.testConfig = {
    // Test URLs
    baseUrl: 'http://localhost:8080/v1/public',
    cameraCalibrationUrl: 'http://localhost:8080/v1/public/camera-calibration.html',

    // Browser settings
    browser: {
        headless: false,        // Set to true for CI
        windowSize: { width: 1920, height: 1080 },
        implicitWait: 10000,
        pageLoadTimeout: 30000
    },

    // Feature flags
    features: {
        mockCamera: true,       // Use mock camera for consistency
        mockFirebase: false,    // Use real Firebase for integration
        enableDebugLogs: true
    }
};
```

### Browser Configuration
- **Chrome** with camera permissions enabled
- **Mock media streams** for consistent testing
- **Automatic screenshot capture** on test failures
- **Responsive design testing** with viewport simulation

## 🎭 Mock Systems

### Mock Camera
```javascript
// Provides consistent video input for testing
navigator.mediaDevices.getUserMedia = async (constraints) => {
    return mockVideoStream;
};

// Mock device enumeration
navigator.mediaDevices.enumerateDevices = async () => {
    return mockCameraDevices;
};
```

### Mock Firebase
```javascript
// Mock authentication
window.mockFirebaseAuth = {
    signInWithPopup: async () => ({ user: mockUser }),
    signOut: async () => {}
};

// Mock Firestore operations
window.mockFirestore = {
    collection: () => ({
        doc: () => ({
            set: async (data) => ({ success: true }),
            get: async () => ({ exists: true, data: () => mockData })
        })
    })
};
```

## 📊 Test Types

### Unit Tests
- Individual component functionality
- Error handling scenarios
- Data validation logic

### Integration Tests
- Component interaction
- Firebase data flow
- OpenCV.js integration

### End-to-End Tests
- Complete user workflows
- Cross-browser compatibility
- Performance validation

### UI/UX Tests
- Responsive design
- Touch interactions
- Accessibility features

## 🎯 Test Utilities

### Core TestUtils Methods
```javascript
// Browser management
await testUtils.initializeDriver()
await testUtils.navigateToPage(url)
await testUtils.cleanup()

// Element interaction
await testUtils.waitForElement(locator)
await testUtils.clickElement(locator)
await testUtils.enterText(locator, text)

// Assertions
await testUtils.assertElementVisible(locator)
await testUtils.assertElementContainsText(locator, text)
await testUtils.assertNoJavaScriptErrors()

// Mock setup
await testUtils.setupMockCamera()
await testUtils.setupMockFirebase()

// Calibration specific
await testUtils.waitForOpenCV()
await testUtils.waitForCalibrationComplete()
await testUtils.getCalibrationResults()
```

## 🚨 Error Handling

### Automatic Error Capture
- JavaScript console errors logged
- Unhandled promise rejections captured
- Network failures detected
- Screenshot on test failure

### Common Issues and Solutions

#### Pop-up Blocker
```javascript
// Browser configuration includes pop-up permissions
options.addArguments('--disable-popup-blocking');
```

#### Camera Permissions
```javascript
// Mock camera setup handles permissions automatically
options.addArguments('--use-fake-ui-for-media-stream');
```

#### OpenCV.js Loading
```javascript
// Wait for OpenCV.js to be fully loaded
await testUtils.waitForOpenCV();
```

## 📈 Performance Testing

### Metrics Tracked
- Page load times
- JavaScript execution times
- Memory usage patterns
- Frame processing rates

### Performance Thresholds
```javascript
// Page load: < 10 seconds
expect(loadTime).toBeLessThan(10000);

// Frame processing: < 50ms average
expect(avgProcessingTime).toBeLessThan(50);

// Memory usage: < 50MB delta
expect(memoryDelta).toBeLessThan(50 * 1024 * 1024);
```

## 🔄 Continuous Integration

### CI Configuration
```bash
# Headless mode for CI
export HEADLESS=true

# Run with coverage
npm run test:ci

# Generate reports
npm run coverage
```

### Test Reports
- Jest test results
- Coverage reports (HTML/LCOV)
- Performance metrics
- Screenshot artifacts

## 🎯 Best Practices

### Writing Tests
1. **Use descriptive test names** that explain the expected behavior
2. **Mock external dependencies** for consistent results
3. **Test both success and failure scenarios**
4. **Include performance and memory checks**
5. **Capture screenshots on failures** for debugging

### Test Organization
1. **Group related tests** in describe blocks
2. **Use beforeEach/afterEach** for setup/cleanup
3. **Share common utilities** in TestUtils
4. **Keep test data separate** in test-data directory

### Debugging Tests
1. **Run with debug flag** for additional logging
2. **Use screenshots** to understand failures
3. **Check browser console** for JavaScript errors
4. **Verify mock setups** are working correctly

## 🔍 Troubleshooting

### Common Issues

#### Tests failing locally but passing in CI
- Check browser versions and capabilities
- Verify test data and mock configurations
- Review timing and timeout settings

#### Chrome driver issues
```bash
# Update chromedriver
npm update chromedriver

# Check Chrome version compatibility
google-chrome --version
```

#### OpenCV.js not loading
- Verify internet connection for CDN
- Check for console errors during load
- Ensure proper wait conditions

### Debug Commands
```bash
# Run single test with debug output
npx jest --testNamePattern="should initialize CalibrationManager" --verbose

# Run with additional Selenium logging
DEBUG=selenium-webdriver npm test

# Check test coverage
npm run test:ci && open coverage/lcov-report/index.html
```

## 📚 Additional Resources

- [Selenium WebDriver Documentation](https://selenium-webdriver.js.org/)
- [Jest Testing Framework](https://jestjs.io/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [OpenCV.js Documentation](https://docs.opencv.org/4.5.0/d5/d10/tutorial_js_root.html)

## 🤝 Contributing

### Adding New Tests
1. Create test file in appropriate directory
2. Follow existing naming conventions
3. Include both positive and negative test cases
4. Add appropriate mock setups
5. Update this README with new test coverage

### Test Data Management
1. Keep test data minimal and focused
2. Use JSON for configuration data
3. Generate mock data programmatically when possible
4. Document expected test outcomes