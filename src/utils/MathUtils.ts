/**
 * Utility functions for mathematical operations
 */
export class MathUtils {
    /**
     * Clamp a floating point value between min and max
     */
    public static gate(value: number, min: number, max: number): number {
        return value < min ? min : (value < max ? value : max);
    }

    /**
     * Clamp an integer value between min and max
     */
    public static gatei(value: number, min: number, max: number): number {
        return value < min ? min : (value < max ? value : max);
    }

    /**
     * Get the sign of a value (-1, 0, or 1)
     */
    public static sign(value: number): number {
        return value === 0 ? 0 : (value < 0 ? -1 : 1);
    }
}