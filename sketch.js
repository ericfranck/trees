// Initialize PIXI Application
console.log("Initializing PIXI Application");

// Constants (will be moved to a separate file later)
const SCENE_SPEED = 1.0;
const TREE_SPACING = 500;
const MAX_BRANCH_LEVELS = 4;
const TRUNK_LENGTH = 250;
const TRUNK_WIDTH = 40;
const TRUNK_ANGLE_RANGE = 20;
const MIN_SPAWN_INTERVAL = 2000;
const BRANCH_COLOR = 0x9E958A;
const LEAF_COLOR = 0x7C7F4A;
const SKY_COLOR = 0x7AB9D4;

// Create the PIXI Application
const app = new PIXI.Application({
    width: window.innerWidth,
    height: 900, // Fixed height of 900px
    backgroundColor: SKY_COLOR,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true
});

// In tests, canvasContainer may not exist
const canvasContainer = document.getElementById('canvasContainer');
if (canvasContainer) {
    canvasContainer.appendChild(app.view);
} else {
    // During tests, just add it to the body or do nothing
    if (document.body) {
        document.body.appendChild(app.view);
    }
}
console.log("PIXI Application initialized");

// Global state
let trees = [];
let scrollX = 0;
let lastTreeX = 0;
let debugMode = false;
let isPaused = false;
let hasStarted = false;
let lastSpawnTime = 0;
let fpsBuffer = [];
const FPS_BUFFER_SIZE = 30;

// HTML elements
let startBtn;
let pauseBtn;
let debugBtn;
let fpsCounter;

// Utility functions to replace p5.js functionality
function random(min, max) {
    if (max === undefined) {
        max = min;
        min = 0;
    }
    return min + Math.random() * (max - min);
}

function floor(value) {
    return Math.floor(value);
}

function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Angle conversion
const PI = Math.PI;
function degrees(rad) { return rad * 180 / PI; }
function radians(deg) { return deg * PI / 180; }

// Text formatting
function nf(num, left, right) {
    return num.toFixed(right);
}

console.log("Utility functions defined");

