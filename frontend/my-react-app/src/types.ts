export type InventoryRow = {
  locationName: string
  sectionName: string
  subSectionName: string
  category: string
  articleNo: string
  colorName: string
  fabric: string
  obsQty: number
  cbsQty: number
  gitQty: number
  netSlsQty: number
  saleThruPct: number
}

export type TreemapNode = {
  name: string
  value: number
  saleThru: number
  children?: TreemapNode[]
}

export type SKUStatus = 'CRITICAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'STAGNANT' | 'HEALTHY' | 'IN_TRANSIT';

export type SKUSummary = {
  totalObs: number
  totalCbs: number
  totalGit: number
  totalSales: number
  avgSaleThru: number
  overallStatus: SKUStatus
  overallReason?: string
  inTransit: boolean
  storeCount: number
}

export type StoreBreakdown = {
  locationName: string
  sectionName: string
  colorName: string
  obsQty: number
  cbsQty: number
  gitQty: number
  netSlsQty: number
  saleThruPct: number
  status: SKUStatus
  statusReason?: string
  asm?: string
  inTransit: boolean
}

export type SKUDetail = {
  articleNo: string
  summary: SKUSummary
  storeBreakdown: StoreBreakdown[]
}

export type TransferSuggestion = {
  articleNo: string
  fromStore: string
  fromObs: number
  fromSurplus: number
  toStore: string
  toCbs: number
  toDeficit: number
  recommendedQty: number
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  fromAsm?: string
  toAsm?: string
}
