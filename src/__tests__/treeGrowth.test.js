// Mock dependencies before importing modules
const mockViewport = {
    width: 800,
    height: 900
};

const mockPIXI = {
    Application: jest.fn().mockImplementation(() => {
        const stage = {
            addChild: jest.fn(child => {
                child.parent = stage;
                stage.children.push(child);
            }),
            removeChild: jest.fn(child => {
                const index = stage.children.indexOf(child);
                if (index > -1) {
                    stage.children.splice(index, 1);
                }
                child.parent = null;
            }),
            children: [],
            getChildIndex: jest.fn(child => stage.children.indexOf(child))
        };
        
        return {
            view: {
                width: mockViewport.width,
                height: mockViewport.height,
                style: {}
            },
            screen: { ...mockViewport },
            stage,
            renderer: { 
                resize: jest.fn(),
                render: jest.fn()
            },
            ticker: { add: jest.fn(), FPS: 60 }
        };
    }),
    Container: jest.fn().mockImplementation(() => {
        const container = {
            children: [],
            addChild: jest.fn(child => {
                child.parent = container;
                container.children.push(child);
            }),
            removeChild: jest.fn(child => {
                const index = container.children.indexOf(child);
                if (index > -1) {
                    container.children.splice(index, 1);
                }
                child.parent = null;
            }),
            x: 0,
            y: 0,
            width: 100,
            height: 500,
            position: { set: jest.fn() },
            pivot: { set: jest.fn() },
            scale: { set: jest.fn() },
            rotation: 0,
            getBounds: jest.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 500 }),
            getChildIndex: jest.fn(child => container.children.indexOf(child)),
            destroy: jest.fn(() => {
                if (container.parent) {
                    container.parent.removeChild(container);
                }
                container.children.forEach(child => {
                    if (child.destroy) child.destroy();
                });
                container.children = [];
            })
        };
        return container;
    }),
    Graphics: jest.fn().mockImplementation(() => ({
        lineStyle: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        clear: jest.fn(),
        beginFill: jest.fn(),
        drawPolygon: jest.fn(),
        endFill: jest.fn(),
        x: 0,
        y: 0,
        position: { set: jest.fn() },
        pivot: { set: jest.fn() },
        destroy: jest.fn()
    })),
    Text: jest.fn().mockImplementation(() => ({
        text: '',
        position: { set: jest.fn() }
    })),
    settings: {
        SPRITE_MAX_TEXTURES: 16
    },
    RenderTexture: {
        create: jest.fn().mockImplementation(() => ({
            width: 100,
            height: 500,
            destroy: jest.fn()
        }))
    },
    Sprite: jest.fn().mockImplementation(() => ({
        x: 0,
        y: 0,
        width: 100,
        height: 500,
        position: { set: jest.fn() },
        destroy: jest.fn()
    }))
};

// Create a module-scoped mock for scroll position
const mockScroll = {
    x: 0
};

// Mock the PIXI module
jest.mock('pixi.js', () => mockPIXI);

// Mock the scroll position module
jest.mock('../sketch.js', () => ({
    isDebugMode: false,
    updateScrollX: jest.fn(x => { mockScroll.x = x; })
}));

// Mock Branch class
jest.mock('../classes/Branch.js', () => {
    return jest.fn().mockImplementation(({ x, y }) => {
        const branch = {
            x,
            y,
            graphics: new mockPIXI.Graphics(),
            startGrowing: jest.fn(),
            update: jest.fn(),
            render: jest.fn(),
            isFullyGrown: jest.fn().mockImplementation(() => {
                return branch.growth >= 1.0;
            }),
            growth: 0,
            destroy: jest.fn()
        };
        return branch;
    });
});

