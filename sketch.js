class Branch {
    constructor(options) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.length = options.length || random(225, 375);
        this.width = options.width || random(30, 45);
        this.angle = options.angle || random(-20, 20) * PI/180;
        this.level = options.level || 0;
        this.growth = 0;
        this.children = [];
        this.growthRate = (2 / (60 * 60)) * 4;
        this.relativeHeight = options.relativeHeight || 0;
        this.side = options.side || 0;
        this.colorVariation = options.colorVariation || 1.0; // Pass through color variation
        
        // Store level 0 width for leaf sizing
        this.level0Width = options.level0Width || this.width;
        
        // Leaf properties
        this.numLeaves = floor(random(1, 3)); // 1 to 3 leaves
        this.leafAppearGrowth = random(0.2, 0.9); // Appear between 30-50% growth
        this.leaves = [];
        
        // Initialize leaves
        for (let i = 0; i < this.numLeaves; i++) {
            this.leaves.push({
                size: 0.8, // Size relative to level 0 branch width
                rotation: random(-1.22, 1.22) - 3.14159, // ±70 degrees in radians
                growth: 0, // Individual leaf growth (0 to 1)
                growthRate: 10 // Grows to full size in 0.5 seconds (1/0.5 = 2.0)
            });
        }
        
        // Branch colors for different levels
        this.levelColors = [
            color(139, 69, 19),  // Level 0 - Brown
            color(165, 42, 42),  // Level 1 - Brown-red
            color(160, 82, 45),  // Level 2 - Sienna
            color(205, 133, 63)  // Level 3 - Peru
        ];
        
        // Branch spawning properties
        this.maxChildren = this.level === 0 ? floor(random(6, 13)) : floor(random(2, 5));
        this.childTriggers = [];
        
        for (let i = 0; i < this.maxChildren; i++) {
            this.childTriggers.push(random(0.3, 0.9));
        }
    }

    addChild() {
        const childLength = this.length * random(0.4, 0.7);
        const childWidth = this.width * 0.6;
        const childAngle = random(-1.22, 1.22);
        const relativeHeight = random(0.5, 1);
        const side = random() < 0.5 ? -1 : 1;
        
        if (this.level < 3) {
            this.children.push(new Branch({
                length: childLength,
                width: childWidth,
                angle: childAngle,
                level: this.level + 1,
                side: side,
                relativeHeight: relativeHeight,
                level0Width: this.level0Width,
                colorVariation: this.colorVariation // Pass color variation to children
            }));
        }
    }

    update() {
        if (this.growth < 1) {
            this.growth += this.growthRate;
            this.growth = constrain(this.growth, 0, 1);
            
            // Update leaf growth
            if (this.growth >= this.leafAppearGrowth) {
                for (let leaf of this.leaves) {
                    if (leaf.growth < 1) {
                        leaf.growth += leaf.growthRate * this.growthRate;
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
        }
        
        // Update all children
        for (let child of this.children) {
            child.update();
        }
    }

    drawDebug(x, y, currentLength) {
        if (!debugMode) return; // Only show debug visuals when debug mode is enabled
        
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

    drawLeaves() {
        if (this.growth < this.leafAppearGrowth) return; // Don't draw leaves until they should appear
        
        push();
        
        // Initial positioning (same as draw())
        if (this.level === 0) {
            translate(this.x, this.y);
            rotate(this.angle);
        }

        let currentLength = this.length * this.growth;
        let currentWidth = this.width * this.growth;
        
        // Position at end of branch
        translate(0, -currentLength);
        
        fill('#7C7F4A80'); // Added 80 for 50% transparency
        noStroke();
        
        for (let leaf of this.leaves) {
            push();
            
            // Draw vesica piscis
            let leafSize = this.level0Width * leaf.size * leaf.growth; // Scale by leaf growth
            let width = leafSize;
            let height = width * 1.2; // Reduced from 1.5 to 1.2 to make it broader
            
            // Calculate control points for bezier curves
            let cp1x = width * 0.4;  // Increased from 0.3 to 0.4 for broader shape
            let cp1y = height * 0.15; // Reduced from 0.2 to 0.15 for broader shape
            let cp2x = width * 0.4;  // Increased from 0.3 to 0.4 for broader shape
            let cp2y = -height * 0.15; // Reduced from 0.2 to 0.15 for broader shape
            
            // Set rotation origin at pointed end of leaf
            rotate(leaf.rotation); // Rotate around branch end point
            translate(0, -height/2); // Move to pointed end
            
            // Draw vesica piscis shape using bezier curves
            beginShape();
            // Start at top point
            vertex(0, -height/2);
            // Right curve
            bezierVertex(
                cp1x, -height/2,  // Control point 1
                cp1x, 0,          // Control point 2
                0, height/2       // End point
            );
            // Left curve
            bezierVertex(
                -cp2x, 0,         // Control point 1
                -cp2x, -height/2, // Control point 2
                0, -height/2      // End point
            );
            endShape(CLOSE);
            
            pop();
        }
        
        // Draw children's leaves
        for (let child of this.children) {
            push();
            let branchStartY = -currentLength * child.relativeHeight;
            let branchStartX = child.side * (currentWidth/2 - child.width/2);
            
            translate(0, branchStartY);
            translate(branchStartX, 0);
            
            rotate(child.angle * child.side);
            child.drawLeaves();
            pop();
        }
        
        pop();
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
        let baseColor = color('#8E867B');
        let r = red(baseColor) * this.colorVariation;
        let g = green(baseColor) * this.colorVariation;
        let b = blue(baseColor) * this.colorVariation;
        
        // Set color with variation
        fill(r, g, b);
        noStroke();
        
        // Draw branch as trapezoid
        quad(
            -currentWidth/2, 0,
            currentWidth/2, 0,
            topWidth/2, -currentLength,
            -topWidth/2, -currentLength
        );
        
        // Draw debug info
        this.drawDebug(0, 0, currentLength);
        
        // Draw leaves for this branch
        if (this.growth >= this.leafAppearGrowth) {
            push();
            translate(0, -currentLength); // Move to end of branch
            
            fill('#7C7F4A80'); // Added 80 for 50% transparency
            noStroke();
            
            for (let leaf of this.leaves) {
                push();
                rotate(leaf.rotation); // First rotate around branch end
                
                // Draw vesica piscis
                let leafSize = this.level0Width * leaf.size * leaf.growth;
                let width = leafSize;
                let height = width * 1.2;
                
                // Calculate control points for bezier curves
                let cp1x = width * 0.4;
                let cp1y = height * 0.15;
                let cp2x = width * 0.4;
                let cp2y = height * 0.85; // Adjusted for pointed ends
                
                // Draw vesica piscis shape using bezier curves
                beginShape();
                vertex(0, 0); // Start at branch end (pointed end)
                // Right curve
                bezierVertex(
                    cp1x, cp1y,     // Control point 1
                    cp1x, height/2,  // Control point 2
                    0, height        // End point (pointed end)
                );
                // Left curve
                bezierVertex(
                    -cp2x, height/2, // Control point 1
                    -cp2x, cp1y,    // Control point 2
                    0, 0            // Back to start (pointed end)
                );
                endShape(CLOSE);
                
                // Debug visualization for leaf rotation
                if (debugMode) {
                    push();
                    noFill();
                    stroke(255, 0, 0); // Red for rotation axis
                    strokeWeight(2);
                    // Draw rotation axis
                    line(0, 0, 0, height);
                    // Draw rotation point
                    fill(255, 0, 0);
                    noStroke();
                    ellipse(0, 0, 6, 6);
                    // Draw angle text
                    fill(255);
                    noStroke();
                    textSize(12);
                    textAlign(CENTER);
                    text(nf(degrees(leaf.rotation), 1, 1) + "°", 0, -10);
                    pop();
                }
                
                pop();
            }
            pop();
        }
        
        // Draw children
        for (let child of this.children) {
            push();
            let branchStartY = -currentLength * child.relativeHeight;
            let branchStartX = child.side * (currentWidth/2 - child.width/2);
            
            // Debug: show connection path
            if (debugMode) {
                stroke(255, 255, 0);
                strokeWeight(2);
                line(0, 0, branchStartX, branchStartY);
            }
            
            translate(0, branchStartY);
            translate(branchStartX, 0);
            
            // Debug: show connection point
            if (debugMode) {
                fill(0, 255, 0);
                noStroke();
                ellipse(0, 0, 6, 6);
            }
            
            rotate(child.angle * child.side);
            child.draw();
            pop();
        }
        
        pop();
    }
}

class Tree {
    constructor(x, y) {
        // Random color variation between 0.8 and 1.2 (±20% variation)
        const colorVar = random(0.8, 1.2);
        
        // Create the trunk (root branch)
        this.root = new Branch({
            x: x,
            y: y,
            level: 0,
            colorVariation: colorVar
        });
    }

    update() {
        this.root.update();
    }

    draw() {
        this.root.draw();
    }
}

let trees = [];
let lastTreeTime = 0;
const TREE_INTERVAL = 20000;
const MAX_TREES = 15;
const SCENE_SPEED = 1.0;
let debugMode = false; // Global debug mode flag

function setup() {
    createCanvas(windowWidth, windowHeight);
    frameRate(60);
    
    // Create initial tree in the center
    let x = width/2;
    trees.push(new Tree(x, height));
    lastTreeTime = millis();
}

function keyPressed() {
    if (key === 'd' || key === 'D') {
        debugMode = !debugMode; // Toggle debug mode when 'd' is pressed
    }
}

function draw() {
    background(135, 206, 235);
    
    // Update and draw all trees
    for (let tree of trees) {
        tree.update();
        tree.draw();
    }
    
    // Add new trees
    if (millis() - lastTreeTime > TREE_INTERVAL && trees.length < MAX_TREES) {
        let x = random(100, width - 100);
        trees.push(new Tree(x, height));
        lastTreeTime = millis();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
