import { Point } from './Point';
import { GeomUtils } from './GeomUtils';

/**
 * A polygon represented as an array of points
 */
export class Polygon extends Array<Point> {
    // Small constant for floating point comparisons
    private static readonly DELTA = 0.000001;
    
    /**
     * Create a new polygon from an array of points
     */
    constructor(vertices: Point[] = []) {
        super();
        if (vertices.length > 0) {
            // Make a deep copy of the vertices
            for (const v of vertices) {
                this.push(v.clone());
            }
        }
    }
    
    /**
     * Calculate the area of the polygon
     * Positive for counter-clockwise winding, negative for clockwise
     */
    public get square(): number {
        if (this.length < 3) return 0;
        
        let s = 0;
        
        for (let i = 0; i < this.length; i++) {
            const v1 = this[i];
            const v2 = this[(i + 1) % this.length];
            s += v1.x * v2.y - v2.x * v1.y;
        }
        
        return s * 0.5;
    }
    
    /**
     * Calculate the perimeter of the polygon
     */
    public get perimeter(): number {
        let len = 0;
        this.forEdge((v0, v1) => {
            len += Point.distance(v0, v1);
        });
        return len;
    }
    
    /**
     * Calculate the compactness of the polygon (1 for a circle, less for other shapes)
     * compactness = 4 * PI * area / perimeter^2
     */
    public get compactness(): number {
        const p = this.perimeter;
        return (4 * Math.PI * Math.abs(this.square)) / (p * p);
    }
    
    /**
     * Get the center point of the polygon (simple average of vertices)
     */
    public get center(): Point {
        const c = new Point();
        for (const v of this) {
            c.addEq(v);
        }
        c.scaleEq(1 / this.length);
        return c;
    }
    
    /**
     * Get the centroid (center of mass) of the polygon
     */
    public get centroid(): Point {
        const x = 0;
        const y = 0;
        let a = 0;
        
        this.forEdge((v0, v1) => {
            const f = GeomUtils.cross(v0.x, v0.y, v1.x, v1.y);
            a += f;
            x += (v0.x + v1.x) * f;
            y += (v0.y + v1.y) * f;
        });
        
        const s6 = 1 / (3 * a);
        return new Point(s6 * x, s6 * y);
    }
    
    /**
     * Check if the polygon contains a point
     */
    public contains(p: Point): boolean {
        return this.indexOf(p) !== -1;
    }
    
    /**
     * Iterate over each edge of the polygon
     */
    public forEdge(callback: (v0: Point, v1: Point) => void): void {
        const len = this.length;
        for (let i = 0; i < len; i++) {
            callback(this[i], this[(i + 1) % len]);
        }
    }
    
    /**
     * Iterate over each segment of the polygon (excluding the last edge)
     */
    public forSegment(callback: (v0: Point, v1: Point) => void): void {
        for (let i = 0; i < this.length - 1; i++) {
            callback(this[i], this[i + 1]);
        }
    }
    
    /**
     * Offset the polygon by a point
     */
    public offset(p: Point): void {
        for (const v of this) {
            v.addEq(p);
        }
    }
    
    /**
     * Rotate the polygon around the origin
     */
    public rotate(angle: number): void {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        
        for (const v of this) {
            const vx = v.x * cosA - v.y * sinA;
            const vy = v.y * cosA + v.x * sinA;
            v.x = vx;
            v.y = vy;
        }
    }
    
    /**
     * Check if a vertex is convex
     */
    public isConvexVertex(v1: Point): boolean {
        const i = this.indexOf(v1);
        if (i === -1) return false;
        
        const len = this.length;
        const v0 = this[(i + len - 1) % len];
        const v2 = this[(i + 1) % len];
        
        return GeomUtils.cross(
            v1.x - v0.x, v1.y - v0.y, 
            v2.x - v1.x, v2.y - v1.y
        ) > 0;
    }
    
