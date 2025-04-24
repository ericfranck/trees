// Math constants
export const PI = Math.PI;
export const TWO_PI = Math.PI * 2;
export const HALF_PI = Math.PI / 2;

// Utility functions
export function random(min, max) {
    if (max === undefined) {
        max = min;
        min = 0;
    }
    return min + Math.random() * (max - min);
}

export function floor(n) {
    return Math.floor(n);
}

export function constrain(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

export function lerp(start, stop, amt) {
    return start + (stop - start) * amt;
}

// Color adjustment function
export function adjustColor(hexColor, variation) {
    // Convert hex to RGB
    const r = (hexColor >> 16) & 255;
    const g = (hexColor >> 8) & 255;
    const b = hexColor & 255;
    
    // Adjust each component
    const adjustedR = Math.round(constrain(r * variation, 0, 255));
    const adjustedG = Math.round(constrain(g * variation, 0, 255));
    const adjustedB = Math.round(constrain(b * variation, 0, 255));
    
    // Convert back to hex
    return (adjustedR << 16) | (adjustedG << 8) | adjustedB;
} 