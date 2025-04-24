import { isDebugMode } from '../sketch.js';
import {
    SCENE_SPEED,
    BRANCH_COLOR,
    LEAF_COLOR,
    MAX_BRANCH_LEVELS,
    LEAF_SIZE,
    TRUNK_LENGTH,
    TRUNK_WIDTH,
    TRUNK_ANGLE_RANGE,
    BRANCH_GROWTH_TIME,
    CHILD_BRANCH_DELAY
} from '../utils/constants.js';
import { random, floor, constrain, PI, adjustColor } from '../utils/math.js';

class Branch {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.level = options.level || 0;
        this.parent = options.parent || null;
        
        // Use fixed values for trunk (level 0), except for angle
        if (this.level === 0) {
            this.length = TRUNK_LENGTH;
            this.width = TRUNK_WIDTH;
            this.angle = random(-TRUNK_ANGLE_RANGE, TRUNK_ANGLE_RANGE) * PI/180;
        } else {
            this.length = options.length || random(275, 325);
            this.width = options.width || random(30, 45);
            this.angle = options.angle || random(-20, 20) * PI/180;
        }
        
        this.growth = 0;
        this.children = [];
        this.creationTime = performance.now();
        this.growthStartTime = null;  // Will be set when growth actually starts
        this.shouldStartGrowing = false;  // New flag to control growth start
        this.growthRate = 1 / BRANCH_GROWTH_TIME;  // Growth per millisecond
        this.relativeHeight = options.relativeHeight || 0;
        this.side = options.side || 0;
        
        // Add flag to track if we've added a top branch (for level 0 only)
        this.hasTopBranch = false;
        
        // Color variation: combine tree's variation with individual branch variation
        const branchVariation = random(0.9, 1.1); // ±10% individual variation
        this.colorVariation = (options.colorVariation || 1.0) * branchVariation;
        
        this.level0Width = options.level0Width || this.width;
        
        // Branch spawning properties
        if (this.level === 0) {
            this.maxChildren = floor(random(6, 13)); // More branches for trunk
        } else {
            this.maxChildren = floor(random(2, 5)); // Fewer branches for other levels
        }
        
        // Generate child spawn points
        this.childSpawnPoints = [];
        const minHeight = 0.3;  // Start spawning at 30% of branch length
        const maxHeight = 0.9;  // Stop spawning at 90% of branch length
        const heightRange = maxHeight - minHeight;
        
        // Distribute spawn points along the branch
        for (let i = 0; i < this.maxChildren; i++) {
            const baseHeight = minHeight + (heightRange * i / (this.maxChildren - 1));
            const randomOffset = random(-0.1, 0.1);  // Add some randomness
            this.childSpawnPoints.push({
                relativeHeight: constrain(baseHeight + randomOffset, minHeight, maxHeight),
                triggered: false
            });
        }
        
        // Calculate and store position bias for this branch
        this.randomBias = random(0.2, 2.0);
        if (Math.sign(this.angle) !== this.side) {
            this.randomBias *= 0.25; // Reduce bias when angle and side don't match
        }
        
        // Store child branches with their creation times
        this.childBranches = [];
        
        // Leaf properties
        this.numLeaves = floor(random(1, 3));
        this.leafAppearGrowth = random(0.2, 0.9);
        this.leaves = [];
        
        // Initialize leaves
        for (let i = 0; i < this.numLeaves; i++) {
            this.leaves.push({
                size: LEAF_SIZE,
                rotation: random(-PI/3.6, PI/3.6),  // Change to ±50 degrees (PI/3.6 ≈ 0.873 radians)
                growth: 0,
                growthRate: 0.01 * SCENE_SPEED,
                colorVariation: random(0.9, 1.1)
            });
        }
        
        // Simplify caching - store vertices instead of graphics
        this.cachedVertices = null;
        this.isFullyGrown = false;
        
        // PIXI graphics objects
        this.graphics = new PIXI.Container();
        this.branchGraphics = new PIXI.Graphics();
        this.leafGraphics = new PIXI.Graphics();
        this.debugGraphics = new PIXI.Graphics();
        
