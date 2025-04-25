import { Model } from '../generator/Model';
import { Palette } from './Palette';
import { Ward } from '../generator/wards/Ward';
import { Castle } from '../generator/wards/Castle';
import { Cathedral } from '../generator/wards/Cathedral';
import { Market } from '../generator/wards/Market';
import { Polygon } from '../geom/Polygon';
import { Point } from '../geom/Point';

export class CityMap {
    public static palette: Palette = Palette.DEFAULT;
    
    private model: Model;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private tooltipEl: HTMLDivElement | null = null;
    private hoveredWard: string | null = null;
    private showTooltips: boolean = true;
    
    constructor(model: Model, canvas: HTMLCanvasElement) {
        this.model = model;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;

        // Add event listeners for tooltips
        this.setupTooltips();
    }
    
    public static setPalette(name: string): void {
        if (name in Palette) {
            CityMap.palette = (Palette as any)[name];
        }
    }
    
    public setShowTooltips(show: boolean): void {
        this.showTooltips = show;
        if (!show && this.tooltipEl) {
            this.tooltipEl.style.display = 'none';
        }
    }

    private setupTooltips(): void {
        // Create tooltip element if it doesn't exist
        if (!this.tooltipEl) {
            this.tooltipEl = document.createElement('div');
            this.tooltipEl.className = 'town-generator-tooltip';
            this.tooltipEl.style.display = 'none';
            document.body.appendChild(this.tooltipEl);
        }
        
        // Add mouse move handler
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.showTooltips) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Convert to model coordinates
            const scale = this.getScale();
            const modelX = (x - this.canvas.width / 2) / scale;
            const modelY = (y - this.canvas.height / 2) / scale;
            
            // Find patch at coordinates
            const mousePoint = new Point(modelX, modelY);
            let hoveredPatch = null;
            
            for (const patch of this.model.patches) {
                if (this.isPointInPolygon(mousePoint, patch.shape)) {
                    hoveredPatch = patch;
                    break;
                }
            }
            
