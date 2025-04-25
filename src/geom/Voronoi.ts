import { Point } from './Point';
import { GeomUtils } from './GeomUtils';
import { MathUtils } from '../utils/MathUtils';

/**
 * A triangle in the Delaunay triangulation
 */
export class Triangle {
    public p1: Point;
    public p2: Point;
    public p3: Point;
    public c: Point; // Circumcenter
    public r: number; // Circumradius

    constructor(p1: Point, p2: Point, p3: Point) {
        // Ensure counter-clockwise orientation
        const s = (p2.x - p1.x) * (p2.y + p1.y) + 
                  (p3.x - p2.x) * (p3.y + p2.y) + 
                  (p1.x - p3.x) * (p1.y + p3.y);
        
        this.p1 = p1;
        // CCW ordering
        this.p2 = s > 0 ? p2 : p3;
        this.p3 = s > 0 ? p3 : p2;

        // Calculate circumcenter and circumradius
        const x1 = (p1.x + p2.x) / 2;
        const y1 = (p1.y + p2.y) / 2;
        const x2 = (p2.x + p3.x) / 2;
        const y2 = (p2.y + p3.y) / 2;

        const dx1 = p1.y - p2.y;
        const dy1 = p2.x - p1.x;
        const dx2 = p2.y - p3.y;
        const dy2 = p3.x - p2.x;

        // Handle special case of vertical line
        let t2: number;
        if (Math.abs(dx1) < 0.000001) {
            t2 = (x1 - x2) / dx2;
        } else {
            const tg1 = dy1 / dx1;
            t2 = ((y1 - y2) - (x1 - x2) * tg1) / (dy2 - dx2 * tg1);
        }

        this.c = new Point(x2 + dx2 * t2, y2 + dy2 * t2);
        this.r = Point.distance(this.c, p1);
    }

    /**
     * Check if this triangle has the given edge
     */
    public hasEdge(a: Point, b: Point): boolean {
        return (this.p1.equals(a) && this.p2.equals(b)) ||
               (this.p2.equals(a) && this.p3.equals(b)) ||
               (this.p3.equals(a) && this.p1.equals(b));
    }
}

/**
 * A region in the Voronoi diagram
 */
export class Region {
    public seed: Point;
    public vertices: Triangle[] = [];

    constructor(seed: Point) {
        this.seed = seed;
    }

    /**
     * Sort vertices in counter-clockwise order around the seed
     */
    public sortVertices(): Region {
        this.vertices.sort(this.compareAngles.bind(this));
        return this;
    }

    /**
     * Find the center of the region
     */
    public center(): Point {
        const c = new Point();
        for (const v of this.vertices) {
            c.addEq(v.c);
        }
        c.scaleEq(1 / this.vertices.length);
        return c;
    }

    /**
     * Check if this region shares a border with another region
     */
    public borders(r: Region): boolean {
        const len1 = this.vertices.length;
        const len2 = r.vertices.length;
        
        for (let i = 0; i < len1; i++) {
            const j = r.vertices.indexOf(this.vertices[i]);
            if (j !== -1) {
                return this.vertices[(i + 1) % len1] === r.vertices[(j + len2 - 1) % len2];
            }
        }
        
        return false;
    }

    /**
     * Compare angles for sorting vertices
     */
    private compareAngles(v1: Triangle, v2: Triangle): number {
        const x1 = v1.c.x - this.seed.x;
        const y1 = v1.c.y - this.seed.y;
        const x2 = v2.c.x - this.seed.x;
        const y2 = v2.c.y - this.seed.y;

        // Handle quadrant comparison for better numerical stability
        if (x1 >= 0 && x2 < 0) return 1;
        if (x2 >= 0 && x1 < 0) return -1;
        if (x1 === 0 && x2 === 0) {
            return y2 > y1 ? 1 : -1;
        }

        return MathUtils.sign(x2 * y1 - x1 * y2);
    }
}

/**
 * Voronoi diagram implementation
 */
export class Voronoi {
    public triangles: Triangle[] = [];
    public points: Point[] = [];
    public frame: Point[] = [];

    private _regions: Map<Point, Region> = new Map();
    private _regionsDirty: boolean = false;

    /**
     * Create a new Voronoi diagram with bounding frame
     */
    constructor(minx: number, miny: number, maxx: number, maxy: number) {
        // Create frame points
        const c1 = new Point(minx, miny);
        const c2 = new Point(minx, maxy);
        const c3 = new Point(maxx, miny);
        const c4 = new Point(maxx, maxy);
        
        this.frame = [c1, c2, c3, c4];
        this.points = [...this.frame];
        
        // Initialize with two triangles covering the frame
        this.triangles.push(new Triangle(c1, c2, c3));
        this.triangles.push(new Triangle(c2, c3, c4));
        
        // Build initial regions
        for (const p of this.points) {
            this._regions.set(p, this.buildRegion(p));
        }
        
        this._regionsDirty = false;
    }

    /**
     * Get the Voronoi regions
     */
    public get regions(): Map<Point, Region> {
        if (this._regionsDirty) {
            this._regions = new Map();
            this._regionsDirty = false;
            
            for (const p of this.points) {
                this._regions.set(p, this.buildRegion(p));
            }
        }
        
        return this._regions;
    }

