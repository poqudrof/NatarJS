/**
 * WindowManager - Enhanced projector window management
 * Handles projector window creation, positioning, and fullscreen management
 */

export class WindowManager {
    constructor() {
        this.projectorWindow = null;
        this.isFullscreen = false;
        this.currentPattern = null;
        this.windowFeatures = null;
        this.displays = [];
        this.selectedDisplay = null;
        this.eventListeners = new Map();
    }

    /**
     * Initialize window manager and detect displays
     */
    async initialize() {
        try {
            // Detect available displays
            await this._detectDisplays();

            // Set up event listeners
            this._setupEventListeners();

            return {
                success: true,
                displays: this.displays,
                message: `Detected ${this.displays.length} display(s)`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to initialize window manager'
            };
        }
    }

    /**
     * Open projector window with user-friendly options
     */
    async openProjectorWindow(options = {}) {
        const defaultOptions = {
            display: this.selectedDisplay || 1,
            width: 1920,
            height: 1080,
            title: 'Projector Calibration',
            backgroundColor: '#1a1a1a',
            showInstructions: true,
            autoFullscreen: false
        };

        const windowOptions = { ...defaultOptions, ...options };

        try {
            // Close existing window if open
            if (this.projectorWindow && !this.projectorWindow.closed) {
                this.projectorWindow.close();
            }

            // Calculate window features
            this.windowFeatures = this._calculateWindowFeatures(windowOptions);

            // Generate projector HTML content
            const htmlContent = this._generateProjectorHTML(windowOptions);

            // Open the window
            this.projectorWindow = window.open(
                '',
                'projector_window',
                this.windowFeatures
            );

            if (!this.projectorWindow) {
                throw new Error('Failed to open projector window. Please allow pop-ups for this site.');
            }

            // Write content to window
            this.projectorWindow.document.open();
            this.projectorWindow.document.write(htmlContent);
            this.projectorWindow.document.close();

            // Setup window event handlers
            this._setupWindowEventHandlers();

            // Auto-detect resolution after window loads
            setTimeout(() => {
                this._detectWindowResolution();
            }, 500);

            // Auto-fullscreen if requested
            if (windowOptions.autoFullscreen) {
                setTimeout(() => {
                    this.enterFullscreen();
                }, 1000);
            }

            return {
                success: true,
                window: this.projectorWindow,
                features: this.windowFeatures,
                message: 'Projector window opened successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to open projector window',
                troubleshooting: [
                    'Enable pop-ups for this website',
                    'Try using a different browser',
                    'Check if another projector window is already open'
                ]
            };
        }
    }

    /**
     * Enter fullscreen mode
     */
    async enterFullscreen() {
        if (!this.projectorWindow || this.projectorWindow.closed) {
            return { success: false, message: 'No projector window is open' };
        }

        try {
            // Try different fullscreen methods
            const docElement = this.projectorWindow.document.documentElement;

            if (docElement.requestFullscreen) {
                await docElement.requestFullscreen();
            } else if (docElement.webkitRequestFullscreen) {
                await docElement.webkitRequestFullscreen();
            } else if (docElement.msRequestFullscreen) {
                await docElement.msRequestFullscreen();
            } else if (docElement.mozRequestFullScreen) {
                await docElement.mozRequestFullScreen();
            } else {
                // Fallback: maximize window
                this.projectorWindow.moveTo(0, 0);
                this.projectorWindow.resizeTo(screen.width, screen.height);
            }

            this.isFullscreen = true;
            this._notifyFullscreenChange(true);

            return {
                success: true,
                message: 'Entered fullscreen mode'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to enter fullscreen',
                instructions: 'Press F11 manually or click the fullscreen button in the projector window'
            };
        }
    }

    /**
     * Exit fullscreen mode
     */
    async exitFullscreen() {
        if (!this.projectorWindow || this.projectorWindow.closed) {
            return { success: false, message: 'No projector window is open' };
        }

        try {
            const doc = this.projectorWindow.document;

            if (doc.exitFullscreen) {
                await doc.exitFullscreen();
            } else if (doc.webkitExitFullscreen) {
                await doc.webkitExitFullscreen();
            } else if (doc.msExitFullscreen) {
                await doc.msExitFullscreen();
            } else if (doc.mozCancelFullScreen) {
                await doc.mozCancelFullScreen();
            }

            this.isFullscreen = false;
            this._notifyFullscreenChange(false);

            return {
                success: true,
                message: 'Exited fullscreen mode'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to exit fullscreen'
            };
        }
    }