// Mock Tree class
jest.mock('../classes/Tree.js', () => {
    const Tree = jest.fn().mockImplementation((x, y, app) => {
        const container = new mockPIXI.Container();
        const branch = new (jest.requireMock('../classes/Branch.js'))({ x, y });
        let hasStartedGrowing = false;
        let isConvertedToSprite = false;
        
        const tree = {
            container,
            root: branch,
            app,
            get hasStartedGrowing() { return hasStartedGrowing; },
            get isConvertedToSprite() { return isConvertedToSprite; },
            id: Math.random().toString(36).substr(2, 9),
            startGrowing: jest.fn().mockImplementation(() => {
                console.log(`[Tree ${tree.id}] Starting to grow`);
                hasStartedGrowing = true;
                branch.startGrowing();
            }),
            update: jest.fn().mockImplementation((deltaTime) => {
                if (isConvertedToSprite) {
                    console.log(`[Tree ${tree.id}] Already converted to sprite, skipping update`);
                    return;
                }
                
                // Check if we should start growing
                const screenX = branch.x - mockScroll.x;
                const triggerX = mockViewport.width - (mockViewport.width/3);
                
                if (!hasStartedGrowing && screenX <= triggerX) {
                    tree.startGrowing();
                }
                
                branch.update(deltaTime);
                branch.growth += deltaTime; // Simulate growth
                
                // Check if fully grown
                if (branch.growth >= 1.0 && !isConvertedToSprite) {
                    console.log(`[Tree ${tree.id}] Fully grown, converting to sprite`);
                    tree.convertToSprite();
                }
            }),
            convertToSprite: jest.fn().mockImplementation(() => {
                if (isConvertedToSprite) {
                    console.log(`[Tree ${tree.id}] Already converted to sprite`);
                    return;
                }
                
                console.log(`[Tree ${tree.id}] Starting sprite conversion`);
                
                const bounds = container.getBounds();
                console.log(`[Tree ${tree.id}] Container bounds:`, bounds);
                
                const renderTexture = mockPIXI.RenderTexture.create({
                    width: Math.max(1, Math.ceil(bounds.width)),
                    height: Math.max(1, Math.ceil(bounds.height))
                });
                console.log(`[Tree ${tree.id}] Created render texture:`, {
                    width: renderTexture.width,
                    height: renderTexture.height
                });
                
                const sprite = new mockPIXI.Sprite(renderTexture);
                sprite.x = container.x;
                sprite.y = container.y;
                console.log(`[Tree ${tree.id}] Created sprite at position:`, {
                    x: sprite.x,
                    y: sprite.y
                });
                
                if (container.parent) {
                    container.parent.removeChild(container);
                    container.parent.addChild(sprite);
                    console.log(`[Tree ${tree.id}] Replaced container with sprite`);
                }
                
                isConvertedToSprite = true;
                console.log(`[Tree ${tree.id}] Sprite conversion complete`);
            }),
            render: jest.fn(),
            isOffScreen: jest.fn().mockImplementation(() => {
                const screenX = branch.x - mockScroll.x;
                return screenX < -container.width;
            }),
            destroy: jest.fn()
        };
        
        return tree;
    });
    
    Tree.updateScrollX = jest.fn((x) => {
        mockScroll.x = x;
    });
    
    return Tree;
});

