/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class MapSettingsCard extends FormattingSettingsCard {
    name: string = "mapSettings";
    displayName: string = "Map Settings";

    showMap = new formattingSettings.ToggleSwitch({
        name: "showMap",
        displayName: "Show Map",
        value: true
    });

    mapStyle = new formattingSettings.ItemDropdown({
        name: "mapStyle",
        displayName: "Map Style",
        items: [
            { displayName: "Grayscale", value: "grayscale" },
            { displayName: "Satellite", value: "satellite" },
            { displayName: "Road", value: "road" }
        ],
        value: { displayName: "Grayscale", value: "grayscale" }
    });

    slices: Array<FormattingSettingsSlice> = [this.showMap, this.mapStyle];
}

class PathSettingsCard extends FormattingSettingsCard {
    name: string = "pathSettings";
    displayName: string = "Path Settings";

    color = new formattingSettings.ColorPicker({
        name: "color",
        displayName: "Route Color",
        value: { value: "#4682B4" }
    });

    thickness = new formattingSettings.NumUpDown({
        name: "thickness",
        displayName: "Thickness",
        value: 2
    });

    opacity = new formattingSettings.NumUpDown({
        name: "opacity",
        displayName: "Opacity (%)",
        value: 80
    });

    slices: Array<FormattingSettingsSlice> = [this.color, this.thickness, this.opacity];
}

class GlyphSettingsCard extends FormattingSettingsCard {
    name: string = "glyphSettings";
    displayName: string = "Glyph Settings";

    startGlyphColor = new formattingSettings.ColorPicker({
        name: "startGlyphColor",
        displayName: "Start Glyph Color",
        value: { value: "#4682B4" }
    });

    endGlyphColor = new formattingSettings.ColorPicker({
        name: "endGlyphColor", 
        displayName: "End Glyph Color",
        value: { value: "#4682B4" }
    });

    arrowColor = new formattingSettings.ColorPicker({
        name: "arrowColor",
        displayName: "Arrow Color", 
        value: { value: "#4682B4" }
    });

    glyphSize = new formattingSettings.NumUpDown({
        name: "glyphSize",
        displayName: "Glyph Size",
        value: 10
    });

    slices: Array<FormattingSettingsSlice> = [this.startGlyphColor, this.endGlyphColor, this.arrowColor, this.glyphSize];
}

class ArrowSettingsCard extends FormattingSettingsCard {
    name: string = "arrowSettings";
    displayName: string = "Directional Arrow Settings";

    showArrows = new formattingSettings.ToggleSwitch({
        name: "showArrows",
        displayName: "Show Arrows",
        value: true
    });

    arrowCount = new formattingSettings.Slider({
        name: "arrowCount",
        displayName: "Arrow Count",
        value: 20,
        options: {
            minValue: {
                type: powerbi.visuals.ValidatorType.Min,
                value: 1
            },
            maxValue: {
                type: powerbi.visuals.ValidatorType.Max,
                value: 48
            }
        }
    });

    slices: Array<FormattingSettingsSlice> = [this.showArrows, this.arrowCount];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    mapSettingsCard = new MapSettingsCard();
    pathSettingsCard = new PathSettingsCard();
    glyphSettingsCard = new GlyphSettingsCard();
    arrowSettingsCard = new ArrowSettingsCard();

    cards = [this.mapSettingsCard, this.pathSettingsCard, this.glyphSettingsCard, this.arrowSettingsCard];
}