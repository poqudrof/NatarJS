/**
 * FirebaseAdapter - Firebase integration for calibration data storage
 * Handles Firebase authentication and Firestore operations
 */

export class FirebaseAdapter {
    constructor(firebaseConfig) {
        this.config = firebaseConfig;
        this.app = null;
        this.auth = null;
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Firebase connection
     */
    async initialize() {
        try {
            // Import Firebase modules dynamically
            const { initializeApp } = await import('firebase/app');
            const { getAuth, onAuthStateChanged } = await import('firebase/auth');
            const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');

            // Initialize Firebase app
            this.app = initializeApp(this.config);
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);

            // Set up auth state listener
            onAuthStateChanged(this.auth, (user) => {
                this.currentUser = user;
            });

            // If in development and emulator is available, connect to it
            if (process.env.NODE_ENV === 'development' && !this.db._delegate._databaseId.projectId.includes('demo-')) {
                try {
                    connectFirestoreEmulator(this.db, 'localhost', 8080);
                } catch (error) {
                    // Emulator connection failed or already connected
                    console.debug('Firestore emulator connection skipped:', error.message);
                }
            }

            this.isInitialized = true;

            return {
                success: true,
                message: 'Firebase initialized successfully'
            };

        } catch (error) {
            throw new Error(`Firebase initialization failed: ${error.message}`);
        }
    }

    /**
     * Save calibration data to Firestore
     */
    async saveCalibration(userId, calibrationId, calibrationData) {
        try {
            this._validateInitialized();

            const { doc, setDoc } = await import('firebase/firestore');

            const docRef = doc(this.db, 'users', userId, 'calibrations', calibrationId);
            await setDoc(docRef, calibrationData);

            return {
                success: true,
                calibrationId
            };

        } catch (error) {
            throw new Error(`Failed to save calibration: ${error.message}`);
        }
    }

    /**
     * Load the latest calibration for a user
     */
    async loadLatestCalibration(userId) {
        try {
            this._validateInitialized();

            const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');

            const calibrationsRef = collection(this.db, 'users', userId, 'calibrations');
            const q = query(calibrationsRef, orderBy('timestamp', 'desc'), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            }

            return null;

        } catch (error) {
            throw new Error(`Failed to load latest calibration: ${error.message}`);
        }
    }

    /**
     * Load a specific calibration by ID
     */
    async loadCalibration(userId, calibrationId) {
        try {
            this._validateInitialized();

            const { doc, getDoc } = await import('firebase/firestore');

            const docRef = doc(this.db, 'users', userId, 'calibrations', calibrationId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            }

            return null;

        } catch (error) {
            throw new Error(`Failed to load calibration: ${error.message}`);
        }
    }

    /**
     * List all calibrations for a user
     */
    async listCalibrations(userId, limitCount = 10) {
        try {
            this._validateInitialized();

            const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');

            const calibrationsRef = collection(this.db, 'users', userId, 'calibrations');
            const q = query(calibrationsRef, orderBy('timestamp', 'desc'), limit(limitCount));
            const querySnapshot = await getDocs(q);

            const calibrations = [];
            querySnapshot.forEach((doc) => {
                calibrations.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return calibrations;

        } catch (error) {
            throw new Error(`Failed to list calibrations: ${error.message}`);
        }
    }

    /**
     * Delete a calibration
     */
    async deleteCalibration(userId, calibrationId) {
        try {
            this._validateInitialized();

            const { doc, deleteDoc } = await import('firebase/firestore');

            const docRef = doc(this.db, 'users', userId, 'calibrations', calibrationId);
            await deleteDoc(docRef);

            return {
                success: true
            };

        } catch (error) {
            throw new Error(`Failed to delete calibration: ${error.message}`);
        }
    }

    /**
     * Update calibration metadata
     */
    async updateCalibrationMetadata(userId, calibrationId, metadata) {
        try {
            this._validateInitialized();

            const { doc, updateDoc } = await import('firebase/firestore');

            const docRef = doc(this.db, 'users', userId, 'calibrations', calibrationId);
            await updateDoc(docRef, {
                metadata: metadata
            });

            return {
                success: true
            };

        } catch (error) {
            throw new Error(`Failed to update calibration metadata: ${error.message}`);
        }
    }

    /**
     * Check Firebase connection
     */
    async checkConnection() {
        try {
            this._validateInitialized();

            const { doc, getDoc } = await import('firebase/firestore');

            // Try to read a test document
            const testDoc = doc(this.db, 'test', 'connection');
            await getDoc(testDoc);

            return true;

        } catch (error) {
            console.warn('Firebase connection check failed:', error.message);
            return false;
        }
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        return this.auth?.currentUser || null;
    }

    /**
     * Get storage statistics for a user
     */
    async getStorageStats(userId) {
        try {
            this._validateInitialized();

            const { collection, query, orderBy, getDocs } = await import('firebase/firestore');

            const calibrationsRef = collection(this.db, 'users', userId, 'calibrations');
            const q = query(calibrationsRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            const calibrations = [];
            let totalSize = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                calibrations.push(data);

                // Estimate size (rough calculation)
                totalSize += JSON.stringify(data).length;
            });

            return {
                count: calibrations.length,
                sizeBytes: totalSize,
                lastTimestamp: calibrations[0]?.timestamp || null,
                oldestTimestamp: calibrations[calibrations.length - 1]?.timestamp || null
            };

        } catch (error) {
            throw new Error(`Failed to get storage stats: ${error.message}`);
        }
    }

    /**
     * Cleanup old calibrations
     */
    async cleanupOldCalibrations(userId, keepCount = 5) {
        try {
            this._validateInitialized();

            const { collection, query, orderBy, getDocs, doc, deleteDoc } = await import('firebase/firestore');

            // Get all calibrations
            const calibrationsRef = collection(this.db, 'users', userId, 'calibrations');
            const q = query(calibrationsRef, orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            const calibrations = [];
            querySnapshot.forEach((docSnapshot) => {
                calibrations.push({
                    id: docSnapshot.id,
                    timestamp: docSnapshot.data().timestamp
                });
            });

            // Delete old calibrations (keep only the most recent ones)
            const toDelete = calibrations.slice(keepCount);
            let deletedCount = 0;

            for (const calibration of toDelete) {
                try {
                    const docRef = doc(this.db, 'users', userId, 'calibrations', calibration.id);
                    await deleteDoc(docRef);
                    deletedCount++;
                } catch (error) {
                    console.warn(`Failed to delete calibration ${calibration.id}:`, error.message);
                }
            }

            return {
                deletedCount,
                remainingCount: calibrations.length - deletedCount
            };

        } catch (error) {
            throw new Error(`Failed to cleanup calibrations: ${error.message}`);
        }
    }

    // Private methods

    _validateInitialized() {
        if (!this.isInitialized) {
            throw new Error('FirebaseAdapter not initialized. Call initialize() first.');
        }
    }
}