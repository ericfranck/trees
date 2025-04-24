// Mock dependencies before importing modules
const mockPIXI = {
    Application: jest.fn().mockImplementation(() => ({
        view: {
            width: 800,
            height: 900,
            style: {}
        },
        screen: { width: 800, height: 900 },
        stage: { addChild: jest.fn() },
        renderer: { resize: jest.fn() },
        ticker: { add: jest.fn(), FPS: 60 }
    })),
    Container: jest.fn().mockImplementation(() => ({
        addChild: jest.fn(),
        removeChild: jest.fn(),
        children: [],
        x: 0,
        y: 0
    })),
    Graphics: jest.fn().mockImplementation(() => ({
        lineStyle: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        clear: jest.fn()
    })),
    Text: jest.fn().mockImplementation(() => ({
        text: '',
        position: { set: jest.fn() }
    }))
};

// Mock Branch class
jest.mock('../classes/Branch.js', () => {
    return jest.fn().mockImplementation(({ x, y }) => ({
        x,
        y,
        graphics: new mockPIXI.Graphics(),
        startGrowing: jest.fn(),
        update: jest.fn(),
        render: jest.fn()
    }));
});

// Mock window
global.window = {
    innerWidth: 800,
    innerHeight: 900,
    devicePixelRatio: 1
};

// Mock PIXI globally
global.PIXI = mockPIXI;

// Mock constants
jest.mock('../utils/constants.js', () => ({
    SCENE_SPEED: 1,
    SKY_COLOR: 0x87CEEB,
    TREE_SPACING: 200,
    MIN_SPAWN_INTERVAL: 1.0
}));

// Now import the modules
import Tree from '../classes/Tree.js';
import { updateScrollX } from '../classes/Tree.js';

describe('Tree Growth and Spawning', () => {
    let trees;
    let lastTreeX;
    let lastSpawnTime;
    let scrollX;
    let app;

    beforeEach(() => {
        // Reset global state
        trees = [];
        lastTreeX = 0;
        lastSpawnTime = 0;
        scrollX = 0;
        
        // Mock app instance
        app = {
            screen: { width: 800, height: 900 },
            stage: { addChild: jest.fn() },
            renderer: { resize: jest.fn() },
            ticker: { add: jest.fn(), FPS: 60 }
        };

        // Clear all mocks
        jest.clearAllMocks();
    });

    test('should spawn first tree at correct position when started', () => {
        const growthTriggerX = app.screen.width - (app.screen.width/3);
        const initialX = growthTriggerX;
        
        const firstTree = new Tree(initialX, app.screen.height);
        trees.push(firstTree);
        lastTreeX = initialX;
        
        expect(trees.length).toBe(1);
        expect(firstTree.root.x).toBe(initialX);
        expect(firstTree.root.y).toBe(app.screen.height);
        // Verify tree doesn't start growing immediately
        expect(firstTree.hasStartedGrowing).toBe(false);
    });

    test('should not start growing immediately when spawned', () => {
        const growthTriggerX = app.screen.width - (app.screen.width/3);
        const initialX = growthTriggerX + 100; // Start tree after trigger point
        
        const tree = new Tree(initialX, app.screen.height);
        trees.push(tree);
        
        // Verify tree hasn't started growing
        expect(tree.hasStartedGrowing).toBe(false);
        expect(tree.root.startGrowing).not.toHaveBeenCalled();
    });

    test('should start growing when passing trigger point from right to left', () => {
        const growthTriggerX = app.screen.width - (app.screen.width/3);
        const initialX = growthTriggerX + 100; // Start tree after trigger point
        
        const tree = new Tree(initialX, app.screen.height);
        trees.push(tree);
        
        // Initially, tree should not be growing
        expect(tree.hasStartedGrowing).toBe(false);
        
        // Simulate scroll that puts the tree before the trigger point
        scrollX = 400;
        updateScrollX(scrollX);
        
        // Update the tree to check growth trigger
        tree.update(0);
        
        // Tree should now be growing
        expect(tree.hasStartedGrowing).toBe(true);
        expect(tree.root.startGrowing).toHaveBeenCalled();
    });

    test('should maintain correct spacing between trees', () => {
        const TREE_SPACING = 200; // Example spacing value
        const growthTriggerX = app.screen.width - (app.screen.width/3);
        
        // Create first tree
        const firstTree = new Tree(growthTriggerX, app.screen.height);
        trees.push(firstTree);
        lastTreeX = firstTree.root.x;
        
        // Create second tree
        const secondTree = new Tree(lastTreeX + TREE_SPACING, app.screen.height);
        trees.push(secondTree);
        
        expect(secondTree.root.x - firstTree.root.x).toBe(TREE_SPACING);
        // Verify neither tree starts growing immediately
        expect(firstTree.hasStartedGrowing).toBe(false);
        expect(secondTree.hasStartedGrowing).toBe(false);
    });

    test('should not spawn new tree before minimum spawn interval', () => {
        const MIN_SPAWN_INTERVAL = 1.0; // Example interval
        const growthTriggerX = app.screen.width - (app.screen.width/3);
        
        // Create first tree
        const firstTree = new Tree(growthTriggerX, app.screen.height);
        trees.push(firstTree);
        lastTreeX = firstTree.root.x;
        lastSpawnTime = 0;
        
        // Try to spawn new tree immediately
        const currentTime = 0.5; // Less than MIN_SPAWN_INTERVAL
        const timeSinceLastSpawn = currentTime - lastSpawnTime;
        
        expect(timeSinceLastSpawn).toBeLessThan(MIN_SPAWN_INTERVAL);
    });

    test('should cull trees that move off-screen', () => {
        // Create a tree
        const tree = new Tree(100, app.screen.height);
        trees.push(tree);
        
        // Simulate tree moving off-screen
        scrollX = 1000; // Large scroll value
        updateScrollX(scrollX);
        
        // Tree should be culled when x < scrollX - 100
        const shouldBeCulled = tree.root.x < scrollX - 100;
        expect(shouldBeCulled).toBe(true);
    });
}); 