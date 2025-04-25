import { Point } from './Point';

/**
 * A line segment between two points
 */
export class Segment {
    /**
     * Create a line segment between two points
     */
    constructor(
        public readonly start: Point,
        public readonly end: Point
    ) {}

    /**
     * Get the x-component of the segment vector
     */
    public get dx(): number {
        return this.end.x - this.start.x;
    }

    /**
     * Get the y-component of the segment vector
     */
    public get dy(): number {
        return this.end.y - this.start.y;
    }

    /**
     * Get the vector representation of the segment
     */
    public get vector(): Point {
        return this.end.subtract(this.start);
    }

    /**
     * Get the length of the segment
     */
    public get length(): number {
        return Point.distance(this.start, this.end);
    }
}