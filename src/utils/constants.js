// Scene settings
export const TREE_INTERVAL = 20000;  // Time between new trees (ms)
export const SCENE_SPEED = 1.0;      // Global speed multiplier
export const TREE_SPACING = 500;     // Fixed spacing between trees
export const MAX_BRANCH_LEVELS = 4;  // Maximum number of branch levels (0 is trunk)
export const LEAF_SIZE = 0.45        // Size relative to level 0 branch width

// Colors
export const BRANCH_COLOR = 0x9E958A;  // Branch color in hex
export const LEAF_COLOR = 0x7C7F4A;    // Leaf color in hex
export const SKY_COLOR = 0x7AB9D4;     // Sky color in hex (10% darker than 0x87CEEB)

// Add trunk constants
export const TRUNK_LENGTH = 250;  // Fixed length for trunks
export const TRUNK_WIDTH = 40;    // Fixed width for trunks
export const TRUNK_ANGLE_RANGE = 20;  // Maximum angle in degrees for trunk tilt

// Growth constants
export const MIN_SPAWN_INTERVAL = 2000; // Minimum 2 seconds between spawns 