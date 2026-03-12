import { ComponentStore, World } from "./ecs.js";
import { generateRandomTribalGovernorName } from "./tribal-governor-names.js";
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 1000;
const SETTLEMENT_CORE_RADIUS = 4;
const SETTLEMENT_BASE_BORDER_RADIUS = 50;
const SETTLEMENT_BORDER_SCALE_PER_POP = 0.28;
const TICK_BASE_MS = 1000;
const DAYS_PER_YEAR = 365;
const DAYS_PER_WEEK = 7;
const GOVERNOR_TERM_YEARS = 25;
const GOVERNOR_TERM_DAYS = DAYS_PER_YEAR * GOVERNOR_TERM_YEARS;
const WEEKLY_NATURAL_DEATH_RATE = 0.001;
const WEEKLY_NATURAL_BIRTH_RATE = 0.005;
const FISH_SPOILAGE_RATE = 0.33;
const FISH_MARKET_CONFIG = {
    basePrice: 10,
    minPrice: 1,
    maxPrice: 100,
    elasticity: 1
};
var TerrainCode;
(function (TerrainCode) {
    TerrainCode[TerrainCode["Grass"] = 0] = "Grass";
    TerrainCode[TerrainCode["Water"] = 1] = "Water";
    TerrainCode[TerrainCode["Tree"] = 2] = "Tree";
})(TerrainCode || (TerrainCode = {}));
const TERRAIN_COLORS = {
    [TerrainCode.Grass]: "#b8c9aa",
    [TerrainCode.Water]: "#3f7ec8",
    [TerrainCode.Tree]: "#347c3a"
};
const world = new World();
const positions = new ComponentStore();
const buildings = new ComponentStore();
const settlements = new ComponentStore();
const renderables = new ComponentStore();
const buildingByPixel = new Map();
const terrainData = new Uint8Array(MAP_WIDTH * MAP_HEIGHT);
let waterCount = 0;
let treeCount = 0;
const root = document.getElementById("game-root");
const statusLabel = document.getElementById("build-status");
const finalizeMapButton = document.getElementById("finalize-map");
const beginSimulationButton = document.getElementById("begin-simulation");
const resetWorldButton = document.getElementById("reset-world");
const brushButtons = Array.from(document.querySelectorAll(".brush-btn[data-brush]"));
const brushSizeInput = document.getElementById("brush-size");
const brushSizeValue = document.getElementById("brush-size-value");
const simulationSpeedSelect = document.getElementById("simulation-speed");
const settlementInfoEmpty = document.getElementById("settlement-info-empty");
const settlementTabButtons = Array.from(document.querySelectorAll(".settlement-tab-btn[data-tab]"));
const settlementPanels = Array.from(document.querySelectorAll(".settlement-panel[data-tab-panel]"));
const settlementGovernmentValue = document.getElementById("settlement-government-type");
const settlementSocietyTypeValue = document.getElementById("settlement-society-type");
const settlementGovernorValue = document.getElementById("settlement-governor");
const settlementGovernorNextValue = document.getElementById("settlement-governor-next");
const settlementPopulationValue = document.getElementById("settlement-population");
const settlementBorderRadiusValue = document.getElementById("settlement-border-radius");
const settlementCultureAValue = document.getElementById("settlement-culture-a");
const settlementReligionAValue = document.getElementById("settlement-religion-a");
const settlementFoodReserveValue = document.getElementById("settlement-food-reserve");
const settlementStoneValue = document.getElementById("settlement-stone");
const settlementWheatValue = document.getElementById("settlement-wheat");
const settlementFruitsValue = document.getElementById("settlement-fruits");
const settlementWoodValue = document.getElementById("settlement-wood");
const settlementFishValue = document.getElementById("settlement-fish");
const settlementFishMarketPriceValue = document.getElementById("settlement-fish-market-price");
const settlementFishMarketSellOrdersValue = document.getElementById("settlement-fish-market-sell-orders");
const settlementFishMarketBuyOrdersValue = document.getElementById("settlement-fish-market-buy-orders");
const settlementFishMarketFulfillmentValue = document.getElementById("settlement-fish-market-fulfillment");
const settlementFishMarketCarryoverValue = document.getElementById("settlement-fish-market-carryover");
const settlementCharcoalValue = document.getElementById("settlement-charcoal");
const settlementWoodToolsValue = document.getElementById("settlement-wood-tools");
const settlementStoneToolsValue = document.getElementById("settlement-stone-tools");
const settlementCordageValue = document.getElementById("settlement-cordage");
const settlementHuntersValue = document.getElementById("settlement-hunters");
const settlementGatherersValue = document.getElementById("settlement-gatherers");
const settlementRulersValue = document.getElementById("settlement-rulers");
const settlementBuildingStorehouseValue = document.getElementById("settlement-building-storehouse");
const settlementBuildingTestValue = document.getElementById("settlement-building-test");
const settlementBuildingFishingValue = document.getElementById("settlement-building-fishing");
const settlementBuildingSmokingHutValue = document.getElementById("settlement-building-smoking-hut");
const settlementBuildingSmokingWoodRequirementValue = document.getElementById("settlement-building-smoking-wood");
if (!(root instanceof HTMLDivElement)) {
    throw new Error("Missing #game-root element.");
}
if (!(statusLabel instanceof HTMLParagraphElement)) {
    throw new Error("Missing #build-status element.");
}
if (!(finalizeMapButton instanceof HTMLButtonElement)) {
    throw new Error("Missing #finalize-map element.");
}
if (!(beginSimulationButton instanceof HTMLButtonElement)) {
    throw new Error("Missing #begin-simulation element.");
}
if (!(resetWorldButton instanceof HTMLButtonElement)) {
    throw new Error("Missing #reset-world element.");
}
if (!(brushSizeInput instanceof HTMLInputElement)) {
    throw new Error("Missing #brush-size element.");
}
if (!(brushSizeValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #brush-size-value element.");
}
if (!(simulationSpeedSelect instanceof HTMLSelectElement)) {
    throw new Error("Missing #simulation-speed element.");
}
if (!(settlementInfoEmpty instanceof HTMLParagraphElement)) {
    throw new Error("Missing #settlement-info-empty element.");
}
if (!settlementTabButtons.length) {
    throw new Error("Missing settlement tab buttons.");
}
if (!settlementPanels.length) {
    throw new Error("Missing settlement panels.");
}
if (!(settlementGovernmentValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-government-type element.");
}
if (!(settlementSocietyTypeValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-society-type element.");
}
if (!(settlementGovernorValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-governor element.");
}
if (!(settlementGovernorNextValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-governor-next element.");
}
if (!(settlementPopulationValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-population element.");
}
if (!(settlementBorderRadiusValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-border-radius element.");
}
if (!(settlementCultureAValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-culture-a element.");
}
if (!(settlementReligionAValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-religion-a element.");
}
if (!(settlementFoodReserveValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-food-reserve element.");
}
if (!(settlementStoneValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-stone element.");
}
if (!(settlementWheatValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-wheat element.");
}
if (!(settlementFruitsValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-fruits element.");
}
if (!(settlementWoodValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-wood element.");
}
if (!(settlementFishValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-fish element.");
}
if (!(settlementFishMarketPriceValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-fish-market-price element.");
}
if (!(settlementFishMarketSellOrdersValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-fish-market-sell-orders element.");
}
if (!(settlementFishMarketBuyOrdersValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-fish-market-buy-orders element.");
}
if (!(settlementFishMarketFulfillmentValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-fish-market-fulfillment element.");
}
if (!(settlementFishMarketCarryoverValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-fish-market-carryover element.");
}
if (!(settlementCharcoalValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-charcoal element.");
}
if (!(settlementWoodToolsValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-wood-tools element.");
}
if (!(settlementStoneToolsValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-stone-tools element.");
}
if (!(settlementCordageValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-cordage element.");
}
if (!(settlementHuntersValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-hunters element.");
}
if (!(settlementGatherersValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-gatherers element.");
}
if (!(settlementRulersValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-rulers element.");
}
if (!(settlementBuildingStorehouseValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-building-storehouse element.");
}
if (!(settlementBuildingTestValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-building-test element.");
}
if (!(settlementBuildingFishingValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-building-fishing element.");
}
if (!(settlementBuildingSmokingHutValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-building-smoking-hut element.");
}
if (!(settlementBuildingSmokingWoodRequirementValue instanceof HTMLSpanElement)) {
    throw new Error("Missing #settlement-building-smoking-wood element.");
}
if (!brushButtons.length) {
    throw new Error("Missing brush buttons.");
}
const app = new PIXI.Application({
    resizeTo: root,
    antialias: false,
    backgroundColor: 0xcad9bf
});
root.appendChild(app.view);
const board = new PIXI.Container();
app.stage.addChild(board);
const terrainCanvas = document.createElement("canvas");
terrainCanvas.width = MAP_WIDTH;
terrainCanvas.height = MAP_HEIGHT;
const terrainCtx = terrainCanvas.getContext("2d");
if (!terrainCtx) {
    throw new Error("Unable to create 2D canvas context for terrain layer.");
}
const terrainSprite = PIXI.Sprite.from(terrainCanvas);
terrainSprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
board.addChild(terrainSprite);
const buildingLayer = new PIXI.Container();
const hoverGraphics = new PIXI.Graphics();
board.addChild(buildingLayer);
board.addChild(hoverGraphics);
const statsText = new PIXI.Text("", {
    fill: 0x0f0f0f,
    fontFamily: "IBM Plex Mono, Courier New, monospace",
    fontSize: 16,
    fontWeight: "bold"
});
app.stage.addChild(statsText);
app.stage.interactive = true;
app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
let phase = "map_edit";
let selectedBrush = "grass";
let brushSize = Math.max(2, Number.parseInt(brushSizeInput.value, 10) || 12);
let hoveredPixel = null;
let isPainting = false;
let lastPaintPixel = null;
let firstSettlementEntity = null;
let selectedSettlementEntity = null;
let activeSettlementTab = "government";
let tickCount = 0;
let dayCount = 0;
let simulationTimer = null;
let simulationSpeedMultiplier = 1;
const setStatus = (message) => {
    statusLabel.textContent = message;
};
const pixelKey = (pixel) => `${pixel.x},${pixel.y}`;
const isBrush = (value) => {
    return value === "grass" || value === "water" || value === "tree";
};
const isSettlementTab = (value) => {
    return value === "government" || value === "population" || value === "resources" || value === "labor" || value === "buildings";
};
const parseSpeedMultiplier = (value) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 1;
    }
    return parsed;
};
const randomInRange = (min, max) => {
    return min + (Math.random() * (max - min));
};
const probabilisticRound = (value) => {
    if (value <= 0) {
        return 0;
    }
    const whole = Math.floor(value);
    const fractional = value - whole;
    return whole + (Math.random() < fractional ? 1 : 0);
};
const formatSpeedMultiplier = () => `${simulationSpeedMultiplier}x`;
const currentTickIntervalMs = () => {
    return Math.max(16, Math.round(TICK_BASE_MS / simulationSpeedMultiplier));
};
const terrainCodeForBrush = (brush) => {
    if (brush === "water") {
        return TerrainCode.Water;
    }
    if (brush === "tree") {
        return TerrainCode.Tree;
    }
    return TerrainCode.Grass;
};
const isInsideMap = (pixel) => {
    return pixel.x >= 0 && pixel.x < MAP_WIDTH && pixel.y >= 0 && pixel.y < MAP_HEIGHT;
};
const terrainAt = (pixel) => {
    return terrainData[(pixel.y * MAP_WIDTH) + pixel.x];
};
const fillTerrainBackground = () => {
    terrainCtx.fillStyle = TERRAIN_COLORS[TerrainCode.Grass];
    terrainCtx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
};
const refreshTerrainTexture = () => {
    terrainSprite.texture.baseTexture.update();
};
const setTerrainPixel = (x, y, nextCode) => {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
        return false;
    }
    const index = (y * MAP_WIDTH) + x;
    const previousCode = terrainData[index];
    if (previousCode === nextCode) {
        return false;
    }
    if (previousCode === TerrainCode.Water) {
        waterCount -= 1;
    }
    if (previousCode === TerrainCode.Tree) {
        treeCount -= 1;
    }
    if (nextCode === TerrainCode.Water) {
        waterCount += 1;
    }
    if (nextCode === TerrainCode.Tree) {
        treeCount += 1;
    }
    terrainData[index] = nextCode;
    terrainCtx.fillStyle = TERRAIN_COLORS[nextCode];
    terrainCtx.fillRect(x, y, 1, 1);
    return true;
};
const formatDayLabel = (day) => {
    if (day <= 0) {
        return "Day 0 (Year 0)";
    }
    const year = Math.floor((day - 1) / DAYS_PER_YEAR) + 1;
    return `Day ${day} (Year ${year})`;
};
const formatAmount = (value) => {
    if (Number.isInteger(value)) {
        return value.toString();
    }
    return value.toFixed(2);
};
const formatRatioPercent = (value) => {
    return `${(value * 100).toFixed(1)}%`;
};
const clearSettlementDetailValues = () => {
    settlementGovernmentValue.textContent = "-";
    settlementSocietyTypeValue.textContent = "-";
    settlementGovernorValue.textContent = "-";
    settlementGovernorNextValue.textContent = "-";
    settlementPopulationValue.textContent = "-";
    settlementBorderRadiusValue.textContent = "-";
    settlementCultureAValue.textContent = "-";
    settlementReligionAValue.textContent = "-";
    settlementFoodReserveValue.textContent = "-";
    settlementStoneValue.textContent = "-";
    settlementWheatValue.textContent = "-";
    settlementFruitsValue.textContent = "-";
    settlementWoodValue.textContent = "-";
    settlementFishValue.textContent = "-";
    settlementFishMarketPriceValue.textContent = "-";
    settlementFishMarketSellOrdersValue.textContent = "-";
    settlementFishMarketBuyOrdersValue.textContent = "-";
    settlementFishMarketFulfillmentValue.textContent = "-";
    settlementFishMarketCarryoverValue.textContent = "-";
    settlementCharcoalValue.textContent = "-";
    settlementWoodToolsValue.textContent = "-";
    settlementStoneToolsValue.textContent = "-";
    settlementCordageValue.textContent = "-";
    settlementHuntersValue.textContent = "-";
    settlementGatherersValue.textContent = "-";
    settlementRulersValue.textContent = "-";
    settlementBuildingStorehouseValue.textContent = "-";
    settlementBuildingTestValue.textContent = "-";
    settlementBuildingFishingValue.textContent = "-";
    settlementBuildingSmokingHutValue.textContent = "-";
    settlementBuildingSmokingWoodRequirementValue.textContent = "-";
};
const setActiveSettlementTab = (tab) => {
    activeSettlementTab = tab;
    for (const button of settlementTabButtons) {
        const buttonTab = button.dataset.tab;
        if (!buttonTab || !isSettlementTab(buttonTab)) {
            continue;
        }
        const isActive = buttonTab === activeSettlementTab;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.tabIndex = isActive ? 0 : -1;
    }
    for (const panel of settlementPanels) {
        const panelTab = panel.dataset.tabPanel;
        if (!panelTab || !isSettlementTab(panelTab)) {
            continue;
        }
        const isActive = panelTab === activeSettlementTab;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
    }
};
const showSettlementInfo = (entity) => {
    selectedSettlementEntity = entity;
    if (entity === null) {
        settlementInfoEmpty.textContent = "Click a settlement to view details.";
        clearSettlementDetailValues();
        return;
    }
    const settlement = settlements.get(entity);
    if (!settlement) {
        settlementInfoEmpty.textContent = "Selected settlement data unavailable.";
        clearSettlementDetailValues();
        return;
    }
    const position = positions.get(entity);
    if (!position) {
        settlementInfoEmpty.textContent = "Selected settlement data unavailable.";
        clearSettlementDetailValues();
        return;
    }
    const daysUntilNextGovernor = Math.max(0, settlement.nextGovernorSelectionDay - dayCount);
    const yearsUntilNextGovernor = Math.ceil(daysUntilNextGovernor / DAYS_PER_YEAR);
    const caananitePopulation = settlement.populationCohorts
        .filter((cohort) => cohort.cultureId === "A")
        .reduce((sum, cohort) => sum + cohort.count, 0);
    const animistPopulation = settlement.populationCohorts
        .filter((cohort) => cohort.religionId === "A")
        .reduce((sum, cohort) => sum + cohort.count, 0);
    settlementInfoEmpty.textContent = `Selected settlement at (${position.x}, ${position.y}).`;
    settlementGovernmentValue.textContent = settlement.government;
    settlementSocietyTypeValue.textContent = settlement.societyType;
    settlementGovernorValue.textContent = settlement.tribalGovernorName;
    settlementGovernorNextValue.textContent =
        `${formatDayLabel(settlement.nextGovernorSelectionDay)} (${yearsUntilNextGovernor}y remaining)`;
    settlementPopulationValue.textContent = settlement.population.toString();
    settlementBorderRadiusValue.textContent = `${settlement.borderRadius}px`;
    settlementCultureAValue.textContent = caananitePopulation.toString();
    settlementReligionAValue.textContent = animistPopulation.toString();
    settlementFoodReserveValue.textContent = formatAmount(settlement.totalFood);
    settlementStoneValue.textContent = formatAmount(settlement.naturalResources.stone);
    settlementWheatValue.textContent = formatAmount(settlement.naturalResources.wheat);
    settlementFruitsValue.textContent = formatAmount(settlement.naturalResources.fruits);
    settlementWoodValue.textContent = formatAmount(settlement.naturalResources.wood);
    settlementFishValue.textContent = formatAmount(settlement.naturalResources.fish);
    settlementFishMarketPriceValue.textContent = `${formatAmount(settlement.market.fish.price)} coins`;
    settlementFishMarketSellOrdersValue.textContent = formatAmount(settlement.market.fish.totalSellOrders);
    settlementFishMarketBuyOrdersValue.textContent = formatAmount(settlement.market.fish.totalBuyOrders);
    settlementFishMarketFulfillmentValue.textContent = formatRatioPercent(settlement.market.fish.fulfillmentRatio);
    settlementFishMarketCarryoverValue.textContent = formatAmount(settlement.market.fish.inventory);
    settlementCharcoalValue.textContent = formatAmount(settlement.manufacturedResources.charcoal);
    settlementWoodToolsValue.textContent = formatAmount(settlement.manufacturedResources.woodTools);
    settlementStoneToolsValue.textContent = formatAmount(settlement.manufacturedResources.stoneTools);
    settlementCordageValue.textContent = formatAmount(settlement.manufacturedResources.cordage);
    settlementHuntersValue.textContent = settlement.labor.hunters.toString();
    settlementGatherersValue.textContent = settlement.labor.gatherers.toString();
    settlementRulersValue.textContent = settlement.labor.rulers.toString();
    settlementBuildingStorehouseValue.textContent = settlement.buildings.storehouse.toString();
    settlementBuildingTestValue.textContent = settlement.buildings.test.toString();
    settlementBuildingFishingValue.textContent = settlement.buildings.fishingBuilding.toString();
    settlementBuildingSmokingHutValue.textContent = settlement.buildings.smokingHut.toString();
    settlementBuildingSmokingWoodRequirementValue.textContent = settlement.buildings.smokingHutWoodRequirement.toString();
};
const updateStats = () => {
    let settlementPopulation = 0;
    let settlementRadius = 0;
    if (firstSettlementEntity !== null) {
        const settlement = settlements.get(firstSettlementEntity);
        if (settlement) {
            settlementPopulation = settlement.population;
            settlementRadius = settlement.borderRadius;
        }
    }
    const phaseLabel = phase === "map_edit" ? "Map Edit" : phase === "settlement" ? "Settlement" : "Simulation";
    const settlementLabel = firstSettlementEntity === null ? "No" : "Yes";
    statsText.text =
        `Phase: ${phaseLabel} | Tick: ${tickCount} | Day: ${dayCount} | Settlement: ${settlementLabel} | Pop: ${settlementPopulation} | Radius: ${settlementRadius}px | Trees: ${treeCount} | Water: ${waterCount}`;
};
const drawHoverPixel = (pixel) => {
    hoverGraphics.clear();
    if (!pixel) {
        return;
    }
    if (phase === "map_edit") {
        const half = Math.floor(brushSize / 2);
        const startX = pixel.x - half;
        const startY = pixel.y - half;
        let previewColor = 0xffffff;
        if (selectedBrush === "water") {
            previewColor = 0x2e6bb4;
        }
        if (selectedBrush === "tree") {
            previewColor = 0x2d6b33;
        }
        hoverGraphics.lineStyle(1, 0xffffff, 0.95);
        hoverGraphics.beginFill(previewColor, 0.28);
        hoverGraphics.drawRect(startX, startY, brushSize, brushSize);
        hoverGraphics.endFill();
        return;
    }
    if (phase === "settlement") {
        hoverGraphics.lineStyle(1, 0xffffff, 0.95);
        hoverGraphics.beginFill(0x8b5f1b, 0.32);
        hoverGraphics.drawRect(pixel.x - 1, pixel.y - 1, 3, 3);
        hoverGraphics.endFill();
    }
};
const positionBoard = () => {
    const availableWidth = Math.max(1, app.screen.width - 28);
    const availableHeight = Math.max(1, app.screen.height - 28);
    const boardScale = Math.min(1, availableWidth / MAP_WIDTH, availableHeight / MAP_HEIGHT);
    board.scale.set(boardScale);
    const scaledWidth = MAP_WIDTH * boardScale;
    const scaledHeight = MAP_HEIGHT * boardScale;
    board.x = Math.max(14, Math.floor((app.screen.width - scaledWidth) / 2));
    board.y = Math.max(14, Math.floor((app.screen.height - scaledHeight) / 2));
    statsText.x = 14;
    statsText.y = 14;
    drawHoverPixel(hoveredPixel);
};
const pointerToPixel = (event) => {
    const local = board.toLocal(event.data.global);
    const px = Math.floor(local.x);
    const py = Math.floor(local.y);
    if (px < 0 || px >= MAP_WIDTH || py < 0 || py >= MAP_HEIGHT) {
        return null;
    }
    return { x: px, y: py };
};
const drawSettlementSprite = (sprite, pixel, borderRadius) => {
    sprite.clear();
    sprite.lineStyle(1, 0x000000, 1);
    sprite.drawCircle(pixel.x, pixel.y, borderRadius);
    sprite.beginFill(0x000000);
    sprite.drawCircle(pixel.x, pixel.y, SETTLEMENT_CORE_RADIUS);
    sprite.endFill();
};
const createBuildingSprite = (pixel, borderRadius) => {
    const sprite = new PIXI.Graphics();
    drawSettlementSprite(sprite, pixel, borderRadius);
    return sprite;
};
const refreshSettlementSprite = (entity) => {
    const settlement = settlements.get(entity);
    const position = positions.get(entity);
    const renderable = renderables.get(entity);
    if (!settlement || !position || !renderable) {
        return;
    }
    drawSettlementSprite(renderable.sprite, position, settlement.borderRadius);
};
const destroyEntity = (entity) => {
    const renderable = renderables.get(entity);
    if (renderable) {
        buildingLayer.removeChild(renderable.sprite);
        renderables.delete(entity);
    }
    positions.delete(entity);
    buildings.delete(entity);
    settlements.delete(entity);
    world.destroyEntity(entity);
};
const updateBrushButtons = () => {
    for (const button of brushButtons) {
        const brushValue = button.dataset.brush;
        if (!brushValue || !isBrush(brushValue)) {
            continue;
        }
        const isSelected = brushValue === selectedBrush;
        button.classList.toggle("is-active", isSelected);
        button.setAttribute("aria-pressed", isSelected ? "true" : "false");
    }
};
const updateBrushSizeLabel = () => {
    brushSizeValue.textContent = `${brushSize}px`;
};
const updateControlsForPhase = () => {
    const isMapEdit = phase === "map_edit";
    for (const button of brushButtons) {
        button.disabled = !isMapEdit;
    }
    brushSizeInput.disabled = !isMapEdit;
    finalizeMapButton.disabled = !isMapEdit;
    beginSimulationButton.disabled = phase !== "settlement" || firstSettlementEntity === null;
};
const setPhase = (nextPhase) => {
    phase = nextPhase;
    updateControlsForPhase();
    drawHoverPixel(hoveredPixel);
    updateStats();
};
const setBrush = (brush) => {
    selectedBrush = brush;
    updateBrushButtons();
    drawHoverPixel(hoveredPixel);
};
const paintBrushAtPixel = (center) => {
    const terrainCode = terrainCodeForBrush(selectedBrush);
    const half = Math.floor(brushSize / 2);
    const startX = center.x - half;
    const startY = center.y - half;
    let changedPixels = 0;
    for (let py = startY; py < startY + brushSize; py += 1) {
        for (let px = startX; px < startX + brushSize; px += 1) {
            const point = { x: px, y: py };
            if (!isInsideMap(point)) {
                continue;
            }
            if (buildingByPixel.has(pixelKey(point))) {
                continue;
            }
            if (setTerrainPixel(px, py, terrainCode)) {
                changedPixels += 1;
            }
        }
    }
    return changedPixels;
};
const paintStroke = (fromPixel, toPixel) => {
    let changedPixels = 0;
    let x0 = fromPixel.x;
    let y0 = fromPixel.y;
    const x1 = toPixel.x;
    const y1 = toPixel.y;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
        changedPixels += paintBrushAtPixel({ x: x0, y: y0 });
        if (x0 === x1 && y0 === y1) {
            break;
        }
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
    return changedPixels;
};
const getBuildingPlacementIssue = (pixel) => {
    const key = pixelKey(pixel);
    if (buildingByPixel.has(key)) {
        return "Pixel already contains a structure.";
    }
    const terrain = terrainAt(pixel);
    if (terrain !== TerrainCode.Grass) {
        return terrain === TerrainCode.Water ? "Cannot build on water." : "Cannot build on trees.";
    }
    return null;
};
const syncLaborAndPopulationFromCohorts = (settlement) => {
    let hunters = 0;
    let gatherers = 0;
    let rulers = 0;
    for (const cohort of settlement.populationCohorts) {
        if (cohort.laborType === "hunters") {
            hunters += cohort.count;
        }
        else if (cohort.laborType === "gatherers") {
            gatherers += cohort.count;
        }
        else if (cohort.laborType === "rulers") {
            rulers += cohort.count;
        }
    }
    settlement.labor.hunters = hunters;
    settlement.labor.gatherers = gatherers;
    settlement.labor.rulers = rulers;
    settlement.population = hunters + gatherers + rulers;
};
const updateSettlementRadius = (settlement) => {
    const populationDelta = Math.max(0, settlement.population - settlement.startingPopulation);
    settlement.borderRadius = Math.round(SETTLEMENT_BASE_BORDER_RADIUS + (populationDelta * SETTLEMENT_BORDER_SCALE_PER_POP));
};
const removePopulationFromLabor = (settlement, laborType, count) => {
    let remaining = count;
    for (const cohort of settlement.populationCohorts) {
        if (cohort.laborType !== laborType || remaining <= 0) {
            continue;
        }
        const removable = laborType === "rulers" ? Math.max(0, cohort.count - 1) : cohort.count;
        const removed = Math.min(removable, remaining);
        cohort.count -= removed;
        remaining -= removed;
    }
    settlement.populationCohorts = settlement.populationCohorts.filter((cohort) => cohort.count > 0);
    syncLaborAndPopulationFromCohorts(settlement);
    return count - remaining;
};
const addPopulationToLabor = (settlement, laborType, count) => {
    if (count <= 0) {
        return;
    }
    const existing = settlement.populationCohorts.find((cohort) => cohort.cultureId === "A" && cohort.religionId === "A" && cohort.laborType === laborType);
    if (existing) {
        existing.count += count;
    }
    else {
        settlement.populationCohorts.push({
            cultureId: "A",
            cultureName: "Caananite",
            religionId: "A",
            religionName: "Animist",
            laborType,
            count
        });
    }
    syncLaborAndPopulationFromCohorts(settlement);
};
const placeBuilding = (pixel) => {
    const issue = getBuildingPlacementIssue(pixel);
    if (issue) {
        setStatus(issue);
        return false;
    }
    const key = pixelKey(pixel);
    const entity = world.createEntity();
    const initialCohorts = [
        {
            cultureId: "A",
            cultureName: "Caananite",
            religionId: "A",
            religionName: "Animist",
            laborType: "hunters",
            count: 99
        },
        {
            cultureId: "A",
            cultureName: "Caananite",
            religionId: "A",
            religionName: "Animist",
            laborType: "gatherers",
            count: 99
        },
        {
            cultureId: "A",
            cultureName: "Caananite",
            religionId: "A",
            religionName: "Animist",
            laborType: "rulers",
            count: 1
        }
    ];
    const calculatedStartingPopulation = initialCohorts.reduce((sum, cohort) => sum + cohort.count, 0);
    const startingGovernor = generateRandomTribalGovernorName();
    const settlementData = {
        isFirstSettlement: true,
        startingPopulation: calculatedStartingPopulation,
        population: calculatedStartingPopulation,
        totalFood: 120,
        borderRadius: SETTLEMENT_BASE_BORDER_RADIUS,
        government: "Tribal Government",
        societyType: "free market",
        tribalGovernorName: startingGovernor,
        nextGovernorSelectionDay: GOVERNOR_TERM_DAYS,
        naturalResources: {
            stone: 0,
            wheat: 40,
            fruits: 40,
            wood: 0,
            fish: 40
        },
        manufacturedResources: {
            charcoal: 0,
            woodTools: 0,
            stoneTools: 0,
            cordage: 0
        },
        buildings: {
            storehouse: 1000,
            test: 100,
            fishingBuilding: 0,
            smokingHut: 0,
            smokingHutWoodRequirement: 1
        },
        market: {
            fish: {
                inventory: 40,
                totalSellOrders: 40,
                totalBuyOrders: calculatedStartingPopulation,
                fulfillmentRatio: Math.min(1, 40 / calculatedStartingPopulation),
                rawPrice: FISH_MARKET_CONFIG.basePrice,
                price: FISH_MARKET_CONFIG.basePrice,
                soldQuantity: Math.min(40, calculatedStartingPopulation),
                lastOrders: [],
                config: { ...FISH_MARKET_CONFIG }
            }
        },
        labor: {
            hunters: 99,
            gatherers: 99,
            rulers: 1
        },
        populationCohorts: initialCohorts
    };
    positions.set(entity, pixel);
    buildings.set(entity, { kind: "settlement" });
    settlements.set(entity, settlementData);
    const sprite = createBuildingSprite(pixel, settlementData.borderRadius);
    renderables.set(entity, { sprite });
    buildingByPixel.set(key, entity);
    buildingLayer.addChild(sprite);
    firstSettlementEntity = entity;
    updateStats();
    return true;
};
const findSettlementFromPixel = (pixel) => {
    for (const [entity, settlement] of settlements.entries()) {
        const position = positions.get(entity);
        if (!position) {
            continue;
        }
        const dx = pixel.x - position.x;
        const dy = pixel.y - position.y;
        const distance = Math.sqrt((dx * dx) + (dy * dy));
        if (distance <= SETTLEMENT_CORE_RADIUS || Math.abs(distance - settlement.borderRadius) <= 2) {
            return entity;
        }
    }
    return null;
};
const countTerrainInRadius = (center, radius, terrainCode) => {
    const radiusSquared = radius * radius;
    const minX = Math.max(0, center.x - radius);
    const maxX = Math.min(MAP_WIDTH - 1, center.x + radius);
    const minY = Math.max(0, center.y - radius);
    const maxY = Math.min(MAP_HEIGHT - 1, center.y + radius);
    let count = 0;
    for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
            const dx = x - center.x;
            const dy = y - center.y;
            if ((dx * dx) + (dy * dy) > radiusSquared) {
                continue;
            }
            if (terrainData[(y * MAP_WIDTH) + x] === terrainCode) {
                count += 1;
            }
        }
    }
    return count;
};
const totalStoredResources = (settlement) => {
    return settlement.naturalResources.stone +
        settlement.naturalResources.wheat +
        settlement.naturalResources.fruits +
        settlement.naturalResources.wood +
        settlement.naturalResources.fish +
        settlement.manufacturedResources.charcoal +
        settlement.manufacturedResources.woodTools +
        settlement.manufacturedResources.stoneTools +
        settlement.manufacturedResources.cordage;
};
const clampSettlementToStorageCapacity = (settlement) => {
    const capacity = Math.max(0, settlement.buildings.storehouse);
    let overflow = totalStoredResources(settlement) - capacity;
    if (overflow <= 0) {
        return;
    }
    const naturalTrimOrder = ["fish", "fruits", "wheat", "wood", "stone"];
    for (const resource of naturalTrimOrder) {
        if (overflow <= 0) {
            break;
        }
        const available = settlement.naturalResources[resource];
        const removed = Math.min(available, overflow);
        settlement.naturalResources[resource] -= removed;
        overflow -= removed;
    }
    const manufacturedTrimOrder = ["charcoal", "cordage", "woodTools", "stoneTools"];
    for (const resource of manufacturedTrimOrder) {
        if (overflow <= 0) {
            break;
        }
        const available = settlement.manufacturedResources[resource];
        const removed = Math.min(available, overflow);
        settlement.manufacturedResources[resource] -= removed;
        overflow -= removed;
    }
    settlement.totalFood =
        settlement.naturalResources.wheat +
            settlement.naturalResources.fruits +
            settlement.naturalResources.fish;
};
const buildFishBuyOrders = (settlement) => {
    const orders = settlement.populationCohorts
        .filter((cohort) => cohort.count > 0)
        .map((cohort) => ({
        orderId: `pop:${cohort.cultureId}:${cohort.religionId}:${cohort.laborType}`,
        label: `${cohort.cultureName} ${cohort.religionName} ${cohort.laborType}`,
        quantityRequested: cohort.count
    }));
    const smokingHutDemand = settlement.buildings.smokingHut;
    if (smokingHutDemand > 0) {
        orders.push({
            orderId: "building:smoking-hut",
            label: "Smoking Hut",
            quantityRequested: smokingHutDemand
        });
    }
    return orders;
};
const runCommodityMarketDay = (inventoryCarryover, producedToday, buyOrders, config) => {
    const safeCarryover = Math.max(0, inventoryCarryover);
    const safeProducedToday = Math.max(0, producedToday);
    const totalSellOrders = safeCarryover + safeProducedToday;
    const totalBuyOrders = buyOrders.reduce((sum, order) => sum + Math.max(0, order.quantityRequested), 0);
    let rawPrice = config.basePrice;
    if (totalBuyOrders > 0 && totalSellOrders > 0) {
        rawPrice = config.basePrice * Math.pow(totalBuyOrders / totalSellOrders, config.elasticity);
    }
    else if (totalBuyOrders > 0 && totalSellOrders <= 0) {
        rawPrice = config.maxPrice;
    }
    const price = Math.max(config.minPrice, Math.min(config.maxPrice, rawPrice));
    const fulfillmentRatio = totalBuyOrders <= 0 ? 1 : Math.min(1, totalSellOrders / totalBuyOrders);
    const orders = buyOrders.map((order) => {
        const requested = Math.max(0, order.quantityRequested);
        const received = requested * fulfillmentRatio;
        return {
            orderId: order.orderId,
            label: order.label,
            quantityRequested: requested,
            quantityReceived: received,
            coinsSpent: received * price
        };
    });
    const soldQuantity = orders.reduce((sum, order) => sum + order.quantityReceived, 0);
    const carryoverInventory = Math.max(0, totalSellOrders - soldQuantity);
    return {
        totalSellOrders,
        totalBuyOrders,
        fulfillmentRatio,
        rawPrice,
        price,
        soldQuantity,
        carryoverInventory,
        orders
    };
};
const applyFishMarketForSettlement = (settlement, fishProducedToday) => {
    const fishState = settlement.market.fish;
    const marketResult = runCommodityMarketDay(fishState.inventory, fishProducedToday, buildFishBuyOrders(settlement), fishState.config);
    fishState.inventory = marketResult.carryoverInventory;
    fishState.totalSellOrders = marketResult.totalSellOrders;
    fishState.totalBuyOrders = marketResult.totalBuyOrders;
    fishState.fulfillmentRatio = marketResult.fulfillmentRatio;
    fishState.rawPrice = marketResult.rawPrice;
    fishState.price = marketResult.price;
    fishState.soldQuantity = marketResult.soldQuantity;
    fishState.lastOrders = marketResult.orders;
    settlement.naturalResources.fish = fishState.inventory;
    return marketResult.orders
        .filter((order) => order.orderId.startsWith("pop:"))
        .reduce((sum, order) => sum + order.quantityReceived, 0);
};
const consumeSmokingHutWood = (settlement) => {
    if (settlement.buildings.smokingHut <= 0) {
        return;
    }
    const requiredWood = settlement.buildings.smokingHut * settlement.buildings.smokingHutWoodRequirement;
    const consumedWood = Math.min(settlement.naturalResources.wood, requiredWood);
    settlement.naturalResources.wood -= consumedWood;
};
const applyDailyFishSpoilage = (settlement) => {
    const carryoverFish = Math.max(0, settlement.market.fish.inventory);
    const spoiledFish = carryoverFish * FISH_SPOILAGE_RATE;
    const nextDayFish = Math.max(0, carryoverFish - spoiledFish);
    settlement.market.fish.inventory = nextDayFish;
    settlement.naturalResources.fish = nextDayFish;
};
const applyWeeklyPopulationVitalRates = (settlement) => {
    for (const cohort of settlement.populationCohorts) {
        const currentCount = Math.max(0, cohort.count);
        if (currentCount <= 0) {
            cohort.count = 0;
            continue;
        }
        const deaths = Math.min(currentCount, probabilisticRound(currentCount * WEEKLY_NATURAL_DEATH_RATE));
        const births = probabilisticRound(currentCount * WEEKLY_NATURAL_BIRTH_RATE);
        cohort.count = Math.max(0, currentCount - deaths + births);
    }
    settlement.populationCohorts = settlement.populationCohorts.filter((cohort) => cohort.count > 0);
    syncLaborAndPopulationFromCohorts(settlement);
};
const calculateDailyResourceGain = (workers, terrainTilesInRange) => {
    const randomFactor = randomInRange(0.9, 1.1);
    return Math.max(0, workers * terrainTilesInRange * 0.001 * randomFactor);
};
const applyFoodShortageLosses = (settlement, shortage) => {
    let remainingShortage = shortage;
    remainingShortage -= removePopulationFromLabor(settlement, "gatherers", remainingShortage);
    remainingShortage -= removePopulationFromLabor(settlement, "hunters", remainingShortage);
    remainingShortage -= removePopulationFromLabor(settlement, "rulers", remainingShortage);
};
const runSimulationStep = () => {
    tickCount += 1;
    dayCount = tickCount;
    const governorRotationMessages = [];
    for (const [entity, settlement] of settlements.entries()) {
        const position = positions.get(entity);
        if (!position) {
            continue;
        }
        const nearbyTrees = countTerrainInRadius(position, settlement.borderRadius, TerrainCode.Tree);
        const nearbyWater = countTerrainInRadius(position, settlement.borderRadius, TerrainCode.Water);
        const fishGain = calculateDailyResourceGain(settlement.labor.hunters, nearbyWater);
        const fruitsGain = calculateDailyResourceGain(settlement.labor.gatherers, nearbyTrees);
        settlement.naturalResources.fruits += fruitsGain;
        const totalPopDemand = settlement.population;
        const popFishReceived = applyFishMarketForSettlement(settlement, fishGain);
        consumeSmokingHutWood(settlement);
        clampSettlementToStorageCapacity(settlement);
        settlement.market.fish.inventory = settlement.naturalResources.fish;
        settlement.totalFood =
            settlement.naturalResources.wheat +
                settlement.naturalResources.fruits +
                settlement.naturalResources.fish;
        const fishShortage = Math.max(0, totalPopDemand - popFishReceived);
        if (fishShortage > 0) {
            applyFoodShortageLosses(settlement, Math.ceil(fishShortage));
        }
        else if (settlement.market.fish.inventory > totalPopDemand * 0.25) {
            addPopulationToLabor(settlement, "gatherers", 1);
        }
        applyDailyFishSpoilage(settlement);
        if (dayCount % DAYS_PER_WEEK === 0) {
            applyWeeklyPopulationVitalRates(settlement);
        }
        settlement.totalFood =
            settlement.naturalResources.wheat +
                settlement.naturalResources.fruits +
                settlement.naturalResources.fish;
        updateSettlementRadius(settlement);
        refreshSettlementSprite(entity);
        if (dayCount >= settlement.nextGovernorSelectionDay) {
            settlement.tribalGovernorName = generateRandomTribalGovernorName();
            settlement.nextGovernorSelectionDay += GOVERNOR_TERM_DAYS;
            governorRotationMessages.push(`Settlement (${position.x}, ${position.y}) elected ${settlement.tribalGovernorName}.`);
        }
    }
    updateStats();
    if (selectedSettlementEntity !== null) {
        showSettlementInfo(selectedSettlementEntity);
    }
    const governorMessage = governorRotationMessages.length ? ` ${governorRotationMessages.join(" ")}` : "";
    setStatus(`Tick ${tickCount} (${formatDayLabel(dayCount)}): simulation running.${governorMessage}`);
};
const stopSimulation = () => {
    if (simulationTimer !== null) {
        window.clearInterval(simulationTimer);
        simulationTimer = null;
    }
};
const startSimulationTimer = () => {
    stopSimulation();
    simulationTimer = window.setInterval(() => {
        runSimulationStep();
    }, currentTickIntervalMs());
};
const beginSimulation = () => {
    if (phase !== "settlement") {
        return;
    }
    if (firstSettlementEntity === null) {
        setStatus("Place your first settlement before starting simulation.");
        return;
    }
    stopSimulation();
    setPhase("simulation");
    setStatus(`Simulation started. Each tick is one day at ${formatSpeedMultiplier()} speed (~${currentTickIntervalMs()}ms per day).`);
    startSimulationTimer();
};
const startPaintStroke = (pixel) => {
    if (phase !== "map_edit") {
        return;
    }
    isPainting = true;
    lastPaintPixel = pixel;
    const changedPixels = paintStroke(pixel, pixel);
    if (changedPixels > 0) {
        refreshTerrainTexture();
        updateStats();
    }
};
const continuePaintStroke = (pixel) => {
    if (!isPainting || phase !== "map_edit" || !lastPaintPixel) {
        return;
    }
    const changedPixels = paintStroke(lastPaintPixel, pixel);
    lastPaintPixel = pixel;
    if (changedPixels > 0) {
        refreshTerrainTexture();
        updateStats();
    }
};
const stopPaintStroke = () => {
    isPainting = false;
    lastPaintPixel = null;
};
const clearWorld = () => {
    stopSimulation();
    stopPaintStroke();
    for (const entity of world.allEntities()) {
        destroyEntity(entity);
    }
    buildingByPixel.clear();
    firstSettlementEntity = null;
    selectedSettlementEntity = null;
    tickCount = 0;
    dayCount = 0;
    hoveredPixel = null;
    terrainData.fill(TerrainCode.Grass);
    waterCount = 0;
    treeCount = 0;
    fillTerrainBackground();
    refreshTerrainTexture();
    setBrush("grass");
    setPhase("map_edit");
    setActiveSettlementTab("government");
    drawHoverPixel(null);
    showSettlementInfo(null);
    updateStats();
    setStatus("Map editing phase: paint water and trees with click-drag, then finalize the map.");
};
app.stage.on("pointermove", (event) => {
    hoveredPixel = pointerToPixel(event);
    drawHoverPixel(hoveredPixel);
    if (hoveredPixel) {
        continuePaintStroke(hoveredPixel);
    }
});
app.stage.on("pointerdown", (event) => {
    if (event.button !== 0) {
        return;
    }
    const pixel = pointerToPixel(event);
    if (!pixel) {
        setStatus("Pointer is outside the 1000x1000 paint area.");
        return;
    }
    const clickedSettlement = findSettlementFromPixel(pixel);
    if (clickedSettlement !== null) {
        showSettlementInfo(clickedSettlement);
        const settlement = settlements.get(clickedSettlement);
        if (settlement) {
            setStatus(`Settlement selected. Governor: ${settlement.tribalGovernorName}. Population: ${settlement.population}, Food: ${formatAmount(settlement.totalFood)}, Wood: ${formatAmount(settlement.naturalResources.wood)}.`);
        }
        if (phase !== "map_edit") {
            return;
        }
    }
    if (phase === "map_edit") {
        startPaintStroke(pixel);
        setStatus(`Painting ${selectedBrush} with ${brushSize}px brush.`);
        return;
    }
    if (phase === "settlement") {
        if (firstSettlementEntity !== null) {
            setStatus("First settlement already placed. Click Begin Simulation.");
            return;
        }
        if (placeBuilding(pixel)) {
            updateControlsForPhase();
            showSettlementInfo(firstSettlementEntity);
            setStatus(`First settlement placed at (${pixel.x}, ${pixel.y}). Click Begin Simulation to continue.`);
        }
        return;
    }
    setStatus("Simulation is running. Click the settlement to inspect it, or use Reset to restart.");
});
app.stage.on("pointerup", () => {
    stopPaintStroke();
});
app.stage.on("pointerupoutside", () => {
    stopPaintStroke();
});
window.addEventListener("mouseup", () => {
    stopPaintStroke();
});
for (const button of settlementTabButtons) {
    button.addEventListener("click", () => {
        const tab = button.dataset.tab;
        if (!tab || !isSettlementTab(tab)) {
            return;
        }
        setActiveSettlementTab(tab);
    });
}
simulationSpeedSelect.addEventListener("change", () => {
    simulationSpeedMultiplier = parseSpeedMultiplier(simulationSpeedSelect.value);
    if (phase === "simulation") {
        startSimulationTimer();
        setStatus(`Simulation speed changed to ${formatSpeedMultiplier()} (~${currentTickIntervalMs()}ms per day).`);
        return;
    }
    setStatus(`Simulation speed set to ${formatSpeedMultiplier()}.`);
});
for (const button of brushButtons) {
    button.addEventListener("click", () => {
        const brushValue = button.dataset.brush;
        if (!brushValue || !isBrush(brushValue) || phase !== "map_edit") {
            return;
        }
        setBrush(brushValue);
        setStatus(`Brush selected: ${brushValue}.`);
    });
}
brushSizeInput.addEventListener("input", () => {
    if (phase !== "map_edit") {
        return;
    }
    const parsed = Number.parseInt(brushSizeInput.value, 10);
    brushSize = Number.isFinite(parsed) ? Math.max(2, parsed) : 12;
    updateBrushSizeLabel();
    drawHoverPixel(hoveredPixel);
});
finalizeMapButton.addEventListener("click", () => {
    if (phase !== "map_edit") {
        return;
    }
    stopPaintStroke();
    setPhase("settlement");
    setStatus("Map finalized. Place your first settlement on a grass pixel.");
});
beginSimulationButton.addEventListener("click", () => {
    beginSimulation();
});
resetWorldButton.addEventListener("click", () => {
    clearWorld();
});
app.renderer.on("resize", () => {
    app.stage.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
    positionBoard();
});
fillTerrainBackground();
refreshTerrainTexture();
updateBrushSizeLabel();
simulationSpeedMultiplier = parseSpeedMultiplier(simulationSpeedSelect.value);
setBrush("grass");
setPhase("map_edit");
setActiveSettlementTab("government");
showSettlementInfo(null);
positionBoard();
updateStats();
setStatus("Map editing phase: paint water and trees with click-drag, then finalize the map.");