    /**
     * Check if the polygon is convex
     */
    public isConvex(): boolean {
        for (const v of this) {
            if (!this.isConvexVertex(v)) return false;
        }
        return true;
    }
    
    /**
     * Smooth a vertex by averaging with neighbors
     */
    public smoothVertex(v: Point, factor: number = 1.0): Point {
        const index = this.indexOf(v);
        if (index === -1) return v.clone();
        
        const len = this.length;
        const prev = this[(index + len - 1) % len];
        const next = this[(index + 1) % len];
        
        return new Point(
            (prev.x + v.x * factor + next.x) / (2 + factor),
            (prev.y + v.y * factor + next.y) / (2 + factor)
        );
    }
    
    /**
     * Create a smoothed version of the polygon
     */
    public smoothVertexEq(factor: number = 1.0): Polygon {
        const len = this.length;
        const result = new Polygon();
        
        if (len < 3) return new Polygon(this);
        
        for (let i = 0; i < len; i++) {
            const v1 = this[i];
            const v0 = this[(i + len - 1) % len];
            const v2 = this[(i + 1) % len];
            
            result.push(new Point(
                (v0.x + v1.x * factor + v2.x) / (2 + factor),
                (v0.y + v1.y * factor + v2.y) / (2 + factor)
            ));
        }
        
        return result;
    }
    
    /**
     * Find the minimum distance from any vertex to a point
     */
    public distance(p: Point): number {
        if (this.length === 0) return Infinity;
        
        let minDist = Point.distance(this[0], p);
        for (let i = 1; i < this.length; i++) {
            const dist = Point.distance(this[i], p);
            if (dist < minDist) {
                minDist = dist;
            }
        }
        return minDist;
    }
    
    /**
     * Find the vertex that minimizes the given function
     */
    public min(valueFn: (p: Point) => number): Point {
        if (this.length === 0) throw new Error("Empty polygon");
        
        let minVertex = this[0];
        let minValue = valueFn(minVertex);
        
        for (let i = 1; i < this.length; i++) {
            const vertex = this[i];
            const value = valueFn(vertex);
            if (value < minValue) {
                minVertex = vertex;
                minValue = value;
            }
        }
        
        return minVertex;
    }
    
    /**
     * Find the vertex that maximizes the given function
     */
    public max(valueFn: (p: Point) => number): Point {
        if (this.length === 0) throw new Error("Empty polygon");
        
        let maxVertex = this[0];
        let maxValue = valueFn(maxVertex);
        
        for (let i = 1; i < this.length; i++) {
            const vertex = this[i];
            const value = valueFn(vertex);
            if (value > maxValue) {
                maxVertex = vertex;
                maxValue = value;
            }
        }
        
        return maxVertex;
    }
    
    /**
     * Get the next vertex after the given one
     */
    public next(p: Point): Point {
        const index = this.indexOf(p);
        if (index === -1) throw new Error("Point not in polygon");
        return this[(index + 1) % this.length];
    }
    
    /**
     * Get the previous vertex before the given one
     */
    public prev(p: Point): Point {
        const index = this.indexOf(p);
        if (index === -1) throw new Error("Point not in polygon");
        return this[(index + this.length - 1) % this.length];
    }
    
    /**
     * Get the direction vector at the given vertex
     */
    public vector(v: Point): Point {
        return this.next(v).subtract(v);
    }
    
