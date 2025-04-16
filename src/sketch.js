import Tree from './classes/Tree.js';
import {
    SCENE_SPEED,
    SKY_COLOR,
    TREE_SPACING
} from './utils/constants.js';

let trees = [];
let debugMode = false;
let hasStarted = false;
let startButton;
let scrollX = 0;
let lastTreeX = 0;

// Track timing for tree spawning
let lastSpawnTime = 0;
const MIN_SPAWN_INTERVAL = 2000; // Minimum 2 seconds between spawns

// Add at the top with other let declarations
let fpsBuffer = [];
const FPS_BUFFER_SIZE = 30;

// Add at the top with other state variables
let isPaused = false;

// Make p5.js functions globally accessible
window.setup = function() {
    createCanvas(windowWidth, 900);
    frameRate(60);
    
    // Create start button
    startButton = createButton('Start Growing');
    startButton.position(width/2 - startButton.width/2, 20);
    startButton.mousePressed(() => {
        hasStarted = true;
        startButton.remove();
        // Create first tree at the right edge
        const initialX = width + TREE_SPACING;
        trees.push(new Tree(initialX, height));
        lastTreeX = initialX;
        
        // Set initial scroll position so tree starts at growth trigger
        const growthTriggerX = width - (width/3);
        scrollX = initialX - growthTriggerX;
        
        lastSpawnTime = millis();
    });
}

window.keyPressed = function() {
    if (key === 'p' || key === 'P') {
        isPaused = !isPaused;
    } else if (key === 'd' || key === 'D') {
        debugMode = !debugMode;
    }
}

function drawDebugInfo() {
    if (!debugMode) return;
    
    push();
    textSize(14);
    textAlign(LEFT);
    fill(255);
    noStroke();
    
    // Calculate average FPS
    fpsBuffer.push(frameRate());
    if (fpsBuffer.length > FPS_BUFFER_SIZE) fpsBuffer.shift();
    const avgFPS = fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length;
    
    // Draw screen boundaries and trigger line
    strokeWeight(2);
    
    // Left and right screen edges (red)
    stroke(255, 0, 0);
    line(0, 0, 0, 20);
    line(width, 0, width, 20);
    
    // Growth trigger line (yellow)
    stroke(255, 255, 0);
    line(width - (width/3), 0, width - (width/3), 20);
    
    // Show minimal info with FPS
    fill(255);
    text(`FPS: ${Math.round(avgFPS)} | Trees: ${trees.length}`, 10, 30);
    
    // Draw minimal tree markers
    stroke(0, 255, 0);
    strokeWeight(1);
    for (let tree of trees) {
        const screenX = tree.root.x - scrollX;
        line(screenX, 0, screenX, 10);
    }
    
    pop();
}

window.draw = function() {
    background(...SKY_COLOR);
    
    // Only update if started and not paused
    if (hasStarted && !isPaused) {
        // Update scroll position
        scrollX += SCENE_SPEED * 0.75;
        
        push();
        translate(-scrollX, 0);
        
        // Calculate screen bounds for culling
        const screenLeft = scrollX - 100;  // Include small buffer for removal
        const screenRight = scrollX + width + 100;  // Include small buffer for growth
        
        // Update and draw all trees
        for (let i = trees.length - 1; i >= 0; i--) {
            const tree = trees[i];
            // Skip trees completely outside view
            if (tree.root.x < screenLeft) {
                trees.splice(i, 1);  // Remove if too far left
                continue;
            }
            
            const screenX = tree.root.x - scrollX;
            
            // Only start growing when tree is 1/3 onto the screen
            if (screenX <= width - (width/3)) {
                tree.update();
            }
            tree.draw();
        }
        
        // Add new tree if needed and enough time has passed
        const timeSinceLastSpawn = millis() - lastSpawnTime;
        if (lastTreeX < scrollX + width - TREE_SPACING && timeSinceLastSpawn >= MIN_SPAWN_INTERVAL) {
            lastTreeX += TREE_SPACING;
            trees.push(new Tree(lastTreeX, height));
            lastSpawnTime = millis();
        }
        
        pop();
    } else {
        // Even when paused, still draw the current state
        push();
        translate(-scrollX, 0);
        for (let tree of trees) {
            tree.draw();
        }
        pop();
    }
    
    // Draw debug information
    drawDebugInfo();
    
    // Draw pause indicator
    if (isPaused) {
        push();
        fill(255);
        noStroke();
        textSize(24);
        textAlign(CENTER, CENTER);
        text('PAUSED', width/2, 40);
        pop();
    }
}

window.windowResized = function() {
    resizeCanvas(windowWidth, 900);
    
    // Update button position if it exists
    if (startButton) {
        startButton.position(width/2 - startButton.width/2, 20);
    }
}

// Make debugMode accessible to other modules
export function isDebugMode() {
    return debugMode;
} 