// Branch class
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
            this.length = options.length || random(225, 375);
            this.width = options.width || random(30, 45);
            this.angle = options.angle || random(-20, 20) * PI/180;
        }
        
        this.growth = 0;
        this.children = [];
        this.growthRate = (2 / (60 * 60)) * 4 * SCENE_SPEED;
        this.relativeHeight = options.relativeHeight || 0;
        this.side = options.side || 0;
        
        // Add flag to track if we've added a top branch (for level 0 only)
        this.hasTopBranch = false;
        
        // Color variation: combine tree's variation with individual branch variation
        const branchVariation = random(0.85, 1.15); // ±15% individual variation
        this.colorVariation = (options.colorVariation || 1.0) * branchVariation;
        
        // Store level 0 width for leaf sizing
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
                size: 0.45, // LEAF_SIZE
                rotation: random(-1.22, 1.22) - 3.14159,
                growth: 0,
                growthRate: 0.01 * SCENE_SPEED, // Reduced for smoother growth
                colorVariation: random(0.85, 1.15)
            });
        }
        
        // Branch spawning properties
        if (this.level === 0) {
            this.maxChildren = floor(random(6, 13));
        } else {
            this.maxChildren = floor(random(2, 5));
        }
        
        this.childTriggers = [];
        
        // Scale child trigger points
        const minTrigger = 0.3;
        const maxTrigger = 0.9;
        const triggerRange = maxTrigger - minTrigger;
        
        for (let i = 0; i < this.maxChildren; i++) {
            // Distribute triggers more evenly across the growth range
            const basePoint = minTrigger + (triggerRange * i / this.maxChildren);
            const randomOffset = random(-0.1, 0.1) * triggerRange;
            this.childTriggers.push(constrain(basePoint + randomOffset, minTrigger, maxTrigger));
        }
        
        // PIXI graphics object
        this.graphics = new PIXI.Graphics();
        
        // Cache for branch vertices
        this.cachedVertices = null;
        this.isFullyGrown = false;
    }

    addChild() {
        const childLength = this.length * random(0.4, 0.7);
        const childWidth = this.width * 0.6;
        const childAngle = random(-1.22, 1.22);
        let relativeHeight;
        
        // For the trunk (level 0), ensure at least one branch is at the top
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

    draw(container, parentX, parentY, parentAngle) {
        try {
            this.graphics.clear();
            
            // Calculate current position
            let currentX, currentY, currentAngle;
            
            if (parentX !== undefined && parentY !== undefined && parentAngle !== undefined) {
                currentAngle = parentAngle + this.angle * this.side;
                
                // Calculate branch start position relative to parent
                const parentLength = this.relativeHeight * this.length; // How far up the parent branch
                const offsetX = Math.sin(parentAngle) * parentLength;
                const offsetY = -Math.cos(parentAngle) * parentLength;
                
                // Calculate base offset using stored random bias
                const baseOffset = (this.width/2) * 0.3;
                const sideOffsetX = Math.cos(parentAngle) * this.side * baseOffset * this.randomBias;
                const sideOffsetY = Math.sin(parentAngle) * this.side * baseOffset * this.randomBias;
                
                currentX = parentX + offsetX + sideOffsetX;
                currentY = parentY + offsetY + sideOffsetY;
            } else {
                currentX = this.x;
                currentY = this.y;
                currentAngle = this.angle;
            }
            
            const currentLength = this.length * this.growth;
            const currentWidth = this.width * this.growth;
            const topWidth = currentWidth * 0.5;
            
            // Get end point of branch
            const endX = currentX + Math.sin(currentAngle) * currentLength;
            const endY = currentY - Math.cos(currentAngle) * currentLength;
            
            // Apply color variation to branches
            const branchColor = BRANCH_COLOR;
            
            // Get the branch color with variation
            const r = ((branchColor >> 16) & 0xFF) / 255 * this.colorVariation;
            const g = ((branchColor >> 8) & 0xFF) / 255 * this.colorVariation;
            const b = (branchColor & 0xFF) / 255 * this.colorVariation;
            
            // Convert back to hex
            const colorValue = (
                Math.floor(r * 255) << 16 |
                Math.floor(g * 255) << 8 |
                Math.floor(b * 255)
            );
            
            // Use cached vertices if fully grown and cached
            if (this.isFullyGrown && this.cachedVertices) {
                const { vertices, controlPoints } = this.cachedVertices;
                
                // Draw using the cached vertices
                this.graphics.beginFill(colorValue);
                
                // Draw the branch shape
                this.graphics.moveTo(currentX + vertices[0][0], currentY + vertices[0][1]);
                this.graphics.lineTo(endX + vertices[1][0], endY + vertices[1][1]);
                
                // Draw the top curve using bezier
                this.graphics.bezierCurveTo(
                    endX + controlPoints[0][0], endY + controlPoints[0][1],
                    endX + controlPoints[1][0], endY + controlPoints[1][1],
                    endX + vertices[2][0], endY + vertices[2][1]
                );
                
                this.graphics.lineTo(currentX + vertices[3][0], currentY + vertices[3][1]);
                
                // Draw the bottom curve using bezier
                this.graphics.bezierCurveTo(
                    currentX + controlPoints[2][0], currentY + controlPoints[2][1],
                    currentX + controlPoints[3][0], currentY + controlPoints[3][1],
                    currentX + vertices[0][0], currentY + vertices[0][1]
                );
                
                this.graphics.endFill();
            } else {
                // Calculate vertices for this branch
                if (this.isFullyGrown) {
                    this.cachedVertices = this.calculateBranchVertices(currentLength, currentWidth, topWidth);
                }
                
                // Get the four corners of the branch (trapezoid)
                const bottomLeft = {
                    x: currentX - Math.cos(currentAngle) * (currentWidth/2),
                    y: currentY - Math.sin(currentAngle) * (currentWidth/2)
                };
                
                const bottomRight = {
                    x: currentX + Math.cos(currentAngle) * (currentWidth/2),
                    y: currentY + Math.sin(currentAngle) * (currentWidth/2)
                };
                
                const topLeft = {
                    x: endX - Math.cos(currentAngle) * (topWidth/2),
                    y: endY - Math.sin(currentAngle) * (topWidth/2)
                };
                
                const topRight = {
                    x: endX + Math.cos(currentAngle) * (topWidth/2),
                    y: endY + Math.sin(currentAngle) * (topWidth/2)
                };
                
                // Calculate control points for bezier curves
                const topCurveHeight = topWidth * 0.5;
                const bottomCurveHeight = currentWidth * 0.3;
                
                const topLeftControl = {
                    x: topLeft.x - Math.sin(currentAngle) * topCurveHeight,
                    y: topLeft.y + Math.cos(currentAngle) * topCurveHeight
                };
                
                const topRightControl = {
                    x: topRight.x - Math.sin(currentAngle) * topCurveHeight,
                    y: topRight.y + Math.cos(currentAngle) * topCurveHeight
                };
                
                const bottomRightControl = {
                    x: bottomRight.x + Math.sin(currentAngle) * bottomCurveHeight,
                    y: bottomRight.y - Math.cos(currentAngle) * bottomCurveHeight
                };
                
                const bottomLeftControl = {
                    x: bottomLeft.x + Math.sin(currentAngle) * bottomCurveHeight,
                    y: bottomLeft.y - Math.cos(currentAngle) * bottomCurveHeight
                };
                
                // Draw the branch shape using bezier curves
                this.graphics.beginFill(colorValue);
                
                this.graphics.moveTo(bottomLeft.x, bottomLeft.y);
                this.graphics.lineTo(topLeft.x, topLeft.y);
                
                // Top curve
                this.graphics.bezierCurveTo(
                    topLeftControl.x, topLeftControl.y,
                    topRightControl.x, topRightControl.y,
                    topRight.x, topRight.y
                );
                
                this.graphics.lineTo(bottomRight.x, bottomRight.y);
                
                // Bottom curve
                this.graphics.bezierCurveTo(
                    bottomRightControl.x, bottomRightControl.y,
                    bottomLeftControl.x, bottomLeftControl.y,
                    bottomLeft.x, bottomLeft.y
                );
                
                this.graphics.endFill();
            }
            
            // Draw leaves
            if (this.growth >= this.leafAppearGrowth) {
                for (let leaf of this.leaves) {
                    if (leaf.growth <= 0) continue;
                    
                    const leafAngle = currentAngle + leaf.rotation;
                    const leafSize = this.level0Width * leaf.size * leaf.growth;
                    const leafWidth = leafSize;
                    const leafHeight = leafWidth * 1.2;
                    
                    // Apply leaf color variation
                    const leafBaseColor = LEAF_COLOR;
                    const lr = ((leafBaseColor >> 16) & 0xFF) / 255 * leaf.colorVariation;
                    const lg = ((leafBaseColor >> 8) & 0xFF) / 255 * leaf.colorVariation;
                    const lb = (leafBaseColor & 0xFF) / 255 * leaf.colorVariation;
                    
                    const leafColorValue = (
                        Math.floor(lr * 255) << 16 |
                        Math.floor(lg * 255) << 8 |
                        Math.floor(lb * 255)
                    );
                    
                    // Draw bezier leaf shape
                    this.graphics.beginFill(leafColorValue, 0.8); // Add transparency
                    
                    // Calculate leaf points
                    const leafX = endX;
                    const leafY = endY;
                    
                    const cp1x = leafX + Math.cos(leafAngle) * leafWidth * 0.4;
                    const cp1y = leafY + Math.sin(leafAngle) * leafWidth * 0.4;
                    
                    const cp2x = leafX + Math.cos(leafAngle) * leafWidth * 0.4;
                    const cp2y = leafY + Math.sin(leafAngle) * (leafHeight - leafWidth * 0.4);
                    
                    const endLeafX = leafX + Math.cos(leafAngle) * leafHeight;
                    const endLeafY = leafY + Math.sin(leafAngle) * leafHeight;
                    
                    const cp3x = leafX - Math.cos(leafAngle) * leafWidth * 0.4;
                    const cp3y = leafY - Math.sin(leafAngle) * leafWidth * 0.4;
                    
                    const cp4x = leafX - Math.cos(leafAngle) * leafWidth * 0.4;
                    const cp4y = leafY - Math.sin(leafAngle) * (leafHeight - leafWidth * 0.4);
                    
                    // Draw the leaf shape using bezier curves
                    this.graphics.moveTo(leafX, leafY);
                    
                    // Right side curve
                    this.graphics.bezierCurveTo(
                        cp1x, cp1y,
                        cp2x, cp2y,
                        endLeafX, endLeafY
                    );
                    
                    // Left side curve
                    this.graphics.bezierCurveTo(
                        cp4x, cp4y,
                        cp3x, cp3y,
                        leafX, leafY
                    );
                    
                    this.graphics.endFill();
                }
            }
            
            container.addChild(this.graphics);
            
            // Draw debug information if needed
            if (debugMode) {
                // Debug connection path from parent to this branch
                if (parentX !== undefined && parentY !== undefined) {
                    // Line from parent to branch start
                    this.graphics.lineStyle(1, 0xFF0000);
                    this.graphics.moveTo(parentX, parentY);
                    this.graphics.lineTo(currentX, currentY);
                    this.graphics.lineStyle(0);
                }
                
                // Debug point at branch start
                this.graphics.beginFill(0xFF0000);
                this.graphics.drawCircle(currentX, currentY, 4);
                this.graphics.endFill();
                
                // Debug point at branch end
                this.graphics.beginFill(0x0000FF);
                this.graphics.drawCircle(endX, endY, 4);
                this.graphics.endFill();
                
                // Show leaf rotation axis
                if (this.growth >= this.leafAppearGrowth) {
                    for (let leaf of this.leaves) {
                        if (leaf.growth <= 0) continue;
                        
                        const leafAngle = currentAngle + leaf.rotation;
                        const leafSize = this.level0Width * leaf.size * leaf.growth;
                        
                        // Draw leaf axis
                        this.graphics.lineStyle(1, 0x00FF00);
                        this.graphics.moveTo(endX, endY);
                        const axisEndX = endX + Math.cos(leafAngle) * leafSize * 1.5;
                        const axisEndY = endY + Math.sin(leafAngle) * leafSize * 1.5;
                        this.graphics.lineTo(axisEndX, axisEndY);
                        this.graphics.lineStyle(0);
                    }
                }
                
                // Debug info text
                const debugText = new PIXI.Text(
                    `Level: ${this.level}\nGrowth: ${nf(this.growth, 1, 2)}\nAngle: ${nf(degrees(currentAngle), 1, 0)}°`,
                    { fontFamily: 'Arial', fontSize: 10, fill: 0xFFFFFF }
                );
                debugText.position.set(currentX + 10, currentY);
                // Add shadow for better visibility
                debugText.style.dropShadow = true;
                debugText.style.dropShadowColor = 0x000000;
                debugText.style.dropShadowDistance = 1;
                this.graphics.addChild(debugText);
            }
            
            // Draw children
            for (let child of this.children) {
                child.draw(container, endX, endY, currentAngle);
            }
        } catch (error) {
            console.error("Error drawing branch:", error);
        }
    }
}

