import Branch from './Branch.js';
import { random } from '../utils/math.js';

// Get global scroll position from sketch.js
let scrollX = 0;
export function updateScrollX(x) {
    scrollX = x;
}

class Tree {
    constructor(x, y) {
        // Create main container for the tree
        this.container = new PIXI.Container();
        
        // Random color variation between 0.9 and 1.1 (±10% variation)
        const colorVar = random(0.9, 1.1);
        
        // Create the trunk (root branch)
        this.root = new Branch({
            x: x,
            y: y,
            level: 0,
            colorVariation: colorVar
        });
        
        // Add root branch to container
        this.container.addChild(this.root.graphics);
        
        // Track if we've started growing
        this.hasStartedGrowing = false;
    }
    
    startGrowing() {
        if (!this.hasStartedGrowing) {
            this.hasStartedGrowing = true;
            this.root.startGrowing();
        }
    }
    
    isPastGrowthTrigger() {
        // Get the tree's screen position
        const worldX = this.root.x;
        const screenX = worldX - scrollX;
        
        // Calculate growth trigger point (1/3 into viewport from right)
        const triggerX = window.innerWidth - (window.innerWidth/3);
        
        // Return true if we're past the trigger point
        return screenX >= triggerX;
    }

    update(deltaTime) {
        // Only start growing if we're past the trigger point
        if (!this.hasStartedGrowing && this.isPastGrowthTrigger()) {
            this.startGrowing();
        }
        
        this.root.update(deltaTime);
    }

    render() {
        this.root.render(this.container);
    }
}

export default Tree; 