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
    CHILD_BRANCH_DELAY,
    BRANCH_MIN_LENGTH,
    BRANCH_MAX_LENGTH,
    BRANCH_MIN_WIDTH,
    BRANCH_MAX_WIDTH,
    BRANCH_SIDE_ANGLE_RANGE,
    BRANCH_END_ANGLE_RANGE,
    BRANCH_MIN_SPAWN_HEIGHT,
    BRANCH_MAX_SPAWN_HEIGHT,
    BRANCH_SPAWN_RANDOM_OFFSET,
    TRUNK_MIN_BRANCHES,
    TRUNK_MAX_BRANCHES,
    BRANCH_MIN_CHILDREN,
    BRANCH_MAX_CHILDREN,
    LEAF_MIN_COUNT,
    LEAF_MAX_COUNT,
    LEAF_WIDTH_RATIO,
    LEAF_MIN_GROWTH,
    LEAF_MAX_GROWTH,
    LEAF_GROWTH_RATE,
    COLOR_VARIATION_RANGE,
    LEAF_ANGLE_RANGE,
    CHILD_LENGTH_MIN_RATIO,
    CHILD_LENGTH_MAX_RATIO,
    CHILD_WIDTH_RATIO,
    BRANCH_TOP_WIDTH_RATIO
} from '../utils/constants.js';
import { random, floor, constrain, PI, adjustColor } from '../utils/math.js';

