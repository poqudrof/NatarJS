# Client Application Requirements

This document outlines the requirements and implementation steps for the runtime client application that loads and uses saved camera and projector configurations.

## Overview

The client application is the final runtime component that uses configurations created by the setup wizards to operate a live camera-projector system. It provides a simple interface to start/stop the system and monitor its status.

## Architecture

### Application Flow
1. **Authentication** - User signs in to access their configurations
2. **Configuration Loading** - Load saved camera and projector configurations
3. **Hardware Initialization** - Set up camera and projector with saved settings
4. **Runtime Operation** - Live camera-projector operation with calibration
5. **Monitoring** - Real-time status and performance monitoring

### Data Sources
- **Camera Configurations** - From camera setup wizard (`camera.setupType !== 'projector'`)
- **Projector Configurations** - From projector setup wizard (`camera.setupType === 'projector'`)
- **Calibration Data** - Camera intrinsics, distortion coefficients, homography matrices

## Current Implementation Status

### ✅ Completed Features
- Basic authentication with Google Sign-In
- Configuration loading from Firebase storage
- Configuration filtering (camera vs projector)
- Configuration selection interface
- Status monitoring framework
- Error handling and display

### 🚧 Placeholder Implementations
The following features have UI placeholders but need actual implementation:

#### Camera Integration
- **Initialize Camera Stream**
  - Use saved camera deviceId and resolution
  - Apply camera settings from configuration
  - Handle camera permission requests
  - Implement fallback for missing devices

- **Apply Camera Calibration**
  - Load camera matrix and distortion coefficients
  - Apply undistortion to video stream
  - Implement real-time calibration validation

#### Projector Integration
- **Initialize Projector Window**
  - Use saved display configuration
  - Position window on correct screen
  - Apply resolution and fullscreen settings
  - Handle multiple display scenarios

- **Pattern Projection**
  - Project calibration patterns
  - Synchronize with camera input
  - Handle pattern switching and timing

#### Calibration Pipeline
- **Camera-Projector Alignment**
  - Load saved homography matrix
  - Apply perspective correction
  - Validate alignment accuracy
  - Handle alignment drift compensation

## Implementation Steps

### Phase 1: Camera Integration

#### Step 1.1: Camera Manager Integration
- Import existing CameraManager from setup system
- Implement camera initialization with saved configuration
- Add camera stream status monitoring
- Handle camera errors and device changes

#### Step 1.2: Camera Calibration
- Import calibration utilities from setup system
- Apply saved camera matrix and distortion coefficients
- Implement real-time undistortion pipeline
- Add calibration quality monitoring

#### Step 1.3: Video Stream Processing
- Set up video element for camera display
- Implement frame processing pipeline
- Add performance monitoring (FPS, latency)
- Handle stream interruptions

### Phase 2: Projector Integration

#### Step 2.1: Projector Window Management
- Import WindowManager from projector setup
- Implement projector window initialization with saved settings
- Add window positioning and fullscreen control
- Handle display configuration changes

#### Step 2.2: Pattern Projection System
- Import pattern generation from projector setup
- Implement pattern display pipeline
- Add pattern synchronization with camera
- Handle projection errors and recovery

#### Step 2.3: Display Calibration
- Load saved projector calibration data
- Apply display correction matrices
- Implement real-time calibration validation
- Add calibration drift detection

### Phase 3: Unified Operation

#### Step 3.1: Camera-Projector Synchronization
- Implement synchronized start/stop procedures
- Add timing coordination between components
- Handle synchronization errors
- Implement recovery mechanisms

#### Step 3.2: Real-time Calibration
- Implement live camera-projector alignment
- Add automatic calibration validation
- Handle calibration drift compensation
- Implement recalibration triggers

#### Step 3.3: Performance Optimization
- Optimize video processing pipeline
- Minimize projection latency
- Implement adaptive quality control
- Add performance profiling

### Phase 4: Advanced Features

#### Step 4.1: Multiple Configurations
- Support switching between configuration sets
- Implement configuration validation
- Add configuration comparison tools
- Handle configuration conflicts

#### Step 4.2: Runtime Adjustments
- Add live parameter tuning
- Implement calibration fine-tuning
- Add manual override controls
- Save runtime adjustments back to configuration

#### Step 4.3: Monitoring and Diagnostics
- Implement comprehensive system monitoring
- Add diagnostic tools and reports
- Implement automated health checks
- Add performance analytics

## Technical Requirements

### Core Dependencies
- **Camera Access**: MediaDevices API, existing CameraManager
- **Projector Control**: Window management, existing WindowManager
- **Calibration**: OpenCV.js for computer vision operations
- **Storage**: Firebase SDK for configuration management
- **UI Framework**: Native DOM manipulation (current approach)

### Data Flow
```
Firebase Storage → Configuration Loading → Hardware Initialization → Runtime Operation
```

### Error Handling
- Configuration loading failures
- Camera device access issues
- Projector display problems
- Calibration validation errors
- Network connectivity issues

### Performance Targets
- **Camera Stream**: 30 FPS minimum, 60 FPS target
- **Projection Latency**: <50ms camera to projector delay
- **Calibration Accuracy**: <2 pixel alignment error
- **Startup Time**: <10 seconds from launch to operational

## Integration Points

### With Setup Wizards
- Load configurations saved by camera-setup and projector-setup
- Use same Firebase authentication and storage
- Import calibration data and validation results
- Maintain configuration version compatibility

### With Existing Codebase
- Reuse CameraManager from src/setup/
- Reuse WindowManager from src/projector/
- Reuse SetupStorage from src/storage/
- Import calibration utilities from src/calibration/

## Testing Strategy

### Unit Testing
- Configuration loading and parsing
- Camera initialization procedures
- Projector window management
- Calibration data application

### Integration Testing
- End-to-end camera-projector setup
- Configuration switching scenarios
- Error recovery procedures
- Performance under load

### User Testing
- Setup wizard to client app workflow
- Multiple configuration management
- Real-world calibration scenarios
- Long-running stability tests

## Deployment Considerations

### Browser Compatibility
- Chrome/Chromium recommended (best WebRTC support)
- Firefox support for camera access
- Safari compatibility for basic features
- Mobile browser considerations

### Hardware Requirements
- Minimum 720p camera (1080p recommended)
- Secondary display or projector
- Adequate processing power for real-time video
- Stable network connection for configuration sync

### Security Considerations
- Secure camera and screen access permissions
- Firebase security rules for configuration data
- User data privacy compliance
- Secure credential management

This client application represents the culmination of the setup system, providing a production-ready interface for operating camera-projector systems with saved configurations.