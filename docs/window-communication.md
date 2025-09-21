# Window Communication System

This document explains how the projector system communicates between the control center and display windows for pattern testing and calibration.

## Architecture Overview

The system uses a **dual-window architecture** where different windows have specific responsibilities:

1. **Projector Control Center** (`projector-client.html`) - Main interface with authentication, configuration management, and pattern controls
2. **Projector Display Window** (`projector-display.html`) - Dedicated fullscreen pattern display
3. **Setup Wizard** (`projector-setup-demo.html`) - Initial configuration and testing

## Communication Patterns

### 1. Window.postMessage() API

The primary communication method uses the [Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) API for cross-window messaging.

#### Advantages:
- ✅ Works across domains
- ✅ Secure with origin validation
- ✅ Native browser support
- ✅ Real-time communication
- ✅ No server required

#### Message Flow:
```
Projector Control Center  ←──→  Projector Display Window
      (Controller)                (Display Target)
```

### 2. Message Types

#### From Control Center → Display Window

| Message Type | Purpose | Data Structure |
|-------------|---------|----------------|
| `init` | Initialize connection | `{ type: 'init' }` |
| `display-pattern` | Show calibration pattern | `{ type: 'display-pattern', pattern: PatternData }` |
| `clear-pattern` | Clear current pattern | `{ type: 'clear-pattern' }` |
| `toggle-fullscreen` | Enter/exit fullscreen | `{ type: 'toggle-fullscreen' }` |

#### From Display Window → Control Center

| Message Type | Purpose | Data Structure |
|-------------|---------|----------------|
| `ready` | Confirm display window loaded | `{ type: 'ready', data: { resolution: object } }` |
| `pattern-displayed` | Confirm pattern shown | `{ type: 'pattern-displayed', data: { success: boolean, pattern: string } }` |
| `pattern-cleared` | Confirm pattern cleared | `{ type: 'pattern-cleared' }` |
| `fullscreen-changed` | Fullscreen state changed | `{ type: 'fullscreen-changed', data: { fullscreen: boolean } }` |
| `window-closed` | Display window closed | `{ type: 'window-closed' }` |
| `error` | Report errors | `{ type: 'error', data: { message: string } }` |

### 3. Pattern Data Structure

```typescript
interface PatternData {
  type: 'solid-color' | 'grid' | 'checkerboard' | 'circles' | 'lines' | 'crosshair' | 'gradient';
  name?: string;           // Display name for the pattern
  color?: string;          // For solid color patterns (hex format)
  options?: {              // Pattern-specific options
    gridSize?: number;
    squareSize?: number;
    radius?: number;
    spacing?: number;
    lineWidth?: number;
  };
}
```

## Implementation Details

### Projector Control Center

```javascript
// Opening projector display window
const projectorWindow = window.open(
  'projector-display.html',
  'projector_display',
  'width=1920,height=1080,left=1920,top=0'
);

// Sending pattern
function displayColor(color) {
  const patternData = {
    type: 'solid-color',
    color: color,
    name: color.charAt(0).toUpperCase() + color.slice(1)
  };

  projectorWindow.postMessage({
    type: 'display-pattern',
    pattern: patternData
  }, '*');
}

// Listening for responses
window.addEventListener('message', (event) => {
  if (event.source === projectorWindow) {
    const { type, data } = event.data;
    switch(type) {
      case 'ready':
        console.log('Projector display ready');
        break;
      case 'pattern-displayed':
        console.log('Pattern displayed:', data.pattern);
        break;
    }
  }
});
```

### Projector Display Window

```javascript
// Listening for commands
window.addEventListener('message', (event) => {
  handleIncomingMessage(event.data, event.source);
});

// Processing pattern display
function handleIncomingMessage(data, source) {
  switch(data.type) {
    case 'display-pattern':
      displayPattern(data.pattern);
      // Send confirmation
      source.postMessage({
        type: 'pattern-displayed',
        success: true,
        pattern: data.pattern.type
      }, '*');
      break;
  }
}
```

## Security Considerations

### Origin Validation
```javascript
window.addEventListener('message', (event) => {
  // Validate origin in production
  if (event.origin !== window.location.origin) {
    console.warn('Message from untrusted origin:', event.origin);
    return;
  }
  handleMessage(event.data);
});
```

### Message Validation
```javascript
function validateMessage(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.type || typeof data.type !== 'string') return false;
  return true;
}
```

## Error Handling

### Connection Monitoring
```javascript
function checkConnection() {
  if (projectorWindow.closed) {
    console.error('Projector window was closed');
    updateConnectionStatus('disconnected');
    return;
  }

  // Send ping
  projectorWindow.postMessage({ type: 'ping', timestamp: Date.now() }, '*');

  // Set timeout for pong response
  setTimeout(() => {
    if (!receivedPong) {
      console.warn('Projector window not responding');
      updateConnectionStatus('unresponsive');
    }
  }, 5000);
}
```

