import { Point } from '../geom/Point';
import { Polygon } from '../geom/Polygon';
import { Region } from '../geom/Voronoi';
import { Ward } from './wards/Ward';

/**
 * A Patch represents a district or area in the town
 */
export class Patch {
    /**
     * The outline shape of the patch
     */
    public shape: Polygon;
    
    /**
     * The ward assigned to this patch
     */
    public ward: Ward | null = null;
    
    /**
     * Whether this patch is within city walls (if they exist)
     */
    public withinWalls: boolean;
    
    /**
     * Whether this patch is part of the city (not countryside)
     */
    public withinCity: boolean;
    
    /**
     * Create a new patch from a set of vertices
     */
    constructor(vertices: Point[]) {
        this.shape = new Polygon(vertices);
        this.withinCity = false;
        this.withinWalls = false;
    }
    
    /**
     * Create a patch from a Voronoi region
     */
    public static fromRegion(r: Region): Patch {
        const vertices = r.vertices.map(tr => tr.c);
        return new Patch(vertices);
    }
}