console.log("Branch class defined");

class Tree {
    constructor(x, y) {
        console.log(`Creating tree at ${x}, ${y}`);
        // Random color variation between 0.9 and 1.1 (±10% variation)
        const colorVar = random(0.9, 1.1);
        
        // Create the trunk (root branch)
        this.root = new Branch({
            x: x,
            y: y,
            level: 0,
            colorVariation: colorVar
        });
        
        // Create container for this tree
        this.container = new PIXI.Container();
        
        // Add containers to stage
        app.stage.addChild(this.container);
    }

    update() {
        this.root.update();
    }

    draw() {
        try {
            // Clear previous drawings
            this.container.removeChildren();
            
            // Draw the tree
            this.root.draw(this.container);
        } catch (error) {
            console.error("Error drawing tree:", error);
        }
    }
}

console.log("Tree class defined");

// Debug UI container
const debugContainer = new PIXI.Container();
app.stage.addChild(debugContainer);

// Debug text
let debugText = new PIXI.Text('', {
    fontFamily: 'Arial',
    fontSize: 14,
    fill: 0xFFFFFF,
    align: 'left'
});
debugText.position.set(10, 10);
debugContainer.addChild(debugText);

// FPS tracking
let lastTime = typeof performance !== 'undefined' ? performance.now() : 0;
let frameCount = 0;
let fps = 0;