    /**
     * Display pattern in projector window
     */
    displayPattern(patternData) {
        if (!this.projectorWindow || this.projectorWindow.closed) {
            return {
                success: false,
                message: 'Projector window is not open'
            };
        }

        try {
            const patternContainer = this.projectorWindow.document.getElementById('pattern-container');
            const patternImage = this.projectorWindow.document.getElementById('pattern-image');

            if (patternContainer && patternImage) {
                patternImage.src = patternData.dataURL;
                patternContainer.style.display = 'flex';

                // Update pattern info
                const patternInfo = this.projectorWindow.document.getElementById('pattern-info');
                if (patternInfo) {
                    patternInfo.textContent = `Pattern: ${patternData.type}`;
                }

                this.currentPattern = patternData;

                return {
                    success: true,
                    pattern: patternData.type,
                    message: `Displaying ${patternData.type} pattern`
                };
            } else {
                throw new Error('Pattern display elements not found in projector window');
            }

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to display pattern'
            };
        }
    }

    /**
     * Clear pattern from projector window
     */
    clearPattern() {
        if (!this.projectorWindow || this.projectorWindow.closed) {
            return { success: false, message: 'Projector window is not open' };
        }

        try {
            const patternContainer = this.projectorWindow.document.getElementById('pattern-container');
            if (patternContainer) {
                patternContainer.style.display = 'none';
            }

            this.currentPattern = null;

            return {
                success: true,
                message: 'Pattern cleared'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to clear pattern'
            };
        }
    }

    /**
     * Get current window status
     */
    getStatus() {
        const isOpen = this.projectorWindow && !this.projectorWindow.closed;

        return {
            isOpen: isOpen,
            isFullscreen: this.isFullscreen,
            currentPattern: this.currentPattern?.type || null,
            resolution: isOpen ? this._getWindowResolution() : null,
            displays: this.displays
        };
    }

    /**
     * Close projector window
     */
    closeWindow() {
        if (this.projectorWindow && !this.projectorWindow.closed) {
            this.projectorWindow.close();
            this.projectorWindow = null;
            this.isFullscreen = false;
            this.currentPattern = null;

            return {
                success: true,
                message: 'Projector window closed'
            };
        }

        return {
            success: false,
            message: 'No projector window to close'
        };
    }

    /**
     * Add event listener
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // Private methods

    async _detectDisplays() {
        this.displays = [
            {
                id: 0,
                name: 'Primary Display',
                primary: true,
                bounds: {
                    x: 0,
                    y: 0,
                    width: screen.width,
                    height: screen.height
                }
            }
        ];

        // Try to detect additional displays using Screen API
        if ('getScreenDetails' in window) {
            try {
                const screenDetails = await window.getScreenDetails();
                this.displays = screenDetails.screens.map((screen, index) => ({
                    id: index,
                    name: screen.label || `Display ${index + 1}`,
                    primary: screen.isPrimary,
                    bounds: {
                        x: screen.left,
                        y: screen.top,
                        width: screen.width,
                        height: screen.height
                    }
                }));
            } catch (error) {
                console.log('Advanced display detection not available');
            }
        }

        // Set default selected display (prefer secondary if available)
        this.selectedDisplay = this.displays.length > 1 ? 1 : 0;
    }

    _calculateWindowFeatures(options) {
        const display = this.displays[options.display] || this.displays[0];

        // Position window on selected display
        const left = display.bounds.x + (display.bounds.width - options.width) / 2;
        const top = display.bounds.y + (display.bounds.height - options.height) / 2;

        return [
            `width=${options.width}`,
            `height=${options.height}`,
            `left=${left}`,
            `top=${top}`,
            'menubar=no',
            'toolbar=no',
            'location=no',
            'status=no',
            'scrollbars=no',
            'resizable=yes'
        ].join(',');
    }

    _generateProjectorHTML(options) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: ${options.backgroundColor};
            color: white;
            font-family: Arial, sans-serif;
            overflow: hidden;
            cursor: none;
            user-select: none;
        }

        #main-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
        }

        #pattern-container {
            width: 100%;
            height: 100%;
            display: none;
            justify-content: center;
            align-items: center;
            position: absolute;
            top: 0;
            left: 0;
        }

        #pattern-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        #instructions {
            text-align: center;
            padding: 20px;
            ${options.showInstructions ? '' : 'display: none;'}
        }

        #instructions h1 {
            font-size: 48px;
            margin-bottom: 30px;
            color: #ffffff;
        }

        #instructions p {
            font-size: 24px;
            margin-bottom: 15px;
            color: #cccccc;
        }

        #status-bar {
            position: absolute;
            bottom: 10px;
            left: 10px;
            font-size: 14px;
            color: #666666;
            background: rgba(0,0,0,0.7);
            padding: 5px 10px;
            border-radius: 5px;
        }

        #controls {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 10px;
        }

        .control-button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }

        .control-button:hover {
            background: rgba(255,255,255,0.3);
        }

        #resolution-info {
            position: absolute;
            top: 10px;
            left: 10px;
            font-size: 16px;
            color: #999999;
            background: rgba(0,0,0,0.7);
            padding: 10px 15px;
            border-radius: 5px;
        }

        .fullscreen-hint {
            position: absolute;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 18px;
            color: #888888;
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="main-container">
        <div id="instructions">
            <h1>🎯 Projector Calibration</h1>
            <p>This window is ready for calibration patterns</p>
            <p>Press <strong>F11</strong> for fullscreen mode</p>
            <p>Use the main window to control pattern display</p>
        </div>

        <div id="pattern-container">
            <img id="pattern-image" alt="Calibration Pattern" />
        </div>

        <div id="resolution-info">
            Resolution: <span id="resolution-display">Detecting...</span>
        </div>

        <div id="controls">
            <button class="control-button" onclick="toggleFullscreen()">⛶ Fullscreen</button>
            <button class="control-button" onclick="window.close()">✕ Close</button>
        </div>

        <div id="status-bar">
            <span id="pattern-info">Ready for calibration</span>
        </div>

        <div class="fullscreen-hint">
            💡 Tip: Use fullscreen mode for accurate calibration
        </div>
    </div>

    <script>
        // Update resolution display
        function updateResolution() {
            const resolutionDisplay = document.getElementById('resolution-display');
            resolutionDisplay.textContent = window.innerWidth + ' × ' + window.innerHeight;
        }

        // Toggle fullscreen
        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Fullscreen error:', err);
                });
            } else {
                document.exitFullscreen();
            }
        }

        // Handle fullscreen changes
        document.addEventListener('fullscreenchange', function() {
            updateResolution();
            const isFullscreen = !!document.fullscreenElement;
            window.parent.postMessage({
                type: 'fullscreen-change',
                fullscreen: isFullscreen
            }, '*');
        });

        // Handle window resize
        window.addEventListener('resize', updateResolution);

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            switch(e.key) {
                case 'F11':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'Escape':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    }
                    break;
            }
        });

        // Initial setup
        updateResolution();

        // Notify parent window that projector is ready
        window.parent.postMessage({
            type: 'projector-ready',
            resolution: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        }, '*');
    </script>
</body>
</html>`;
    }

    _setupEventListeners() {
        // Listen for messages from projector window
        window.addEventListener('message', (event) => {
            if (event.source === this.projectorWindow) {
                this._handleProjectorMessage(event.data);
            }
        });
    }

    _setupWindowEventHandlers() {
        if (!this.projectorWindow) return;

        // Handle window close
        this.projectorWindow.addEventListener('beforeunload', () => {
            this.projectorWindow = null;
            this.isFullscreen = false;
            this.currentPattern = null;
            this._notifyEvent('window-closed');
        });
    }

    _handleProjectorMessage(data) {
        switch (data.type) {
            case 'projector-ready':
                this._notifyEvent('projector-ready', data.resolution);
                break;
            case 'fullscreen-change':
                this.isFullscreen = data.fullscreen;
                this._notifyFullscreenChange(data.fullscreen);
                break;
        }
    }

    _detectWindowResolution() {
        if (this.projectorWindow && !this.projectorWindow.closed) {
            const width = this.projectorWindow.innerWidth;
            const height = this.projectorWindow.innerHeight;

            this._notifyEvent('resolution-detected', { width, height });
        }
    }

    _getWindowResolution() {
        if (this.projectorWindow && !this.projectorWindow.closed) {
            return {
                width: this.projectorWindow.innerWidth,
                height: this.projectorWindow.innerHeight
            };
        }
        return null;
    }

    _notifyEvent(eventType, data = null) {
        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventType}:`, error);
                }
            });
        }
    }

    _notifyFullscreenChange(isFullscreen) {
        this._notifyEvent('fullscreen-change', { isFullscreen });
    }
}