// Helper function to convert degrees to radians
const toRadians = degrees => degrees * PI / 180;

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
            this.angle = toRadians(random(-TRUNK_ANGLE_RANGE, TRUNK_ANGLE_RANGE));
        } else {
            this.length = options.length || random(BRANCH_MIN_LENGTH, BRANCH_MAX_LENGTH);
            this.width = options.width || random(BRANCH_MIN_WIDTH, BRANCH_MAX_WIDTH);
            this.angle = options.angle || toRadians(random(-20, 20));
        }
        
        this.growth = 0;
        this.children = [];
        this.creationTime = performance.now() / 1000; // Store in seconds
        this.growthStartTime = null;
        this.shouldStartGrowing = false;
        this.growthRate = 1.0 / BRANCH_GROWTH_TIME; // Rate is now correctly in per-second
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
            this.maxChildren = floor(random(TRUNK_MIN_BRANCHES, TRUNK_MAX_BRANCHES));
        } else {
            this.maxChildren = floor(random(BRANCH_MIN_CHILDREN, BRANCH_MAX_CHILDREN));
        }
        
        // Generate child spawn points
        this.childSpawnPoints = [];
        
        // First, add a spawn point at the end of the branch
        this.childSpawnPoints.push({
            relativeHeight: 1.0,
            triggered: false,
            isEndPoint: true
        });
        
        // Then distribute remaining spawn points along the branch
        const remainingChildren = this.maxChildren - 1;
        for (let i = 0; i < remainingChildren; i++) {
            const baseHeight = BRANCH_MIN_SPAWN_HEIGHT + 
                             (BRANCH_MAX_SPAWN_HEIGHT - BRANCH_MIN_SPAWN_HEIGHT) * 
                             i / (remainingChildren - 1 || 1);
            const randomOffset = random(-BRANCH_SPAWN_RANDOM_OFFSET, BRANCH_SPAWN_RANDOM_OFFSET);
            this.childSpawnPoints.push({
                relativeHeight: constrain(baseHeight + randomOffset, BRANCH_MIN_SPAWN_HEIGHT, BRANCH_MAX_SPAWN_HEIGHT),
                triggered: false,
                isEndPoint: false
            });
        }
        
        // Sort spawn points by height to maintain proper growth order
        this.childSpawnPoints.sort((a, b) => a.relativeHeight - b.relativeHeight);
        
        // Calculate and store position bias for this branch
        this.randomBias = random(0.2, 2.0);
        if (Math.sign(this.angle) !== this.side) {
            this.randomBias *= 0.25;
        }
        
        // Store child branches with their creation times
        this.childBranches = [];
        
        // Leaf properties
        this.leafAppearGrowth = random(LEAF_MIN_GROWTH, LEAF_MAX_GROWTH);
        this.leaves = [];
        const numLeaves = floor(random(LEAF_MIN_COUNT, LEAF_MAX_COUNT));
        
        // Initialize leaves with fixed rotations
        for (let i = 0; i < numLeaves; i++) {
            this.leaves.push({
                size: LEAF_SIZE,
                rotation: toRadians(random(-LEAF_ANGLE_RANGE, LEAF_ANGLE_RANGE)), // Cache the rotation
                growth: 0,
                growthRate: LEAF_GROWTH_RATE * SCENE_SPEED,
                colorVariation: random(1 - COLOR_VARIATION_RANGE, 1 + COLOR_VARIATION_RANGE)
            });
        }
        
        // Simplify caching - store vertices instead of graphics
        this.cachedVertices = null;
        this.hasFullyGrown = false;
        
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

    addChild(relativeHeight, isEndPoint) {
        const childLength = this.length * random(CHILD_LENGTH_MIN_RATIO, CHILD_LENGTH_MAX_RATIO);
        const childWidth = this.width * CHILD_WIDTH_RATIO;
        
        // Adjust angle range based on whether this is an end point branch
        const angleRange = isEndPoint ? BRANCH_END_ANGLE_RANGE : BRANCH_SIDE_ANGLE_RANGE;
        const childAngle = toRadians(random(-angleRange, angleRange));
        
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
        this.growthStartTime = performance.now() / 1000; // Store in seconds
    }

    update(deltaTime) {
        // Only update if we have delta time
        if (deltaTime === undefined) return;
        
        const now = performance.now() / 1000; // Current time in seconds
        
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
                this.shouldStartGrowing = true;
            }
        }
        
        // Only update growth if we've started growing
        if (this.shouldStartGrowing) {
            // Update growth based on delta time
            this.growth = Math.min(this.growth + (this.growthRate * deltaTime), 1);
            
            // Check spawn points for adding new branches
            for (let spawnPoint of this.childSpawnPoints) {
                if (!spawnPoint.triggered && this.growth >= spawnPoint.relativeHeight) {
                    this.addChild(spawnPoint.relativeHeight, spawnPoint.isEndPoint);
                    spawnPoint.triggered = true;
                }
            }
            
            // Update leaf growth
            if (this.growth >= this.leafAppearGrowth) {
                const leafGrowthRate = LEAF_GROWTH_RATE * deltaTime;
                for (let leaf of this.leaves) {
                    if (leaf.growth < 1) {
                        leaf.growth = Math.min(leaf.growth + leafGrowthRate, 1);
                    }
                }
            }
        }
        
        // Update all children
        for (let childInfo of this.childBranches) {
            if (this.growth >= childInfo.branch.relativeHeight) {
                childInfo.branch.startGrowing();
            }
            childInfo.branch.update(deltaTime);
        }
        
        // Clear cache if not fully grown
        if (this.growth < 1) {
            this.cachedVertices = null;
        }
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
            let topWidth = currentWidth * BRANCH_TOP_WIDTH_RATIO;
            
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
            
            // Control points for curves - increased bottom curve height for rounder bottom
            const bottomCurveHeight = currentWidth * 0.5;  // Increased from 0.3 to 0.5 for rounder bottom
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
            
            // Bottom curve - added explicit bottom curve for rounder bottom
            const bottomCurveLeftX = bottomRightX - Math.sin(currentAngle) * bottomCurveHeight;
            const bottomCurveLeftY = bottomRightY + Math.cos(currentAngle) * bottomCurveHeight;
            const bottomCurveRightX = bottomLeftX - Math.sin(currentAngle) * bottomCurveHeight;
            const bottomCurveRightY = bottomLeftY + Math.cos(currentAngle) * bottomCurveHeight;
            
            this.branchGraphics.bezierCurveTo(
                bottomCurveLeftX, bottomCurveLeftY,
                bottomCurveRightX, bottomCurveRightY,
                bottomLeftX, bottomLeftY
            );
            
            this.branchGraphics.endFill();
            
            // Draw leaves if they should be visible
            if (this.growth >= this.leafAppearGrowth && this.level > 0) {
                this.leafGraphics.clear();
                
                // Calculate branch end point once
                const endX = currentX + Math.sin(currentAngle) * currentLength;
                const endY = currentY - Math.cos(currentAngle) * currentLength;
                const topWidth = currentWidth * 0.5;
                
                for (let leaf of this.leaves) {
                    if (leaf.growth > 0) {
                        const leafColor = adjustColor(LEAF_COLOR, leaf.colorVariation);
                        const currentLeafSize = LEAF_SIZE * leaf.growth;
                        
                        // Calculate leaf base position using cached rotation
                        const leafX = endX + Math.sin(currentAngle + leaf.rotation) * (topWidth/2);
                        const leafY = endY - Math.cos(currentAngle + leaf.rotation) * (topWidth/2);
                        
                        // Draw the leaf shape
                        this.leafGraphics.beginFill(leafColor);
                        this.leafGraphics.lineStyle(1, leafColor);
                        
                        // Calculate the almond shape points
                        const angle = currentAngle + leaf.rotation;
                        const length = currentLeafSize;
                        const width = currentLeafSize * LEAF_WIDTH_RATIO;
                        
                        // Calculate points relative to base point
                        const topX = leafX + Math.sin(angle) * length;
                        const topY = leafY - Math.cos(angle) * length;
                        
                        // Calculate the control points for the curves
                        const controlX = leafX + Math.cos(angle) * width + Math.sin(angle) * length/2;
                        const controlY = leafY + Math.sin(angle) * width - Math.cos(angle) * length/2;
                        const control2X = leafX - Math.cos(angle) * width + Math.sin(angle) * length/2;
                        const control2Y = leafY - Math.sin(angle) * width - Math.cos(angle) * length/2;
                        
                        // Draw the almond shape using two quadratic curves
                        this.leafGraphics.moveTo(leafX, leafY);
                        this.leafGraphics.quadraticCurveTo(controlX, controlY, topX, topY);
                        this.leafGraphics.quadraticCurveTo(control2X, control2Y, leafX, leafY);
                        this.leafGraphics.endFill();
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

    isFullyGrown() {
        // Check if this branch is fully grown
        if (this.growth < 1) return false;
        
        // Check if all leaves are fully grown
        for (const leaf of this.leaves) {
            if (leaf.growth < 1) return false;
        }
        
        // Check if all child branches are fully grown
        for (const childInfo of this.childBranches) {
            if (!childInfo.branch.isFullyGrown()) return false;
        }
        
        return true;
    }
}

export default Branch; 