# Growing Trees Visualization

A visualization of procedurally generated trees with continuously growing branches and leaves.

## Features

- Procedurally generated trees with smooth growing animation
- Realistic branch and leaf shapes using bezier curves
- Realistic positioning of child branches with bias
- Scrolling landscape with tree generation system
- Vertex caching for performance optimization
- Multiple trees with culling system
- Detailed debug mode for development and learning
- WebGL rendering for better performance

## Technical Improvements

### WebGL Rendering with PIXI.js
- Converted from p5.js to PIXI.js for hardware accelerated rendering
- Implemented proper scene rendering using PIXI Graphics
- Bezier curve-based branch and leaf shapes
- Proper matrix transformations for branch and leaf positioning

### Performance Optimizations
- Uses WebGL for GPU-accelerated rendering
- Vertex caching for fully grown branches
- Intelligent off-screen culling system
- Optimized branch and leaf calculations
- Progressive branch and leaf growth

### UI Improvements
- Start button to begin animation
- Pause/Resume functionality
- Debug mode toggle
- FPS counter
- On-screen controls and keyboard shortcuts

### Testing
- Added Jest tests to verify core functionality
- Implemented a console checker to detect browser errors

## Controls

- Press 'P' to pause/resume animation
- Press 'D' to toggle debug mode
- Click UI buttons to control the visualization

## Debug Features

When debug mode is enabled, you can see:
- Branch connection paths
- Growth points and measurements
- Leaf rotation axes
- FPS counter
- Tree tracking
- Growth trigger indicators

## Development

### Requirements
- Node.js

### Setup
```bash
npm install
npm start
```

### Testing
```bash
npm test
```

## Credits
Originally implemented in p5.js, then optimized using PIXI.js for WebGL acceleration. 