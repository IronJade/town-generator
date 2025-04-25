import { Point } from './Point';

/**
 * Utility functions for geometry operations
 */
export class GeomUtils {
    /**
     * Find the intersection of two line segments
     * Returns a point with [t1, t2] parameters or null if no intersection
     */
    public static intersectLines(
        x1: number, y1: number, dx1: number, dy1: number,
        x2: number, y2: number, dx2: number, dy2: number
    ): Point | null {
        const d = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(d) < 0.0001) {
            return null; // Lines are parallel
        }

        const t2 = (dy1 * (x2 - x1) - dx1 * (y2 - y1)) / d;
        
        const t1 = dx1 !== 0
            ? (x2 - x1 + dx2 * t2) / dx1
            : (y2 - y1 + dy2 * t2) / dy1;

        return new Point(t1, t2);
    }

    /**
     * Interpolate between two points
     */
    public static interpolate(p1: Point, p2: Point, ratio: number = 0.5): Point {
        return new Point(
            p1.x + (p2.x - p1.x) * ratio,
            p1.y + (p2.y - p1.y) * ratio
        );
    }

    /**
     * Calculate the scalar (dot) product of two vectors
     */
    public static scalar(x1: number, y1: number, x2: number, y2: number): number {
        return x1 * x2 + y1 * y2;
    }

    /**
     * Calculate the cross product of two vectors
     */
    public static cross(x1: number, y1: number, x2: number, y2: number): number {
        return x1 * y2 - y1 * x2;
    }

    /**
     * Calculate the perpendicular distance from a point to a line
     */
    public static distance2line(
        x1: number, y1: number, dx1: number, dy1: number,
        x0: number, y0: number
    ): number {
        return Math.abs(
            dx1 * y0 - dy1 * x0 + (y1 + dy1) * x1 - (x1 + dx1) * y1
        ) / Math.sqrt(dx1 * dx1 + dy1 * dy1);
    }
}