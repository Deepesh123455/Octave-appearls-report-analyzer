export type InventoryRow = {
  locationName: string
  sectionName: string
  subSectionName: string
  category: string
  articleNo: string
  colorName: string
  fabric: string
  obsQty: number
  netSlsQty: number
  saleThruPercent: number
}

export type TreemapNode = {
  name: string
  value: number
  saleThru: number
  children?: TreemapNode[]
}
