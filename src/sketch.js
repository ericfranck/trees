import Tree from './classes/Tree.js';
import {
    SCENE_SPEED,
    SKY_COLOR,
    TREE_SPACING,
    MIN_SPAWN_INTERVAL
} from './utils/constants.js';
import { updateScrollX } from './classes/Tree.js';

// WebGL Optimizations
PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(
    PIXI.settings.SPRITE_MAX_TEXTURES,
    16
);

PIXI.settings.RENDER_OPTIONS.antialias = false;
PIXI.settings.RENDER_OPTIONS.forceFXAA = false;
PIXI.settings.ROUND_PIXELS = true;

// Initialize PIXI Application
const app = new PIXI.Application({
    width: window.innerWidth,
    height: 900,
    backgroundColor: SKY_COLOR,
    resolution: Math.min(2, window.devicePixelRatio || 1), // Cap resolution at 2x
    autoDensity: true,
    antialias: false, // Disable antialiasing for better performance
    powerPreference: "high-performance",
    autoStart: false // We'll control the ticker manually
});

// Global state
let trees = [];
let debugMode = false;
let hasStarted = false;
let scrollX = 0;
let lastTreeX = 0;
let lastSpawnTime = 0;
let isPaused = false;
let lastUpdateTime = performance.now() / 1000; // Store in seconds

// Constants for time-based movement
const PIXELS_PER_SECOND = 45; // Approximately matches original speed

// FPS tracking
let fpsBuffer = [];
const FPS_BUFFER_SIZE = 30;

// Create main container for all trees
const worldContainer = new PIXI.Container();
app.stage.addChild(worldContainer);

// Debug container for overlay information
const debugContainer = new PIXI.Container();
app.stage.addChild(debugContainer);  // Back to stage for screen-space coordinates

// Utility functions
function random(min, max) {
    if (max === undefined) {
        max = min;
        min = 0;
    }
    return min + Math.random() * (max - min);
}

function floor(n) {
    return Math.floor(n);
}

function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Initialize function
function initialize() {
    // Add canvas to page and set style
    const canvas = app.view;
    document.getElementById('canvasContainer').appendChild(canvas);
    
    // Setup UI elements
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const debugBtn = document.getElementById('debugBtn');
    
    // Initially hide pause button
    pauseBtn.style.display = 'none';
    
    // Setup button handlers
    startBtn.addEventListener('click', () => {
        if (!hasStarted) {
            hasStarted = true;
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            
            // Position first tree at the growth trigger point
            const growthTriggerX = app.screen.width - (app.screen.width/3);
            const initialX = growthTriggerX;
            const firstTree = new Tree(initialX, app.screen.height, app);
            trees.push(firstTree);
            worldContainer.addChild(firstTree.container);
            lastTreeX = initialX;
            
            // Start with no scroll offset
            scrollX = 0;
            lastUpdateTime = performance.now() / 1000;
            lastSpawnTime = lastUpdateTime;
            
            // First tree will start growing when it passes the trigger point
            firstTree.update(0);
            firstTree.render();
        }
    });
    
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        if (!isPaused) {
            lastUpdateTime = performance.now() / 1000;
            lastSpawnTime = lastUpdateTime;
        }
        pauseBtn.textContent = isPaused ? 'Resume (P)' : 'Pause (P)';
    });
    
    debugBtn.addEventListener('click', () => {
        debugMode = !debugMode;
        debugContainer.visible = debugMode;
    });
    
    // Setup keyboard handlers
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'p') {
            isPaused = !isPaused;
            if (!isPaused) {
                lastUpdateTime = performance.now() / 1000;
                lastSpawnTime = lastUpdateTime;
            }
            pauseBtn.textContent = isPaused ? 'Resume (P)' : 'Pause (P)';
        } else if (e.key.toLowerCase() === 'd') {
            debugMode = !debugMode;
            debugContainer.visible = debugMode;
        }
    });
    
    // Setup resize handler
    window.addEventListener('resize', () => {
        app.renderer.resize(window.innerWidth, 900);
    });
    
    // Start the game loop with a fixed FPS
    app.ticker.maxFPS = 60;
    app.ticker.add(update);
    app.ticker.start();
}

