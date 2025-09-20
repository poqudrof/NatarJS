/**
 * DataValidator - Validates calibration data structure and integrity
 * Ensures calibration data meets required standards before storage/usage
 */

export class DataValidator {
    constructor() {
        this.requiredFields = {
            camera: ['intrinsicMatrix', 'resolution'],
            projector: ['resolution'],
            quad: ['corners'],
            validation: ['isValid']
        };

        this.validationRules = {
            intrinsicMatrix: (matrix) => Array.isArray(matrix) && matrix.length === 9,
            resolution: (res) => res && typeof res.width === 'number' && typeof res.height === 'number' && res.width > 0 && res.height > 0,
            corners: (corners) => Array.isArray(corners) && corners.length === 4,
            timestamp: (ts) => typeof ts === 'string' && !isNaN(Date.parse(ts)),
            accuracy: (acc) => typeof acc === 'number' && acc >= 0 && acc <= 1
        };
    }

    /**
     * Validate complete calibration data structure
     */
    validateCalibrationData(data) {
        const errors = [];
        const warnings = [];

        try {
            // Check basic structure
            if (!data || typeof data !== 'object') {
                errors.push('Calibration data must be an object');
                return { isValid: false, errors, warnings };
            }

            // Validate required top-level fields
            if (!data.camera) {
                errors.push('Missing camera calibration data');
            }

            if (!data.projector) {
                errors.push('Missing projector calibration data');
            }

            if (!data.timestamp) {
                errors.push('Missing timestamp');
            } else if (!this.validationRules.timestamp(data.timestamp)) {
                errors.push('Invalid timestamp format');
            }

            // Validate camera data
            if (data.camera) {
                const cameraErrors = this._validateCameraData(data.camera);
                errors.push(...cameraErrors);
            }

            // Validate projector data
            if (data.projector) {
                const projectorErrors = this._validateProjectorData(data.projector);
                errors.push(...projectorErrors);
            }

            // Validate quad data if present
            if (data.quad) {
                const quadErrors = this._validateQuadData(data.quad);
                errors.push(...quadErrors);
            } else {
                warnings.push('No quad calibration data found');
            }

            // Validate validation data if present
            if (data.validation) {
                const validationErrors = this._validateValidationData(data.validation);
                errors.push(...validationErrors);
            } else {
                warnings.push('No validation data found');
            }

            // Check data consistency
            const consistencyErrors = this._validateDataConsistency(data);
            errors.push(...consistencyErrors);

            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };

        } catch (error) {
            errors.push(`Validation error: ${error.message}`);
            return { isValid: false, errors, warnings };
        }
    }

    /**
     * Validate camera calibration data
     */
    _validateCameraData(camera) {
        const errors = [];

        // Check required fields
        for (const field of this.requiredFields.camera) {
            if (!camera[field]) {
                errors.push(`Missing camera field: ${field}`);
                continue;
            }

            // Validate specific fields
            switch (field) {
                case 'intrinsicMatrix':
                    if (!this.validationRules.intrinsicMatrix(camera[field])) {
                        errors.push('Camera intrinsic matrix must be an array of 9 numbers');
                    } else {
                        // Check for reasonable values
                        const matrix = camera[field];
                        if (matrix[0] <= 0 || matrix[4] <= 0) { // fx, fy
                            errors.push('Camera focal lengths must be positive');
                        }
                        if (matrix[2] < 0 || matrix[5] < 0) { // cx, cy
                            errors.push('Camera principal point coordinates must be non-negative');
                        }
                    }
                    break;

                case 'resolution':
                    if (!this.validationRules.resolution(camera[field])) {
                        errors.push('Camera resolution must have positive width and height');
                    } else {
                        const res = camera[field];
                        if (res.width > 8192 || res.height > 8192) {
                            errors.push('Camera resolution seems unreasonably high');
                        }
                        if (res.width < 320 || res.height < 240) {
                            errors.push('Camera resolution seems unreasonably low');
                        }
                    }
                    break;
            }
        }

        // Check optional fields
        if (camera.distortionCoefficients) {
            if (!Array.isArray(camera.distortionCoefficients) || camera.distortionCoefficients.length < 4) {
                errors.push('Camera distortion coefficients must be an array with at least 4 elements');
            }
        }

        if (camera.deviceId && typeof camera.deviceId !== 'string') {
            errors.push('Camera device ID must be a string');
        }

        return errors;
    }

    /**
     * Validate projector calibration data
     */
    _validateProjectorData(projector) {
        const errors = [];

        // Check required fields
        for (const field of this.requiredFields.projector) {
            if (!projector[field]) {
                errors.push(`Missing projector field: ${field}`);
                continue;
            }

            // Validate specific fields
            switch (field) {
                case 'resolution':
                    if (!this.validationRules.resolution(projector[field])) {
                        errors.push('Projector resolution must have positive width and height');
                    } else {
                        const res = projector[field];
                        if (res.width > 8192 || res.height > 8192) {
                            errors.push('Projector resolution seems unreasonably high');
                        }
                        if (res.width < 320 || res.height < 240) {
                            errors.push('Projector resolution seems unreasonably low');
                        }
                    }
                    break;
            }
        }

        // Check optional fields
        if (projector.transformMatrix && !Array.isArray(projector.transformMatrix)) {
            errors.push('Projector transform matrix must be an array');
        }

        if (projector.homography && !Array.isArray(projector.homography)) {
            errors.push('Projector homography must be an array');
        }

        return errors;
    }

    /**
     * Validate quad calibration data
     */
    _validateQuadData(quad) {
        const errors = [];

        // Check required fields
        for (const field of this.requiredFields.quad) {
            if (!quad[field]) {
                errors.push(`Missing quad field: ${field}`);
                continue;
            }

            // Validate specific fields
            switch (field) {
                case 'corners':
                    if (!this.validationRules.corners(quad[field])) {
                        errors.push('Quad corners must be an array of 4 corner objects');
                    } else {
                        // Validate each corner
                        for (let i = 0; i < quad[field].length; i++) {
                            const corner = quad[field][i];
                            if (!corner.camera || !corner.projector) {
                                errors.push(`Quad corner ${i} missing camera or projector coordinates`);
                            } else {
                                if (typeof corner.camera.x !== 'number' || typeof corner.camera.y !== 'number') {
                                    errors.push(`Quad corner ${i} camera coordinates must be numbers`);
                                }
                                if (typeof corner.projector.x !== 'number' || typeof corner.projector.y !== 'number') {
                                    errors.push(`Quad corner ${i} projector coordinates must be numbers`);
                                }
                            }
                        }
                    }
                    break;
            }
        }

        // Check optional fields
        if (quad.accuracy && !this.validationRules.accuracy(quad.accuracy)) {
            errors.push('Quad accuracy must be a number between 0 and 1');
        }

        if (quad.reprojectionError && (typeof quad.reprojectionError !== 'number' || quad.reprojectionError < 0)) {
            errors.push('Quad reprojection error must be a non-negative number');
        }

        return errors;
    }

    /**
     * Validate validation data
     */
    _validateValidationData(validation) {
        const errors = [];

        // Check required fields
        for (const field of this.requiredFields.validation) {
            if (validation[field] === undefined) {
                errors.push(`Missing validation field: ${field}`);
                continue;
            }

            // Validate specific fields
            switch (field) {
                case 'isValid':
                    if (typeof validation[field] !== 'boolean') {
                        errors.push('Validation isValid field must be a boolean');
                    }
                    break;
            }
        }

        // Check optional fields
        if (validation.accuracy && !this.validationRules.accuracy(validation.accuracy)) {
            errors.push('Validation accuracy must be a number between 0 and 1');
        }

        if (validation.testPoints && !Array.isArray(validation.testPoints)) {
            errors.push('Validation test points must be an array');
        }

        if (validation.validatedAt && !this.validationRules.timestamp(validation.validatedAt)) {
            errors.push('Validation timestamp must be a valid ISO date string');
        }

        return errors;
    }

    /**
     * Validate data consistency across different components
     */
    _validateDataConsistency(data) {
        const errors = [];

        try {
            // Check timestamp consistency
            if (data.timestamp && data.validation?.validatedAt) {
                const dataTime = new Date(data.timestamp);
                const validationTime = new Date(data.validation.validatedAt);

                if (validationTime < dataTime) {
                    errors.push('Validation timestamp cannot be earlier than data timestamp');
                }
            }

            // Check camera and projector resolution consistency with quad corners
            if (data.camera?.resolution && data.projector?.resolution && data.quad?.corners) {
                const cameraRes = data.camera.resolution;
                const projectorRes = data.projector.resolution;

                for (let i = 0; i < data.quad.corners.length; i++) {
                    const corner = data.quad.corners[i];

                    // Check camera coordinates are within resolution bounds
                    if (corner.camera.x < 0 || corner.camera.x > cameraRes.width ||
                        corner.camera.y < 0 || corner.camera.y > cameraRes.height) {
                        errors.push(`Quad corner ${i} camera coordinates outside resolution bounds`);
                    }

                    // Check projector coordinates are within resolution bounds
                    if (corner.projector.x < 0 || corner.projector.x > projectorRes.width ||
                        corner.projector.y < 0 || corner.projector.y > projectorRes.height) {
                        errors.push(`Quad corner ${i} projector coordinates outside resolution bounds`);
                    }
                }
            }

            // Check validation consistency
            if (data.validation?.isValid === false && data.validation?.accuracy > 0.9) {
                errors.push('Validation marked as invalid but accuracy is high');
            }

        } catch (error) {
            errors.push(`Consistency validation error: ${error.message}`);
        }

        return errors;
    }

    /**
     * Validate calibration data for specific use case
     */
    validateForUse(data, useCase = 'projection') {
        const baseValidation = this.validateCalibrationData(data);

        if (!baseValidation.isValid) {
            return baseValidation;
        }

        const errors = [];
        const warnings = [];

        switch (useCase) {
            case 'projection':
                // For projection, we need quad calibration
                if (!data.quad) {
                    errors.push('Quad calibration required for projection use case');
                } else if (!data.quad.accuracy || data.quad.accuracy < 0.8) {
                    warnings.push('Quad calibration accuracy below recommended threshold (0.8)');
                }
                break;

            case 'measurement':
                // For measurement, we need high accuracy camera calibration
                if (!data.camera?.intrinsicMatrix) {
                    errors.push('Camera intrinsic calibration required for measurement use case');
                } else if (data.validation?.accuracy && data.validation.accuracy < 0.95) {
                    warnings.push('Calibration accuracy below recommended threshold for measurement (0.95)');
                }
                break;

            case 'tracking':
                // For tracking, we need both camera and projector calibration
                if (!data.camera?.intrinsicMatrix || !data.projector?.transformMatrix) {
                    errors.push('Both camera and projector calibration required for tracking use case');
                }
                break;
        }

        return {
            isValid: errors.length === 0,
            errors: [...baseValidation.errors, ...errors],
            warnings: [...baseValidation.warnings, ...warnings]
        };
    }
}