### Graceful Degradation
```javascript
function displayPattern(patternData) {
  try {
    if (projectorWindow && !projectorWindow.closed) {
      // Send to projector window
      projectorWindow.postMessage({
        type: 'display-pattern',
        pattern: patternData
      }, '*');
    } else {
      // Fallback: display in current window
      displayPatternLocally(patternData);
    }
  } catch (error) {
    console.error('Pattern display failed:', error);
    showErrorMessage('Failed to display pattern');
  }
}
```

## Configuration Storage Integration

### Firebase Authentication Flow
```javascript
// Shared authentication state
setupStorage.setCallbacks({
  onAuthChanged: (user) => {
    // Notify all windows of auth change
    if (projectorWindow) {
      projectorWindow.postMessage({
        type: 'auth-changed',
        user: user ? {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email
        } : null
      }, '*');
    }
  }
});
```

### Configuration Synchronization
```javascript
// Load configuration in projector client
async function loadProjectorConfig() {
  if (setupStorage.isSignedIn()) {
    const configs = await setupStorage.loadUserConfigurations();
    const projectorConfigs = configs.filter(c => c.type === 'projector');

    if (projectorConfigs.length > 0) {
      applyConfiguration(projectorConfigs[0]);
    }
  }
}
```

## Performance Optimization

### Message Throttling
```javascript
let lastMessageTime = 0;
const MESSAGE_THROTTLE = 100; // ms

function sendThrottledMessage(message) {
  const now = Date.now();
  if (now - lastMessageTime < MESSAGE_THROTTLE) {
    return; // Skip message
  }

  projectorWindow.postMessage(message, '*');
  lastMessageTime = now;
}
```

### Pattern Caching
```javascript
const patternCache = new Map();

function getOrGeneratePattern(patternType) {
  if (patternCache.has(patternType)) {
    return patternCache.get(patternType);
  }

  const pattern = generatePattern(patternType);
  patternCache.set(patternType, pattern);
  return pattern;
}
```

## Testing & Debugging

### Message Logging
```javascript
function logMessage(direction, message, source) {
  console.log(`${direction} [${new Date().toISOString()}]`, {
    type: message.type,
    source: source === projectorWindow ? 'projector' : 'unknown',
    data: message
  });
}

// Enable in development
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('message', (event) => {
    logMessage('RECEIVED', event.data, event.source);
  });
}
```

### Connection Diagnostics
```javascript
function runConnectionDiagnostics() {
  const diagnostics = {
    windowOpen: projectorWindow && !projectorWindow.closed,
    windowLoaded: false,
    responseTime: null,
    lastMessage: null
  };

  // Test ping/pong
  const startTime = performance.now();
  projectorWindow.postMessage({ type: 'ping' }, '*');

  const timeout = setTimeout(() => {
    diagnostics.responseTime = 'timeout';
    console.log('Diagnostics:', diagnostics);
  }, 5000);

  const pongHandler = (event) => {
    if (event.data.type === 'pong') {
      clearTimeout(timeout);
      diagnostics.responseTime = performance.now() - startTime;
      diagnostics.windowLoaded = true;
      console.log('Diagnostics:', diagnostics);
      window.removeEventListener('message', pongHandler);
    }
  };

  window.addEventListener('message', pongHandler);
}
```

## Usage Examples

### Basic Pattern Display
```javascript
// In main setup window
const patternData = {
  type: 'checkerboard',
  dataURL: generateCheckerboardDataURL(8, 8, 60)
};

projectorWindow.postMessage({
  type: 'display-pattern',
  pattern: patternData
}, '*');
```

### Fullscreen Control
```javascript
// Toggle fullscreen on projector
projectorWindow.postMessage({
  type: 'toggle-fullscreen'
}, '*');

// Listen for fullscreen change confirmation
window.addEventListener('message', (event) => {
  if (event.data.type === 'fullscreen-changed') {
    console.log('Fullscreen:', event.data.fullscreen);
  }
});
```

### Error Recovery
```javascript
function handleProjectorError(error) {
  console.error('Projector error:', error);

  // Attempt to reconnect
  if (projectorWindow.closed) {
    projectorWindow = window.open('projector-client.html', 'projector_window');

    // Wait for ready signal
    const readyHandler = (event) => {
      if (event.data.type === 'client-ready') {
        console.log('Projector reconnected');
        window.removeEventListener('message', readyHandler);
      }
    };
    window.addEventListener('message', readyHandler);
  }
}
```

## Future Enhancements

1. **WebSocket Support** - For remote control from different devices
2. **Message Encryption** - For sensitive calibration data
3. **Offline Mode** - Local storage fallback when cloud is unavailable
4. **Multi-Projector** - Support for multiple projector clients
5. **Voice Commands** - Audio-based pattern control
6. **QR Code Sync** - Quick pairing between devices

## Troubleshooting

### Common Issues

1. **Popup Blocked**
   - Enable popups for the domain
   - Check browser settings

2. **Messages Not Received**
   - Verify window reference is valid
   - Check if window is closed
   - Validate message origin

3. **Pattern Not Displaying**
   - Check pattern data format
   - Verify canvas/image rendering
   - Monitor console for errors

4. **Performance Issues**
   - Implement message throttling
   - Use pattern caching
   - Optimize canvas rendering

This communication system provides a robust, secure, and flexible foundation for multi-window projector calibration applications.