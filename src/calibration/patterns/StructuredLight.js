/**
 * StructuredLight - Pattern generation for projector calibration
 * Creates various patterns for projector-camera calibration
 */

export class StructuredLight {
    constructor(projectorWidth = 1920, projectorHeight = 1080) {
        this.projectorWidth = projectorWidth;
        this.projectorHeight = projectorHeight;
        this.patterns = new Map();
        this.currentPattern = null;
    }

    /**
     * Generate checkerboard pattern for basic calibration
     */
    generateCheckerboard(squareSize = 80, rows = 9, cols = 6) {
        const canvas = document.createElement('canvas');
        canvas.width = this.projectorWidth;
        canvas.height = this.projectorHeight;
        const ctx = canvas.getContext('2d');

        // Fill background with dark gray
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, this.projectorWidth, this.projectorHeight);

        // Calculate centering offset
        const totalWidth = cols * squareSize;
        const totalHeight = rows * squareSize;
        const offsetX = (this.projectorWidth - totalWidth) / 2;
        const offsetY = (this.projectorHeight - totalHeight) / 2;

        // Draw checkerboard pattern
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const isBlack = (row + col) % 2 === 0;
                ctx.fillStyle = isBlack ? '#000000' : '#ffffff';

                const x = offsetX + col * squareSize;
                const y = offsetY + row * squareSize;

