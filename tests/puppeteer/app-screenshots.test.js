/**
 * Puppeteer tests for taking screenshots of calibration apps
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Calibration Apps Screenshots', () => {
  let browser;
  let page;
  const screenshotsDir = path.join(__dirname, '../../screenshots');

  beforeAll(async () => {
    // Create screenshots directory if it doesn't exist
    try {
      await fs.access(screenshotsDir);
    } catch {
      await fs.mkdir(screenshotsDir, { recursive: true });
    }

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Camera Calibration App Screenshot', async () => {
    // Build the app first
    await page.goto('http://localhost:1234', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for the demo message to appear
    await page.waitForSelector('#auth-section', { timeout: 10000 });

    // Wait a bit for the demo message to be inserted
    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'camera-calibration-app.png'),
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'camera-calibration-app-viewport.png'),
      fullPage: false
    });

    console.log('✅ Camera calibration app screenshots saved');
  }, 60000);

  test('Calibration Wizard App Screenshot', async () => {
    // Navigate to wizard app
    await page.goto('http://localhost:1234', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for loading screen to disappear and app to show
    await page.waitForSelector('#app', { timeout: 15000 });

    // Wait for the demo content to load
    await page.waitForTimeout(3000);

    // Take full page screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'calibration-wizard-app.png'),
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'calibration-wizard-app-viewport.png'),
      fullPage: false
    });

    console.log('✅ Calibration wizard app screenshots saved');
  }, 60000);

  test('Camera App - Settings Modal', async () => {
    await page.goto('http://localhost:1234', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('#auth-section', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Click a button to show the demo alert
    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(1000);

      // Take screenshot with alert
      await page.screenshot({
        path: path.join(screenshotsDir, 'camera-app-demo-interaction.png'),
        fullPage: false
      });
    }

    console.log('✅ Camera app interaction screenshot saved');
  }, 60000);

  test('Wizard App - Settings Modal', async () => {
    await page.goto('http://localhost:1234', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('#app', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Click settings button
    const settingsBtn = await page.$('#settings-btn');
    if (settingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(1000);

      // Take screenshot of settings modal
      await page.screenshot({
        path: path.join(screenshotsDir, 'wizard-app-settings-modal.png'),
        fullPage: false
      });
    }

    console.log('✅ Wizard app settings modal screenshot saved');
  }, 60000);

  test('Wizard App - About Modal', async () => {
    await page.goto('http://localhost:1234', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('#app', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Click about button
    const aboutBtn = await page.$('#about-btn');
    if (aboutBtn) {
      await aboutBtn.click();
      await page.waitForTimeout(1000);

      // Take screenshot of about modal
      await page.screenshot({
        path: path.join(screenshotsDir, 'wizard-app-about-modal.png'),
        fullPage: false
      });
    }

    console.log('✅ Wizard app about modal screenshot saved');
  }, 60000);
});