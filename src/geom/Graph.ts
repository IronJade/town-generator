import { MathUtils } from '../utils/MathUtils';

/**
 * A node in a graph
 */
export class Node {
    /**
     * Map of connected nodes and their distances
     */
    public links: Map<Node, number> = new Map();

    constructor() {}

    /**
     * Link this node to another with a given distance
     */
    public link(node: Node, price: number = 1, symmetrical: boolean = true): void {
        this.links.set(node, price);
        if (symmetrical) {
            node.links.set(this, price);
        }
    }

    /**
     * Remove a link to another node
     */
    public unlink(node: Node, symmetrical: boolean = true): void {
        this.links.delete(node);
        if (symmetrical) {
            node.links.delete(this);
        }
    }

    /**
     * Remove all links to and from this node
     */
    public unlinkAll(): void {
        for (const node of this.links.keys()) {
            node.links.delete(this);
        }
        this.links.clear();
    }
}

/**
 * A graph data structure with nodes and edges
 */
export class Graph {
    /**
     * All nodes in the graph
     */
    public nodes: Node[] = [];

    constructor() {}

    /**
     * Add a node to the graph
     * If no node is provided, a new one is created
     */
    public add(node?: Node): Node {
        if (!node) {
            node = new Node();
        }
        this.nodes.push(node);
        return node;
    }

    /**
     * Remove a node from the graph
     */
    public remove(node: Node): void {
        node.unlinkAll();
        const index = this.nodes.indexOf(node);
        if (index !== -1) {
            this.nodes.splice(index, 1);
        }
    }

    /**
     * Find a path between two nodes using A* algorithm
     */
    public aStar(start: Node, goal: Node, exclude: Node[] = []): Node[] | null {
        // Nodes already evaluated
        const closedSet: Node[] = [...(exclude || [])];
        
        // Nodes to be evaluated
        const openSet: Node[] = [start];
        
        // Most efficient previous step
        const cameFrom: Map<Node, Node> = new Map();
        
        // Distance from start to node
        const gScore: Map<Node, number> = new Map();
        gScore.set(start, 0);
        
        // Estimated distance from node to goal
        const fScore: Map<Node, number> = new Map();
        fScore.set(start, 0);

        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet[0];
            let lowestScore = fScore.get(current) || Infinity;
            
            for (let i = 1; i < openSet.length; i++) {
                const node = openSet[i];
                const score = fScore.get(node) || Infinity;
                if (score < lowestScore) {
                    current = node;
                    lowestScore = score;
                }
            }
            
            // If we've reached the goal, construct and return the path
            if (current === goal) {
                return this.buildPath(cameFrom, current);
            }
            
            // Move current from openSet to closedSet
            openSet.splice(openSet.indexOf(current), 1);
            closedSet.push(current);
            
            // Get current node's score
            const curScore = gScore.get(current) || Infinity;
            
            // Check all neighbors
            for (const [neighbor, distance] of current.links.entries()) {
                // Skip if neighbor is in closedSet
                if (closedSet.includes(neighbor)) {
                    continue;
                }
                
                // Calculate tentative gScore
                const score = curScore + distance;
                
                // Add to openSet if not there
                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                } 
                // Skip if this path is worse than existing
                else if (score >= (gScore.get(neighbor) || Infinity)) {
                    continue;
                }
                
                // This path is better, record it
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, score);
                fScore.set(neighbor, score);
            }
        }
        
        // No path found
        return null;
    }

    /**
     * Build a path from the cameFrom map
     */
    private buildPath(cameFrom: Map<Node, Node>, current: Node): Node[] {
        const path = [current];
        
        while (cameFrom.has(current)) {
            current = cameFrom.get(current)!;
            path.unshift(current);
        }
        
        return path;
    }

    /**
     * Calculate the total distance of a path
     */
    public calculatePrice(path: Node[]): number {
        if (path.length < 2) {
            return 0;
        }
        
        let price = 0;
        
        for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];
            
            if (current.links.has(next)) {
                price += current.links.get(next)!;
            } else {
                return NaN; // Path has disconnected nodes
            }
        }
        
        return price;
    }
}