import { Point } from '../../geom/Point';
import { Polygon } from '../../geom/Polygon';
import { Model } from '../Model';
import { Patch } from '../Patch';
import { Random } from '../../utils/Random';
import { GeomUtils } from '../../geom/GeomUtils';

export class Ward {
    // Street width constants
    public static readonly MAIN_STREET = 2.0;
    public static readonly REGULAR_STREET = 1.0;
    public static readonly ALLEY = 0.6;

    public model: Model;
    public patch: Patch;
    public geometry: Polygon[] = [];

    constructor(model: Model, patch: Patch) {
        this.model = model;
        this.patch = patch;
    }

    /**
     * Create the geometry for this ward
     * (buildings, structures, etc.)
     */
    public createGeometry(): void {
        this.geometry = [];
    }

    /**
     * Get the buildable area within this ward
     * (inset from streets and walls)
     */
    public getCityBlock(): Polygon {
        const insetDist: number[] = [];
        
        const innerPatch = this.model.wall === null || this.patch.withinWalls;
        
        this.patch.shape.forEdge((v0, v1) => {
            if (this.model.wall !== null && this.model.wall.bordersBy(this.patch, v0, v1)) {
                // Not too close to the wall
                insetDist.push(Ward.MAIN_STREET / 2);
            } else {
                let onStreet = innerPatch && (
                    this.model.plaza !== null && 
                    this.model.plaza.shape.findEdge(v1, v0) !== -1
                );
                
                if (!onStreet) {
                    for (const street of this.model.arteries) {
                        if (street.includes(v0) && street.includes(v1)) {
                            onStreet = true;
                            break;
                        }
                    }
                }
                
                insetDist.push((onStreet ? 
                    Ward.MAIN_STREET : 
                    (innerPatch ? Ward.REGULAR_STREET : Ward.ALLEY)
                ) / 2);
            }
        });

        // Use different methods based on polygon shape
        return this.patch.shape.isConvex() ?
            this.patch.shape.shrink(insetDist) :
            // For concave, use buffer method (not fully implemented in Polygon yet)
            this.patch.shape.shrinkEq(Ward.REGULAR_STREET / 2);
    }

    /**
     * Remove buildings in outskirt areas
     */
    protected filterOutskirts(): void {
        const populatedEdges: {x: number, y: number, dx: number, dy: number, d: number}[] = [];
        
        // Calculate edge factors
        const addEdge = (v1: Point, v2: Point, factor: number = 1.0) => {
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            let maxDist = 0;
            let maxPoint: Point | null = null;
            
            for (const v of this.patch.shape) {
                if (v !== v1 && v !== v2) {
                    const dist = GeomUtils.distance2line(v1.x, v1.y, dx, dy, v.x, v.y);
                    if (dist > maxDist) {
                        maxDist = dist;
                        maxPoint = v;
                    }
                }
            }
            
            if (maxPoint) {
                populatedEdges.push({
                    x: v1.x, 
                    y: v1.y, 
                    dx: dx, 
                    dy: dy, 
                    d: maxDist * factor
                });
            }
        };
        
        // Add edges based on roads and neighbors
        this.patch.shape.forEdge((v1, v2) => {
            let onRoad = false;
            for (const street of this.model.arteries) {
                if (street.includes(v1) && street.includes(v2)) {
                    onRoad = true;
                    break;
                }
            }

            if (onRoad) {
                addEdge(v1, v2, 1);
            } else {
                const n = this.model.getNeighbour(this.patch, v1);
                if (n !== null && n.withinCity) {
                    addEdge(v1, v2, this.model.isEnclosed(n) ? 1 : 0.4);
                }
            }
        });

        // Calculate vertex density factors
        const density: number[] = [];
        for (const v of this.patch.shape) {
            if (this.model.gates.includes(v)) {
                density.push(1);
            } else {
                // Check if all patches containing this vertex are within city
                const patches = this.model.patchByVertex(v);
                const allWithinCity = patches.every(p => p.withinCity);
                density.push(allWithinCity ? 2 * Random.float() : 0);
            }
        }

        // Filter buildings based on their distance to populated edges
        this.geometry = this.geometry.filter(building => {
            let minDist = 1.0;
            
            // Find minimum distance to any populated edge
            for (const edge of populatedEdges) {
                for (const v of building) {
                    const d = GeomUtils.distance2line(
                        edge.x, edge.y, edge.dx, edge.dy, v.x, v.y
                    );
                    const dist = d / edge.d;
                    if (dist < minDist) {
                        minDist = dist;
                    }
                }
            }

            // Calculate density factor for building center
            const c = building.center;
            const i = this.patch.shape.interpolate(c);
            let p = 0.0;
            for (let j = 0; j < i.length; j++) {
                p += density[j] * i[j];
            }
            minDist /= Math.max(0.1, p); // Avoid division by zero

            // Randomly keep or remove building based on distance factor
            return Random.fuzzy(1) > minDist;
        });
    }

