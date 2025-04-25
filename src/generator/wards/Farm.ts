import { Model } from '../Model';
import { Patch } from '../Patch';
import { Ward } from './Ward';
import { Polygon } from '../../geom/Polygon';
import { GeomUtils } from '../../geom/GeomUtils';
import { Random } from '../../utils/Random';

/**
 * A farm ward with farmhouse and fields
 */
export class Farm extends Ward {
    /**
     * Create the geometry for the farm
     */
    override createGeometry(): void {
        // Create a small farmhouse
        const housing = Polygon.rect(4, 4);
        
        // Position somewhere near the edge of the patch, but not directly at center
        const randomVertex = this.patch.shape[Math.floor(Random.float() * this.patch.shape.length)];
        const position = GeomUtils.interpolate(
            randomVertex, 
            this.patch.shape.centroid, 
            0.3 + Random.float() * 0.4
        );
        
        // Random rotation
        housing.rotate(Random.float() * Math.PI);
        housing.offset(position);
        
        // Create farmhouse with orthogonal layout
        this.geometry = Ward.createOrthoBuilding(housing, 8, 0.5);
    }

    /**
     * Get the label for this ward type
     */
    override getLabel(): string {
        return "Farm";
    }
}