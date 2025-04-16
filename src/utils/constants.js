// Scene settings
export const TREE_INTERVAL = 20000;  // Time between new trees (ms)
export const SCENE_SPEED = 1.0;      // Global speed multiplier
export const TREE_SPACING = 500;     // Fixed spacing between trees
export const MAX_BRANCH_LEVELS = 4;  // Maximum number of branch levels (0 is trunk)
export const LEAF_SIZE = 0.45        // Size relative to level 0 branch width

// Colors
export const BRANCH_COLOR = '#9E958A';
export const LEAF_COLOR = '#7C7F4A';
export const SKY_COLOR = [122, 185, 212]; // 10% darker than [135, 206, 235] 

// Add trunk constants
export const TRUNK_LENGTH = 250;  // Previously random(275, 325)
export const TRUNK_WIDTH = 40;    // Previously random(30, 45)
export const TRUNK_ANGLE_RANGE = 20;  // Maximum angle in degrees for trunk tilt 