function update() {
    // Update FPS buffer
    fpsBuffer.push(app.ticker.FPS);
    if (fpsBuffer.length > FPS_BUFFER_SIZE) {
        fpsBuffer.shift();
    }
    
    // Update FPS counter in HTML
    const fpsCounter = document.getElementById('fpsCounter');
    if (fpsCounter) {
        const avgFps = fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length || 0;
        fpsCounter.textContent = Math.round(avgFps);
    }
    
    if (!hasStarted || isPaused) {
        drawDebugInfo();
        return;
    }

    // Calculate delta time in seconds
    const currentTime = performance.now() / 1000;
    const deltaTime = Math.min(currentTime - lastUpdateTime, 0.1); // Cap at 100ms
    lastUpdateTime = currentTime;
    
    // Update scroll position using delta time
    const scrollDistance = PIXELS_PER_SECOND * deltaTime;
    scrollX += scrollDistance;
    worldContainer.x = -scrollX;
    updateScrollX(scrollX);
    
    // Update and cull trees
    const viewportLeft = scrollX;
    const viewportRight = scrollX + app.screen.width;
    
    for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];
        
        // Only update trees that are in or near the viewport
        if (tree.root.x >= viewportLeft - 100 && tree.root.x <= viewportRight + 100) {
            tree.update(deltaTime);
            if (!tree.isConvertedToSprite) {
                tree.render();
            }
        }
        
        // Remove trees that are entirely past the culling threshold
        if (tree.isOffScreen()) {
            if (tree.isConvertedToSprite) {
                worldContainer.removeChild(tree.sprite);
            } else {
                worldContainer.removeChild(tree.container);
            }
            trees.splice(i, 1);
        }
    }
    
    // Spawn new trees when the last tree crosses the growth trigger point
    const growthTriggerX = app.screen.width - (app.screen.width/3);
    const lastTreeScreenX = lastTreeX - scrollX;
    const timeSinceLastSpawn = currentTime - lastSpawnTime;
    
    if (lastTreeScreenX <= growthTriggerX && timeSinceLastSpawn >= MIN_SPAWN_INTERVAL) {
        const newTree = new Tree(lastTreeX + TREE_SPACING, app.screen.height, app);
        trees.push(newTree);
        worldContainer.addChild(newTree.container);
        lastTreeX = newTree.root.x;
        lastSpawnTime = currentTime;
    }
    
    drawDebugInfo();
}

function drawDebugInfo() {
    if (!debugMode) return;
    
    // Clear previous debug graphics
    debugContainer.removeChildren();
    
    // Create debug graphics
    const debugGraphics = new PIXI.Graphics();
    debugContainer.addChild(debugGraphics);
    
    // Calculate average FPS
    const avgFps = fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length || 0;
    
    // Draw FPS, tree count, and scroll position
    const debugText = new PIXI.Text(
        `FPS: ${Math.round(avgFps)} | Trees: ${trees.length} | ScrollX: ${Math.round(scrollX)}`,
        {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 0xFFFFFF
        }
    );
    debugText.position.set(10, 10);
    debugContainer.addChild(debugText);
    
    // Draw growth trigger line
    const triggerX = app.screen.width - (app.screen.width/3);
    debugGraphics.lineStyle(2, 0xFFFF00);
    debugGraphics.moveTo(triggerX, 0);
    debugGraphics.lineTo(triggerX, 20);
    
    // Draw viewport and culling zones
    const debugMargin = 400; // Width of yellow margins
    
    // Draw debug margins (yellow)
    debugGraphics.lineStyle(1, 0xFFFF00, 0.2);
    debugGraphics.beginFill(0xFFFF00, 0.1);
    debugGraphics.drawRect(-debugMargin, 0, debugMargin, app.screen.height); // Left margin
    debugGraphics.drawRect(app.screen.width, 0, debugMargin, app.screen.height); // Right margin
    debugGraphics.endFill();
    
    // Draw viewport bounds (screen space)
    debugGraphics.lineStyle(2, 0x00FFFF, 0.5);
    debugGraphics.drawRect(0, 0, app.screen.width, app.screen.height);
    
    // Draw culling zone (screen space)
    debugGraphics.lineStyle(1, 0xFF0000, 0.3);
    debugGraphics.beginFill(0xFF0000, 0.1);
    debugGraphics.drawRect(0, 0, 1, app.screen.height); // Culling zone at left edge
    debugGraphics.endFill();
    
    // Draw tree markers and positions
    trees.forEach((tree, index) => {
        const treeX = tree.root.x;
        const screenX = treeX - scrollX;
        
        if (screenX >= -debugMargin && screenX <= app.screen.width + debugMargin) {
            // Draw different colors for container vs sprite
            if (tree.isConvertedToSprite) {
                // Sprite - Red marker
                debugGraphics.lineStyle(2, 0xFF0000);
                debugGraphics.moveTo(screenX, 30);
                debugGraphics.lineTo(screenX, 40);
            } else {
                // Container - Green marker (just the vertical line, no rectangle)
                debugGraphics.lineStyle(2, 0x00FF00);
                debugGraphics.moveTo(screenX, 30);
                debugGraphics.lineTo(screenX, 40);
            }
            
            // Add position text
            const posText = new PIXI.Text(
                `Tree ${index}: ${Math.round(treeX)} -> ${Math.round(screenX)}`,
                {
                    fontFamily: 'Arial',
                    fontSize: 10,
                    fill: tree.isConvertedToSprite ? 0xFF0000 : 0x00FF00
                }
            );
            posText.position.set(screenX, 45);
            posText.anchor.set(0.5, 0);
            debugContainer.addChild(posText);
        }
    });
}

// Start everything when the page is loaded
window.addEventListener('load', initialize);

// Export for testing
export function isDebugMode() {
    return debugMode;
} 