    /**
     * Add a point to the Voronoi diagram
     */
    public addPoint(p: Point): void {
        // Find triangles whose circumcircles contain the point
        const toSplit: Triangle[] = [];
        
        for (const tr of this.triangles) {
            if (Point.distance(p, tr.c) < tr.r) {
                toSplit.push(tr);
            }
        }
        
        if (toSplit.length > 0) {
            // Add point to list
            this.points.push(p);
            
            // Collect edges that need new triangles
            const a: Point[] = [];
            const b: Point[] = [];
            
            for (const t1 of toSplit) {
                let e1 = true, e2 = true, e3 = true;
                
                for (const t2 of toSplit) {
                    if (t2 !== t1) {
                        // If triangles have a common edge, it goes in opposite directions
                        if (e1 && t2.hasEdge(t1.p2, t1.p1)) e1 = false;
                        if (e2 && t2.hasEdge(t1.p3, t1.p2)) e2 = false;
                        if (e3 && t2.hasEdge(t1.p1, t1.p3)) e3 = false;
                        
                        if (!(e1 || e2 || e3)) break;
                    }
                }
                
                if (e1) { a.push(t1.p1); b.push(t1.p2); }
                if (e2) { a.push(t1.p2); b.push(t1.p3); }
                if (e3) { a.push(t1.p3); b.push(t1.p1); }
            }
            
            // Create new triangles
            let index = 0;
            do {
                this.triangles.push(new Triangle(p, a[index], b[index]));
                index = a.indexOf(b[index]);
            } while (index !== 0);
            
            // Remove old triangles
            for (const tr of toSplit) {
                const index = this.triangles.indexOf(tr);
                if (index !== -1) {
                    this.triangles.splice(index, 1);
                }
            }
            
            this._regionsDirty = true;
        }
    }

    /**
     * Build a region for a point
     */
    private buildRegion(p: Point): Region {
        const r = new Region(p);
        
        for (const tr of this.triangles) {
            if (tr.p1.equals(p) || tr.p2.equals(p) || tr.p3.equals(p)) {
                r.vertices.push(tr);
            }
        }
        
        return r.sortVertices();
    }

    /**
     * Check if a triangle contains only non-frame vertices
     */
    private isReal(tr: Triangle): boolean {
        return !(
            this.frame.some(p => p.equals(tr.p1)) || 
            this.frame.some(p => p.equals(tr.p2)) || 
            this.frame.some(p => p.equals(tr.p3))
        );
    }

    /**
     * Get the Delaunay triangulation (triangles with no frame points)
     */
    public triangulation(): Triangle[] {
        return this.triangles.filter(tr => this.isReal(tr));
    }

    /**
     * Get the Voronoi partitioning (regions with no frame points)
     */
    public partitioning(): Region[] {
        const result: Region[] = [];
        
        for (const p of this.points) {
            const r = this.regions.get(p);
            if (r) {
                let isReal = true;
                
                for (const v of r.vertices) {
                    if (!this.isReal(v)) {
                        isReal = false;
                        break;
                    }
                }
                
                if (isReal) {
                    result.push(r);
                }
            }
        }
        
        return result;
    }

    /**
     * Get neighboring regions
     */
    public getNeighbours(r1: Region): Region[] {
        return Array.from(this.regions.values())
            .filter(r2 => r1 !== r2 && r1.borders(r2));
    }

    /**
     * Relax the Voronoi diagram (Lloyd's algorithm)
     */
    public static relax(voronoi: Voronoi, toRelax: Point[] = null): Voronoi {
        const regions = voronoi.partitioning();
        
        // Copy points except frame points
        const points = voronoi.points.filter(
            p => !voronoi.frame.some(fp => fp.equals(p))
        );
        
        // If no specific points to relax, relax all
        if (!toRelax) {
            toRelax = [...voronoi.points];
        }
        
        // Replace seed points with region centers
        for (const r of regions) {
            if (toRelax.some(p => p.equals(r.seed))) {
                // Remove old seed
                const index = points.findIndex(p => p.equals(r.seed));
                if (index !== -1) {
                    points.splice(index, 1);
                }
                
                // Add new center
                points.push(r.center());
            }
        }
        
        return Voronoi.build(points);
    }

    /**
     * Build a Voronoi diagram from a set of points
     */
    public static build(vertices: Point[]): Voronoi {
        // Find bounding box
        let minx = Infinity, miny = Infinity;
        let maxx = -Infinity, maxy = -Infinity;
        
        for (const v of vertices) {
            minx = Math.min(minx, v.x);
            miny = Math.min(miny, v.y);
            maxx = Math.max(maxx, v.x);
            maxy = Math.max(maxy, v.y);
        }
        
        // Expand bounding box
        const dx = (maxx - minx) * 0.5;
        const dy = (maxy - miny) * 0.5;
        
        // Create Voronoi diagram with expanded frame
        const voronoi = new Voronoi(
            minx - dx/2, miny - dy/2, 
            maxx + dx/2, maxy + dy/2
        );
        
        // Add all points
        for (const v of vertices) {
            voronoi.addPoint(v);
        }
        
        return voronoi;
    }
}