import { Point } from '../geom/Point';
import { Polygon } from '../geom/Polygon';
import { Voronoi } from '../geom/Voronoi';
import { Random } from '../utils/Random';
import { Patch } from './Patch';
import { CurtainWall } from './CurtainWall';
import { Topology } from '../geom/Topology';
import { Ward } from './wards/Ward';
import { Castle } from './wards/Castle';
import { Market } from './wards/Market';
import { Cathedral } from './wards/Cathedral';
import { CraftsmenWard } from './wards/CraftsmenWard';
import { MerchantWard } from './wards/MerchantWard';
import { AdministrationWard } from './wards/AdministrationWard';
import { MilitaryWard } from './wards/MilitaryWard';
import { PatriciateWard } from './wards/PatriciateWard';
import { Slum } from './wards/Slum';
import { Park } from './wards/Park';
import { GateWard } from './wards/GateWard';
import { Farm } from './wards/Farm';
import { StateManager } from './StateManager';
import { Segment } from '../geom/Segment';

export type Street = Polygon;

export class Model {
    public static instance: Model;

    // Ward types distribution used for town generation
    private static WARDS: Array<typeof Ward> = [
        CraftsmenWard, CraftsmenWard, MerchantWard, CraftsmenWard, CraftsmenWard, Cathedral,
        CraftsmenWard, CraftsmenWard, CraftsmenWard, CraftsmenWard, CraftsmenWard,
        CraftsmenWard, CraftsmenWard, CraftsmenWard, AdministrationWard, CraftsmenWard,
        Slum, CraftsmenWard, Slum, PatriciateWard, Market,
        Slum, CraftsmenWard, CraftsmenWard, CraftsmenWard, Slum,
        CraftsmenWard, CraftsmenWard, CraftsmenWard, MilitaryWard, Slum,
        CraftsmenWard, Park, PatriciateWard, Market, MerchantWard
    ];

    // Town properties
    private nPatches: number;
    private plazaNeeded: boolean;
    private citadelNeeded: boolean;
    private wallsNeeded: boolean;

    // Town structure
    public topology: Topology;
    public patches: Array<Patch> = [];
    public waterbody: Array<Patch> = [];
    public inner: Array<Patch> = [];
    public citadel: Patch | null = null;
    public plaza: Patch | null = null;
    public center: Point;
    public border: CurtainWall;
    public wall: CurtainWall | null = null;
    public cityRadius: number;
    public gates: Array<Point> = [];
    public arteries: Array<Street> = [];
    public streets: Array<Street> = [];
    public roads: Array<Street> = [];

    constructor(nPatches: number = -1, seed: number = -1) {
        // For backward compatibility, create synchronously if params are provided
        if (nPatches !== -1 || seed !== -1) {
            this.initSync(nPatches, seed);
        }
        // Otherwise just initialize basic properties
        else {
            this.streets = [];
            this.roads = [];
            this.patches = [];
            this.inner = [];
            this.arteries = [];
            this.gates = [];
        }
    }

    // Helper method for backward compatibility
    private initSync(nPatches: number, seed: number): void {
        // Original constructor logic
        if (seed > 0) {
            Random.reset(seed);
        } else {
            Random.reset();
            StateManager.seed = Random.getSeed();
        }
        
        this.nPatches = nPatches !== -1 ? nPatches : 15;
        StateManager.size = this.nPatches;
    
        this.plazaNeeded = Random.bool();
        this.citadelNeeded = Random.bool();
        this.wallsNeeded = Random.bool();
    
        let success = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;
    
        while (!success && attempts < MAX_ATTEMPTS) {
            try {
                this.build();
                success = true;
                Model.instance = this;
            } catch (e) {
                console.error("Error building town:", e);
                Random.reset();
                StateManager.seed = Random.getSeed();
                attempts++;
            }
        }
    
        if (!success) {
            throw new Error("Failed to generate town after multiple attempts");
        }
    }
    
