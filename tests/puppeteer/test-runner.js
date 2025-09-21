/**
 * Test runner for taking screenshots of both calibration apps
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AppScreenshotTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.screenshotsDir = path.join(__dirname, '../../screenshots');
    this.cameraAppProcess = null;
    this.wizardAppProcess = null;
  }

  async setup() {
    // Create screenshots directory
    try {
      await fs.access(this.screenshotsDir);
    } catch {
      await fs.mkdir(this.screenshotsDir, { recursive: true });
    }

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();

    // Kill any running processes
    if (this.cameraAppProcess) {
      this.cameraAppProcess.kill();
    }
    if (this.wizardAppProcess) {
      this.wizardAppProcess.kill();
    }
  }

  async startApp(appType) {
    return new Promise((resolve, reject) => {
      const command = appType === 'camera' ? 'npm run camera-app' : 'npm run wizard-app';
      const process = spawn('npm', ['run', appType === 'camera' ? 'camera-app' : 'wizard-app'], {
        stdio: 'pipe',
        shell: true
      });

      if (appType === 'camera') {
        this.cameraAppProcess = process;
      } else {
        this.wizardAppProcess = process;
      }

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running at http://localhost:1234')) {
          console.log(`✅ ${appType} app started successfully`);
          setTimeout(resolve, 2000); // Give it 2 seconds to fully load
        }
      });

      process.stderr.on('data', (data) => {
        console.log(`${appType} app stderr:`, data.toString());
      });

      process.on('error', (error) => {
        console.error(`Failed to start ${appType} app:`, error);
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!output.includes('Server running')) {
          reject(new Error(`${appType} app failed to start within 30 seconds`));
        }
      }, 30000);
    });
  }

  async takeScreenshots(appType, url = 'http://localhost:1234') {
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    try {
      console.log(`📸 Taking screenshots of ${appType} app...`);

      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      if (appType === 'camera') {
        // Wait for camera app demo message
        await this.page.waitForSelector('#auth-section', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Full page screenshot
        await this.page.screenshot({
          path: path.join(this.screenshotsDir, 'camera-calibration-app-full.png'),
          fullPage: true
        });

        // Viewport screenshot
        await this.page.screenshot({
          path: path.join(this.screenshotsDir, 'camera-calibration-app.png'),
          fullPage: false
        });

        // Try to click a button and capture interaction
        try {
          const buttons = await this.page.$$('button');
          if (buttons.length > 0) {
            await buttons[0].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.screenshot({
              path: path.join(this.screenshotsDir, 'camera-app-interaction.png'),
              fullPage: false
            });
          }
        } catch (e) {
          console.log('Could not capture interaction screenshot:', e.message);
        }

      } else if (appType === 'wizard') {
        // Wait for wizard app to load
        await this.page.waitForSelector('#app', { timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Full page screenshot
        await this.page.screenshot({
          path: path.join(this.screenshotsDir, 'calibration-wizard-app-full.png'),
          fullPage: true
        });

        // Viewport screenshot
        await this.page.screenshot({
          path: path.join(this.screenshotsDir, 'calibration-wizard-app.png'),
          fullPage: false
        });

        // Take screenshot of settings modal
        try {
          const settingsBtn = await this.page.$('#settings-btn');
          if (settingsBtn) {
            await settingsBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.screenshot({
              path: path.join(this.screenshotsDir, 'wizard-settings-modal.png'),
              fullPage: false
            });

            // Close modal and open about
            const closeBtn = await this.page.$('#settings-modal-close');
            if (closeBtn) await closeBtn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          const aboutBtn = await this.page.$('#about-btn');
          if (aboutBtn) {
            await aboutBtn.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.screenshot({
              path: path.join(this.screenshotsDir, 'wizard-about-modal.png'),
              fullPage: false
            });
          }
        } catch (e) {
          console.log('Could not capture modal screenshots:', e.message);
        }
      }

      console.log(`✅ Screenshots saved for ${appType} app`);

    } catch (error) {
      console.error(`❌ Failed to take screenshots for ${appType} app:`, error);
      throw error;
    } finally {
      await this.page.close();
      this.page = null;
    }
  }

  async runTests() {
    try {
      await this.setup();

      console.log('🚀 Starting camera calibration app...');
      await this.startApp('camera');
      await this.takeScreenshots('camera');

      // Kill camera app
      if (this.cameraAppProcess) {
        this.cameraAppProcess.kill();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('🚀 Starting calibration wizard app...');
      await this.startApp('wizard');
      await this.takeScreenshots('wizard');

      console.log('🎉 All screenshots completed successfully!');
      console.log(`📁 Screenshots saved to: ${this.screenshotsDir}`);

    } catch (error) {
      console.error('❌ Test run failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new AppScreenshotTester();
  tester.runTests().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default AppScreenshotTester;