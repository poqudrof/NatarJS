/**
 * CalibrationDataManager - Enhanced calibration data management
 * Handles saving, loading, and managing calibration data with cloud storage
 */

import { CalibrationStorage } from '../storage/CalibrationStorage.js';

export class CalibrationDataManager {
    constructor() {
        this.storage = null;
        this.currentUser = null;
        this.calibrations = new Map();
        this.autoSave = true;
        this.saveInterval = null;

        // Event callbacks
        this.onSave = null;
        this.onLoad = null;
        this.onError = null;
        this.onSync = null;

        // Calibration metadata
        this.metadata = {
            version: '1.0',
            created: null,
            modified: null,
            device: null,
            user: null
        };
    }

    /**
     * Initialize calibration manager
     */
    async initialize(options = {}) {
        try {
            this.autoSave = options.autoSave ?? true;

            // Initialize storage
            this.storage = new CalibrationStorage();
            await this.storage.initialize();

            // Setup auto-save if enabled
            if (this.autoSave) {
                this._setupAutoSave();
            }

            // Load user calibrations
            await this._loadUserCalibrations();

            return {
                success: true,
                message: 'Calibration manager initialized successfully'
            };

        } catch (error) {
            this._notifyError('Initialization failed', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to initialize calibration manager'
            };
        }
    }

    /**
     * Save calibration data
     */
    async saveCalibration(type, data, options = {}) {
        try {
            const calibrationData = this._prepareCalibrationData(type, data, options);

            // Validate data
            const validation = await this.storage.validateData(calibrationData);
            if (!validation.isValid) {
                throw new Error(`Invalid calibration data: ${validation.errors.join(', ')}`);
            }

            // Save to storage
            const result = await this.storage.saveCalibration(type, calibrationData);

            // Update local cache
            this.calibrations.set(result.id, {
                id: result.id,
                type: type,
                data: calibrationData,
                metadata: calibrationData.metadata
            });

            this._notifySave('success', `${type} calibration saved successfully`, result);

            return {
                success: true,
                id: result.id,
                data: calibrationData,
                message: 'Calibration saved successfully'
            };

        } catch (error) {
            this._notifyError('Save failed', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to save calibration'
            };
        }
    }

    /**
     * Load calibration data
     */
    async loadCalibration(calibrationId) {
        try {
            // Check local cache first
            if (this.calibrations.has(calibrationId)) {
                const cached = this.calibrations.get(calibrationId);
                this._notifyLoad('success', 'Calibration loaded from cache', cached);
                return {
                    success: true,
                    data: cached.data,
                    metadata: cached.metadata,
                    message: 'Calibration loaded successfully'
                };
            }

            // Load from storage
            const data = await this.storage.loadCalibration(calibrationId);

            // Update local cache
            this.calibrations.set(calibrationId, {
                id: calibrationId,
                type: data.type,
                data: data,
                metadata: data.metadata
            });

            this._notifyLoad('success', 'Calibration loaded from storage', data);

            return {
                success: true,
                data: data,
                metadata: data.metadata,
                message: 'Calibration loaded successfully'
            };

        } catch (error) {
            this._notifyError('Load failed', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to load calibration'
            };
        }
    }

    /**
     * List user calibrations
     */
    async listCalibrations(type = null) {
        try {
            const calibrations = await this.storage.listCalibrations(this.currentUser?.uid, type);

            // Update local cache
            calibrations.forEach(cal => {
                this.calibrations.set(cal.id, cal);
            });

            return {
                success: true,
                calibrations: calibrations,
                count: calibrations.length,
                message: 'Calibrations retrieved successfully'
            };

        } catch (error) {
            this._notifyError('List failed', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to retrieve calibrations'
            };
        }
    }

    /**
     * Delete calibration
     */
    async deleteCalibration(calibrationId) {
        try {
            await this.storage.deleteCalibration(calibrationId);

            // Remove from local cache
            this.calibrations.delete(calibrationId);

            return {
                success: true,
                message: 'Calibration deleted successfully'
            };

        } catch (error) {
            this._notifyError('Delete failed', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to delete calibration'
            };
        }
    }

