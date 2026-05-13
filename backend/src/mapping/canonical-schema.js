/**
 * CANONICAL SCHEMA
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for every field this system can understand.
 * Each field specifies: key, label, group, dataType, required, and all known
 * synonyms in lowercase (used by the semantic matcher).
 *
 * To add support for a new field: add a new entry here. That's it.
 */

export const CANONICAL_FIELDS = {

  // ── LOCATION / STORE ───────────────────────────────────────────────────────
  locationName: {
    key: 'locationName', label: 'Location Name', group: 'identity', dataType: 'string', required: false,
    synonyms: [
      'location name','location','store name','store','outlet','outlet name','site','site name',
      'branch','branch name','shop','shop name','pos','point of sale','retail location',
      'loc','loc name','locname','store code','outlet code','location code','loc code',
      'business unit','bu','plant','cost center','channel','retail channel'
    ]
  },

  // ── SKU / ARTICLE ──────────────────────────────────────────────────────────
  articleNo: {
    key: 'articleNo', label: 'Article No', group: 'identity', dataType: 'string', required: true,
    synonyms: [
      'article no','article','article number','articleno','article_no',
      'sku','sku code','sku id','skuid','sku number','skuno',
      'item code','item no','item number','item id','item','itemcode',
      'product id','product code','product no','product number','productid','productcode',
      'material no','material number','material code','matno','material','matnr',
      'style no','style number','style code','style id',
      'ref no','reference no','reference number','ref','reference',
      'part no','part number','part code',
      'model no','model number','model code',
      'stock keeping unit','stock code','upc','ean','gtin'
    ]
  },

  // ── COLOR ──────────────────────────────────────────────────────────────────
  colorName: {
    key: 'colorName', label: 'Color Name', group: 'identity', dataType: 'string', required: false,
    synonyms: [
      'color name','color','colour name','colour','col',
      'color code','colour code','col code','color description',
      'shade','shade name','shade code','colorway','colorway name',
      'finish','variant color','color variant','hue','colourway'
    ]
  },

  // ── PRODUCT ATTRIBUTES ─────────────────────────────────────────────────────
  description: {
    key: 'description', label: 'Description', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'description','desc','product description','item description',
      'product name','item name','article name','style name',
      'product title','short description','long description',
      'product detail','item detail','name','title','product label','display name'
    ]
  },

  sectionName: {
    key: 'sectionName', label: 'Section Name', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'section name','section','division','division name',
      'gender segment','customer segment','segment',
      'floor','floor name','floor segment','section code'
    ]
  },

  subSectionName: {
    key: 'subSectionName', label: 'Sub Section Name', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'sub section name','sub section','subsection','sub-section',
      'sub department','subdepartment','sub dept','sub-dept',
      'product group','merchandise group',
      'class','class name','sub class','subclass',
      'type','product type','item type'
    ]
  },

  category: {
    key: 'category', label: 'Category', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'category','cat','product category','item category',
      'locgroup','loc group','location group',
      'merchandise category','merch cat','merch category',
      'product group','group','grp',
      'family','product family','line','product line',
      'range','product range','collection type'
    ]
  },

  fabric: {
    key: 'fabric', label: 'Fabric', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'fabric','fabric type','fabric name','fabric composition',
      'material','material type','material name','composition',
      'textile','fibre','fiber','construction','yarn','blend','content','fabric content'
    ]
  },

  gender: {
    key: 'gender', label: 'Gender', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'gender','sex','gender category','target gender',
      'customer gender','gender segment','gender type'
    ]
  },

  season: {
    key: 'season', label: 'Season', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'season','season code','season name','collection',
      'collection name','collection code','line','launch'
    ]
  },

  brand: {
    key: 'brand', label: 'Brand', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'brand','brand name','brand code','label',
      'sub brand','subbrand','marque','private label',
      'own brand','own label','manufacturer','make'
    ]
  },

  styleCode: {
    key: 'styleCode', label: 'Style Code', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'style code','style','style no','style number',
      'model no','model number','model code','model',
      'design code','design no','design number','design',
      'pattern code','pattern no','pattern','cut code'
    ]
  },

  size: {
    key: 'size', label: 'Size', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'size','size code','size name','size label',
      'sz','size_code','size description','grid','scale','dimension'
    ]
  },

  barcode: {
    key: 'barcode', label: 'Barcode', group: 'product', dataType: 'string', required: false,
    synonyms: [
      'barcode','ean','upc','gtin','isbn',
      'barcode no','barcode number','scan code','ean code','ean13','upc a','product barcode'
    ]
  },

  // ── QUANTITY FIELDS ────────────────────────────────────────────────────────
  obsQty: {
    key: 'obsQty', label: 'OBS Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'obs qty','obs','obsqty','obs_qty','ob qty','ob',
      'opening stock','opening balance','opening quantity','opening qty',
      'open stock','opening','stock opening','begin qty',
      'beginning stock','beginning inventory','beginning balance',
      'start qty','start stock','initial stock','initial qty',
      'period open qty','bfwd','brought forward'
    ]
  },

  cbsQty: {
    key: 'cbsQty', label: 'CBS Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'cbs qty','cbs','cbsqty','cbs_qty',
      'closing stock','closing balance','closing quantity','closing qty',
      'close stock','closing','stock closing','end qty',
      'ending stock','ending inventory','ending balance',
      'current stock','current inventory','stock on hand','soh',
      'available stock','available qty','in stock','stock available',
      'balance qty','balance stock','remaining qty','remaining stock',
      'cfwd','carried forward','closing inventory'
    ]
  },

  netSlsQty: {
    key: 'netSlsQty', label: 'Net SLS Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'net sls qty','net sls','netslsqty','net_sls_qty',
      'net sales qty','net sales','net sales quantity',
      'sales qty','sales','sales quantity','qty sold','sold qty',
      'units sold','unit sales','sold units','total sales qty',
      'qty sale','sale qty','sale quantity','selling qty',
      'offtake','throughput','actual sales'
    ]
  },

  gitQty: {
    key: 'gitQty', label: 'GIT Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'git qty','git','gitqty','git_qty',
      'goods in transit','in transit','intransit','in-transit',
      'transit qty','transit stock','on the way','pipeline stock',
      'inbound','inbound qty','incoming stock','po outstanding','open po qty'
    ]
  },

  groupPurQty: {
    key: 'groupPurQty', label: 'Group Pur Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'group pur qty','grp pur qty','group_pur_qty','group pur',
      'purchase qty','purchased qty','pur qty','po qty',
      'buy qty','bought qty','procured qty','procurement qty',
      'order qty','ordered qty','purchase order qty',
      'intake qty','intake','receipt qty','received qty'
    ]
  },

  groupPrtQty: {
    key: 'groupPrtQty', label: 'Group Prt Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'group prt qty','grp prt qty','group_prt_qty','group prt',
      'print qty','printing qty','prt qty','production qty',
      'production quantity','manufactured qty','mfg qty',
      'factory qty','vendor qty','supply qty','allocation qty'
    ]
  },

  deliveryChallanQty: {
    key: 'deliveryChallanQty', label: 'Delivery Challan Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'delivery challan qty','dc qty','challan qty','delivery qty',
      'delivery_challan_qty','challan','delivery challan',
      'dispatched qty','dispatch qty','shipped qty','shipping qty',
      'despatched qty','despatch qty','outbound qty'
    ]
  },

  groupWslQty: {
    key: 'groupWslQty', label: 'Group Wsl Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'group wsl qty','grp wsl qty','group_wsl_qty','group wsl',
      'wholesale qty','wsl qty','wholesale','b2b qty',
      'trade qty','institutional qty','bulk qty','bulk sale qty',
      'distributor qty','dealer qty','reseller qty'
    ]
  },

  returnQty: {
    key: 'returnQty', label: 'Return Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'return qty','returns','rtn qty','return quantity',
      'customer return','customer returns','goods return',
      'sale return','sales return','returned qty',
      'refund qty','exchange qty','rejection qty',
      'vendor return','stock return'
    ]
  },

  transferInQty: {
    key: 'transferInQty', label: 'Transfer In Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'transfer in qty','transfer in','trf in qty','trf_in',
      'stock in','received from store','intra store in',
      'inter store receipt','store transfer in','transfer receipt',
      'received transfer','incoming transfer'
    ]
  },

  transferOutQty: {
    key: 'transferOutQty', label: 'Transfer Out Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'transfer out qty','transfer out','trf out qty','trf_out',
      'stock out','sent to store','intra store out',
      'inter store issue','store transfer out','transfer issue',
      'issued transfer','outgoing transfer'
    ]
  },

  damagedQty: {
    key: 'damagedQty', label: 'Damaged Qty', group: 'quantity', dataType: 'integer', required: false,
    synonyms: [
      'damaged qty','damaged','damage qty','damage',
      'shrinkage','shrink qty','wastage','wastage qty',
      'write off','write-off','write off qty','written off',
      'defective qty','defective','defects','rejections',
      'expired qty','obsolete qty','scrap qty','scrap'
    ]
  },

  // ── FINANCIAL FIELDS ───────────────────────────────────────────────────────
  mrp: {
    key: 'mrp', label: 'MRP', group: 'financial', dataType: 'decimal', required: false,
    synonyms: [
      'mrp','max retail price','maximum retail price','retail price',
      'list price','selling price','marked price','ticket price',
      'price tag','sticker price','rrp','recommended retail price',
      'msrp','suggested retail price','full price'
    ]
  },

  asp: {
    key: 'asp', label: 'ASP', group: 'financial', dataType: 'decimal', required: false,
    synonyms: [
      'asp','avg selling price','average selling price','average price',
      'net price','realized price','effective price','actual price',
      'net asp','net average price','avg sale price',
      'per unit price','unit price','average unit price','aur',
      'avg unit retail','average unit retail'
    ]
  },

  netSalesValue: {
    key: 'netSalesValue', label: 'Net Sales Value', group: 'financial', dataType: 'decimal', required: false,
    synonyms: [
      'net sales value','revenue','net revenue','sales value',
      'sales amount','sales revenue','net sales amount',
      'turnover','net turnover','sales turnover',
      'gross revenue','total sales value','total revenue',
      'billing amount','invoice amount','sales total'
    ]
  },

  discountPct: {
    key: 'discountPct', label: 'Discount %', group: 'financial', dataType: 'percentage', required: false,
    synonyms: [
      'discount pct','discount %','discount','disc pct','disc %',
      'markdown','markdown %','markdown pct','reduction %',
      'off %','off pct','promotional discount','promo discount',
      'clearance %','sale %','offer %','rebate %'
    ]
  },

  costPrice: {
    key: 'costPrice', label: 'Cost Price', group: 'financial', dataType: 'decimal', required: false,
    synonyms: [
      'cost price','cost','cogs','cost of goods sold',
      'landed cost','landed price','buy price','purchase price',
      'procurement cost','unit cost','per unit cost',
      'factory price','ex factory','fob price','standard cost'
    ]
  },

  // ── PERFORMANCE ────────────────────────────────────────────────────────────
  saleThruPct: {
    key: 'saleThruPct', label: 'Sale Thru %', group: 'performance', dataType: 'percentage', required: false,
    synonyms: [
      'sale thru %','sale thru','sell thru %','sell thru',
      'sell-thru','sell through','sell-through','st %','st',
      'salethru','sellthru','sale thru pct','sell thru pct',
      'sell through %','sell through pct','throughput %',
      'depletion %','offtake %','turnover rate'
    ]
  },

  // ── ORGANIZATION ───────────────────────────────────────────────────────────
  asm: {
    key: 'asm', label: 'ASM', group: 'organization', dataType: 'string', required: false,
    synonyms: [
      'asm','area sales manager','area manager','regional manager',
      'rsm','regional sales manager','territory manager','tm',
      'sales manager','sm','key account manager','kam',
      'zonal manager','zm','cluster manager','cm',
      'business manager','bm','store owner','franchisee'
    ]
  },

  region: {
    key: 'region', label: 'Region', group: 'organization', dataType: 'string', required: false,
    synonyms: [
      'region','region name','regional area','area',
      'territory','zone name','sales zone',
      'sales territory','geo','geography','geographic area',
      'cluster','cluster name'
    ]
  },

  zone: {
    key: 'zone', label: 'Zone', group: 'organization', dataType: 'string', required: false,
    synonyms: ['zone','zone code','sub region','sub zone','zonal area','sales cluster']
  },

  storeGrade: {
    key: 'storeGrade', label: 'Store Grade', group: 'organization', dataType: 'string', required: false,
    synonyms: [
      'store grade','grade','tier','store tier','store class',
      'store classification','abc classification','store category',
      'store type','format','store format'
    ]
  },

  storeManager: {
    key: 'storeManager', label: 'Store Manager', group: 'organization', dataType: 'string', required: false,
    synonyms: [
      'store manager','sm','store head','store in charge','store owner',
      'manager name','branch manager','outlet manager'
    ]
  },

  // ── TIME / PERIOD ──────────────────────────────────────────────────────────
  weekNumber: {
    key: 'weekNumber', label: 'Week Number', group: 'time', dataType: 'integer', required: false,
    synonyms: ['week number','week no','week','wk','wk no','fiscal week','iso week']
  },

  periodLabel: {
    key: 'periodLabel', label: 'Period Label', group: 'time', dataType: 'string', required: false,
    synonyms: [
      'period label','period','period name','month','month name',
      'fiscal period','accounting period','quarter','fiscal quarter'
    ]
  },

  daysInPeriod: {
    key: 'daysInPeriod', label: 'Days In Period', group: 'time', dataType: 'integer', required: false,
    synonyms: ['days in period','days','period days','trading days','selling days','business days']
  },
};

/**
 * Ordered list of field keys. Fields listed earlier take priority
 * when resolving ambiguous column matches.
 */
export const FIELD_PRIORITY_ORDER = [
  'articleNo','locationName','colorName','sectionName','subSectionName','category',
  'description','fabric','brand','season','gender','styleCode','size','barcode',
  'obsQty','cbsQty','netSlsQty','gitQty','saleThruPct',
  'groupPurQty','groupPrtQty','deliveryChallanQty','groupWslQty',
  'returnQty','transferInQty','transferOutQty','damagedQty',
  'mrp','asp','netSalesValue','discountPct','costPrice',
  'asm','region','zone','storeGrade','storeManager',
  'weekNumber','periodLabel','daysInPeriod'
];

/** Fields that are critical — if none resolve, reject the file */
export const CRITICAL_FIELDS = ['articleNo'];

/** Fields that make entity resolution unique */
export const IDENTITY_FIELDS = ['locationName','articleNo','colorName'];

export default CANONICAL_FIELDS;
