// Scene settings
export const TREE_INTERVAL = 20000;  // Time between new trees (ms)
export const SCENE_SPEED = 0.5;      // Global speed multiplier (adjusted for 2s growth)
export const TREE_SPACING = 500;     // Fixed spacing between trees
export const MAX_BRANCH_LEVELS = 4;  // Maximum number of branch levels (0 is trunk)
export const LEAF_SIZE = 20;        // Base size for leaves

// Growth timing (all in seconds for consistency with delta time)
export const BRANCH_GROWTH_TIME = 1.0;     // Time for a branch to grow fully (seconds)
export const CHILD_BRANCH_DELAY = 0.1;     // Delay before child branches start growing (seconds)
export const LEAF_GROWTH_TIME = 2.0;       // Time for leaves to fully grow (seconds)

// Colors
export const BRANCH_COLOR = 0x9E958A;  // Branch color in hex
export const LEAF_COLOR = 0x7C7F4A;    // Leaf color in hex
export const SKY_COLOR = 0x7AB9D4;     // Sky color in hex (10% darker than 0x87CEEB)

// Add trunk constants
export const TRUNK_LENGTH = 250;  // Fixed length for trunks
export const TRUNK_WIDTH = 40;    // Fixed width for trunks
export const TRUNK_ANGLE_RANGE = 20;  // Maximum angle in degrees for trunk tilt

// Growth constants
export const MIN_SPAWN_INTERVAL = 2.0; // Minimum time between spawns (seconds)

// Branch growth constants
export const BRANCH_MIN_LENGTH = 275;  // Minimum length for non-trunk branches
export const BRANCH_MAX_LENGTH = 325;  // Maximum length for non-trunk branches
export const BRANCH_MIN_WIDTH = 30;    // Minimum width for non-trunk branches
export const BRANCH_MAX_WIDTH = 45;    // Maximum width for non-trunk branches
export const BRANCH_SIDE_ANGLE_RANGE = 70;  // Maximum angle for side branches (±70 degrees)
export const BRANCH_END_ANGLE_RANGE = 23;   // Maximum angle for end branches (±23 degrees)

// Branch spawn points
export const BRANCH_MIN_SPAWN_HEIGHT = 0.3;  // Minimum height for branch spawning (30% of parent length)
export const BRANCH_MAX_SPAWN_HEIGHT = 0.9;  // Maximum height for branch spawning (90% of parent length)
export const BRANCH_SPAWN_RANDOM_OFFSET = 0.1;  // Random offset for spawn points (±10%)

// Tree structure
export const TRUNK_MIN_BRANCHES = 3;  // Minimum number of branches for trunk
export const TRUNK_MAX_BRANCHES = 5; // Maximum number of branches for trunk
export const BRANCH_MIN_CHILDREN = 2; // Minimum number of branches for non-trunk branches
export const BRANCH_MAX_CHILDREN = 5; // Maximum number of branches for non-trunk branches

// Leaf properties
export const LEAF_MIN_COUNT = 1;      // Minimum number of leaves per branch
export const LEAF_MAX_COUNT = 3;      // Maximum number of leaves per branch
export const LEAF_WIDTH_RATIO = 0.4;  // Width ratio for leaf shape
export const LEAF_MIN_GROWTH = 0.2;   // Minimum growth progress before leaves appear
export const LEAF_MAX_GROWTH = 0.9;   // Maximum growth progress before leaves appear
export const LEAF_GROWTH_RATE = 0.5;  // Growth rate per second for leaves
export const LEAF_ANGLE_RANGE = 90;   // Maximum angle for leaf rotation (±50 degrees)

// Visual variation
export const COLOR_VARIATION_RANGE = 0.1;  // ±10% color variation 