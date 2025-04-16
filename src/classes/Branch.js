import { isDebugMode } from '../sketch.js';
import {
    SCENE_SPEED,
    BRANCH_COLOR,
    LEAF_COLOR,
    MAX_BRANCH_LEVELS,
    LEAF_SIZE,
    TRUNK_LENGTH,
    TRUNK_WIDTH,
    TRUNK_ANGLE_RANGE
} from '../utils/constants.js';

class Branch {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.level = options.level || 0;
        
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
        this.growthRate = (2 / (60 * 60)) * SCENE_SPEED * 10;
        this.relativeHeight = options.relativeHeight || 0;
        this.side = options.side || 0;
        
        // Add flag to track if we've added a top branch (for level 0 only)
        this.hasTopBranch = false;
        
        // Color variation: combine tree's variation with individual branch variation
        const branchVariation = random(0.85, 1.15); // ±15% individual variation
        this.colorVariation = (options.colorVariation || 1.0) * branchVariation;
        
        this.level0Width = options.level0Width || this.width;
        
        // Calculate and store position bias for this branch
        this.randomBias = random(0.2, 2.0);
        if (Math.sign(this.angle) !== this.side) {
            this.randomBias *= 0.25;
        }
        
        // Leaf properties
        this.numLeaves = floor(random(1, 3));
        this.leafAppearGrowth = random(0.2, 0.9);
        this.leaves = [];
        
        // Initialize leaves
        for (let i = 0; i < this.numLeaves; i++) {
            this.leaves.push({
                size: LEAF_SIZE,
                rotation: random(-1.22, 1.22) - 3.14159,
                growth: 0,
                growthRate: 0.01 * SCENE_SPEED, // Reduced from 1.0 to 0.1 for smoother growth
                colorVariation: random(0.85, 1.15)
            });
        }
        
        // Branch spawning properties
        this.maxChildren = floor(random(4, 5));
        this.childTriggers = [];
        
        // Scale child trigger points with scene speed
        const minTrigger = 0.3;
        const maxTrigger = 0.9;
        const triggerRange = maxTrigger - minTrigger;
        
        for (let i = 0; i < this.maxChildren; i++) {
            // Distribute triggers more evenly across the growth range
            const basePoint = minTrigger + (triggerRange * i / this.maxChildren);
            const randomOffset = random(-0.1, 0.1) * triggerRange;
            this.childTriggers.push(constrain(basePoint + randomOffset, minTrigger, maxTrigger));
        }
        
