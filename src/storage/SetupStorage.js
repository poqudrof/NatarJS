/**
 * Firebase Storage for Camera Setup Configurations
 * Handles saving, loading, and managing camera configurations in Firebase
 */

import { firebaseConfig } from '../../config/firebase.config.js';

export class SetupStorage {
    constructor() {
        this.db = null;
        this.auth = null;
        this.user = null;
        this.isInitialized = false;
        this.deviceFingerprint = null;

        this.callbacks = {
            onAuthChanged: null,
            onConfigLoaded: null,
            onError: null
        };
    }

    /**
     * Initialize Firebase and authentication
     */
    async initialize() {
        try {
            // Dynamically import Firebase modules
            const { initializeApp } = await import('firebase/app');
            const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
            const { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } = await import('firebase/auth');

            // Initialize Firebase app
            const app = initializeApp(firebaseConfig);
            this.db = getFirestore(app);
            this.auth = getAuth(app);

            // Generate device fingerprint
            this.deviceFingerprint = await this.generateDeviceFingerprint();

            // Set up auth state listener
            onAuthStateChanged(this.auth, (user) => {
                this.user = user;
                if (this.callbacks.onAuthChanged) {
                    this.callbacks.onAuthChanged(user);
                }

                // Auto-load configurations when user signs in
                if (user) {
                    this.loadUserConfigurations();
                }
            });

            this.isInitialized = true;
            return { success: true };

        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return {
                success: false,
                error: error.message,
                userMessage: 'Failed to connect to cloud storage. Configurations will be saved locally.'
            };
        }
    }

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        if (!this.isInitialized) {
            throw new Error('Firebase not initialized');
        }

        try {
            const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
            const provider = new GoogleAuthProvider();

            const result = await signInWithPopup(this.auth, provider);
            this.user = result.user;

            return {
                success: true,
                user: {
                    uid: this.user.uid,
                    displayName: this.user.displayName,
                    email: this.user.email,
                    photoURL: this.user.photoURL
                }
            };

        } catch (error) {
            console.error('Google sign-in failed:', error);

            let userMessage = 'Sign-in failed. Please try again.';
            if (error.code === 'auth/popup-closed-by-user') {
                userMessage = 'Sign-in was cancelled.';
            } else if (error.code === 'auth/popup-blocked') {
                userMessage = 'Sign-in popup was blocked. Please allow popups and try again.';
            }

            return {
                success: false,
                error: error.message,
                userMessage
            };
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        if (!this.isInitialized || !this.auth) return;

        try {
            await this.auth.signOut();
            this.user = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out failed:', error);
            return {
                success: false,
                error: error.message,
                userMessage: 'Failed to sign out.'
            };
        }
    }

    /**
     * Save camera configuration
     */
    async saveConfiguration(config) {
        if (!this.isInitialized) {
            return this.saveToLocalStorage(config);
        }

        if (!this.user) {
            throw new Error('User must be signed in to save configurations to cloud');
        }

        try {
            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

            const configData = {
                userId: this.user.uid,
                deviceFingerprint: this.deviceFingerprint,
                name: config.name,
                camera: {
                    deviceId: config.camera.deviceId,
                    label: config.camera.label,
                    resolution: config.camera.resolution,
                    settings: config.camera.settings || {}
                },
                testResults: config.testResults || null,
                created: serverTimestamp(),
                lastUsed: serverTimestamp(),
                version: '1.0'
            };

            const configId = this.generateConfigId(config.name);
            const docRef = doc(this.db, 'cameraConfigurations', configId);

            await setDoc(docRef, configData);

            // Also save to local storage as backup
            this.saveToLocalStorage(config);

            return {
                success: true,
                configId,
                message: 'Configuration saved to cloud successfully'
            };

        } catch (error) {
            console.error('Failed to save configuration to Firebase:', error);

            // Fallback to local storage
            const localResult = this.saveToLocalStorage(config);

            return {
                success: false,
                error: error.message,
                userMessage: 'Failed to save to cloud. Configuration saved locally instead.',
                fallbackResult: localResult
            };
        }
    }

    /**
     * Load all user configurations
     */
    async loadUserConfigurations() {
        if (!this.isInitialized || !this.user) {
            return this.loadFromLocalStorage();
        }

        try {
            const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');

            const q = query(
                collection(this.db, 'cameraConfigurations'),
                where('userId', '==', this.user.uid),
                orderBy('lastUsed', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const configurations = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                configurations.push({
                    id: doc.id,
                    ...data,
                    created: data.created?.toDate(),
                    lastUsed: data.lastUsed?.toDate()
                });
            });

            // Also load local configurations
            const localConfigs = this.loadFromLocalStorage();

            // Merge and deduplicate
            const allConfigs = this.mergeConfigurations(configurations, localConfigs);

            if (this.callbacks.onConfigLoaded) {
                this.callbacks.onConfigLoaded(allConfigs);
            }

            return {
                success: true,
                configurations: allConfigs,
                source: 'cloud'
            };

        } catch (error) {
            console.error('Failed to load configurations from Firebase:', error);

            // Fallback to local storage
            const localConfigs = this.loadFromLocalStorage();

            if (this.callbacks.onConfigLoaded) {
                this.callbacks.onConfigLoaded(localConfigs);
            }

            return {
                success: false,
                error: error.message,
                userMessage: 'Failed to load from cloud. Showing local configurations.',
                configurations: localConfigs,
                source: 'local'
            };
        }
    }