        // Add graphics objects to container
        this.graphics.addChild(this.branchGraphics);
        this.graphics.addChild(this.leafGraphics);
        this.graphics.addChild(this.debugGraphics);
    }

    addChild(relativeHeight) {
        const childLength = this.length * random(0.4, 0.7);
        const childWidth = this.width * 0.6;
        const childAngle = random(-1.22, 1.22);
        const side = random() < 0.5 ? -1 : 1;
        
        if (this.level < MAX_BRANCH_LEVELS) {
            const child = new Branch({
                length: childLength,
                width: childWidth,
                angle: childAngle,
                level: this.level + 1,
                side: side,
                relativeHeight: relativeHeight,
                level0Width: this.level0Width,
                colorVariation: this.colorVariation,
                parent: this
            });
            
            this.childBranches.push({
                branch: child,
                creationTime: performance.now()
            });
            
            this.children.push(child);
        }
    }

    startGrowing() {
        this.shouldStartGrowing = true;
        this.growthStartTime = performance.now();
    }

    update() {
        const now = performance.now();
        
        // Initialize growth start time if not set
        if (this.growthStartTime === null) {
            // For root branch (level 0), wait for explicit start
            if (this.level === 0) {
                if (!this.shouldStartGrowing) return;
                this.growthStartTime = now;
            } 
            // For other branches, wait for the delay after parent starts
            else if (this.parent && this.parent.growthStartTime && 
                     (now - this.creationTime >= CHILD_BRANCH_DELAY)) {
                this.growthStartTime = now;
            }
        }
        
        // Only update growth if we've started growing
        if (this.growthStartTime !== null) {
            const growthElapsed = now - this.growthStartTime;
            this.growth = constrain(growthElapsed / BRANCH_GROWTH_TIME, 0, 1);
            
            // Check spawn points for adding new branches
            for (let spawnPoint of this.childSpawnPoints) {
                if (!spawnPoint.triggered && this.growth >= spawnPoint.relativeHeight) {
                    this.addChild(spawnPoint.relativeHeight);
                    spawnPoint.triggered = true;
                }
            }
            
            // Update leaf growth
            if (this.growth >= this.leafAppearGrowth) {
                for (let leaf of this.leaves) {
                    if (leaf.growth < 1) {
                        leaf.growth += leaf.growthRate;
                        leaf.growth = constrain(leaf.growth, 0, 1);
                    }
                }
            }
        }
        
        // Update all children
        for (let childInfo of this.childBranches) {
            childInfo.branch.update();
        }
        
        // Clear cache if not fully grown
        this.cachedVertices = null;
    }

    calculateBranchVertices(currentLength, currentWidth, topWidth) {
        // Calculate curve heights - make bottom curve rounder
        let bottomCurveHeight = currentWidth * 0.3; // Increased from 0.15 to 0.3 for rounder bottom
        let topCurveHeight = topWidth * 0.5;
        
        return {
            vertices: [
                [-currentWidth/2, 0],              // Bottom left
                [-topWidth/2, -currentLength],     // Top left
                [topWidth/2, -currentLength],      // Top right
                [currentWidth/2, 0]                // Bottom right
            ],
            controlPoints: [
                // Top curve
                [-topWidth/2, -currentLength - topCurveHeight],  // Left control point
                [topWidth/2, -currentLength - topCurveHeight],   // Right control point
                // Bottom curve - adjust control points for rounder connection
                [currentWidth/2, bottomCurveHeight],            // Right control point
                [-currentWidth/2, bottomCurveHeight]            // Left control point
            ]
        };
    }

    render(container, parentX, parentY, parentAngle) {
        try {
            // Clear all graphics
            this.branchGraphics.clear();
            this.leafGraphics.clear();
            this.debugGraphics.clear();
            
            // Calculate current position
            let currentX, currentY, currentAngle;
            
            if (parentX !== undefined && parentY !== undefined && parentAngle !== undefined) {
                currentAngle = parentAngle + this.angle * this.side;
                
                // Calculate branch start position relative to parent's current growth
                const parentCurrentLength = this.parent.length * this.parent.growth * this.relativeHeight;
                const offsetX = Math.sin(parentAngle) * parentCurrentLength;
                const offsetY = -Math.cos(parentAngle) * parentCurrentLength;
                
                // Calculate base offset using stored random bias
                const baseOffset = (this.width/2) * 0.3;
                const adjustedBias = this.randomBias * (Math.sign(this.angle) === this.side ? 1.0 : 0.25);
                const sideOffsetX = Math.cos(parentAngle) * this.side * baseOffset * adjustedBias;
                const sideOffsetY = Math.sin(parentAngle) * this.side * baseOffset * adjustedBias;
                
                currentX = parentX + offsetX + sideOffsetX;
                currentY = parentY + offsetY + sideOffsetY;
            } else {
                currentX = this.x;
                currentY = this.y;
                currentAngle = this.angle;
            }

            let currentLength = this.length * this.growth;
            let currentWidth = this.width * this.growth;
            let topWidth = currentWidth * 0.5;
            
            // Calculate end point
            const endX = currentX + Math.sin(currentAngle) * currentLength;
            const endY = currentY - Math.cos(currentAngle) * currentLength;
            
            // Draw branch shape with curves
            const branchColor = adjustColor(BRANCH_COLOR, this.colorVariation);
            this.branchGraphics.lineStyle(0);
            this.branchGraphics.beginFill(branchColor);
            
            // Calculate points for the branch shape
            // Base points are perpendicular to branch angle
            const bottomLeftX = currentX - Math.cos(currentAngle) * (currentWidth/2);
            const bottomLeftY = currentY - Math.sin(currentAngle) * (currentWidth/2);
            const bottomRightX = currentX + Math.cos(currentAngle) * (currentWidth/2);
            const bottomRightY = currentY + Math.sin(currentAngle) * (currentWidth/2);
            
            // Top points
            const topLeftX = endX - Math.cos(currentAngle) * (topWidth/2);
            const topLeftY = endY - Math.sin(currentAngle) * (topWidth/2);
            const topRightX = endX + Math.cos(currentAngle) * (topWidth/2);
            const topRightY = endY + Math.sin(currentAngle) * (topWidth/2);
            
            // Control points for curves
            const bottomCurveHeight = currentWidth * 0.3;
            const topCurveHeight = topWidth * 0.5;
            
            // Draw the branch shape
            this.branchGraphics.moveTo(bottomLeftX, bottomLeftY);
            
            // Left side curve
            const leftCurveStartX = bottomLeftX + Math.sin(currentAngle) * bottomCurveHeight;
            const leftCurveStartY = bottomLeftY - Math.cos(currentAngle) * bottomCurveHeight;
            const leftCurveEndX = topLeftX + Math.sin(currentAngle) * topCurveHeight;
            const leftCurveEndY = topLeftY - Math.cos(currentAngle) * topCurveHeight;
            
            this.branchGraphics.bezierCurveTo(
                leftCurveStartX, leftCurveStartY,
                leftCurveEndX, leftCurveEndY,
                topLeftX, topLeftY
            );
            
            // Top curve
            const topCurveLeftX = topLeftX + Math.sin(currentAngle) * topCurveHeight;
            const topCurveLeftY = topLeftY - Math.cos(currentAngle) * topCurveHeight;
            const topCurveRightX = topRightX + Math.sin(currentAngle) * topCurveHeight;
            const topCurveRightY = topRightY - Math.cos(currentAngle) * topCurveHeight;
            
            this.branchGraphics.bezierCurveTo(
                topCurveLeftX, topCurveLeftY,
                topCurveRightX, topCurveRightY,
                topRightX, topRightY
            );
            
            // Right side curve
            const rightCurveStartX = topRightX + Math.sin(currentAngle) * topCurveHeight;
            const rightCurveStartY = topRightY - Math.cos(currentAngle) * topCurveHeight;
            const rightCurveEndX = bottomRightX + Math.sin(currentAngle) * bottomCurveHeight;
            const rightCurveEndY = bottomRightY - Math.cos(currentAngle) * bottomCurveHeight;
            
            this.branchGraphics.bezierCurveTo(
                rightCurveStartX, rightCurveStartY,
                rightCurveEndX, rightCurveEndY,
                bottomRightX, bottomRightY
            );
            
            // Close the path
            this.branchGraphics.lineTo(bottomLeftX, bottomLeftY);
            this.branchGraphics.endFill();
            
            // Draw leaves if they should be visible
            if (this.growth >= this.leafAppearGrowth && this.level > 0) {
                this.leafGraphics.clear();
                
                for (let leaf of this.leaves) {
                    if (leaf.growth > 0) {
                        const leafColor = adjustColor(LEAF_COLOR, leaf.colorVariation);
                        const currentLeafSize = LEAF_SIZE * leaf.growth;
                        
                        // Calculate leaf base position (attachment point)
                        const leafX = endX + Math.sin(currentAngle + leaf.rotation) * (topWidth/2);
                        const leafY = endY - Math.cos(currentAngle + leaf.rotation) * (topWidth/2);
                        
                        // Draw the leaf shape
                        this.leafGraphics.beginFill(leafColor);
                        this.leafGraphics.lineStyle(1, leafColor);
                        
                        // Calculate the almond shape points
                        const angle = currentAngle + leaf.rotation;
                        const length = currentLeafSize;
                        const width = currentLeafSize * 0.4;
                        
                        // Calculate points relative to base point (leafX, leafY is now the base)
                        const topX = leafX + Math.sin(angle) * length;
                        const topY = leafY - Math.cos(angle) * length;
                        
                        // Calculate the control points for the curves
                        const controlX = leafX + Math.cos(angle) * width + Math.sin(angle) * length/2;
                        const controlY = leafY + Math.sin(angle) * width - Math.cos(angle) * length/2;
                        const control2X = leafX - Math.cos(angle) * width + Math.sin(angle) * length/2;
                        const control2Y = leafY - Math.sin(angle) * width - Math.cos(angle) * length/2;
                        
                        // Draw the almond shape using two quadratic curves
                        this.leafGraphics.moveTo(leafX, leafY);  // Start at base
                        this.leafGraphics.quadraticCurveTo(controlX, controlY, topX, topY);
                        this.leafGraphics.quadraticCurveTo(control2X, control2Y, leafX, leafY);
                        this.leafGraphics.endFill();
                        
                        // Debug visualization when debug mode is on
                        if (isDebugMode()) {
                            // Draw the control points and lines
                            this.debugGraphics.lineStyle(1, 0xFF0000, 0.5);
                            
                            // Draw branch angle line
                            this.debugGraphics.lineStyle(1, 0xFFFF00, 0.5);
                            const branchLineLength = length;
                            this.debugGraphics.moveTo(leafX, leafY);
                            this.debugGraphics.lineTo(
                                leafX + Math.sin(currentAngle) * branchLineLength,
                                leafY - Math.cos(currentAngle) * branchLineLength
                            );
                            
                            // Draw leaf angle line
                            this.debugGraphics.lineStyle(1, 0x00FF00, 0.5);
                            this.debugGraphics.moveTo(leafX, leafY);
                            this.debugGraphics.lineTo(
                                leafX + Math.sin(angle) * branchLineLength,
                                leafY - Math.cos(angle) * branchLineLength
                            );
                            
                            // Draw control points
                            this.debugGraphics.lineStyle(1, 0xFF0000, 0.5);
                            this.debugGraphics.moveTo(leafX, leafY);  // Start at base
                            this.debugGraphics.lineTo(controlX, controlY);
                            this.debugGraphics.lineTo(topX, topY);
                            this.debugGraphics.moveTo(topX, topY);
                            this.debugGraphics.lineTo(control2X, control2Y);
                            this.debugGraphics.lineTo(leafX, leafY);  // Back to base
                            
                            // Draw points
                            this.debugGraphics.beginFill(0xFF0000);
                            this.debugGraphics.drawCircle(leafX, leafY, 2); // Base point
                            this.debugGraphics.beginFill(0x0000FF);
                            this.debugGraphics.drawCircle(topX, topY, 2); // Top point
                            this.debugGraphics.beginFill(0x00FF00);
                            this.debugGraphics.drawCircle(controlX, controlY, 2); // Control point 1
                            this.debugGraphics.drawCircle(control2X, control2Y, 2); // Control point 2
                        }
                    }
                }
            }

            // Draw debug visualization if enabled
            if (isDebugMode()) {
                // Start point
                this.debugGraphics.beginFill(0xFF0000);
                this.debugGraphics.drawCircle(currentX, currentY, 2);
                this.debugGraphics.endFill();
                
                // End point
                this.debugGraphics.beginFill(0x0000FF);
                this.debugGraphics.drawCircle(endX, endY, 2);
                this.debugGraphics.endFill();

                // Draw base line (perpendicular to branch)
                this.debugGraphics.lineStyle(1, 0xFF0000);
                this.debugGraphics.moveTo(bottomLeftX, bottomLeftY);
                this.debugGraphics.lineTo(bottomRightX, bottomRightY);
                
                // Draw top line (perpendicular to branch)
                this.debugGraphics.lineStyle(1, 0x0000FF);
                this.debugGraphics.moveTo(topLeftX, topLeftY);
                this.debugGraphics.lineTo(topRightX, topRightY);

                // Draw leaf debug info if leaves should be visible
                if (this.growth >= this.leafAppearGrowth && this.level > 0) {
                    for (let leaf of this.leaves) {
                        // Calculate leaf position
                        const leafX = endX + Math.sin(currentAngle + leaf.rotation) * (topWidth/2);
                        const leafY = endY - Math.cos(currentAngle + leaf.rotation) * (topWidth/2);
                        
                        // Draw leaf attachment point
                        this.debugGraphics.beginFill(0x00FF00);
                        this.debugGraphics.drawCircle(leafX, leafY, 2);
                        this.debugGraphics.endFill();
                        
                        // Draw leaf direction line
                        this.debugGraphics.lineStyle(1, 0x00FF00);
                        const rotationLineLength = 10;
                        const rotationEndX = leafX + Math.cos(leaf.rotation) * rotationLineLength;
                        const rotationEndY = leafY + Math.sin(leaf.rotation) * rotationLineLength;
                        this.debugGraphics.moveTo(leafX, leafY);
                        this.debugGraphics.lineTo(rotationEndX, rotationEndY);
                        this.debugGraphics.lineStyle(0);
                    }
                }
            }

            // Add to container if not already added
            if (!this.graphics.parent) {
                container.addChild(this.graphics);
            }
            
            // Render children
            for (let child of this.children) {
                child.render(container, currentX, currentY, currentAngle);
            }
        } catch (error) {
            console.error("Error rendering branch:", error);
        }
    }
}

export default Branch; 