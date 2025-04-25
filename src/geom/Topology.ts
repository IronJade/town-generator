import { Point } from '../geom/Point';
import { Graph, Node } from '../geom/Graph';
import { Model } from '../generator/Model';
import { Patch } from '../generator/Patch';

export class Topology {
    private model: Model;
    private graph: Graph;

    public pt2node: Map<Point, Node> = new Map();
    public node2pt: Map<Node, Point> = new Map();

    private blocked: Point[] = [];

    public inner: Node[] = [];
    public outer: Node[] = [];

    constructor(model: Model) {
        this.model = model;
        this.graph = new Graph();

        // Build a list of all blocked points (shore + walls excluding gates)
        this.blocked = [];
        
        if (model.citadel !== null) {
            this.blocked = [...this.blocked, ...model.citadel.shape];
        }
        
        if (model.wall !== null) {
            this.blocked = [...this.blocked, ...model.wall.shape];
        }
        
        // Remove gates from blocked points
        for (const gate of model.gates) {
            const index = this.blocked.indexOf(gate);
            if (index !== -1) {
                this.blocked.splice(index, 1);
            }
        }

        const border = model.border.shape;

        // Create nodes for all patches
        for (const p of model.patches) {
            const withinCity = p.withinCity;

            let v1 = p.shape[p.shape.length - 1];
            let n1 = this.processPoint(v1);

            for (let i = 0; i < p.shape.length; i++) {
                const v0 = v1;
                v1 = p.shape[i];
                
                const n0 = n1;
                n1 = this.processPoint(v1);

                // Add nodes to appropriate lists (inner or outer)
                if (n0 !== null && !border.includes(v0)) {
                    if (withinCity) {
                        this.addToList(this.inner, n0);
                    } else {
                        this.addToList(this.outer, n0);
                    }
                }
                
                if (n1 !== null && !border.includes(v1)) {
                    if (withinCity) {
                        this.addToList(this.inner, n1);
                    } else {
                        this.addToList(this.outer, n1);
                    }
                }

                // Link nodes together
                if (n0 !== null && n1 !== null) {
                    n0.link(n1, Point.distance(v0, v1));
                }
            }
        }
    }

    private processPoint(v: Point): Node | null {
        let n: Node;

        if (this.pt2node.has(v)) {
            n = this.pt2node.get(v)!;
        } else {
            n = this.graph.add();
            this.pt2node.set(v, n);
            this.node2pt.set(n, v);
        }

        // Return null if this point is blocked
        return this.blocked.some(p => p.equals(v)) ? null : n;
    }

    private addToList(list: Node[], node: Node): void {
        if (!list.includes(node)) {
            list.push(node);
        }
    }

    public buildPath(from: Point, to: Point, exclude: Node[] = []): Point[] | null {
        const fromNode = this.pt2node.get(from);
        const toNode = this.pt2node.get(to);
        
        if (!fromNode || !toNode) return null;
        
        const path = this.graph.aStar(fromNode, toNode, exclude);
        
        if (path === null) return null;
        
        // Convert nodes back to points
        return path.map(n => this.node2pt.get(n)!);
    }
}