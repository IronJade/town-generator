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
     * Create alley-style geometry for a ward
     */
    public static createAlleys(
        p: Polygon, 
        minSq: number, 
        gridChaos: number, 
        sizeChaos: number, 
        emptyProb: number = 0.04, 
        split: boolean = true
    ): Polygon[] {
        // TODO: Implementation of the createAlleys method
        // This is a complex method that recursively cuts the polygon
        // For now, we'll return a simple placeholder
        return [p];
    }

    /**
     * Create orthogonal building layout
     */
    public static createOrthoBuilding(
        poly: Polygon, 
        minBlockSq: number, 
        fill: number
    ): Polygon[] {
        // TODO: Implement createOrthoBuilding
        // For now, return a simple placeholder
        return [poly];
    }
}