    // Create async versions of heavy computations
    private async buildPatchesAsync(): Promise<void> {
        // Same logic as buildPatches but with yield points for UI
        // Generate initial points with some variation
        const sa = Random.float() * 2 * Math.PI;
        const points: Point[] = [];
        
        for (let i = 0; i < this.nPatches * 8; i++) {
            const a = sa + Math.sqrt(i) * 5;
            const r = (i === 0) ? 0 : 10 + i * (2 + Random.float());
            points.push(new Point(Math.cos(a) * r, Math.sin(a) * r));
            
            // Yield every 20 points to keep UI responsive
            if (i % 20 === 0 && i > 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }
        
        // Create Voronoi diagram from points
        let voronoi = Voronoi.build(points);
    
        // Relax central districts for nicer shapes
        for (let i = 0; i < 3; i++) {
            const toRelax = [voronoi.points[0], voronoi.points[1], voronoi.points[2], voronoi.points[this.nPatches]];
            voronoi = Voronoi.relax(voronoi, toRelax);
            await new Promise(r => setTimeout(r, 0)); // Yield after each relaxation
        }
    
        // Sort points by distance from center
        voronoi.points.sort((p1, p2) => 
            p1.length() - p2.length()
        );
        
        const regions = voronoi.partitioning();
        await new Promise(r => setTimeout(r, 0)); // Yield after partitioning
    
        this.patches = [];
        this.inner = [];
    
        let count = 0;
        for (const r of regions) {
            const patch = Patch.fromRegion(r);
            this.patches.push(patch);
    
            if (count === 0) {
                // First patch is center
                this.center = patch.shape.min((p: Point) => p.length());
                if (this.plazaNeeded) {
                    this.plaza = patch;
                }
            } else if (count === this.nPatches && this.citadelNeeded) {
                // Last patch (at index == nPatches) is citadel
                this.citadel = patch;
                this.citadel.withinCity = true;
            }
    
            if (count < this.nPatches) {
                // Inner city wards
                patch.withinCity = true;
                patch.withinWalls = this.wallsNeeded;
                this.inner.push(patch);
            }
    
            count++;
            
            // Yield every 10 patches
            if (count % 10 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }
        }
    }

    private build(): void {
        this.streets = [];
        this.roads = [];

        this.buildPatches();
        this.optimizeJunctions();
        this.buildWalls();
        this.buildStreets();
        this.createWards();
        this.buildGeometry();
    }

    private buildPatches(): void {
        // Generate initial points with some variation
        const sa = Random.float() * 2 * Math.PI;
        const points: Point[] = [];
        
        for (let i = 0; i < this.nPatches * 8; i++) {
            const a = sa + Math.sqrt(i) * 5;
            const r = (i === 0) ? 0 : 10 + i * (2 + Random.float());
            points.push(new Point(Math.cos(a) * r, Math.sin(a) * r));
        }
        
        // Create Voronoi diagram from points
        let voronoi = Voronoi.build(points);

        // Relax central districts for nicer shapes
        for (let i = 0; i < 3; i++) {
            const toRelax = [voronoi.points[0], voronoi.points[1], voronoi.points[2], voronoi.points[this.nPatches]];
            voronoi = Voronoi.relax(voronoi, toRelax);
        }

        // Sort points by distance from center
        voronoi.points.sort((p1, p2) => 
            p1.length() - p2.length()
        );
        
        const regions = voronoi.partitioning();

        this.patches = [];
        this.inner = [];

        let count = 0;
        for (const r of regions) {
            const patch = Patch.fromRegion(r);
            this.patches.push(patch);

            if (count === 0) {
                // First patch is center
                this.center = patch.shape.min((p: Point) => p.length());
                if (this.plazaNeeded) {
                    this.plaza = patch;
                }
            } else if (count === this.nPatches && this.citadelNeeded) {
                // Last patch (at index == nPatches) is citadel
                this.citadel = patch;
                this.citadel.withinCity = true;
            }

            if (count < this.nPatches) {
                // Inner city wards
                patch.withinCity = true;
                patch.withinWalls = this.wallsNeeded;
                this.inner.push(patch);
            }

            count++;
        }
    }

    private buildWalls(): void {
        // Create empty list of reserved points or use citadel shape
        const reserved: Point[] = this.citadel ? [...this.citadel.shape] : [];

        // Create city border
        this.border = new CurtainWall(this.wallsNeeded, this, this.inner, reserved);
        
        if (this.wallsNeeded) {
            this.wall = this.border;
            this.wall.buildTowers();
        }

        // Limit patches to those within 3x the city radius
        const radius = this.border.getRadius();
        this.patches = this.patches.filter(p => 
            p.shape.distance(this.center) < radius * 3
        );

        // Store gates
        this.gates = [...this.border.gates];

        // Add citadel if needed
        if (this.citadel) {
            const castle = new Castle(this, this.citadel);
            castle.wall.buildTowers();
            this.citadel.ward = castle;

            // Check citadel shape quality
            if (this.citadel.shape.compactness < 0.75) {
                throw new Error("Bad citadel shape!");
            }

            // Add castle gates to city gates
            this.gates = [...this.gates, ...castle.wall.gates];
        }
    }

    private buildStreets(): void {
        // Create topology to find paths
        this.topology = new Topology(this);

        // Connect gates to plaza or center
        for (const gate of this.gates) {
            // Each gate connects to nearest corner of plaza or center
            const end: Point = this.plaza 
                ? this.plaza.shape.min(v => Point.distance(v, gate))
                : this.center;

            // Build street from gate to end
            const street = this.topology.buildPath(gate, end, this.topology.outer);
            if (street) {
                this.streets.push(new Polygon(street));

                // For city gates (not castle gates), create roads to outside
                if (this.border.gates.includes(gate)) {
                    // Find distant point in same direction
                    const dir = gate.norm(1000);
                    let start = null;
                    let dist = Infinity;
                    
                    for (const p of this.topology.node2pt.values()) {
                        const d = Point.distance(p, dir);
                        if (d < dist) {
                            dist = d;
                            start = p;
                        }
                    }

                    if (start) {
                        const road = this.topology.buildPath(start, gate, this.topology.inner);
                        if (road) {
                            this.roads.push(new Polygon(road));
                        }
                    }
                }
            } else {
                throw new Error("Unable to build a street!");
            }
        }

        // Clean up roads and combine into arteries
        this.tidyUpRoads();

        // Smooth all roads/streets
        for (const a of this.arteries) {
            this.smoothStreet(a);
        }
    }

    private smoothStreet(street: Street): void {
        // Smooth the street by averaging each point with its neighbors
        const smoothed = street.smoothVertexEq(3);
        for (let i = 1; i < street.length - 1; i++) {
            street[i].set(smoothed[i]);
        }
    }

    private tidyUpRoads(): void {
        // Collect all unique segments
        const segments: Segment[] = [];
        
        // Convert streets and roads to segments
        const cut2segments = (street: Street) => {
            let v0: Point | null = null;
            let v1: Point = street[0];
            
            for (let i = 1; i < street.length; i++) {
                v0 = v1;
                v1 = street[i];

                // Skip segments along the plaza
                if (this.plaza && this.plaza.shape.contains(v0) && this.plaza.shape.contains(v1)) {
                    continue;
                }

                // Check if segment already exists
                let exists = false;
                for (const seg of segments) {
                    if (seg.start.equals(v0) && seg.end.equals(v1)) {
                        exists = true;
                        break;
                    }
                }

                if (!exists) {
                    segments.push(new Segment(v0, v1));
                }
            }
        };

        // Process streets and roads
        for (const street of this.streets) {
            cut2segments(street);
        }
        
        for (const road of this.roads) {
            cut2segments(road);
        }

        // Create new arteries from segments
        this.arteries = [];
        
        while (segments.length > 0) {
            const seg = segments.pop()!;
            
            let attached = false;
            for (const a of this.arteries) {
                if (a[0].equals(seg.end)) {
                    // Add to beginning of existing artery
                    a.unshift(seg.start);
                    attached = true;
                    break;
                } else if (a[a.length - 1].equals(seg.start)) {
                    // Add to end of existing artery
                    a.push(seg.end);
                    attached = true;
                    break;
                }
            }

            if (!attached) {
                // Create new artery
                this.arteries.push(new Polygon([seg.start, seg.end]));
            }
        }
    }

    private optimizeJunctions(): void {
        // Get patches to optimize
        const patchesToOptimize: Patch[] = this.citadel 
            ? [...this.inner, this.citadel] 
            : [...this.inner];

        const wards2clean: Patch[] = [];
        
        // For each patch, merge close vertices
        for (const w of patchesToOptimize) {
            let index = 0;
            while (index < w.shape.length) {
                const v0: Point = w.shape[index];
                const v1: Point = w.shape[(index + 1) % w.shape.length];

                if (!v0.equals(v1) && Point.distance(v0, v1) < 8) {
                    // For other patches containing v1, replace it with v0
                    for (const w1 of this.patchByVertex(v1)) {
                        if (w1 !== w) {
                            const idx = w1.shape.indexOf(v1);
                            if (idx !== -1) {
                                w1.shape[idx] = v0;
                                wards2clean.push(w1);
                            }
                        }
                    }

                    // Average the points
                    v0.x = (v0.x + v1.x) / 2;
                    v0.y = (v0.y + v1.y) / 2;

                    // Remove v1
                    w.shape.splice(w.shape.indexOf(v1), 1);
                } else {
                    index++;
                }
            }
        }

        // Remove duplicate vertices
        for (const w of wards2clean) {
            for (let i = 0; i < w.shape.length; i++) {
                const v = w.shape[i];
                let dupIdx: number;
                while ((dupIdx = w.shape.indexOf(v, i + 1)) !== -1) {
                    w.shape.splice(dupIdx, 1);
                }
            }
        }
    }

    private createWards(): void {
        // Start with all inner wards unassigned
        const unassigned = [...this.inner];
        
        // Assign plaza first if it exists
        if (this.plaza) {
            this.plaza.ward = new Market(this, this.plaza);
            unassigned.splice(unassigned.indexOf(this.plaza), 1);
        }

        // Assign gate wards
        for (const gate of this.border.gates) {
            for (const patch of this.patchByVertex(gate)) {
                if (patch.withinCity && !patch.ward && Random.bool(this.wall ? 0.5 : 0.2)) {
                    patch.ward = new GateWard(this, patch);
                    unassigned.splice(unassigned.indexOf(patch), 1);
                }
            }
        }

        // Make a copy of ward types and shuffle slightly
        const wards = [...Model.WARDS];
        for (let i = 0; i < Math.floor(wards.length / 10); i++) {
            const index = Random.int(0, wards.length - 2);
            const tmp = wards[index];
            wards[index] = wards[index + 1];
            wards[index + 1] = tmp;
        }

        // Assign inner city wards
        while (unassigned.length > 0) {
            let bestPatch: Patch | null = null;

            const WardClass = wards.length > 0 ? wards.shift()! : Slum;
            
            // Get static rateLocation method if available
            const rateFunc = WardClass.hasOwnProperty('rateLocation') 
                ? (WardClass as any).rateLocation 
                : null;

            if (!rateFunc) {
                // Pick a random unassigned patch if no rating function
                do {
                    bestPatch = unassigned[Math.floor(Random.float() * unassigned.length)];
                } while (bestPatch.ward !== null);
            } else {
                // Find the best patch according to the ward's rating function
                bestPatch = unassigned.reduce((best, patch) => {
                    if (patch.ward !== null) return best;
                    
                    const rating = rateFunc(this, patch);
                    if (!best || rating < best.rating) {
                        return { patch, rating };
                    }
                    return best;
                }, null as { patch: Patch, rating: number } | null)?.patch || null;
            }

            if (bestPatch) {
                // Create the ward
                bestPatch.ward = new WardClass(this, bestPatch);
                unassigned.splice(unassigned.indexOf(bestPatch), 1);
            }
        }

        // Process outskirts near gates
        if (this.wall) {
            for (const gate of this.wall.gates) {
                if (!Random.bool(1 / (this.nPatches - 5))) {
                    for (const patch of this.patchByVertex(gate)) {
                        if (!patch.ward) {
                            patch.withinCity = true;
                            patch.ward = new GateWard(this, patch);
                        }
                    }
                }
            }
        }

        // Calculate city radius and process countryside
        this.cityRadius = 0;
        for (const patch of this.patches) {
            if (patch.withinCity) {
                // City radius is farthest point from center of any city patch
                for (const v of patch.shape) {
                    this.cityRadius = Math.max(this.cityRadius, v.length());
                }
            } else if (!patch.ward) {
                // Assign farms or generic wards to outer patches
                patch.ward = Random.bool(0.2) && patch.shape.compactness >= 0.7
                    ? new Farm(this, patch)
                    : new Ward(this, patch);
            }
        }
    }

    private buildGeometry(): void {
        // Initialize geometry for all wards
        for (const patch of this.patches) {
            if (patch.ward) {
                patch.ward.createGeometry();
            }
        }
    }

    // Helper methods
    public patchByVertex(v: Point): Patch[] {
        return this.patches.filter(patch => patch.shape.contains(v));
    }

    public getNeighbour(patch: Patch, v: Point): Patch | null {
        const next = patch.shape.next(v);
        for (const p of this.patches) {
            if (p.shape.findEdge(next, v) !== -1) {
                return p;
            }
        }
        return null;
    }

    public getNeighbours(patch: Patch): Patch[] {
        return this.patches.filter(p => 
            p !== patch && p.shape.borders(patch.shape)
        );
    }

    public isEnclosed(patch: Patch): boolean {
        return patch.withinCity && (
            patch.withinWalls || 
            this.getNeighbours(patch).every(p => p.withinCity)
        );
    }

    // Static helper to find circumference of multiple wards
    public static findCircumference(wards: Patch[]): Polygon {
        if (wards.length === 0) {
            return new Polygon();
        } else if (wards.length === 1) {
            return new Polygon(wards[0].shape);
        }

        const A: Point[] = [];
        const B: Point[] = [];

        for (const w1 of wards) {
            w1.shape.forEdge((a, b) => {
                let outerEdge = true;
                for (const w2 of wards) {
                    if (w2.shape.findEdge(b, a) !== -1) {
                        outerEdge = false;
                        break;
                    }
                }
                if (outerEdge) {
                    A.push(a);
                    B.push(b);
                }
            });
        }

        const result = new Polygon();
        let index = 0;
        do {
            result.push(A[index]);
            index = A.indexOf(B[index]);
        } while (index !== 0);

        return result;
    }

    public static async createAsync(nPatches: number = -1, seed: number = -1): Promise<Model> {
        // Create the model instance
        const model = new Model();
        
        // Set or generate seed
        if (seed > 0) {
            Random.reset(seed);
        } else {
            Random.reset();
            StateManager.seed = Random.getSeed();
        }
        
        // Store parameters
        model.nPatches = nPatches !== -1 ? nPatches : 15;
        StateManager.size = model.nPatches;
    
        // Configure random features (50% chance each)
        model.plazaNeeded = Random.bool();
        model.citadelNeeded = Random.bool();
        model.wallsNeeded = Random.bool();
    
        // Build the town asynchronously
        let success = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 5;
    
        while (!success && attempts < MAX_ATTEMPTS) {
            try {
                // Use setTimeout to ensure UI responsiveness
                await new Promise<void>(resolve => {
                    setTimeout(async () => {
                        // Initialize arrays
                        model.streets = [];
                        model.roads = [];
                        model.patches = [];
                        model.inner = [];
                        model.arteries = [];
                        model.gates = [];
                        
                        // Build steps with yield points to prevent freezing
                        await model.buildPatchesAsync();
                        await new Promise(r => setTimeout(r, 0)); // Yield to UI
                        
                        model.optimizeJunctions();
                        await new Promise(r => setTimeout(r, 0)); // Yield to UI
                        
                        model.buildWalls();
                        await new Promise(r => setTimeout(r, 0)); // Yield to UI
                        
                        model.buildStreets();
                        await new Promise(r => setTimeout(r, 0)); // Yield to UI
                        
                        model.createWards();
                        await new Promise(r => setTimeout(r, 0)); // Yield to UI
                        
                        model.buildGeometry();
                        
                        success = true;
                        resolve();
                    }, 0);
                });
                
                if (success) {
                    Model.instance = model;
                }
            } catch (e) {
                console.error("Error building town:", e);
                Random.reset(); // Generate new random seed
                StateManager.seed = Random.getSeed();
                attempts++;
                await new Promise(r => setTimeout(r, 100)); // Small delay before retrying
            }
        }
    
        if (!success) {
            throw new Error("Failed to generate town after multiple attempts");
        }
        
        return model;
    }
}