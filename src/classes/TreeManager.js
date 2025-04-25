import Tree from './Tree.js';

export class TreeManager {
    constructor(app) {
        this.app = app;
        this.trees = [];
        this.lastTreeX = 0;
        this.lastSpawnTime = 0;
        this.minSpawnInterval = 1000; // Minimum time between tree spawns in milliseconds
    }

    spawnTree() {
        const currentTime = performance.now() / 1000;
        const timeSinceLastSpawn = currentTime - this.lastSpawnTime;
        
        if (timeSinceLastSpawn >= this.minSpawnInterval) {
            const newTree = new Tree(this.lastTreeX + 200, this.app.screen.height, this.app);
            this.trees.push(newTree);
            this.app.stage.addChild(newTree.container);
            this.lastTreeX = newTree.root.x;
            this.lastSpawnTime = currentTime;
            return newTree;
        }
        return null;
    }

    update(deltaTime) {
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const tree = this.trees[i];
            
            if (tree.isOffScreen()) {
                tree.destroy();
                this.trees.splice(i, 1);
            } else {
                tree.update(deltaTime);
            }
        }
    }

    clearAllTrees() {
        for (const tree of this.trees) {
            tree.destroy();
        }
        this.trees = [];
        this.lastTreeX = 0;
        this.lastSpawnTime = 0;
    }

    getTrees() {
        return this.trees;
    }
} 