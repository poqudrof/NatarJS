# QR Code Pose Estimation - Features

## Core Features

### 1. Real-time QR Code and ArUco Marker Detection
- **QR Code Detection**: Uses `jsQR` library for real-time QR code detection from webcam feed
- **ArUco Marker Detection**: Integrated ArUco marker detection using OpenCV.js for more robust tracking
- **Multi-marker Support**: Can detect and track multiple markers simultaneously
- **Real-time Processing**: Processes video feed at 30+ FPS for smooth tracking

### 2. 3D Pose Estimation
- **Perspective-n-Point (PnP) Algorithm**: Uses OpenCV's `solvePnP` for accurate 3D pose estimation
- **Camera Calibration**: Configurable camera parameters (focal length, optical center)
- **Multiple Marker Pose Estimation**: Combines multiple markers for improved accuracy using `estimatePose3DFromMultipleMarkers`
- **3D Transformation Matrix**: Generates 4x4 transformation matrices for precise 3D positioning

### 3. Advanced Filtering and Smoothing
- **One Euro Filter**: Implements professional-grade filtering for smooth pose tracking
  - Configurable parameters (frequency, min cutoff, beta, derivative cutoff)
  - Reduces jitter while maintaining responsiveness
  - Applied to both translation and rotation components
- **Real-time Filtering**: Optional filtering can be toggled on/off during runtime

### 4. Camera and Hardware Integration
- **Multi-camera Support**: Can enumerate and select from multiple connected cameras
- **Resolution Selection**: Supports multiple resolutions (640x480, 1280x720, 1920x1080)
- **Camera Configuration**: Save/load camera settings and configurations
- **Focal Length Adjustment**: Real-time focal length adjustment via slider interface

### 5. Calibration System
- **Projector Calibration**: Dedicated calibration interface (`calib.html`) with:
  - Cyclic circle grid generation for projector calibration
  - Adjustable frequency patterns for temporal calibration
  - Circle size and spacing controls
  - FPS selection (30/60 FPS)
- **Camera-Projector Calibration**: Tools for calibrating camera-projector systems

### 6. Visualization and Rendering
- **3D Coordinate Axes**: Real-time rendering of X, Y, Z axes overlaid on detected markers
- **CSS 3D Transforms**: Applies real-time 3D transformations to HTML elements
- **Perspective Warping**: Advanced perspective transformation calculations
- **Debug Visualization**: Multiple canvas overlays for debugging pose estimation

### 7. Data Management and Export
- **Configuration Persistence**: Save and load camera and calibration settings
- **Pose Data Export**: Save 3D pose data for offline analysis
- **JSON-based Configuration**: Human-readable configuration files
- **Real-time Data Display**: Live feedback of pose estimation parameters

### 8. User Authentication and Cloud Integration
- **Firebase Integration**: Complete Firebase setup for user authentication
- **Google Sign-in**: OAuth integration for user management
- **Cloud Storage**: Firestore integration for storing user configurations and data
- **Cross-device Sync**: Synchronize settings across multiple devices

### 9. Frequency Analysis Tools
- **FFT Analysis**: Dedicated frequency analysis tools (`fft.html`) for:
  - Video capture and frame rate analysis
  - Temporal frequency analysis of visual patterns
  - Real-time FPS monitoring and statistics

### 10. Marker Management System
- **Marker Database**: JSON-based marker configuration system
- **Link Management**: Associate URLs and data with specific marker IDs
- **CRUD Interface**: Web-based interface for managing marker-URL associations
- **PDF Generation**: Generate printable PDF documents with marker configurations

### 11. Point Projection and Geometry
- **Ray-Plane Intersection**: Advanced geometric calculations for projecting 2D points to 3D planes
- **Homography Calculations**: 2D to 2D perspective transformations
- **Coordinate System Conversion**: Seamless conversion between camera and marker coordinate systems

### 12. Development and Build Tools
- **Parcel Integration**: Modern build system with hot-reload
- **ES6 Modules**: Modular architecture with proper import/export structure
- **JSON Server**: Mock API server for development and testing
- **Multi-page Application**: Support for multiple specialized interfaces

## Technical Architecture

### Core Libraries and Dependencies
- **OpenCV.js**: Computer vision and pose estimation
- **jsQR**: QR code detection
- **Firebase**: Authentication and cloud storage
- **JIMP**: Image processing
- **Parcel**: Build system and development server

### File Structure
- `src/`: Core application source code
  - `camera.js`: Camera management and configuration
  - `poseEstimation.js`: 3D pose estimation algorithms
  - `drawing.js`: Visualization and rendering utilities
  - `oneEuroFilter.js`: Advanced filtering algorithms
  - `firebase.js`: Cloud integration and authentication
- Multiple HTML interfaces for different use cases
- Modular JavaScript architecture with ES6 imports/exports

## Performance Features
- **Real-time Processing**: Optimized for 30+ FPS tracking
- **Memory Management**: Proper OpenCV matrix cleanup to prevent memory leaks
- **Configurable Quality**: Adjustable processing parameters for different performance requirements
- **Background Processing**: Support for non-blocking operations

## Future Enhancement Areas
- Enhanced multi-marker tracking algorithms
- Machine learning integration for improved detection
- WebXR/AR integration
- Advanced analytics and reporting
- Mobile device optimization