    /**
     * Get the label for this ward type
     */
    public getLabel(): string | null {
        return null;
    }

    /**
     * Static method for rating patch locations for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        return 0;
    }

    /**
     * Create alley-style geometry for a ward by recursively cutting the polygon
     */
    public static createAlleys(
        p: Polygon, 
        minSq: number, 
        gridChaos: number, 
        sizeChaos: number, 
        emptyProb: number = 0.04, 
        split: boolean = true
    ): Polygon[] {
        // Find the longest edge to cut
        let vertex: Point | null = null;
        let length = -1.0;
        
        p.forEdge((p0, p1) => {
            const len = Point.distance(p0, p1);
            if (len > length) {
                length = len;
                vertex = p0;
            }
        });
        
        if (!vertex) return [p];
        
        // Calculate parameters for the cut
        const spread = 0.8 * gridChaos;
        const ratio = (1 - spread) / 2 + Random.float() * spread;
        
        // Calculate angle variation based on grid chaos
        // Less chaos for small blocks to keep buildings rectangular
        const angleSpread = Math.PI / 6 * gridChaos * (p.square < minSq * 4 ? 0.0 : 1);
        const angle = (Random.float() - 0.5) * angleSpread;
        
        // Cut the polygon
        const halves = Cutter.bisect(p, vertex, ratio, angle, split ? this.ALLEY : 0.0);
        
        // Recursively process the halves
        const buildings: Polygon[] = [];
        
        for (const half of halves) {
            // Random size variation based on chaos parameter
            const sizeVariation = Math.pow(2, 4 * sizeChaos * (Random.float() - 0.5));
            
            if (half.square < minSq * sizeVariation) {
                // Block is small enough, so keep it if not empty
                if (!Random.bool(emptyProb)) {
                    buildings.push(half);
                }
            } else {
                // Block is too large, subdivide it
                const halfSplit = half.square > minSq / (Random.float() * Random.float());
                const subBuildings = this.createAlleys(half, minSq, gridChaos, sizeChaos, emptyProb, halfSplit);
                buildings.push(...subBuildings);
            }
        }
        
        return buildings;
    }

    /**
     * Find the longest edge in a polygon
     */
    private static findLongestEdge(poly: Polygon): Point {
        return poly.min(v => -poly.vector(v).length());
    }

    /**
     * Create orthogonal building layout
     */
    public static createOrthoBuilding(
        poly: Polygon, 
        minBlockSq: number, 
        fill: number
    ): Polygon[] {
        // Helper function to slice a polygon along one of its vectors
        const slice = (poly: Polygon, c1: Point, c2: Point): Polygon[] => {
            // Find the longest edge
            const v0 = this.findLongestEdge(poly);
            const v1 = poly.next(v0);
            const v = v1.subtract(v0);
            
            // Calculate cut position
            const ratio = 0.4 + Random.float() * 0.2;
            const p1 = GeomUtils.interpolate(v0, v1, ratio);
            
            // Decide which direction to cut (parallel to c1 or c2)
            const c = Math.abs(GeomUtils.scalar(v.x, v.y, c1.x, c1.y)) < 
                      Math.abs(GeomUtils.scalar(v.x, v.y, c2.x, c2.y)) ? c1 : c2;
            
            // Cut the polygon
            const halves = poly.cut(p1, p1.add(c));
            
            const buildings: Polygon[] = [];
            
            for (const half of halves) {
                // Size variation with normal distribution
                const sizeVariation = Math.pow(2, Random.normal() * 2 - 1);
                
                if (half.square < minBlockSq * sizeVariation) {
                    // Block is small enough, keep it if random check passes
                    if (Random.bool(fill)) {
                        buildings.push(half);
                    }
                } else {
                    // Block is too large, further subdivide
                    buildings.push(...slice(half, c1, c2));
                }
            }
            
            return buildings;
        };
        
        // If polygon is too small, return it as is
        if (poly.square < minBlockSq) {
            return [poly];
        }
        
        // Get cutting directions
        const c1 = poly.vector(this.findLongestEdge(poly));
        const c2 = c1.rotate90();
        
        // Start slicing recursively
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const blocks = slice(poly, c1, c2);
            if (blocks.length > 0) {
                return blocks;
            }
        }
        
        // Fallback if slicing fails
        return [poly];
    }
}