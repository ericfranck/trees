# Growing Trees Visualization

A visualization of procedurally generated trees with continuously growing branches and leaves, built with PIXI.js for high-performance WebGL rendering.

## Features

- Procedurally generated trees with smooth growing animation
- Realistic branch and leaf shapes using bezier curves
- Realistic positioning of child branches with bias
- Scrolling landscape with automatic tree generation
- Vertex caching for performance optimization
- Multiple trees with intelligent culling system
- Detailed debug mode for development and learning
- WebGL-accelerated rendering with PIXI.js v8

## Technical Details

### WebGL Rendering with PIXI.js
- Hardware-accelerated rendering using PIXI.js v8.9.1
- Optimized scene rendering using PIXI Graphics
- Bezier curve-based branch and leaf shapes
- Efficient matrix transformations for branch and leaf positioning
- Resolution-aware rendering with device pixel ratio support

### Performance Optimizations
- WebGL-based GPU acceleration
- Smart vertex caching for fully grown branches
- Intelligent off-screen culling system
- Optimized branch and leaf calculations
- Progressive branch and leaf growth
- Capped frame rate and delta time handling
- Efficient memory management with proper cleanup

### UI Features
- Clean, modern interface with semi-transparent controls
- Start/Stop animation control
- Pause/Resume functionality
- Debug mode toggle
- Real-time FPS counter
- Keyboard shortcuts and on-screen controls
- Responsive canvas sizing

### Testing
- Comprehensive Jest test suite
- Performance benchmarking tests
- Growth simulation tests
- JSDOM environment for DOM testing
- Automated test running with watch mode support

## Controls

- Press 'S' to start the animation
- Press 'P' to pause/resume animation
- Press 'D' to toggle debug mode
- Use on-screen buttons for all controls

## Debug Features

When debug mode is enabled, you can see:
- Branch connection paths
- Growth points and measurements
- Leaf rotation axes
- Real-time FPS counter
- Active tree count
- Growth trigger indicators
- Performance metrics

## Development

### Requirements
- Node.js (Latest LTS recommended)
- Modern web browser with WebGL support

### Dependencies
- PIXI.js v8.9.1 for WebGL rendering
- Jest v29.7.0 for testing
- Babel for modern JavaScript support
- HTTP server for local development

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Testing
```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Any modern browser with WebGL support

## Credits
Originally implemented in p5.js, then optimized using PIXI.js for WebGL acceleration. Built with modern JavaScript and WebGL best practices. 