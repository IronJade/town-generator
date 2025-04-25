/**
 * A 2D point with x and y coordinates
 */
export class Point {
    /**
     * Create a new point with x and y coordinates
     */
    constructor(public x: number = 0, public y: number = 0) {}
    
    /**
     * Create a copy of this point
     */
    public clone(): Point {
        return new Point(this.x, this.y);
    }
    
    /**
     * Calculate the distance between two points
     */
    public static distance(p1: Point, p2: Point): number {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Set this point's coordinates to match another point
     */
    public set(p: Point): void {
        this.x = p.x;
        this.y = p.y;
    }
    
    /**
     * Add another point's coordinates to this point
     */
    public add(p: Point): Point {
        return new Point(this.x + p.x, this.y + p.y);
    }
    
    /**
     * Add another point's coordinates to this point (modifying this point)
     */
    public addEq(p: Point): void {
        this.x += p.x;
        this.y += p.y;
    }
    
    /**
     * Subtract another point from this point
     */
    public subtract(p: Point): Point {
        return new Point(this.x - p.x, this.y - p.y);
    }
    
    /**
     * Subtract another point from this point (modifying this point)
     */
    public subEq(p: Point): void {
        this.x -= p.x;
        this.y -= p.y;
    }
    
    /**
     * Scale this point by a factor
     */
    public scale(factor: number): Point {
        return new Point(this.x * factor, this.y * factor);
    }
    
    /**
     * Scale this point by a factor (modifying this point)
     */
    public scaleEq(factor: number): void {
        this.x *= factor;
        this.y *= factor;
    }
    
    /**
     * Calculate the dot product with another point
     */
    public dot(p: Point): number {
        return this.x * p.x + this.y * p.y;
    }
    
    /**
     * Calculate the length (magnitude) of this point as a vector
     */
    public length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    /**
     * Normalize this point to a specific length
     */
    public normalize(length: number = 1): void {
        const l = this.length();
        if (l > 0) {
            this.x = (this.x / l) * length;
            this.y = (this.y / l) * length;
        }
    }
    
    /**
     * Get a normalized copy of this point
     */
    public norm(length: number = 1): Point {
        const p = this.clone();
        p.normalize(length);
        return p;
    }
    
    /**
     * Rotate this point 90 degrees counter-clockwise
     */
    public rotate90(): Point {
        return new Point(-this.y, this.x);
    }
    
    /**
     * Calculate the angle of this point in radians
     */
    public atan(): number {
        return Math.atan2(this.y, this.x);
    }
    
    /**
     * Check if this point equals another point (within a small epsilon)
     */
    public equals(p: Point | null, epsilon: number = 0.0001): boolean {
        if (!p) return false;
        return Math.abs(this.x - p.x) < epsilon && Math.abs(this.y - p.y) < epsilon;
    }
    
    /**
     * Convert point to string representation
     */
    public toString(): string {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }
}