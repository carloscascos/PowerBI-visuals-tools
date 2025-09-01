/*
*  Power BI Visual CLI - Working Routes and Glyphs Version
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import * as d3 from "d3";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import ISelectionId = powerbi.visuals.ISelectionId;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { VisualFormattingSettingsModel } from "./settings";

interface RoutePoint {
    pathId: string;
    timestamp: Date;
    latitude: number;
    longitude: number;
    tooltipData?: any[];
    selectionId: ISelectionId;
}

interface PathGroup {
    pathId: string;
    points: RoutePoint[];
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private element: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    
    private svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
    private pathLayer: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    private glyphLayer: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

    private readonly SHIP_PATH = "M 0,-8 L -3,-4 L -3,4 L -1,8 L 1,8 L 3,4 L 3,-4 Z";
    private readonly ARROW_PATH = "M 0,-4 L -3,4 L 0,2 L 3,4 Z";

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.element = options.element;
        this.formattingSettingsService = new FormattingSettingsService();
        
        this.svg = d3.select(this.element)
            .append('svg')
            .style('width', '100%')
            .style('height', '100%')
            .style('background', '#e8e8e8');

        this.pathLayer = this.svg.append('g').classed('pathLayer', true);
        this.glyphLayer = this.svg.append('g').classed('glyphLayer', true);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel, 
            options.dataViews?.[0]
        );

        const width = options.viewport.width;
        const height = options.viewport.height;
        
        this.svg.attr('width', width).attr('height', height);
        this.pathLayer.selectAll('*').remove();
        this.glyphLayer.selectAll('*').remove();

        const routeData = this.parseData(options.dataViews?.[0]);
        if (!routeData || routeData.length === 0) {
            this.svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .style('font-size', '16px')
                .style('fill', '#666')
                .text('Add: Path ID, Timestamp, Latitude, Longitude');
            return;
        }

        this.renderRoutes(routeData, width, height);
    }

    private parseData(dataView?: DataView): PathGroup[] {
        if (!dataView?.categorical?.values) return [];

        const categorical = dataView.categorical;
        const pathGroups: Map<string, RoutePoint[]> = new Map();

        let pathIdIndex = -1;
        let timestampIndex = -1;
        categorical.categories?.forEach((category, index) => {
            if (category.source.roles?.['pathId']) pathIdIndex = index;
            if (category.source.roles?.['timestamp']) timestampIndex = index;
        });

        let latIndex = -1;
        let lonIndex = -1;
        let tooltipIndices: number[] = [];
        categorical.values?.forEach((valueColumn, index) => {
            if (valueColumn.source.roles?.['latitude']) latIndex = index;
            if (valueColumn.source.roles?.['longitude']) lonIndex = index;
            if (valueColumn.source.roles?.['tooltipData']) tooltipIndices.push(index);
        });

        if (latIndex === -1 || lonIndex === -1) return [];

        const rowCount = categorical.values[0].values.length;
        
        for (let i = 0; i < rowCount; i++) {
            const pathId = pathIdIndex >= 0 && categorical.categories ? 
                String(categorical.categories[pathIdIndex].values[i]) : 'route';
            const timestamp = timestampIndex >= 0 && categorical.categories ? 
                new Date(categorical.categories[timestampIndex].values[i] as any) : new Date(i);
            const latitude = categorical.values[latIndex].values[i] as number;
            const longitude = categorical.values[lonIndex].values[i] as number;
            
            if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) continue;

            const tooltipData = tooltipIndices.map(idx => categorical.values![idx].values[i]);
            const selectionId = this.host.createSelectionIdBuilder()
                .withCategory(categorical.categories?.[0], i)
                .createSelectionId();

            const point: RoutePoint = { pathId, timestamp, latitude, longitude, tooltipData, selectionId };

            if (!pathGroups.has(pathId)) pathGroups.set(pathId, []);
            pathGroups.get(pathId)!.push(point);
        }

        const result: PathGroup[] = [];
        pathGroups.forEach((points, pathId) => {
            points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            result.push({ pathId, points });
        });

        return result;
    }

    private renderRoutes(pathGroups: PathGroup[], width: number, height: number) {
        // Calculate bounds
        let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
        pathGroups.forEach(group => {
            group.points.forEach(point => {
                minLat = Math.min(minLat, point.latitude);
                maxLat = Math.max(maxLat, point.latitude);
                minLon = Math.min(minLon, point.longitude);
                maxLon = Math.max(maxLon, point.longitude);
            });
        });

        // Simple linear scaling with padding
        const padding = 50;
        const xScale = d3.scaleLinear().domain([minLon, maxLon]).range([padding, width - padding]);
        const yScale = d3.scaleLinear().domain([minLat, maxLat]).range([height - padding, padding]);
        
        const projection = (coords: [number, number]): [number, number] => {
            return [xScale(coords[0]), yScale(coords[1])];
        };

        // Render each route with glyphs
        pathGroups.forEach(group => {
            this.renderPath(group, projection);
            this.renderGlyphs(group, projection);
        });
    }

    private renderPath(pathGroup: PathGroup, projection: (coords: [number, number]) => [number, number]) {
        const settings = this.formattingSettings.pathSettingsCard;
        
        const line = d3.line<RoutePoint>()
            .x(d => projection([d.longitude, d.latitude])[0])
            .y(d => projection([d.longitude, d.latitude])[1])
            .curve(d3.curveCardinal.tension(0.5));

        this.pathLayer.append('path')
            .datum(pathGroup.points)
            .attr('d', line)
            .attr('stroke', settings.color.value.value)
            .attr('stroke-width', settings.thickness.value)
            .attr('stroke-opacity', settings.opacity.value / 100)
            .attr('fill', 'none')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round');
    }

    private renderGlyphs(pathGroup: PathGroup, projection: (coords: [number, number]) => [number, number]) {
        const glyphSettings = this.formattingSettings.glyphSettingsCard;
        const arrowSettings = this.formattingSettings.arrowSettingsCard;
        
        if (pathGroup.points.length < 2) return;

        // Start glyph (dot)
        const start = pathGroup.points[0];
        const [startX, startY] = projection([start.longitude, start.latitude]);
        
        this.glyphLayer.append('circle')
            .attr('cx', startX)
            .attr('cy', startY)
            .attr('r', glyphSettings.glyphSize.value / 2)
            .attr('fill', glyphSettings.startGlyphColor.value.value)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

        // End glyph (ship)
        const end = pathGroup.points[pathGroup.points.length - 1];
        const [endX, endY] = projection([end.longitude, end.latitude]);
        
        // Calculate rotation
        const prev = pathGroup.points[pathGroup.points.length - 2];
        const [prevX, prevY] = projection([prev.longitude, prev.latitude]);
        const angle = Math.atan2(endY - prevY, endX - prevX) * 180 / Math.PI + 90;
        
        this.glyphLayer.append('path')
            .attr('d', this.SHIP_PATH)
            .attr('transform', `translate(${endX},${endY}) rotate(${angle}) scale(${glyphSettings.glyphSize.value / 10})`)
            .attr('fill', glyphSettings.endGlyphColor.value.value)
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5);

        // Directional arrows
        if (arrowSettings.showArrows.value) {
            this.renderDirectionalArrows(pathGroup, glyphSettings, arrowSettings, projection);
        }
    }

    private renderDirectionalArrows(
        pathGroup: PathGroup, 
        glyphSettings: any,
        arrowSettings: any,
        projection: (coords: [number, number]) => [number, number]
    ) {
        const line = d3.line<RoutePoint>()
            .x(d => projection([d.longitude, d.latitude])[0])
            .y(d => projection([d.longitude, d.latitude])[1])
            .curve(d3.curveCardinal.tension(0.5));

        const tempPath = this.svg.append('path')
            .datum(pathGroup.points)
            .attr('d', line)
            .style('visibility', 'hidden');

        const pathNode = tempPath.node() as SVGPathElement;
        const totalLength = pathNode.getTotalLength();
        const arrowCount = Math.min(arrowSettings.arrowCount.value, 48);
        const interval = totalLength / (arrowCount + 1);

        for (let i = 1; i <= arrowCount; i++) {
            const distance = i * interval;
            const point = pathNode.getPointAtLength(distance);
            
            const epsilon = 2;
            const pointBefore = pathNode.getPointAtLength(Math.max(0, distance - epsilon));
            const pointAfter = pathNode.getPointAtLength(Math.min(totalLength, distance + epsilon));
            const angle = Math.atan2(pointAfter.y - pointBefore.y, pointAfter.x - pointBefore.x) * 180 / Math.PI + 90;

            this.glyphLayer.append('path')
                .attr('d', this.ARROW_PATH)
                .attr('transform', `translate(${point.x},${point.y}) rotate(${angle}) scale(${glyphSettings.glyphSize.value / 20})`)
                .attr('fill', glyphSettings.arrowColor.value.value)
                .attr('stroke', '#fff')
                .attr('stroke-width', 0.3);
        }

        tempPath.remove();
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}