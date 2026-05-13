export type InventoryRow = {
  locationName: string
  sectionName: string
  subSectionName: string
  category: string
  articleNo: string
  colorName: string
  fabric?: string | null
  description?: string | null
  brand?: string | null
  gender?: string | null
  season?: string | null
  styleCode?: string | null
  size?: string | null
  barcode?: string | null
  obsQty: number
  cbsQty: number
  gitQty: number
  netSlsQty: number
  saleThruPct: number
  groupPurQty?: number
  groupPrtQty?: number
  deliveryChallanQty?: number
  groupWslQty?: number
  returnQty?: number
  transferInQty?: number
  transferOutQty?: number
  damagedQty?: number
  mrp?: number | null
  asp?: number | null
  netSalesValue?: number | null
  discountPct?: number
  costPrice?: number | null
  asm?: string | null
  region?: string | null
  zone?: string | null
  storeGrade?: string | null
  storeManager?: string | null
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
  subSectionName?: string
  category?: string
  colorName: string
  description?: string | null
  fabric?: string | null
  brand?: string | null
  gender?: string | null
  season?: string | null
  styleCode?: string | null
  size?: string | null
  region?: string | null
  zone?: string | null
  storeGrade?: string | null
  obsQty: number
  cbsQty: number
  gitQty: number
  netSlsQty: number
  saleThruPct: number
  groupPurQty?: number
  groupPrtQty?: number
  deliveryChallanQty?: number
  groupWslQty?: number
  returnQty?: number
  transferInQty?: number
  transferOutQty?: number
  damagedQty?: number
  mrp?: number | null
  asp?: number | null
  netSalesValue?: number | null
  discountPct?: number
  costPrice?: number | null
  status: SKUStatus
  statusReason?: string
  asm?: string | null
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
  colorName?: string
  category?: string
}