// Setup function
function setup() {
    console.log("Setting up");
    
    // Get HTML elements - these might not exist in tests
    try {
        startBtn = document.getElementById('startBtn');
        pauseBtn = document.getElementById('pauseBtn');
        debugBtn = document.getElementById('debugBtn');
        fpsCounter = document.getElementById('fpsCounter');
        
        // Only setup DOM events if we're in a browser environment
        if (startBtn && pauseBtn && debugBtn) {
            // Initially hide pause button until started
            pauseBtn.style.display = 'none';
            
            // Setup button event handlers
            startBtn.addEventListener('click', () => {
                if (!hasStarted) {
                    startGrowing();
                }
            });
            
            pauseBtn.addEventListener('click', () => {
                togglePause();
            });
            
            debugBtn.addEventListener('click', () => {
                toggleDebug();
            });
        }
    } catch (error) {
        console.warn('HTML elements not available (likely in test environment)');
    }
    
    // Set up keyboard listeners
    if (typeof window !== 'undefined') {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', onResize);
    }
    
    // Set up ticker
    app.ticker.add(gameLoop);
    
    console.log("Setup complete");
}

function startGrowing() {
    hasStarted = true;
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'block';
    
    // Create first tree at the right edge
    const initialX = app.renderer.width + TREE_SPACING;
    trees.push(new Tree(initialX, app.renderer.height));
    lastTreeX = initialX;
    
    // Set initial scroll position so tree starts at growth trigger
    const growthTriggerX = app.renderer.width - (app.renderer.width/3);
    scrollX = initialX - growthTriggerX;
    
    lastSpawnTime = performance.now();
    console.log("Started growing trees");
}