    /**
     * Load configuration for current device
     */
    async loadDeviceConfiguration() {
        if (!this.isInitialized || !this.user) {
            return this.loadFromLocalStorage();
        }

        try {
            const { collection, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');

            const q = query(
                collection(this.db, 'cameraConfigurations'),
                where('userId', '==', this.user.uid),
                where('deviceFingerprint', '==', this.deviceFingerprint),
                orderBy('lastUsed', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const data = doc.data();

                return {
                    success: true,
                    configuration: {
                        id: doc.id,
                        ...data,
                        created: data.created?.toDate(),
                        lastUsed: data.lastUsed?.toDate()
                    }
                };
            }

            return { success: false, error: 'No configuration found for this device' };

        } catch (error) {
            console.error('Failed to load device configuration:', error);
            return {
                success: false,
                error: error.message,
                userMessage: 'Failed to load device configuration.'
            };
        }
    }

    /**
     * Delete configuration
     */
    async deleteConfiguration(configId) {
        if (!this.isInitialized || !this.user) {
            return this.deleteFromLocalStorage(configId);
        }

        try {
            const { doc, deleteDoc } = await import('firebase/firestore');

            const docRef = doc(this.db, 'cameraConfigurations', configId);
            await deleteDoc(docRef);

            // Also delete from local storage
            this.deleteFromLocalStorage(configId);

            return {
                success: true,
                message: 'Configuration deleted successfully'
            };

        } catch (error) {
            console.error('Failed to delete configuration:', error);
            return {
                success: false,
                error: error.message,
                userMessage: 'Failed to delete configuration.'
            };
        }
    }

    /**
     * Generate device fingerprint
     */
    async generateDeviceFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.platform,
            screen.width + 'x' + screen.height,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            navigator.hardwareConcurrency || 'unknown',
            navigator.maxTouchPoints || 0
        ];

        const fingerprint = components.join('|');

        // Create a simple hash
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }

        return Math.abs(hash).toString(36);
    }

    /**
     * Generate configuration ID
     */
    generateConfigId(configName) {
        const timestamp = Date.now();
        const cleanName = configName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        return `${this.user.uid}_${this.deviceFingerprint}_${cleanName}_${timestamp}`;
    }

    /**
     * Local storage fallback methods
     */
    saveToLocalStorage(config) {
        try {
            const configs = this.loadFromLocalStorage();
            const configWithId = {
                ...config,
                id: `local_${Date.now()}`,
                deviceFingerprint: this.deviceFingerprint,
                created: new Date(),
                lastUsed: new Date(),
                source: 'local'
            };

            configs.push(configWithId);
            localStorage.setItem('cameraConfigurations', JSON.stringify(configs));

            return {
                success: true,
                configId: configWithId.id,
                message: 'Configuration saved locally'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                userMessage: 'Failed to save configuration locally'
            };
        }
    }

    loadFromLocalStorage() {
        try {
            const configs = localStorage.getItem('cameraConfigurations');
            return configs ? JSON.parse(configs) : [];
        } catch (error) {
            console.error('Failed to load from local storage:', error);
            return [];
        }
    }

    deleteFromLocalStorage(configId) {
        try {
            const configs = this.loadFromLocalStorage();
            const updatedConfigs = configs.filter(config => config.id !== configId);
            localStorage.setItem('cameraConfigurations', JSON.stringify(updatedConfigs));

            return {
                success: true,
                message: 'Configuration deleted from local storage'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                userMessage: 'Failed to delete local configuration'
            };
        }
    }

    /**
     * Merge cloud and local configurations
     */
    mergeConfigurations(cloudConfigs, localConfigs) {
        const merged = [...cloudConfigs];

        // Add local configs that don't exist in cloud
        localConfigs.forEach(localConfig => {
            const exists = cloudConfigs.find(cloudConfig =>
                cloudConfig.name === localConfig.name &&
                cloudConfig.deviceFingerprint === localConfig.deviceFingerprint
            );

            if (!exists) {
                merged.push({ ...localConfig, source: 'local' });
            }
        });

        // Sort by last used date
        return merged.sort((a, b) => {
            const aDate = a.lastUsed || a.created || new Date(0);
            const bDate = b.lastUsed || b.created || new Date(0);
            return bDate - aDate;
        });
    }

    /**
     * Set callbacks
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Check if user is signed in
     */
    isSignedIn() {
        return !!this.user;
    }

    /**
     * Get device fingerprint
     */
    getDeviceFingerprint() {
        return this.deviceFingerprint;
    }
}