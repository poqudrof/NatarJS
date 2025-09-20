/**
 * Firebase configuration for calibration system
 * Using the existing Firebase project from the main QR pose estimation project
 */

// Firebase configuration using existing project settings
export const firebaseConfig = {
    apiKey: "AIzaSyCfZZGkjx2glAfkEjw83R-s4oMqj9nGC1Q",
    authDomain: "natariojs.firebaseapp.com",
    projectId: "natariojs",
    storageBucket: "natariojs.appspot.com",
    messagingSenderId: "132797644857",
    appId: "1:132797644857:web:ed3dae98c752c0fba44de8",
    measurementId: "G-EZ2PFGK8QD"
};

// Validation function to check if config is properly set
export function validateFirebaseConfig() {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];

    for (const field of requiredFields) {
        if (!firebaseConfig[field] || firebaseConfig[field].includes('your-') || firebaseConfig[field].includes('123456789')) {
            return {
                isValid: false,
                error: `Firebase configuration incomplete. Please set ${field} in config/firebase.config.js`
            };
        }
    }

    return { isValid: true };
}

// Development/testing configuration
export const testConfig = {
    // For testing with Firebase emulator
    useEmulator: process.env.NODE_ENV === 'development',
    emulatorHost: 'localhost',
    emulatorPort: 8080
};