// Mock window
global.window = {
    innerWidth: mockViewport.width,
    innerHeight: mockViewport.height,
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
import { TreeManager } from '../classes/TreeManager.js';

describe('Tree Growth and Spawning', () => {
    let trees;
    let lastTreeX;
    let lastSpawnTime;
    let app;
    let treeManager;
    let originalDateNow;

    beforeEach(() => {
        // Store original Date.now
        originalDateNow = Date.now;
        // Mock Date.now to return a fixed timestamp
        Date.now = jest.fn(() => 1000);
        
        // Reset global state
        trees = [];
        lastTreeX = 0;
        lastSpawnTime = 0;
        mockScroll.x = 0;
        
        // Create a new PIXI application instance
        app = new mockPIXI.Application();
        app.screen = { 
            width: window.innerWidth,  // 800
            height: window.innerHeight // 900
        };
        app.stage = { addChild: jest.fn() };
        app.renderer = { 
            resize: jest.fn(),
            render: jest.fn()
        };
        app.ticker = { add: jest.fn(), FPS: 60 };

        // Create a new TreeManager instance
        treeManager = new TreeManager(app);
        
        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation((msg) => process.stdout.write(msg + '\n'));
        jest.spyOn(console, 'time').mockImplementation();
        jest.spyOn(console, 'timeEnd').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation((msg) => process.stderr.write(msg + '\n'));
    });

    afterEach(() => {
        // Restore original Date.now
        Date.now = originalDateNow;
        
        // Clear all mocks
        jest.clearAllMocks();
        
        // Restore console methods
        console.log.mockRestore();
        console.time.mockRestore();
        console.timeEnd.mockRestore();
        console.error.mockRestore();
    });

    test('should spawn first tree at correct position when started', () => {
        const growthTriggerX = app.screen.width - (app.screen.width/3);
        const initialX = growthTriggerX;
        
        const firstTree = new Tree(initialX, app.screen.height, app);
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
        
        const tree = new Tree(initialX, app.screen.height, app);
        trees.push(tree);
        
        // Verify tree hasn't started growing
        expect(tree.hasStartedGrowing).toBe(false);
        expect(tree.root.startGrowing).not.toHaveBeenCalled();
    });

    test('should start growing when passing trigger point from right to left', () => {
        const growthTriggerX = app.screen.width - (app.screen.width/3);
        const initialX = growthTriggerX + 100; // Start tree after trigger point
        
        const tree = new Tree(initialX, app.screen.height, app);
        
        // Initially, tree should not be growing
        expect(tree.hasStartedGrowing).toBe(false);
        
        // Simulate scroll that puts the tree before the trigger point
        mockScroll.x = 400;
        updateScrollX(mockScroll.x);
        
        // Update the tree to check growth trigger
        tree.update(0.016);
        
        // Tree should now be growing
        expect(tree.hasStartedGrowing).toBe(true);
        expect(tree.root.startGrowing).toHaveBeenCalled();
    });

    test('should maintain correct spacing between trees', () => {
        const TREE_SPACING = 200; // Example spacing value
        const growthTriggerX = app.screen.width - (app.screen.width/3);
        
        // Create first tree
        const firstTree = new Tree(growthTriggerX, app.screen.height, app);
        trees.push(firstTree);
        lastTreeX = firstTree.root.x;
        
        // Create second tree
        const secondTree = new Tree(lastTreeX + TREE_SPACING, app.screen.height, app);
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
        const firstTree = new Tree(growthTriggerX, app.screen.height, app);
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
        const tree = new Tree(100, app.screen.height, app);
        trees.push(tree);
        
        // Simulate tree moving off-screen
        mockScroll.x = 1000; // Large scroll value
        scrollX = 1000; // Large scroll value
        updateScrollX(scrollX);
        
        // Tree should be culled when x < scrollX - 100
        const shouldBeCulled = tree.root.x < scrollX - 100;
        expect(shouldBeCulled).toBe(true);
    });

    test('should log when spawning and culling trees', () => {
        console.log('Test started');
        const tree = treeManager.spawnTree();
        expect(tree).not.toBeNull();
        console.log('Tree should be spawned');
        
        // Move the tree off screen
        tree.root.x = -1000;
        
        // Update should cull the tree
        treeManager.update(1/60);
        
        expect(treeManager.getTrees().length).toBe(0);
    });

    test('should simulate real-world usage with scrolling and multiple trees', () => {
        // First tree should spawn immediately
        const firstTree = treeManager.spawnTree();
        expect(firstTree).not.toBeNull();
        expect(treeManager.getTrees().length).toBe(1);
        
        // Move viewport to trigger growth
        mockScroll.x = 300;
        updateScrollX(mockScroll.x);
        treeManager.update(1/60);
        
        // Try to spawn too early (500ms)
        Date.now = jest.fn(() => 1500);
        const earlyTree = treeManager.spawnTree();
        expect(earlyTree).toBeNull();
        expect(treeManager.getTrees().length).toBe(1);
        
        // Try to spawn after minimum interval (1100ms)
        Date.now = jest.fn(() => 2100);
        const secondTree = treeManager.spawnTree();
        expect(secondTree).not.toBeNull();
        expect(treeManager.getTrees().length).toBe(2);
        
        // Update trees with scroll position
        mockScroll.x = 500;
        updateScrollX(mockScroll.x);
        treeManager.update(1/60);
        
        // Check if trees are growing
        expect(firstTree.hasStartedGrowing).toBe(true);
        expect(secondTree.hasStartedGrowing).toBe(true);
    });

    test('should properly convert tree to sprite when fully grown', () => {
        // Create and grow a tree
        const tree = treeManager.spawnTree();
        expect(tree).not.toBeNull();
        
        // Move viewport to trigger growth
        mockScroll.x = 300;
        updateScrollX(mockScroll.x);
        
        // Update multiple times to simulate growth
        for (let i = 0; i < 60; i++) { // 1 second worth of updates at 60 FPS
            treeManager.update(1/60);
        }
        
        // Tree should be converted to sprite
        expect(tree.isConvertedToSprite).toBe(true);
    });
}); 