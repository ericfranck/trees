import Branch from './Branch.js';
import { random } from '../utils/math.js';

// Get global scroll position from sketch.js
let scrollX = 0;
export function updateScrollX(x) {
    scrollX = x;
}

class Tree {
    constructor(x, y, app) {
        // Store app reference
        this.app = app;
        
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
        
        // Add flag to track if tree has been converted to sprite
        this.isConvertedToSprite = false;
        
        // Add unique ID for logging
        this.id = Math.random().toString(36).substr(2, 9);
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
        
        // Return true if we've passed the trigger point from right to left
        return screenX <= triggerX;
    }

    isFullyGrown() {
        // Check if the root branch and all its children are fully grown
        const isGrown = this.root.isFullyGrown();
        if (isGrown) {
            console.log(`[Tree ${this.id}] Tree is fully grown`);
        }
        return isGrown;
    }
    
    convertToSprite() {
        if (this.isConvertedToSprite) return;
        
        // Verify we have a valid app reference
        if (!this.app || !this.app.renderer) {
            console.error(`[Tree ${this.id}] Cannot convert to sprite: missing app reference`);
            return;
        }
        
        // Store the original parent and position
        const originalParent = this.container.parent;
        const originalIndex = originalParent ? originalParent.getChildIndex(this.container) : 0;
        
        if (!originalParent) {
            console.error(`[Tree ${this.id}] Container has no parent before conversion`);
            return;
        }

        // Get the current bounds in world space
        const worldBounds = this.container.getBounds();
        
        // Calculate screen-space bounds by adjusting for scroll
        const screenBounds = {
            x: worldBounds.x + scrollX,
            y: worldBounds.y,
            width: worldBounds.width,
            height: worldBounds.height
        };
        
        // Create a render texture with the bounds dimensions
        const renderTexture = PIXI.RenderTexture.create({
            width: Math.max(1, Math.ceil(worldBounds.width)),
            height: Math.max(1, Math.ceil(worldBounds.height))
        });
        
        // Create a temporary container for rendering
        const tempContainer = new PIXI.Container();
        
        // Remove from parent but keep reference
        originalParent.removeChild(this.container);
        tempContainer.addChild(this.container);
        
        // Position container for rendering to texture
        // Use screen-space coordinates for positioning
        this.container.position.set(
            -worldBounds.x - scrollX,
            -worldBounds.y
        );
        
        // Render the tree to the texture
        try {
            this.app.renderer.render(tempContainer, { renderTexture });
        } catch (error) {
            console.error(`[Tree ${this.id}] Error rendering to texture:`, error);
            // Restore container to original parent
            tempContainer.removeChild(this.container);
            originalParent.addChildAt(this.container, originalIndex);
            return;
        }
        
        // Create a sprite from the texture
        const sprite = new PIXI.Sprite(renderTexture);
        
        // Position sprite in screen space
        sprite.position.set(screenBounds.x, screenBounds.y);
        
        // Add sprite to original parent before destroying container
        originalParent.addChildAt(sprite, originalIndex);
        
        // Store sprite reference
        this.sprite = sprite;
        
        // Clean up
        tempContainer.removeChild(this.container);
        this.container.destroy({ children: true });
        this.container = null;
        tempContainer.destroy();
        
        // Mark as converted
        this.isConvertedToSprite = true;
    }
    
    update(deltaTime) {
        // Only update if not converted to sprite
        if (this.isConvertedToSprite) {
            if (this.sprite) {
                const worldPos = this.sprite.position;
                const screenPos = {
                    x: worldPos.x - scrollX,
                    y: worldPos.y
                };
                console.log(`[Tree ${this.id}] Sprite positions:`, {
                    world: { x: worldPos.x, y: worldPos.y },
                    screen: screenPos,
                    scrollX,
                    parent: this.sprite.parent ? 'yes' : 'no',
                    visible: this.sprite.visible,
                    alpha: this.sprite.alpha
                });
            }
            return;
        }
        
        // Log container position
        const containerWorldPos = this.container.position;
        const containerScreenPos = {
            x: containerWorldPos.x - scrollX,
            y: containerWorldPos.y
        };
        console.log(`[Tree ${this.id}] Container positions:`, {
            world: { x: containerWorldPos.x, y: containerWorldPos.y },
            screen: containerScreenPos,
            scrollX,
            parent: this.container.parent ? 'yes' : 'no',
            visible: this.container.visible,
            alpha: this.container.alpha
        });
        
        // Only start growing if we've passed the trigger point
        if (!this.hasStartedGrowing && this.isPastGrowthTrigger()) {
            console.log(`[Tree ${this.id}] Starting to grow`);
            this.startGrowing();
        }
        
        this.root.update(deltaTime);
        
        // Check if tree is fully grown and convert to sprite if it is
        if (this.isFullyGrown()) {
            console.log(`[Tree ${this.id}] Converting to sprite`);
            this.convertToSprite();
        }
    }

    render() {
        // Only render if not converted to sprite
        if (this.isConvertedToSprite) return;
        
        this.root.render(this.container);
    }

    isOffScreen() {
        // Get the tree's screen position
        const worldX = this.root.x;
        const screenX = worldX - scrollX;
        
        // Check if the tree is completely off screen to the left
        // Add a buffer of tree width to ensure it's completely off screen
        return screenX < -this.container.width;
    }

    destroy() {
        // Clean up container if it exists
        if (this.container) {
            if (this.container.parent) {
                this.container.parent.removeChild(this.container);
            }
            this.container.destroy({ children: true });
            this.container = null;
        }

        // Clean up sprite if it exists
        if (this.sprite) {
            if (this.sprite.parent) {
                this.sprite.parent.removeChild(this.sprite);
            }
            this.sprite.destroy({ texture: true });
            this.sprite = null;
        }

        // Clean up root branch
        if (this.root) {
            this.root = null;
        }

        // Clear app reference last
        this.app = null;
    }
}

export default Tree; 