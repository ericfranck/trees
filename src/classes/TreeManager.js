import Tree from './Tree.js';

export class TreeManager {
    constructor(app) {
        this.app = app;
        this.trees = [];
        this.lastSpawnTime = 0;
        this.minSpawnInterval = 1000; // Minimum time between tree spawns in milliseconds
        this.lastTreeX = this.app.screen.width - (this.app.screen.width/3); // Initial spawn position
    }

    spawnTree() {
        const currentTime = Date.now();
        if (currentTime - this.lastSpawnTime < this.minSpawnInterval) {
            return null;
        }

        try {
            // Create new tree at the right position, passing the app instance
            const tree = new Tree(this.lastTreeX, this.app.screen.height, this.app);
            
            // Validate tree was created properly
            if (!tree || !tree.container) {
                console.error('Failed to create tree or tree container');
                return null;
            }
            
            // Add tree to stage and collection
            this.app.stage.addChild(tree.container);
            this.trees.push(tree);
            
            // Update timing and position
            this.lastSpawnTime = currentTime;
            this.lastTreeX += 200; // Tree spacing
            
            console.log('Tree spawned');
            return tree;
        } catch (error) {
            console.error('Error spawning tree:', error);
            return null;
        }
    }

    update(deltaTime) {
        // Update all trees
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const tree = this.trees[i];
            if (!tree) continue;

            try {
                tree.update(deltaTime);

                // Check if tree is off screen
                if (tree.isOffScreen()) {
                    console.log('Tree is off screen, destroying...');
                    tree.destroy();
                    this.trees.splice(i, 1);
                    console.log('Tree destroyed and removed from array');
                }
            } catch (error) {
                console.error('Error updating tree:', error);
                // Clean up the problematic tree
                try {
                    tree.destroy();
                } catch (destroyError) {
                    console.error('Error destroying tree:', destroyError);
                }
                this.trees.splice(i, 1);
            }
        }
    }

    getTrees() {
        return this.trees;
    }

    clear() {
        console.log('Clearing all trees...');
        // Destroy all trees
        for (const tree of this.trees) {
            if (tree) {
                try {
                    tree.destroy();
                } catch (error) {
                    console.error('Error destroying tree during clear:', error);
                }
            }
        }
        this.trees = [];
        this.lastSpawnTime = 0;
        this.lastTreeX = 0;
        console.log('All trees cleared');
    }
} 