        // Simplify caching - store vertices instead of graphics
        this.cachedVertices = null;
        this.isFullyGrown = false;
    }

    addChild() {
        const childLength = this.length * random(0.4, 0.7);
        const childWidth = this.width * 0.6;
        const childAngle = random(-1.22, 1.22);
        
        // For the trunk (level 0), ensure at least one branch is at the top
        let relativeHeight;
        if (this.level === 0 && !this.hasTopBranch && this.children.length === 0) {
            // First branch on trunk - place at top
            relativeHeight = 1.0;
            this.hasTopBranch = true;
        } else {
            relativeHeight = random(0.5, 1);
        }
        
        const side = random() < 0.5 ? -1 : 1;
        
        if (this.level < MAX_BRANCH_LEVELS) {
            this.children.push(new Branch({
                length: childLength,
                width: childWidth,
                angle: childAngle,
                level: this.level + 1,
                side: side,
                relativeHeight: relativeHeight,
                level0Width: this.level0Width,
                colorVariation: this.colorVariation
            }));
        }
    }

    update() {
        const wasFullyGrown = this.growth >= 1;
        
        if (this.growth < 1) {
            this.growth += this.growthRate;
            this.growth = constrain(this.growth, 0, 1);
            
            // Update leaf growth
            if (this.growth >= this.leafAppearGrowth) {
                for (let leaf of this.leaves) {
                    if (leaf.growth < 1) {
                        leaf.growth += leaf.growthRate;
                        leaf.growth = constrain(leaf.growth, 0, 1);
                    }
                }
            }
            
            // Check triggers for adding new branches
            for (let i = this.childTriggers.length - 1; i >= 0; i--) {
                if (this.growth >= this.childTriggers[i]) {
                    this.addChild();
                    this.childTriggers.splice(i, 1);
                }
            }
            
            // Clear cache if not fully grown
            this.cachedVertices = null;
        }
        
        // Check if just reached full growth
        if (!wasFullyGrown && this.growth >= 1) {
            this.isFullyGrown = true;
            // Cache will be created on next draw
        }
        
        // Update all children
        for (let child of this.children) {
            child.update();
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

    draw() {
        push();
        
        // Initial positioning
        if (this.level === 0) {
            translate(this.x, this.y);
            rotate(this.angle);
        }

        let currentLength = this.length * this.growth;
        let currentWidth = this.width * this.growth;
        let topWidth = currentWidth * 0.5;
        
        // Get base color components
        let baseColor = color(BRANCH_COLOR);
        let r = red(baseColor) * this.colorVariation;
        let g = green(baseColor) * this.colorVariation;
        let b = blue(baseColor) * this.colorVariation;
        fill(r, g, b);
        noStroke();
        
        if (this.isFullyGrown) {
            // Use cached vertices for fully grown branches
            if (!this.cachedVertices) {
                this.cachedVertices = this.calculateBranchVertices(currentLength, currentWidth, topWidth);
            }
            
            const { vertices, controlPoints } = this.cachedVertices;
            
            beginShape();
            // Draw main shape in a specific order for better curves
            vertex(vertices[0][0], vertices[0][1]);     // Start at bottom left
            vertex(vertices[1][0], vertices[1][1]);     // Top left
            bezierVertex(                               // Top curve
                controlPoints[0][0], controlPoints[0][1],
                controlPoints[1][0], controlPoints[1][1],
                vertices[2][0], vertices[2][1]
            );
            vertex(vertices[3][0], vertices[3][1]);     // Bottom right
            bezierVertex(                               // Bottom curve
                controlPoints[2][0], controlPoints[2][1],
                controlPoints[3][0], controlPoints[3][1],
                vertices[0][0], vertices[0][1]          // Back to start
            );
            endShape(CLOSE);
        } else {
            // Draw shape for growing branches
            beginShape();
            // Bottom left
            vertex(-currentWidth/2, 0);
            // Top left
            vertex(-topWidth/2, -currentLength);
            
            // Top curve
            bezierVertex(
                -topWidth/2, -currentLength - topWidth * 0.5,
                topWidth/2, -currentLength - topWidth * 0.5,
                topWidth/2, -currentLength
            );
            
            // Bottom right
            vertex(currentWidth/2, 0);
            
            // Bottom curve - match the rounder curve of cached version
            bezierVertex(
                currentWidth/2, currentWidth * 0.3,    // Match the 0.3 multiplier from calculateBranchVertices
                -currentWidth/2, currentWidth * 0.3,
                -currentWidth/2, 0
            );
            
            endShape(CLOSE);
        }
        
        // Draw debug info
        this.drawDebug(0, 0, currentLength);
        
        // Draw leaves
        if (this.growth >= this.leafAppearGrowth) {
            push();
            translate(0, -currentLength);
            
            for (let leaf of this.leaves) {
                if (leaf.growth > 0) {
                    push();
                    rotate(leaf.rotation);
                    
                    let leafSize = this.level0Width * leaf.size * leaf.growth;
                    let width = leafSize;
                    let height = width * 1.2;
                    
                    let cp1x = width * 0.4;
                    let cp1y = height * 0.15;
                    let cp2x = width * 0.4;
                    let cp2y = height * 0.85;
                    
                    // Apply color variation to leaf
                    let leafBaseColor = color(LEAF_COLOR);
                    let leafR = red(leafBaseColor) * leaf.colorVariation;
                    let leafG = green(leafBaseColor) * leaf.colorVariation;
                    let leafB = blue(leafBaseColor) * leaf.colorVariation;
                    fill(leafR, leafG, leafB);
                    noStroke();
                    
                    beginShape();
                    vertex(0, 0);
                    bezierVertex(cp1x, cp1y, cp1x, height/2, 0, height);
                    bezierVertex(-cp2x, height/2, -cp2x, cp1y, 0, 0);
                    endShape(CLOSE);
                    
                    pop();
                }
            }
            pop();
        }
        
        // Draw children
        for (let child of this.children) {
            push();
            let branchStartY = -currentLength * child.relativeHeight;
            
            // Calculate base offset using stored random bias
            let baseOffset = (currentWidth/2 - child.width/2) * 0.3;
            let branchStartX = child.side * baseOffset * child.randomBias;
            
            translate(0, branchStartY);
            translate(branchStartX, 0);
            rotate(child.angle * child.side);
            child.draw();
            pop();
        }
        
        pop();
    }

    drawDebug(x, y, currentLength) {
        if (!isDebugMode()) return;
        
        push();
        noStroke();
        fill(255, 0, 0);
        ellipse(x, y, 8, 8);
        
        fill(0);
        textSize(12);
        textAlign(LEFT);
        text(`Level: ${this.level}`, x + 10, y);
        text(`Growth: ${nf(this.growth, 1, 2)}`, x + 10, y + 15);
        pop();
    }
}

export default Branch; 