                ctx.fillRect(x, y, squareSize, squareSize);
            }
        }

        const patternData = {
            type: 'checkerboard',
            canvas: canvas,
            dataURL: canvas.toDataURL(),
            rows: rows,
            cols: cols,
            squareSize: squareSize,
            centerOffset: { x: offsetX, y: offsetY }
        };

        this.patterns.set('checkerboard', patternData);
        return patternData;
    }

    /**
     * Generate grid pattern with corner markers
     */
    generateGridPattern(gridSpacing = 100, markerSize = 20) {
        const canvas = document.createElement('canvas');
        canvas.width = this.projectorWidth;
        canvas.height = this.projectorHeight;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.projectorWidth, this.projectorHeight);

        // Draw grid lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        // Vertical lines
        for (let x = gridSpacing; x < this.projectorWidth; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.projectorHeight);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = gridSpacing; y < this.projectorHeight; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.projectorWidth, y);
            ctx.stroke();
        }

        // Add corner markers for quad calibration
        const corners = [
            { x: markerSize, y: markerSize }, // Top-left
            { x: this.projectorWidth - markerSize, y: markerSize }, // Top-right
            { x: this.projectorWidth - markerSize, y: this.projectorHeight - markerSize }, // Bottom-right
            { x: markerSize, y: this.projectorHeight - markerSize } // Bottom-left
        ];

        ctx.fillStyle = '#ff0000';
        corners.forEach(corner => {
            ctx.fillRect(corner.x - markerSize/2, corner.y - markerSize/2, markerSize, markerSize);
        });

        const patternData = {
            type: 'grid',
            canvas: canvas,
            dataURL: canvas.toDataURL(),
            gridSpacing: gridSpacing,
            corners: corners,
            markerSize: markerSize
        };

        this.patterns.set('grid', patternData);
        return patternData;
    }

    /**
     * Generate QR code markers for corner detection
     */
    generateQRMarkers(markerSize = 100) {
        const canvas = document.createElement('canvas');
        canvas.width = this.projectorWidth;
        canvas.height = this.projectorHeight;
        const ctx = canvas.getContext('2d');

        // Fill background with dark color
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.projectorWidth, this.projectorHeight);

        // QR marker positions (corners + center)
        const positions = [
            { x: 50, y: 50, id: 'TL' }, // Top-left
            { x: this.projectorWidth - 50 - markerSize, y: 50, id: 'TR' }, // Top-right
            { x: this.projectorWidth - 50 - markerSize, y: this.projectorHeight - 50 - markerSize, id: 'BR' }, // Bottom-right
            { x: 50, y: this.projectorHeight - 50 - markerSize, id: 'BL' }, // Bottom-left
            { x: this.projectorWidth/2 - markerSize/2, y: this.projectorHeight/2 - markerSize/2, id: 'C' } // Center
        ];

        // Generate simple QR-like patterns for each position
        positions.forEach(pos => {
            this._drawQRLikeMarker(ctx, pos.x, pos.y, markerSize, pos.id);
        });

        const patternData = {
            type: 'qr_markers',
            canvas: canvas,
            dataURL: canvas.toDataURL(),
            positions: positions,
            markerSize: markerSize
        };

        this.patterns.set('qr_markers', patternData);
        return patternData;
    }

    /**
     * Generate binary code patterns for structured light
     */
    generateBinaryPattern(direction = 'vertical', step = 0, totalSteps = 10) {
        const canvas = document.createElement('canvas');
        canvas.width = this.projectorWidth;
        canvas.height = this.projectorHeight;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.projectorWidth, this.projectorHeight);

        const stripeWidth = direction === 'vertical' ?
            Math.floor(this.projectorWidth / Math.pow(2, Math.ceil(Math.log2(totalSteps)))) :
            Math.floor(this.projectorHeight / Math.pow(2, Math.ceil(Math.log2(totalSteps))));

        // Generate binary pattern based on step
        const binaryCode = step.toString(2).padStart(Math.ceil(Math.log2(totalSteps)), '0');

        ctx.fillStyle = '#ffffff';

        if (direction === 'vertical') {
            for (let i = 0; i < binaryCode.length; i++) {
                if (binaryCode[i] === '1') {
                    const x = i * stripeWidth * Math.pow(2, binaryCode.length - 1 - i);
                    ctx.fillRect(x, 0, stripeWidth * Math.pow(2, binaryCode.length - 1 - i), this.projectorHeight);
                }
            }
        } else {
            for (let i = 0; i < binaryCode.length; i++) {
                if (binaryCode[i] === '1') {
                    const y = i * stripeWidth * Math.pow(2, binaryCode.length - 1 - i);
                    ctx.fillRect(0, y, this.projectorWidth, stripeWidth * Math.pow(2, binaryCode.length - 1 - i));
                }
            }
        }

        const patternData = {
            type: 'binary',
            canvas: canvas,
            dataURL: canvas.toDataURL(),
            direction: direction,
            step: step,
            totalSteps: totalSteps,
            binaryCode: binaryCode
        };

        this.patterns.set(`binary_${direction}_${step}`, patternData);
        return patternData;
    }

    /**
     * Generate solid color patterns for basic testing
     */
    generateSolidColor(color = '#ffffff') {
        const canvas = document.createElement('canvas');
        canvas.width = this.projectorWidth;
        canvas.height = this.projectorHeight;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, this.projectorWidth, this.projectorHeight);

        const patternData = {
            type: 'solid',
            canvas: canvas,
            dataURL: canvas.toDataURL(),
            color: color
        };

        this.patterns.set(`solid_${color}`, patternData);
        return patternData;
    }

    /**
     * Generate test pattern with measurements
     */
    generateTestPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = this.projectorWidth;
        canvas.height = this.projectorHeight;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, this.projectorWidth, this.projectorHeight);

        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, this.projectorWidth - 4, this.projectorHeight - 4);

        // Draw center crosshair
        ctx.beginPath();
        ctx.moveTo(this.projectorWidth/2 - 50, this.projectorHeight/2);
        ctx.lineTo(this.projectorWidth/2 + 50, this.projectorHeight/2);
        ctx.moveTo(this.projectorWidth/2, this.projectorHeight/2 - 50);
        ctx.lineTo(this.projectorWidth/2, this.projectorHeight/2 + 50);
        ctx.stroke();

        // Add resolution text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.projectorWidth} × ${this.projectorHeight}`, this.projectorWidth/2, this.projectorHeight/2 - 100);

        // Add corner markers with coordinates
        const corners = [
            { x: 50, y: 50, text: '(0,0)' },
            { x: this.projectorWidth - 50, y: 50, text: `(${this.projectorWidth},0)` },
            { x: this.projectorWidth - 50, y: this.projectorHeight - 50, text: `(${this.projectorWidth},${this.projectorHeight})` },
            { x: 50, y: this.projectorHeight - 50, text: `(0,${this.projectorHeight})` }
        ];

        ctx.fillStyle = '#00ff00';
        ctx.font = '24px Arial';
        corners.forEach(corner => {
            ctx.fillRect(corner.x - 10, corner.y - 10, 20, 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(corner.text, corner.x, corner.y + 40);
            ctx.fillStyle = '#00ff00';
        });

        const patternData = {
            type: 'test',
            canvas: canvas,
            dataURL: canvas.toDataURL(),
            corners: corners
        };

        this.patterns.set('test', patternData);
        return patternData;
    }

    /**
     * Get pattern by type
     */
    getPattern(type) {
        return this.patterns.get(type);
    }

    /**
     * Get all generated patterns
     */
    getAllPatterns() {
        return Array.from(this.patterns.values());
    }

    /**
     * Clear all patterns
     */
    clearPatterns() {
        this.patterns.clear();
        this.currentPattern = null;
    }

    /**
     * Set current pattern for projection
     */
    setCurrentPattern(type) {
        const pattern = this.patterns.get(type);
        if (pattern) {
            this.currentPattern = pattern;
            return true;
        }
        return false;
    }

    /**
     * Generate pattern sequence for structured light calibration
     */
    generateCalibrationSequence() {
        const sequence = [];

        // 1. Test pattern
        sequence.push(this.generateTestPattern());

        // 2. Solid colors for basic testing
        sequence.push(this.generateSolidColor('#000000')); // Black
        sequence.push(this.generateSolidColor('#ffffff')); // White
        sequence.push(this.generateSolidColor('#ff0000')); // Red
        sequence.push(this.generateSolidColor('#00ff00')); // Green
        sequence.push(this.generateSolidColor('#0000ff')); // Blue

        // 3. Checkerboard pattern
        sequence.push(this.generateCheckerboard());

        // 4. Grid pattern
        sequence.push(this.generateGridPattern());

        // 5. QR markers
        sequence.push(this.generateQRMarkers());

        // 6. Binary patterns for structured light
        const binarySteps = 8;
        for (let i = 0; i < binarySteps; i++) {
            sequence.push(this.generateBinaryPattern('vertical', i, binarySteps));
        }
        for (let i = 0; i < binarySteps; i++) {
            sequence.push(this.generateBinaryPattern('horizontal', i, binarySteps));
        }

        return sequence;
    }

    // Private helper methods

    _drawQRLikeMarker(ctx, x, y, size, id) {
        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, size, size);

        // Draw black border
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, size, size/8); // Top
        ctx.fillRect(x, y, size/8, size); // Left
        ctx.fillRect(x + size - size/8, y, size/8, size); // Right
        ctx.fillRect(x, y + size - size/8, size, size/8); // Bottom

        // Draw inner pattern based on ID
        const innerSize = size * 0.6;
        const innerX = x + size * 0.2;
        const innerY = y + size * 0.2;

        ctx.fillStyle = '#000000';

        // Simple pattern based on ID
        switch(id) {
            case 'TL':
                ctx.fillRect(innerX, innerY, innerSize/2, innerSize/2);
                break;
            case 'TR':
                ctx.fillRect(innerX + innerSize/2, innerY, innerSize/2, innerSize/2);
                break;
            case 'BR':
                ctx.fillRect(innerX + innerSize/2, innerY + innerSize/2, innerSize/2, innerSize/2);
                break;
            case 'BL':
                ctx.fillRect(innerX, innerY + innerSize/2, innerSize/2, innerSize/2);
                break;
            case 'C':
                ctx.fillRect(innerX + innerSize/4, innerY + innerSize/4, innerSize/2, innerSize/2);
                break;
        }

        // Add ID text
        ctx.fillStyle = '#666666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(id, x + size/2, y + size + 15);
    }
}