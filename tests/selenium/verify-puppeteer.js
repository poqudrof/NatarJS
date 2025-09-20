/**
 * Simple verification script to test Puppeteer setup
 */

// Set up test config first
global.testConfig = {
    browser: {
        headless: true,
        windowSize: { width: 1920, height: 1080 }
    },
    timeouts: {
        elementWait: 10000
    }
};

const TestUtils = require('./utils/TestUtils');

async function verifyPuppeteerSetup() {
    let testUtils;

    try {
        console.log('🧪 Testing Puppeteer setup...');

        testUtils = new TestUtils();
        await testUtils.initializeDriver();

        console.log('✅ Browser launched successfully');

        // Navigate to a simple page
        await testUtils.page.goto('https://example.com');
        await testUtils.page.waitForSelector('h1');

        const title = await testUtils.page.title();
        console.log('✅ Page navigation successful:', title);

        // Test screenshot functionality
        await testUtils.takeScreenshot('puppeteer-verification');
        console.log('✅ Screenshot functionality works');

        console.log('🎉 Puppeteer setup verified successfully!');

    } catch (error) {
        console.error('❌ Puppeteer setup verification failed:', error.message);
        process.exit(1);
    } finally {
        if (testUtils) {
            await testUtils.cleanup();
        }
    }
}

// Run verification if this file is executed directly
if (require.main === module) {
    verifyPuppeteerSetup().then(() => {
        console.log('Verification complete');
        process.exit(0);
    }).catch(error => {
        console.error('Verification failed:', error);
        process.exit(1);
    });
}

module.exports = verifyPuppeteerSetup;