export interface TilePosition {
  x: number;
  y: number;
}

export interface Building {
  kind: "settlement";
}

export interface TerrainFeature {
  kind: "water" | "tree";
}

export interface NaturalResources {
  stone: number;
  wheat: number;
  fruits: number;
  wood: number;
  fish: number;
}

export interface ManufacturedResources {
  charcoal: number;
  woodTools: number;
  stoneTools: number;
  cordage: number;
}

export interface LaborAllocation {
  hunters: number;
  gatherers: number;
  rulers: number;
}

export type LaborType = keyof LaborAllocation;

export interface PopulationCohort {
  cultureId: string;
  cultureName: string;
  religionId: string;
  religionName: string;
  laborType: LaborType;
  count: number;
}

export interface SettlementBuildings {
  storehouse: number;
  test: number;
  fishingBuilding: number;
  smokingHut: number;
  smokingHutWoodRequirement: number;
}

export interface MarketCommodityOrder {
  orderId: string;
  label: string;
  quantityRequested: number;
  quantityReceived: number;
  coinsSpent: number;
}

export interface MarketCommodityConfig {
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  elasticity: number;
}

export interface MarketCommodityState {
  inventory: number;
  totalSellOrders: number;
  totalBuyOrders: number;
  fulfillmentRatio: number;
  rawPrice: number;
  price: number;
  soldQuantity: number;
  lastOrders: MarketCommodityOrder[];
  config: MarketCommodityConfig;
}

export interface SettlementMarket {
  fish: MarketCommodityState;
}

export interface Settlement {
  isFirstSettlement: boolean;
  startingPopulation: number;
  population: number;
  totalFood: number;
  borderRadius: number;
  government: "Tribal Government";
  societyType: "free market";
  tribalGovernorName: string;
  nextGovernorSelectionDay: number;
  naturalResources: NaturalResources;
  manufacturedResources: ManufacturedResources;
  buildings: SettlementBuildings;
  market: SettlementMarket;
  labor: LaborAllocation;
  populationCohorts: PopulationCohort[];
}

export interface Renderable {
  sprite: PixiGraphics;
}
