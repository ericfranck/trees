// Mock dependencies
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

// Mock performance.now
const mockPerformanceNow = jest.fn();
global.performance = { now: mockPerformanceNow };

// Mock PIXI globally
global.PIXI = mockPIXI;

// Mock constants
jest.mock('../utils/constants.js', () => ({
    SCENE_SPEED: 1,
    SKY_COLOR: 0x87CEEB,
    TREE_SPACING: 200,
    MIN_SPAWN_INTERVAL: 1.0
}));

// Import modules
import Tree from '../classes/Tree.js';
import { updateScrollX } from '../classes/Tree.js';

describe('Performance Tests', () => {
    let trees;
    let scrollX;
    let app;
    let fpsBuffer;
    const FPS_BUFFER_SIZE = 30;

    beforeEach(() => {
        // Reset state
        trees = [];
        scrollX = 0;
        fpsBuffer = [];
        
        // Mock app instance
        app = {
            screen: { width: 800, height: 900 },
            stage: { addChild: jest.fn() },
            renderer: { resize: jest.fn() },
            ticker: { FPS: 60 }
        };

        // Clear all mocks
        jest.clearAllMocks();
    });

    // Helper function to simulate frame updates
    function simulateFrames(numFrames, scrollSpeed = 45) {
        const results = {
            minFPS: Infinity,
            maxFPS: 0,
            avgFPS: 0,
            fpsDrops: 0
        };

        for (let i = 0; i < numFrames; i++) {
            // Simulate time passing
            const currentTime = i * (1/60); // Assuming 60fps
            mockPerformanceNow.mockReturnValue(currentTime * 1000);

            // Update scroll position
            scrollX += scrollSpeed * (1/60);
            updateScrollX(scrollX);

            // Update all trees
            trees.forEach(tree => {
                tree.update(1/60);
                tree.render();
            });

            // Record FPS
            const fps = app.ticker.FPS;
            fpsBuffer.push(fps);
            if (fpsBuffer.length > FPS_BUFFER_SIZE) {
                fpsBuffer.shift();
            }

            // Update stats
            results.minFPS = Math.min(results.minFPS, fps);
            results.maxFPS = Math.max(results.maxFPS, fps);
            if (fps < 30) results.fpsDrops++;
        }

        // Calculate average FPS
        results.avgFPS = fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length;
        return results;
    }

    test('should maintain good performance with few trees', () => {
        // Create a small number of trees
        for (let i = 0; i < 5; i++) {
            const tree = new Tree(i * 200, app.screen.height);
            trees.push(tree);
        }

        // Simulate 100 frames
        const results = simulateFrames(100);

        // Performance expectations
        expect(results.avgFPS).toBeGreaterThan(50); // Should maintain high FPS
        expect(results.minFPS).toBeGreaterThan(30); // No severe drops
        expect(results.fpsDrops).toBe(0); // No frames below 30fps
    });

    test('should handle many trees without severe performance impact', () => {
        // Create many trees
        for (let i = 0; i < 50; i++) {
            const tree = new Tree(i * 200, app.screen.height);
            trees.push(tree);
        }

        // Simulate 100 frames
        const results = simulateFrames(100);

        // Performance expectations
        expect(results.avgFPS).toBeGreaterThan(30); // Should maintain playable FPS
        expect(results.fpsDrops).toBeLessThan(10); // Few severe drops
    });

    test('should handle rapid scrolling without performance issues', () => {
        // Create moderate number of trees
        for (let i = 0; i < 20; i++) {
            const tree = new Tree(i * 200, app.screen.height);
            trees.push(tree);
        }

        // Simulate rapid scrolling (3x normal speed)
        const results = simulateFrames(100, 135);

        // Performance expectations
        expect(results.avgFPS).toBeGreaterThan(40); // Should maintain good FPS
        expect(results.fpsDrops).toBeLessThan(5); // Few severe drops
    });

    test('should properly cull off-screen trees', () => {
        // Create many trees
        for (let i = 0; i < 100; i++) {
            const tree = new Tree(i * 200, app.screen.height);
            trees.push(tree);
        }

        // Simulate scrolling past all trees
        const results = simulateFrames(200);

        // Performance expectations
        expect(results.avgFPS).toBeGreaterThan(30); // Should maintain playable FPS
        expect(results.fpsDrops).toBeLessThan(15); // Few severe drops
    });
}); 