function togglePause() {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume (P)' : 'Pause (P)';
    console.log(`Paused: ${isPaused ? 'ON' : 'OFF'}`);
}

function toggleDebug() {
    debugMode = !debugMode;
    debugBtn.textContent = debugMode ? 'Hide Debug (D)' : 'Show Debug (D)';
    console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
}

function onKeyDown(e) {
    if (e.key === 'd' || e.key === 'D') {
        toggleDebug();
    } else if (e.key === 'p' || e.key === 'P') {
        if (hasStarted) {
            togglePause();
        }
    }
}

function onResize() {
    app.renderer.resize(window.innerWidth, 900);
    console.log(`Resized to ${window.innerWidth}x900`);
}

function drawDebugInfo() {
    if (!debugMode) {
        debugContainer.visible = false;
        return;
    }
    
    debugContainer.visible = true;
    
    // Calculate average FPS from buffer
    const avgFps = fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length || 0;
    
    // Update debug text
    debugText.text = `FPS: ${Math.round(avgFps)} | Trees: ${trees.length} | Scroll: ${Math.round(scrollX)}`;
    
    // Draw pause indicator
    if (isPaused) {
        const pauseText = new PIXI.Text('PAUSED', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center'
        });
        pauseText.position.set(app.renderer.width / 2, 40);
        pauseText.anchor.set(0.5);
        debugContainer.addChild(pauseText);
    }
    
    // Draw scroll position indicator
    const scrollIndicator = new PIXI.Graphics();
    scrollIndicator.beginFill(0xFF0000, 0.5);
    scrollIndicator.drawRect(0, app.renderer.height - 20, app.renderer.width, 10);
    scrollIndicator.endFill();
    
    // Draw tree positions on indicator
    for (let tree of trees) {
        const screenX = tree.root.x - scrollX;
        const markerX = (screenX / app.renderer.width) * app.renderer.width;
        
        if (markerX >= 0 && markerX <= app.renderer.width) {
            scrollIndicator.beginFill(0x00FF00);
            scrollIndicator.drawCircle(markerX, app.renderer.height - 15, 5);
            scrollIndicator.endFill();
        }
    }
    
    // Draw growth trigger line
    const triggerX = app.renderer.width - (app.renderer.width/3);
    scrollIndicator.lineStyle(2, 0xFFFF00);
    scrollIndicator.moveTo(triggerX, app.renderer.height - 30);
    scrollIndicator.lineTo(triggerX, app.renderer.height - 5);
    scrollIndicator.lineStyle(0);
    
    debugContainer.addChild(scrollIndicator);
}