    /**
     * Export calibration data
     */
    async exportCalibration(calibrationId, format = 'json') {
        try {
            const calibration = this.calibrations.get(calibrationId);
            if (!calibration) {
                const loadResult = await this.loadCalibration(calibrationId);
                if (!loadResult.success) {
                    throw new Error('Calibration not found');
                }
            }

            const data = this.calibrations.get(calibrationId).data;

            switch (format.toLowerCase()) {
                case 'json':
                    return this._exportAsJSON(data);
                case 'csv':
                    return this._exportAsCSV(data);
                case 'xml':
                    return this._exportAsXML(data);
                case 'opencv':
                    return this._exportAsOpenCV(data);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

        } catch (error) {
            this._notifyError('Export failed', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to export calibration'
            };
        }
    }

    /**
     * Import calibration data
     */
    async importCalibration(data, format = 'json', options = {}) {
        try {
            let calibrationData;

            switch (format.toLowerCase()) {
                case 'json':
                    calibrationData = this._importFromJSON(data);
                    break;
                case 'csv':
                    calibrationData = this._importFromCSV(data);
                    break;
                case 'xml':
                    calibrationData = this._importFromXML(data);
                    break;
                case 'opencv':
                    calibrationData = this._importFromOpenCV(data);
                    break;
                default:
                    throw new Error(`Unsupported import format: ${format}`);
            }

            // Save imported data
            const saveResult = await this.saveCalibration(
                calibrationData.type || 'imported',
                calibrationData,
                { ...options, imported: true }
            );

            return saveResult;

        } catch (error) {
            this._notifyError('Import failed', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to import calibration'
            };
        }
    }

    /**
     * Sync with cloud storage
     */
    async syncCalibrations() {
        try {
            const syncResult = await this.storage.sync();

            // Update local cache with synced data
            if (syncResult.updated) {
                await this._loadUserCalibrations();
            }

            this._notifySync('success', 'Calibrations synced successfully', syncResult);

            return {
                success: true,
                syncResult: syncResult,
                message: 'Calibrations synced successfully'
            };

        } catch (error) {
            this._notifyError('Sync failed', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to sync calibrations'
            };
        }
    }

    /**
     * Set user context
     */
    setUser(user) {
        this.currentUser = user;
        this.storage.setUser(user);

        // Reload calibrations for new user
        this._loadUserCalibrations();
    }

    /**
     * Get calibration statistics
     */
    getStatistics() {
        const stats = {
            total: this.calibrations.size,
            byType: {},
            byQuality: { excellent: 0, good: 0, fair: 0, poor: 0 },
            recent: [],
            oldest: null,
            newest: null
        };

        const calibrations = Array.from(this.calibrations.values());

        // Count by type
        calibrations.forEach(cal => {
            const type = cal.type;
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            // Count by quality
            const quality = this._getCalibrationQuality(cal.data);
            if (stats.byQuality[quality] !== undefined) {
                stats.byQuality[quality]++;
            }
        });

        // Find date ranges
        const dates = calibrations
            .map(cal => new Date(cal.metadata?.created || 0))
            .sort((a, b) => a - b);

        if (dates.length > 0) {
            stats.oldest = dates[0];
            stats.newest = dates[dates.length - 1];
        }

        // Recent calibrations (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        stats.recent = calibrations.filter(cal =>
            new Date(cal.metadata?.created || 0) > weekAgo
        );

        return stats;
    }

