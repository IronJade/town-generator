import { Model } from '../Model';
import { Patch } from '../Patch';
import { Ward } from './Ward';
import { Polygon } from '../../geom/Polygon';
import { Point } from '../../geom/Point';
import { Random } from '../../utils/Random';
import { GeomUtils } from '../../geom/GeomUtils';

/**
 * A market ward with a central feature (fountain or statue)
 */
export class Market extends Ward {
    /**
     * Create the geometry for the market
     */
    override createGeometry(): void {
        // Determine if we're creating a statue or fountain
        const statue = Random.bool(0.6);
        
        // Determine if we offset the feature from center
        const offset = statue || Random.bool(0.3);
        
        // Initialize variables with correct typing
        let v0: Point | null = null;
        let v1: Point | null = null;
        
        // Find longest edge for orientation/offset
        if (statue || offset) {
            let length = -1.0;
            
            this.patch.shape.forEdge((p0, p1) => {
                const len = Point.distance(p0, p1);
                if (len > length) {
                    length = len;
                    v0 = p0;
                    v1 = p1;
                }
            });
        }
        
        // Create the central object (statue or fountain)
        let object: Polygon;
        
        if (statue && v0 !== null && v1 !== null) {
            // Rectangular statue
            object = Polygon.rect(1 + Random.float(), 1 + Random.float());
            
            // Rotate to align with the edge
            const angle = Math.atan2(v1.y - v0.y, v1.x - v0.x);
            object.rotate(angle);
        } else {
            // Circular fountain
            object = Polygon.circle(1 + Random.float());
        }
        
        // Position the object
        if (offset && v0 !== null && v1 !== null) {
            // Offset toward one of the edges
            const gravity = GeomUtils.interpolate(v0, v1);
            const position = GeomUtils.interpolate(
                this.patch.shape.centroid,
                gravity,
                0.2 + Random.float() * 0.4
            );
            object.offset(position);
        } else {
            // Center in the patch
            object.offset(this.patch.shape.centroid);
        }
        
        this.geometry = [object];
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Market";
    }

    /**
     * Rate how suitable a patch is for this ward type
     */
    public static rateLocation(model: Model, patch: Patch): number {
        // One market should not touch another
        for (const p of model.inner) {
            if (p.ward && p.ward.constructor.name === 'Market' && p.shape.borders(patch.shape)) {
                return Infinity;
            }
        }
        
        // Market shouldn't be much larger than the plaza
        return model.plaza !== null 
            ? patch.shape.square / model.plaza.shape.square 
            : patch.shape.distance(model.center);
    }
}