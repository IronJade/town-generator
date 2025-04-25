import { Point } from '../geom/Point';
import { Polygon } from '../geom/Polygon';
import { GeomUtils } from '../geom/GeomUtils';

/**
 * Utility class for cutting polygons in various ways
 */
export class Cutter {
    /**
     * Cut a polygon along a line passing through a vertex at an angle
     */
    public static bisect(
        poly: Polygon, 
        vertex: Point, 
        ratio: number = 0.5, 
        angle: number = 0, 
        gap: number = 0
    ): Polygon[] {
        // Get the next vertex
        const next = poly.next(vertex);
        
        // Calculate point along the edge
        const p1 = GeomUtils.interpolate(vertex, next, ratio);
        
        // Calculate direction vector
        const d = next.subtract(vertex);
        
        // Rotate the direction vector by the angle
        const cosB = Math.cos(angle);
        const sinB = Math.sin(angle);
        const vx = d.x * cosB - d.y * sinB;
        const vy = d.y * cosB + d.x * sinB;
        
        // Create second point perpendicular to the edge
        const p2 = new Point(p1.x - vy, p1.y + vx);
        
        // Cut the polygon
        return poly.cut(p1, p2, gap);
    }

    /**
     * Cut a polygon into radial sectors from a center point
     */
    public static radial(
        poly: Polygon, 
        center: Point | null = null, 
        gap: number = 0
    ): Polygon[] {
        // Use centroid if no center provided
        if (!center) {
            center = poly.centroid;
        }
        
        const sectors: Polygon[] = [];
        
        // Create triangular sectors from center to each edge
        poly.forEdge((v0, v1) => {
            const sector = new Polygon([center, v0, v1]);
            
            // Apply gap if needed
            if (gap > 0) {
                const shrunk = sector.shrink([gap/2, 0, gap/2]);
                sectors.push(shrunk);
            } else {
                sectors.push(sector);
            }
        });
        
        return sectors;
    }

    /**
     * Cut a polygon into semi-radial sectors from a point
     */
    public static semiRadial(
        poly: Polygon, 
        center: Point | null = null, 
        gap: number = 0
    ): Polygon[] {
        // Find best center point if not provided
        if (!center) {
            const centroid = poly.centroid;
            center = poly.min(v => Point.distance(v, centroid));
        }
        
        gap /= 2;
        const sectors: Polygon[] = [];
        
        // Create triangular sectors from center to each edge
        poly.forEdge((v0, v1) => {
            if (!v0.equals(center) && !v1.equals(center)) {
                const sector = new Polygon([center, v0, v1]);
                
                // Apply gap if needed
                if (gap > 0) {
                    const gapDistances = [
                        poly.findEdge(center, v0) === -1 ? gap : 0, 
                        0, 
                        poly.findEdge(v1, center) === -1 ? gap : 0
                    ];
                    const shrunk = sector.shrink(gapDistances);
                    sectors.push(shrunk);
                } else {
                    sectors.push(sector);
                }
            }
        });
        
        return sectors;
    }

    /**
     * Create a ring around the perimeter of a polygon
     */
    public static ring(poly: Polygon, thickness: number): Polygon[] {
        const slices: { p1: Point, p2: Point, len: number }[] = [];
        
        // Create offset points for each edge
        poly.forEdge((v1, v2) => {
            const v = v2.subtract(v1);
            const n = v.rotate90().norm(thickness);
            slices.push({
                p1: v1.add(n),
                p2: v2.add(n),
                len: v.length()
            });
        });
        
        // Sort slices so shorter edges are cut first
        slices.sort((s1, s2) => s1.len - s2.len);
        
        const peel: Polygon[] = [];
        
        // Cut the polygon with each slice
        let p = new Polygon(poly);
        for (let i = 0; i < slices.length; i++) {
            const halves = p.cut(slices[i].p1, slices[i].p2);
            p = halves[0];
            if (halves.length > 1) {
                peel.push(halves[1]);
            }
        }
        
        return peel;
    }
}