    /**
     * Find the index of an edge between two points
     */
    public findEdge(a: Point, b: Point): number {
        for (let i = 0; i < this.length; i++) {
            if (this[i].equals(a) && this[(i + 1) % this.length].equals(b)) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Check if this polygon shares an edge with another
     */
    public borders(another: Polygon): boolean {
        const len1 = this.length;
        const len2 = another.length;
        
        for (let i = 0; i < len1; i++) {
            const v1 = this[i];
            const j = another.indexOf(v1);
            
            if (j !== -1) {
                const next = this[(i + 1) % len1];
                if (next.equals(another[(j + 1) % len2]) || 
                    next.equals(another[(j + len2 - 1) % len2])) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Cut the polygon along a line segment
     */
    public cut(p1: Point, p2: Point, gap: number = 0): Polygon[] {
        const x1 = p1.x;
        const y1 = p1.y;
        const dx1 = p2.x - x1;
        const dy1 = p2.y - y1;

        const len = this.length;
        let edge1 = 0, ratio1 = 0;
        let edge2 = 0, ratio2 = 0;
        let count = 0;

        // Find intersections with the cutting line
        for (let i = 0; i < len; i++) {
            const v0 = this[i];
            const v1 = this[(i + 1) % len];

            const x2 = v0.x;
            const y2 = v0.y;
            const dx2 = v1.x - x2;
            const dy2 = v1.y - y2;

            const t = GeomUtils.intersectLines(x1, y1, dx1, dy1, x2, y2, dx2, dy2);
            if (t && t.y >= 0 && t.y <= 1) {
                if (count === 0) {
                    edge1 = i;
                    ratio1 = t.x;
                } else if (count === 1) {
                    edge2 = i;
                    ratio2 = t.x;
                }
                count++;
            }
        }

        if (count === 2) {
            // Calculate intersection points
            const point1 = new Point(
                p1.x + (p2.x - p1.x) * ratio1,
                p1.y + (p2.y - p1.y) * ratio1
            );
            
            const point2 = new Point(
                p1.x + (p2.x - p1.x) * ratio2,
                p1.y + (p2.y - p1.y) * ratio2
            );

            // Create the two halves
            const half1 = new Polygon(this.slice(edge1 + 1, edge2 + 1));
            half1.unshift(point1);
            half1.push(point2);

            const half2Points = [...this.slice(edge2 + 1), ...this.slice(0, edge1 + 1)];
            const half2 = new Polygon(half2Points);
            half2.unshift(point2);
            half2.push(point1);

            // Add gap if needed
            if (gap > 0) {
                // TODO: Implement peel function to create gap
                // For now, return without gap
            }

            // Determine which half is which based on cross product
            const v = this[(edge1 + 1) % len].subtract(this[edge1]);
            return GeomUtils.cross(dx1, dy1, v.x, v.y) > 0 ? [half1, half2] : [half2, half1];
        }

        // If no valid cut, return the original polygon
        return [new Polygon(this)];
    }
    
    /**
     * Shrink the polygon inward by the specified distances
     */
    public shrink(distances: number[]): Polygon {
        let result = new Polygon(this);
        let i = 0;
        
        this.forEdge((v1, v2) => {
            const distance = distances[i++];
            if (distance > 0) {
                const v = v2.subtract(v1);
                const n = v.rotate90().norm(distance);
                
                // Cut the polygon along a parallel line inset by distance
                result = result.cut(v1.add(n), v2.add(n), 0)[0];
            }
        });
        
        return result;
    }
    
    /**
     * Shrink the polygon by an equal distance on all sides
     */
    public shrinkEq(distance: number): Polygon {
        return this.shrink(Array(this.length).fill(distance));
    }
    
    /**
     * Create a rectangular polygon
     */
    public static rect(w: number = 1.0, h: number = 1.0): Polygon {
        return new Polygon([
            new Point(-w/2, -h/2),
            new Point(w/2, -h/2),
            new Point(w/2, h/2),
            new Point(-w/2, h/2)
        ]);
    }
    
    /**
     * Create a regular polygon
     */
    public static regular(n: number = 8, r: number = 1.0): Polygon {
        const vertices: Point[] = [];
        for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2;
            vertices.push(new Point(
                r * Math.cos(a),
                r * Math.sin(a)
            ));
        }
        return new Polygon(vertices);
    }
    
    /**
     * Create a circular polygon approximation
     */
    public static circle(r: number = 1.0): Polygon {
        return Polygon.regular(16, r);
    }
}