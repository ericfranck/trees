# Procedural Tree Growth Animation

A creative coding project that generates and animates procedurally growing trees using p5.js. Trees grow organically with branches and leaves, creating a peaceful, ever-evolving scene.

## Features

- Procedural tree generation with organic growth animation
- Infinite scrolling scene with new trees spawning continuously
- Natural branch and leaf variations within each tree
- Consistent trunk properties with random tilt angles
- Pause/resume functionality
- Debug mode for development

## Controls

- **P**: Pause/Resume the animation
- **D**: Toggle debug mode

## Project Structure

```
src/
├── classes/
│   ├── Branch.js    # Branch class for tree segments
│   └── Tree.js      # Tree class managing overall tree structure
├── utils/
│   └── constants.js # Configuration and constants
└── sketch.js        # Main p5.js sketch file
```

## Constants

Key parameters that control the tree generation and animation:

- `TRUNK_LENGTH`: Fixed length for tree trunks (250px)
- `TRUNK_WIDTH`: Fixed width for tree trunks (40px)
- `TRUNK_ANGLE_RANGE`: Maximum tilt angle for trunks (±20°)
- `MAX_BRANCH_LEVELS`: Maximum branch depth (4 levels)
- `TREE_SPACING`: Distance between trees (500px)
- `SCENE_SPEED`: Global animation speed multiplier

## Setup

1. Clone the repository
2. Start a local server (e.g., using Python's `http.server` or Live Server in VS Code)
3. Open in your browser

## Development

The project uses vanilla JavaScript with p5.js for rendering. Key features can be modified through the constants in `src/utils/constants.js`.

### Branch Generation

Branches are generated with:
- Random angles within constraints
- Varying lengths relative to parent
- Natural color variations
- Smooth growth animations

### Performance Optimizations

- Shape caching for fully grown branches
- Vertex data storage for efficient rendering
- Tree culling when off-screen

## License

MIT License - feel free to use and modify for your own projects! 