    /**
     * Search calibrations
     */
    searchCalibrations(query, filters = {}) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        this.calibrations.forEach((calibration, id) => {
            let matches = false;

            // Search in metadata
            const metadata = calibration.metadata || {};
            if (metadata.name?.toLowerCase().includes(lowerQuery) ||
                metadata.description?.toLowerCase().includes(lowerQuery) ||
                metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                matches = true;
            }

            // Search by type
            if (calibration.type.toLowerCase().includes(lowerQuery)) {
                matches = true;
            }

            // Apply filters
            if (matches && filters.type && calibration.type !== filters.type) {
                matches = false;
            }

            if (matches && filters.quality) {
                const quality = this._getCalibrationQuality(calibration.data);
                if (quality !== filters.quality) {
                    matches = false;
                }
            }

            if (matches && filters.dateRange) {
                const created = new Date(metadata.created || 0);
                if (created < filters.dateRange.start || created > filters.dateRange.end) {
                    matches = false;
                }
            }

            if (matches) {
                results.push({
                    id: id,
                    calibration: calibration,
                    relevance: this._calculateRelevance(calibration, lowerQuery)
                });
            }
        });

        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);

        return results.map(r => r.calibration);
    }

    // Private methods

    /**
     * Prepare calibration data for saving
     */
    _prepareCalibrationData(type, data, options) {
        const now = new Date().toISOString();

        const calibrationData = {
            type: type,
            ...data,
            metadata: {
                ...this.metadata,
                name: options.name || `${type} calibration`,
                description: options.description || '',
                tags: options.tags || [],
                created: data.metadata?.created || now,
                modified: now,
                version: '1.0',
                user: this.currentUser?.uid || 'anonymous',
                device: this._getDeviceInfo(),
                quality: this._getCalibrationQuality(data),
                imported: options.imported || false
            }
        };

        return calibrationData;
    }

    /**
     * Load user calibrations from storage
     */
    async _loadUserCalibrations() {
        try {
            const calibrations = await this.storage.listCalibrations(this.currentUser?.uid);

            // Update local cache
            this.calibrations.clear();
            calibrations.forEach(cal => {
                this.calibrations.set(cal.id, cal);
            });

        } catch (error) {
            console.warn('Failed to load user calibrations:', error);
        }
    }

    /**
     * Setup auto-save functionality
     */
    _setupAutoSave() {
        // Auto-save every 5 minutes
        this.saveInterval = setInterval(() => {
            this._performAutoSave();
        }, 5 * 60 * 1000);
    }

    /**
     * Perform auto-save
     */
    async _performAutoSave() {
        // Implementation depends on what needs to be auto-saved
        // For now, just sync with cloud storage
        try {
            await this.syncCalibrations();
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    /**
     * Export calibration as JSON
     */
    _exportAsJSON(data) {
        const exportData = {
            format: 'calibration-json',
            version: '1.0',
            exported: new Date().toISOString(),
            data: data
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        return {
            success: true,
            blob: blob,
            filename: `calibration-${Date.now()}.json`,
            mimeType: 'application/json'
        };
    }

    /**
     * Export calibration as CSV
     */
    _exportAsCSV(data) {
        let csv = 'Parameter,Value\n';

        // Add basic info
        csv += `Type,${data.type}\n`;
        csv += `Created,${data.metadata?.created}\n`;
        csv += `Quality,${data.metadata?.quality}\n`;

        // Add camera matrix if available
        if (data.cameraMatrix) {
            const matrix = data.cameraMatrix;
            csv += `Camera Matrix fx,${matrix[0][0]}\n`;
            csv += `Camera Matrix fy,${matrix[1][1]}\n`;
            csv += `Camera Matrix cx,${matrix[0][2]}\n`;
            csv += `Camera Matrix cy,${matrix[1][2]}\n`;
        }

        // Add distortion coefficients
        if (data.distortionCoefficients) {
            data.distortionCoefficients.forEach((coeff, index) => {
                csv += `Distortion Coeff ${index + 1},${coeff}\n`;
            });
        }

        // Add reprojection error
        if (data.reprojectionError !== undefined) {
            csv += `Reprojection Error,${data.reprojectionError}\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });

        return {
            success: true,
            blob: blob,
            filename: `calibration-${Date.now()}.csv`,
            mimeType: 'text/csv'
        };
    }

    /**
     * Export calibration as OpenCV format
     */
    _exportAsOpenCV(data) {
        const opencvData = {
            '%YAML:1.0': '',
            camera_matrix: data.cameraMatrix,
            distortion_coefficients: data.distortionCoefficients,
            image_width: data.imageSize?.width || 0,
            image_height: data.imageSize?.height || 0,
            reprojection_error: data.reprojectionError || 0,
            calibration_time: data.metadata?.created || new Date().toISOString()
        };

        // Convert to YAML-like format
        let yamlContent = '%YAML:1.0\n---\n';

        Object.entries(opencvData).forEach(([key, value]) => {
            if (key === '%YAML:1.0') return;

            if (Array.isArray(value)) {
                yamlContent += `${key}: !!opencv-matrix\n`;
                yamlContent += `   rows: ${value.length}\n`;
                yamlContent += `   cols: ${value[0]?.length || 1}\n`;
                yamlContent += `   dt: d\n`;
                yamlContent += `   data: [ ${value.flat().join(', ')} ]\n`;
            } else {
                yamlContent += `${key}: ${value}\n`;
            }
        });

        const blob = new Blob([yamlContent], { type: 'text/yaml' });

        return {
            success: true,
            blob: blob,
            filename: `calibration-${Date.now()}.yml`,
            mimeType: 'text/yaml'
        };
    }

    /**
     * Import calibration from JSON
     */
    _importFromJSON(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            if (data.format === 'calibration-json' && data.data) {
                return data.data;
            }

            // Try to parse as direct calibration data
            return data;

        } catch (error) {
            throw new Error('Invalid JSON format');
        }
    }

    /**
     * Get calibration quality assessment
     */
    _getCalibrationQuality(data) {
        if (data.metadata?.quality) {
            return data.metadata.quality;
        }

        if (data.reprojectionError !== undefined) {
            if (data.reprojectionError < 0.5) return 'excellent';
            if (data.reprojectionError < 1.0) return 'good';
            if (data.reprojectionError < 2.0) return 'fair';
            return 'poor';
        }

        return 'unknown';
    }

    /**
     * Get device information
     */
    _getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: {
                width: screen.width,
                height: screen.height,
                pixelRatio: window.devicePixelRatio || 1
            }
        };
    }

    /**
     * Calculate search relevance
     */
    _calculateRelevance(calibration, query) {
        let score = 0;

        const metadata = calibration.metadata || {};

        // Name match (highest priority)
        if (metadata.name?.toLowerCase().includes(query)) {
            score += 10;
        }

        // Type match
        if (calibration.type.toLowerCase().includes(query)) {
            score += 5;
        }

        // Description match
        if (metadata.description?.toLowerCase().includes(query)) {
            score += 3;
        }

        // Tag match
        if (metadata.tags?.some(tag => tag.toLowerCase().includes(query))) {
            score += 2;
        }

        // Recent bonus
        const daysSinceCreated = (Date.now() - new Date(metadata.created || 0)) / (1000 * 60 * 60 * 24);
        if (daysSinceCreated < 7) {
            score += 1;
        }

        return score;
    }

    // Event notification methods

    _notifySave(type, message, data) {
        if (this.onSave) {
            this.onSave({ type, message, data });
        }
    }

    _notifyLoad(type, message, data) {
        if (this.onLoad) {
            this.onLoad({ type, message, data });
        }
    }

    _notifyError(message, error) {
        if (this.onError) {
            this.onError({ message, error });
        }
        console.error('CalibrationManager:', message, error);
    }

    _notifySync(type, message, data) {
        if (this.onSync) {
            this.onSync({ type, message, data });
        }
    }

    // Event listener setters
    setSaveCallback(callback) {
        this.onSave = callback;
    }

    setLoadCallback(callback) {
        this.onLoad = callback;
    }

    setErrorCallback(callback) {
        this.onError = callback;
    }

    setSyncCallback(callback) {
        this.onSync = callback;
    }

    // Cleanup
    destroy() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }

        this.calibrations.clear();
        this.storage = null;
    }
}

export default CalibrationDataManager;