            // Update tooltip
            if (hoveredPatch && hoveredPatch.ward) {
                const label = hoveredPatch.ward.getLabel();
                if (label !== this.hoveredWard && this.tooltipEl) {
                    this.hoveredWard = label;
                    this.tooltipEl.textContent = label;
                }
                
                if (this.tooltipEl) {
                    this.tooltipEl.style.display = 'block';
                    this.tooltipEl.style.left = `${e.clientX + 10}px`;
                    this.tooltipEl.style.top = `${e.clientY + 10}px`;
                }
            } else {
                this.hoveredWard = null;
                if (this.tooltipEl) {
                    this.tooltipEl.style.display = 'none';
                }
            }
        });
        
        // Hide tooltip when mouse leaves canvas
        this.canvas.addEventListener('mouseleave', () => {
            if (this.tooltipEl) {
                this.tooltipEl.style.display = 'none';
            }
        });
    }

    private isPointInPolygon(point: Point, polygon: Polygon): boolean {
        // Ray casting algorithm to determine if point is in polygon
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
                
            if (intersect) inside = !inside;
        }
        
        return inside;
    }
    
    private getScale(): number {
        const { width, height } = this.canvas;
        return Math.min(
            width / (this.model.cityRadius * 2.5),
            height / (this.model.cityRadius * 2.5)
        );
    }

    public render(): void {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        // Set the background
        this.ctx.fillStyle = this.hexToRgba(CityMap.palette.paper);
        this.ctx.fillRect(0, 0, width, height);
        
        // Center and scale 
        const scale = Math.min(
            width / (this.model.cityRadius * 2.5),
            height / (this.model.cityRadius * 2.5)
        );
        
        this.ctx.save();
        this.ctx.translate(width / 2, height / 2);
        this.ctx.scale(scale, scale);
        
        // Draw roads
        for (const road of this.model.roads) {
            this.drawRoad(road);
        }
        
        // Draw patches
        for (const patch of this.model.patches) {
            if (patch.ward) {
                this.drawPatch(patch);
            }
        }
        
        // Draw streets
        for (const street of this.model.streets) {
            this.drawRoad(street);
        }
        
        // Draw walls if they exist
        if (this.model.wall) {
            this.drawWall(this.model.wall, false);
        }
        
        // Draw citadel if it exists
        if (this.model.citadel && this.model.citadel.ward) {
            const castle = this.model.citadel.ward as Castle;
            this.drawWall(castle.wall, true);
        }
        
        this.ctx.restore();
    }
    
    private drawRoad(road: Polygon): void {
        // Draw road base (wider)
        this.ctx.beginPath();
        this.drawPolyline(road);
        this.ctx.lineWidth = Ward.MAIN_STREET + 1.5;
        this.ctx.strokeStyle = this.hexToRgba(CityMap.palette.medium);
        this.ctx.lineCap = "round";
        this.ctx.stroke();
        
        // Draw road interior
        this.ctx.beginPath();
        this.drawPolyline(road);
        this.ctx.lineWidth = Ward.MAIN_STREET - 1;
        this.ctx.strokeStyle = this.hexToRgba(CityMap.palette.paper);
        this.ctx.stroke();
    }
    
    private drawWall(wall: any, large: boolean): void {
        // Draw wall
        this.ctx.beginPath();
        this.drawPolygon(wall.shape);
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeStyle = this.hexToRgba(CityMap.palette.dark);
        this.ctx.stroke();
        
        // Draw gates
        for (const gate of wall.gates) {
            this.drawGate(wall.shape, gate);
        }
        
        // Draw towers
        for (const tower of wall.towers) {
            this.drawTower(tower, 2.5 * (large ? 1.5 : 1));
        }
    }
    
    private drawTower(p: Point, r: number): void {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = this.hexToRgba(CityMap.palette.dark);
        this.ctx.fill();
    }
    
    private drawGate(wall: Polygon, gate: Point): void {
        this.ctx.beginPath();
        
        // Get direction perpendicular to wall at gate
        const dir = wall.next(gate).subtract(wall.prev(gate));
        dir.normalize(3);
        
        this.ctx.moveTo(gate.x - dir.x, gate.y - dir.y);
        this.ctx.lineTo(gate.x + dir.x, gate.y + dir.y);
        
        this.ctx.lineWidth = 5;
        this.ctx.strokeStyle = this.hexToRgba(CityMap.palette.dark);
        this.ctx.lineCap = "round";
        this.ctx.stroke();
    }
    
    private drawPatch(patch: any): void {
        const { ward } = patch;
        if (!ward.geometry || ward.geometry.length === 0) return;
        
        const wardClass = ward.constructor.name;
        
        switch (wardClass) {
            case 'Castle':
                this.drawBuilding(
                    ward.geometry, 
                    CityMap.palette.light, 
                    CityMap.palette.dark, 
                    3
                );
                break;
                
            case 'Cathedral':
                this.drawBuilding(
                    ward.geometry, 
                    CityMap.palette.light, 
                    CityMap.palette.dark, 
                    1.5
                );
                break;
                
            case 'Market':
            case 'CraftsmenWard':
            case 'MerchantWard':
            case 'GateWard':
            case 'Slum':
            case 'AdministrationWard':
            case 'MilitaryWard':
            case 'PatriciateWard':
            case 'Farm':
                this.ctx.fillStyle = this.hexToRgba(CityMap.palette.light);
                this.ctx.strokeStyle = this.hexToRgba(CityMap.palette.dark);
                this.ctx.lineWidth = 1;
                
                for (const building of ward.geometry) {
                    this.ctx.beginPath();
                    this.drawPolygon(building);
                    this.ctx.fill();
                    this.ctx.stroke();
                }
                break;
                
            case 'Park':
                this.ctx.fillStyle = this.hexToRgba(CityMap.palette.medium);
                this.ctx.lineWidth = 0;
                
                for (const grove of ward.geometry) {
                    this.ctx.beginPath();
                    this.drawPolygon(grove);
                    this.ctx.fill();
                }
                break;
        }
    }
    
    private drawBuilding(
        blocks: Polygon[], 
        fill: number, 
        line: number, 
        thickness: number
    ): void {
        // Draw outlines
        this.ctx.lineWidth = thickness * 2;
        this.ctx.strokeStyle = this.hexToRgba(line);
        
        for (const block of blocks) {
            this.ctx.beginPath();
            this.drawPolygon(block);
            this.ctx.stroke();
        }
        
        // Fill buildings
        this.ctx.fillStyle = this.hexToRgba(fill);
        
        for (const block of blocks) {
            this.ctx.beginPath();
            this.drawPolygon(block);
            this.ctx.fill();
        }
    }
    
    private drawPolygon(p: Polygon): void {
        if (p.length === 0) return;
        
        this.ctx.moveTo(p[p.length - 1].x, p[p.length - 1].y);
        for (const point of p) {
            this.ctx.lineTo(point.x, point.y);
        }
    }
    
    private drawPolyline(p: Polygon): void {
        if (p.length === 0) return;
        
        this.ctx.moveTo(p[0].x, p[0].y);
        for (let i = 1; i < p.length; i++) {
            this.ctx.lineTo(p[i].x, p[i].y);
        }
    }
    
    private hexToRgba(hex: number, alpha: number = 1): string {
        const r = (hex >> 16) & 0xff;
        const g = (hex >> 8) & 0xff;
        const b = hex & 0xff;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}