function gameLoop(delta) {
    try {
        // Clear debug container each frame
        debugContainer.removeChildren();
        debugText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 0xFFFFFF,
            align: 'left'
        });
        debugText.position.set(10, 10);
        debugContainer.addChild(debugText);
        
        // Update FPS counter even when paused
        if (typeof window !== 'undefined' && typeof performance !== 'undefined') {
            const now = performance.now();
            frameCount++;
            
            if (now - lastTime >= 1000) {
                fps = Math.round((frameCount * 1000) / (now - lastTime));
                frameCount = 0;
                lastTime = now;
                
                // Update FPS buffer
                fpsBuffer.push(fps);
                if (fpsBuffer.length > FPS_BUFFER_SIZE) {
                    fpsBuffer.shift();
                }
                
                // Update FPS counter in HTML
                if (fpsCounter) {
                    const avgFps = fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length || 0;
                    fpsCounter.textContent = Math.round(avgFps);
                }
            }
        }
        
        // Skip processing if paused or not started
        if (isPaused || !hasStarted) {
            drawDebugInfo();
            return;
        }
        
        // Update scroll position (move scene to the left)
        scrollX += SCENE_SPEED * 0.75;
        
        // Calculate screen bounds for culling
        const screenLeft = scrollX - 100;  // Include small buffer for removal
        const screenRight = scrollX + app.renderer.width + 100;  // Include buffer for growth
        
        // Update and draw all trees with culling
        for (let i = trees.length - 1; i >= 0; i--) {
            const tree = trees[i];
            
            // Skip trees completely outside view
            if (tree.root.x < screenLeft) {
                // Remove tree from stage
                app.stage.removeChild(tree.container);
                trees.splice(i, 1);  // Remove from array
                continue;
            }
            
            // Calculate screen position
            const screenX = tree.root.x - scrollX;
            
            // Only start growing when tree is 1/3 onto the screen
            if (screenX <= app.renderer.width - (app.renderer.width/3)) {
                tree.update();
            }
            
            // Update tree position based on scroll
            tree.container.position.x = -scrollX;
            tree.draw();
        }
        
        // Add new tree if needed and enough time has passed
        const timeSinceLastSpawn = typeof performance !== 'undefined' ? performance.now() - lastSpawnTime : 0;
        if (lastTreeX < scrollX + app.renderer.width && timeSinceLastSpawn >= MIN_SPAWN_INTERVAL) {
            lastTreeX += TREE_SPACING;
            trees.push(new Tree(lastTreeX, app.renderer.height));
            lastSpawnTime = typeof performance !== 'undefined' ? performance.now() : 0;
            console.log(`Added new tree at ${lastTreeX}. Total trees: ${trees.length}`);
        }
        
        // Draw debug information
        drawDebugInfo();
        
    } catch (error) {
        console.error("Error in game loop:", error);
    }
}

// Start everything when the page is loaded
console.log("Starting application");
if (typeof window !== 'undefined') {
    window.onload = setup;
} else {
    // In test environment, just call setup directly
    setup();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Branch,
        Tree,
        app,
        trees,
        debugMode,
        setup,
        onKeyDown,
        gameLoop,
        isPaused
    };
}

