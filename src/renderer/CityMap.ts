import { Model } from '../src/generator/Model';
import { Palette } from './Palette';
import { Ward } from '../src/generator/wards/Ward';
import { Castle } from '../src/generator/wards/Castle';
import { Cathedral } from '../src/generator/wards/Cathedral';
import { Market } from '../src/generator/wards/Market';
import { Polygon } from '../src/geom/Polygon';
import { Point } from '../src/geom/Point';

export class CityMap {
    public static palette: Palette = Palette.DEFAULT;
    
    private model: Model;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    
    constructor(model: Model, canvas: HTMLCanvasElement) {
        this.model = model;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
    }
    
    public static setPalette(name: string): void {
        if (name in Palette) {
            CityMap.palette = (Palette as any)[name];
        }
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