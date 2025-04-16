import Branch from './Branch.js';

class Tree {
    constructor(x, y) {
        // Random color variation between 0.9 and 1.1 (±10% variation)
        const colorVar = random(0.9, 1.1);
        
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

export default Tree; 