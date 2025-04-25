import { Point } from '../geom/Point';
import { Polygon } from '../geom/Polygon';
import { Model } from './Model';
import { Patch } from './Patch';
import { Random } from '../utils/Random';
import { GeomUtils } from '../geom/GeomUtils';

export class CurtainWall {
    public shape: Polygon;
    public segments: boolean[];
    public gates: Point[] = [];
    public towers: Point[] = [];

    private real: boolean;
    private patches: Patch[];

    constructor(real: boolean, model: Model, patches: Patch[], reserved: Point[] = []) {
        this.real = real;
        this.patches = patches;

        // Create shape based on number of patches
        if (patches.length === 1) {
            this.shape = new Polygon(patches[0].shape);
        } else {
            // Find circumference of all patches
            this.shape = Model.findCircumference(patches);

            // Smooth walls if they're real (not just boundary)
            if (real) {
                const smoothFactor = Math.min(1, 40 / patches.length);
                // Create a smoothed version of the walls
                const smoothed = new Polygon();
                for (const v of this.shape) {
                    if (reserved.includes(v)) {
                        smoothed.push(v.clone());
                    } else {
                        smoothed.push(this.shape.smoothVertex(v, smoothFactor));
                    }
                }
                this.shape = smoothed;
            }
        }

        // Initialize segments
        this.segments = Array(this.shape.length).fill(true);

        // Build gates
        this.buildGates(real, model, reserved);
    }

    private buildGates(real: boolean, model: Model, reserved: Point[]): void {
        this.gates = [];

        // Find potential entrance points - vertices with multiple inner wards
        let entrances: Point[] = [];
        
        if (this.patches.length > 1) {
            entrances = this.shape.filter(v => {
                // Don't place gates on reserved vertices (like those belonging to the citadel)
                if (reserved.includes(v)) return false;
                
                // Count how many city patches contain this vertex
                const count = this.patches.filter(p => p.shape.contains(v)).length;
                return count > 1;
            });
        } else {
            // For single patch walls (like a citadel), any non-reserved vertex can be a gate
            entrances = this.shape.filter(v => !reserved.includes(v));
        }

        if (entrances.length === 0) {
            throw new Error("Bad walled area shape - no possible gates!");
        }

        // Place gates with minimum spacing between them
        while (entrances.length > 0) {
            // Pick a random entrance point
            const index = Random.int(0, entrances.length - 1);
            const gate = entrances[index];
            this.gates.push(gate);

            // If these are "real" walls, adjust the outer areas to create roads
            if (real) {
                const outerPatches = model.patchByVertex(gate).filter(
                    w => !this.patches.includes(w)
                );
                
                if (outerPatches.length === 1) {
                    const outer = outerPatches[0];
                    // Only split if there are enough vertices to make a valid polygon
                    if (outer.shape.length > 3) {
                        // Find direction perpendicular to wall
                        const wall = this.shape.next(gate).subtract(this.shape.prev(gate));
                        const outDir = new Point(wall.y, -wall.x);
                        
                        // Find farthest point in outer patch in that direction
                        const farthest = outer.shape.max(v => {
                            // Ignore points that are part of city walls or citadel
                            if (this.shape.contains(v) || reserved.includes(v)) {
                                return -Infinity;
                            }
                            
                            // Calculate directional distance
                            const dir = v.subtract(gate);
                            return dir.dot(outDir) / dir.length();
                        });
                        
                        // Split the outer patch to create a road
                        try {
                            const halves = outer.shape.split(gate, farthest);
                            if (halves.length === 2) {
                                // Create two new patches from the split
                                const newPatches = halves.map(half => new Patch(half));
                                
                                // Replace old patch with new ones
                                const patchIndex = model.patches.indexOf(outer);
                                if (patchIndex !== -1) {
                                    model.patches.splice(patchIndex, 1, ...newPatches);
                                }
                            }
                        } catch (e) {
                            console.warn("Failed to split patch at gate:", e);
                        }
                    }
                }
            }

            // Remove nearby entrances to ensure gates are well-spaced
            if (index === 0) {
                entrances.splice(0, Math.min(2, entrances.length));
                if (entrances.length > 0) entrances.pop();
            } else if (index === entrances.length - 1) {
                entrances.splice(index - 1, Math.min(2, entrances.length));
                if (entrances.length > 0) entrances.shift();
            } else {
                entrances.splice(index - 1, Math.min(3, entrances.length));
            }

        }

        // Smooth gates for better appearance
        if (real) {
            for (const gate of this.gates) {
                const smoothed = this.shape.smoothVertex(gate);
                gate.x = smoothed.x;
                gate.y = smoothed.y;
            }
        }

        if (this.gates.length === 0) {
            throw new Error("Failed to create any gates in the wall!");
        }
    }

    public buildTowers(): void {
        this.towers = [];
        
        if (this.real) {
            const len = this.shape.length;
            for (let i = 0; i < len; i++) {
                const t = this.shape[i];
                
                // Add towers at wall vertices that aren't gates
                if (!this.gates.includes(t) && 
                    (this.segments[(i + len - 1) % len] || this.segments[i])) {
                    this.towers.push(t);
                }
            }
        }
    }

    public getRadius(): number {
        let radius = 0;
        for (const v of this.shape) {
            radius = Math.max(radius, v.length());
        }
        return radius;
    }

    public bordersBy(p: Patch, v0: Point, v1: Point): boolean {
        const index = this.patches.includes(p) ?
            this.shape.findEdge(v0, v1) :
            this.shape.findEdge(v1, v0);
            
        if (index !== -1 && this.segments[index]) {
            return true;
        }
        
        return false;
    }

    public borders(p: Patch): boolean {
        const withinWalls = this.patches.includes(p);
        const length = this.shape.length;

        for (let i = 0; i < length; i++) {
            if (this.segments[i]) {
                const v0 = this.shape[i];
                const v1 = this.shape[(i + 1) % length];
                
                const index = withinWalls ?
                    p.shape.findEdge(v0, v1) :
                    p.shape.findEdge(v1, v0);
                    
                if (index !== -1) {
                    return true;
                }
            }
        }

        return false;
    }
}