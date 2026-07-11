export const SCENARIO_STORAGE_KEY = (id: string) => `ps_overrides_${id}`;
export const SCENARIO_DECISION_KEY = (id: string) => `ps_decisions_${id}`;

export type CompetitorPrice = {
  name: string;
  price: number | null;
  outOfStock?: boolean;
  signal: "lower" | "higher" | "match";
};

export type ScenarioRecommendation = {
  id: string;
  productSku: string;
  product: string;
  category: string;
  channel: "Online" | "In-Store";
  currentPrice: number;
  recommendedPrice: number;
  direction: "lower" | "raise";
  headline: string;
  reason: string;
  detailedAnalysis: string;
  unitImpact: string;
  marginImpact: string;
  netMonthly: string;
  confidence: number;
  competitorPrices: CompetitorPrice[];
};

export type DemoProduct = {
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  imageEmoji: string;
  description: string;
};

export type ScenarioInsight = {
  headline: string;
  bullets: string[];
  actions: Array<{ title: string; detail: string }>;
};

export type LoyaltySegment = {
  name: string;
  icon: string;
  count: number;
  share: string;
  trend: "up" | "down" | "flat";
  trendPct: string;
  color: string;
  tagline: string;
  action: string;
};

export type ScenarioPromotion = {
  id: string;
  type: "competitor" | "opportunity" | "active";
  title: string;
  detail: string;
  urgency: "high" | "medium" | "low";
  daysLeft?: number;
};

export type MarketSignal = {
  label: string;
  value: string;
  delta: string;
  direction: "up" | "down" | "flat";
  note: string;
};

export type DemoScenario = {
  id: string;
  name: string;
  tagline: string;
  platform: string;
  platformColor: string;
  category: string;
  primaryColor: string;
  headerBg: string;
  position: number;
  products: DemoProduct[];
  recommendations: ScenarioRecommendation[];
  insight: ScenarioInsight;
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "kiddo-kart",
    name: "KiddoKart",
    tagline: "Baby & Kids Essentials",
    platform: "Shopify",
    platformColor: "#96BF48",
    category: "Baby Products",
    primaryColor: "#F472B6",
    headerBg: "linear-gradient(135deg, #FECDD3 0%, #BBF7D0 100%)",
    position: 0,
    products: [
      { sku: "PAM-S3-44", name: "Pampers Premium Care Newborn S3 (44ct)", category: "Diapers", basePrice: 65, imageEmoji: "👶", description: "Ultra-soft diapers with skin-friendly layers, up to 12h dryness." },
      { sku: "APT-CF-S1-800", name: "Aptamil Comfort Stage 1 (800g)", category: "Formula", basePrice: 89, imageEmoji: "🍼", description: "Specially formulated to help comfort mild digestive discomfort." },
      { sku: "GRACO-M2G", name: "Graco Modes2Grow Travel System", category: "Strollers", basePrice: 1299, imageEmoji: "🛒", description: "10 riding options from infant to toddler, reversible seat." },
      { sku: "AVENT-NTR-4PK", name: "Philips Avent Natural 4-Pack Bottles", category: "Feeding", basePrice: 149, imageEmoji: "🧴", description: "Natural latch bottle set, BPA-free, anti-colic system." },
      { sku: "BE-NGYM", name: "Baby Einstein Neighborhood Gym", category: "Toys", basePrice: 249, imageEmoji: "🎠", description: "Sensory play gym with lights, music, and 5 activities." },
      { sku: "MUS-GEL-500", name: "Mustela Bébé Cleansing Gel 500ml", category: "Skincare", basePrice: 85, imageEmoji: "🧼", description: "Dermatologist-tested, ultra-gentle tear-free formula." },
      { sku: "NUNA-PIPA-CSR", name: "Nuna PIPA Infant Car Seat", category: "Safety", basePrice: 1799, imageEmoji: "🪑", description: "Lightweight carrier, ISOFIX-compatible base, FAA approved." },
      { sku: "INF-SENS-5PK", name: "Infantino Senso Rainbow Balls 5pk", category: "Toys", basePrice: 55, imageEmoji: "🌈", description: "Textured sensory balls for tactile development, birth+." },
    ],
    recommendations: [
      {
        id: "kk-rec-001",
        productSku: "PAM-S3-44",
        product: "Pampers Premium Care Newborn S3 (44ct)",
        category: "Diapers",
        channel: "Online",
        currentPrice: 65,
        recommendedPrice: 58,
        direction: "lower",
        headline: "Drop Pampers S3 to QAR 58 — you are losing 200+ monthly units to BabyShop.",
        reason: "BabyShop Qatar is at QAR 58.50 and Carrefour at QAR 57.90. Diapers are the most price-compared baby SKU. At QAR 65, you are losing repeat purchasers on a high-frequency, high-loyalty product.",
        detailedAnalysis: "Pampers S3 is a weekly or bi-weekly purchase for families with infants. Price sensitivity is extremely high — buyers actively compare across platforms. BabyShop Qatar has held QAR 58.50 for 3 months and Amazon.ae is at QAR 60. At your current QAR 65, you are the most expensive listed option by QAR 4.50 to QAR 7.10. PrizeSkout's elasticity model (calibrated on 8 months of your platform data) estimates you are losing approximately 210 units per month to BabyShop on this SKU alone. Lowering to QAR 58 — within QAR 0.50 of BabyShop — recaptures the price-comparison-led buyers while retaining your same-day delivery advantage, which BabyShop cannot match across all Doha zones.",
        unitImpact: "+18%",
        marginImpact: "-2.8%",
        netMonthly: "+QAR 9,200",
        confidence: 91,
        competitorPrices: [
          { name: "BabyShop Qatar", price: 58.5, signal: "lower" },
          { name: "Carrefour", price: 57.9, signal: "lower" },
          { name: "Amazon.ae", price: 60.0, signal: "lower" },
          { name: "Noon", price: 62.0, signal: "lower" },
          { name: "Lulu Hypermarket", price: 63.5, signal: "lower" },
        ],
      },
      {
        id: "kk-rec-002",
        productSku: "GRACO-M2G",
        product: "Graco Modes2Grow Travel System",
        category: "Strollers",
        channel: "Online",
        currentPrice: 1299,
        recommendedPrice: 1499,
        direction: "raise",
        headline: "Raise Graco stroller to QAR 1,499 — Mothercare and Lulu are both out of stock this week.",
        reason: "The two largest stroller competitors in Qatar are out of stock on this model. You have exclusive availability for an estimated 5-8 days. Your same-day delivery gives you an additional edge over Amazon's 4-7 day lead time.",
        detailedAnalysis: "Mothercare Qatar (KiddoKart's primary stroller competitor) has been out of stock on the Graco Modes2Grow since Monday. Lulu Hypermarket's Lusail and Al Gharafa locations are also showing zero inventory, confirmed by field observation data on Tuesday. Amazon.ae has the unit at QAR 1,449 but with 4-7 day delivery — significantly less compelling for families needing immediate availability. The market average for this model is QAR 1,389 across active listings. By moving to QAR 1,499, you are positioning at a 7.9% premium over the closest active competitor (Amazon) — justified by your same-day delivery and full warranty support in Doha. Once Mothercare restocks (estimated 5-8 days based on their historical restock cadence), reverse this change. PrizeSkout will alert you when their stock returns.",
        unitImpact: "-3%",
        marginImpact: "+15.4%",
        netMonthly: "+QAR 14,600",
        confidence: 84,
        competitorPrices: [
          { name: "Mothercare Qatar", price: null, outOfStock: true, signal: "higher" },
          { name: "Lulu Hypermarket", price: null, outOfStock: true, signal: "higher" },
          { name: "Amazon.ae", price: 1449, signal: "higher" },
          { name: "Noon", price: 1349, signal: "higher" },
          { name: "BabyShop Qatar", price: 1379, signal: "higher" },
        ],
      },
      {
        id: "kk-rec-003",
        productSku: "APT-CF-S1-800",
        product: "Aptamil Comfort Stage 1 (800g)",
        category: "Formula",
        channel: "Online",
        currentPrice: 89,
        recommendedPrice: 82,
        direction: "lower",
        headline: "Lower Aptamil Comfort to QAR 82 — you are the most expensive option by QAR 7.",
        reason: "Amazon.ae has this at QAR 82 and BabyShop at QAR 84. Stage 1 formula is a high-sensitivity, non-deferrable purchase. Families who need it today will pay more, but repeat buyers have already switched to the cheaper source.",
        detailedAnalysis: "Infant formula is among the most price-sensitive product categories in the baby segment — parents compare across every available platform at the moment of need and typically lock in one source for repeat purchasing. Your QAR 89 price point is QAR 7 above Amazon.ae and QAR 5 above BabyShop. Over the past 30 days, search impression data from your platform suggests this product has a 34% add-to-cart rate but only a 19% purchase completion — high abandonment relative to your other baby SKUs, consistent with price comparison. Lowering to QAR 82 matches Amazon exactly and undercuts BabyShop by QAR 2, positioning you as the best price-plus-speed option in Doha. Estimate: recovers approximately 120 lapsed monthly buyers and adds ~85 net new buyers who currently go to Amazon.",
        unitImpact: "+22%",
        marginImpact: "-3.2%",
        netMonthly: "+QAR 7,800",
        confidence: 88,
        competitorPrices: [
          { name: "Amazon.ae", price: 82.0, signal: "lower" },
          { name: "BabyShop Qatar", price: 84.0, signal: "lower" },
          { name: "Carrefour", price: 86.5, signal: "lower" },
          { name: "Noon", price: 91.0, signal: "higher" },
          { name: "Lulu Hypermarket", price: 88.0, signal: "lower" },
        ],
      },
      {
        id: "kk-rec-004",
        productSku: "MUS-GEL-500",
        product: "Mustela Bébé Cleansing Gel 500ml",
        category: "Skincare",
        channel: "Online",
        currentPrice: 85,
        recommendedPrice: 77,
        direction: "lower",
        headline: "Match Carrefour on Mustela Gel at QAR 77 — premium skincare buyers still comparison shop.",
        reason: "Carrefour is at QAR 77.25 and BabyShop at QAR 74.50. Despite being a premium brand, this SKU has 4+ listed competitors all priced below you. It is a regular replenishment item with moderate elasticity.",
        detailedAnalysis: "Mustela is a trusted premium brand in Qatar but is widely distributed, creating direct price competition across platforms. Carrefour runs a recurring promotion on Mustela bringing it to QAR 77.25, now active for 6+ weeks and likely becoming their permanent price point. BabyShop has been at QAR 74.50 for 9 months. At QAR 85, you are 10-15% above active market pricing on a product that does not benefit from delivery urgency (buyers typically purchase skincare in advance). Reducing to QAR 77 — matching Carrefour exactly — captures the segment of buyers who prefer ordering online but will choose Carrefour delivery if the price difference exceeds QAR 5. Keep QAR 2.50 above BabyShop to avoid a race to the bottom; your platform's better UX and loyalty program justify that premium.",
        unitImpact: "+14%",
        marginImpact: "-3.5%",
        netMonthly: "+QAR 3,900",
        confidence: 79,
        competitorPrices: [
          { name: "BabyShop Qatar", price: 74.5, signal: "lower" },
          { name: "Carrefour", price: 77.25, signal: "lower" },
          { name: "Amazon.ae", price: 79.0, signal: "lower" },
          { name: "Noon", price: 82.5, signal: "lower" },
        ],
      },
    ],
    insight: {
      headline: "Three SKU price changes can recover QAR 35,500 in monthly revenue lost to BabyShop and Amazon.",
      bullets: [
        "Pampers S3 at QAR 65 is 11% above BabyShop — you are losing ~210 units/month on the most price-sensitive baby category.",
        "Graco stroller window is open now: Mothercare and Lulu are both out of stock, giving you exclusive availability for an estimated 5-8 days.",
        "Aptamil Comfort Stage 1 shows a 34% add-to-cart but only 19% purchase rate — high abandonment consistent with price comparison loss.",
        "Mustela Gel is priced 10% above Carrefour's sustained promotional price, which now appears to be their permanent price point.",
      ],
      actions: [
        { title: "Act on Graco this week", detail: "The stroller out-of-stock window closes in 5-8 days — raise price and revert when Mothercare restocks." },
        { title: "Match BabyShop on diapers and formula", detail: "Both SKUs have immediate recovery potential; implement together before Tuesday to capture weekend browsing traffic." },
      ],
    },
  },

  {
    id: "techzone-snoonu",
    name: "TechZone",
    tagline: "Electronics on Snoonu",
    platform: "Snoonu",
    platformColor: "#FF5A1F",
    category: "Electronics",
    primaryColor: "#3B82F6",
    headerBg: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)",
    position: 1,
    products: [
      { sku: "APPL-IP16P-128", name: "Apple iPhone 16 Pro 128GB (Natural Titanium)", category: "Smartphones", basePrice: 3999, imageEmoji: "📱", description: "A18 Pro chip, ProMotion display, 48MP main camera." },
      { sku: "SAMS-S25U-256", name: "Samsung Galaxy S25 Ultra 256GB", category: "Smartphones", basePrice: 4299, imageEmoji: "📲", description: "Galaxy AI, Snapdragon 8 Elite, 200MP Zoom camera." },
      { sku: "APPL-MBA-M3-13", name: "Apple MacBook Air M3 13-inch 256GB", category: "Laptops", basePrice: 5499, imageEmoji: "💻", description: "18-hour battery, Liquid Retina display, 8GB unified memory." },
      { sku: "SONY-WH1000XM5", name: "Sony WH-1000XM5 Wireless Headphones", category: "Audio", basePrice: 1299, imageEmoji: "🎧", description: "Industry-leading noise cancellation, 30h battery, foldable." },
      { sku: "APPL-IPADPRO-M4-11", name: "Apple iPad Pro M4 11-inch 256GB", category: "Tablets", basePrice: 4199, imageEmoji: "📒", description: "Ultra Retina XDR, M4 chip, Apple Pencil Pro support." },
      { sku: "SONY-PS5S-D", name: "PlayStation 5 Slim Disc Edition", category: "Gaming", basePrice: 1899, imageEmoji: "🎮", description: "Ultra HD Blu-ray, 1TB SSD, DualSense wireless controller." },
      { sku: "DYSON-V15-DETECT", name: "Dyson V15 Detect Cordless Vacuum", category: "Home Appliances", basePrice: 2799, imageEmoji: "🔌", description: "Laser dust detection, 60-min runtime, HEPA filter." },
      { sku: "DELL-XPS15-I7", name: "Dell XPS 15 Intel Core i7 (16GB/512GB)", category: "Laptops", basePrice: 6499, imageEmoji: "🖥️", description: "OLED touch display, NVIDIA RTX 4060, premium aluminium build." },
    ],
    recommendations: [
      {
        id: "tz-rec-001",
        productSku: "SONY-WH1000XM5",
        product: "Sony WH-1000XM5 Wireless Headphones",
        category: "Audio",
        channel: "Online",
        currentPrice: 1299,
        recommendedPrice: 1199,
        direction: "lower",
        headline: "Lower Sony WH-1000XM5 to QAR 1,199 — Amazon and Carrefour are both at QAR 1,149 to 1,199.",
        reason: "You are 7-12% above the two main competitors on the most popular premium headphone SKU on the platform. Price elasticity in this bracket is high and buyers actively compare before purchasing.",
        detailedAnalysis: "The WH-1000XM5 is the single most searched audio product on your Snoonu store. It is also listed on Amazon.ae (QAR 1,149), Carrefour (QAR 1,199), and Noon (QAR 1,249). Your price of QAR 1,299 is the highest active listing. PrizeSkout's behavioral data shows that 68% of customers who viewed this product in your store in the last 30 days did not purchase — the abandonment rate is 14 percentage points above your audio category average, strongly correlated with price comparison drop-off. Moving to QAR 1,199 matches Carrefour exactly and is QAR 50 above Amazon. Your same-day Snoonu delivery justifies the QAR 50 Amazon premium for Doha buyers who need immediate delivery. This is expected to recover approximately 95 monthly sales currently going to competitors.",
        unitImpact: "+16%",
        marginImpact: "-2.1%",
        netMonthly: "+QAR 18,400",
        confidence: 92,
        competitorPrices: [
          { name: "Amazon.ae", price: 1149, signal: "lower" },
          { name: "Carrefour", price: 1199, signal: "match" },
          { name: "Noon", price: 1249, signal: "lower" },
          { name: "Talabat Mart", price: 1279, signal: "lower" },
          { name: "Lulu Hypermarket", price: 1269, signal: "lower" },
        ],
      },
      {
        id: "tz-rec-002",
        productSku: "APPL-MBA-M3-13",
        product: "Apple MacBook Air M3 13-inch 256GB",
        category: "Laptops",
        channel: "Online",
        currentPrice: 5499,
        recommendedPrice: 5749,
        direction: "raise",
        headline: "Raise MacBook Air M3 to QAR 5,749 — Carrefour is out of stock and Noon is at QAR 5,699.",
        reason: "Carrefour has been out of stock on this model for 11 days. Noon has it at QAR 5,699. You are the only major platform with immediate inventory and you are priced QAR 200 below Noon for no reason.",
        detailedAnalysis: "Carrefour's MacBook Air M3 13-inch has been zero-inventory since 12 days ago — confirmed via daily scrape. Noon has it at QAR 5,699 with standard 2-3 day delivery. Amazon.ae is at QAR 5,499 but 5-7 day shipping from UAE. You are the only Snoonu-category seller with this product in stock and available for same-day delivery in Doha. Your QAR 5,499 is QAR 200 below Noon for a product where you have full availability advantage. Raising to QAR 5,749 puts you QAR 50 above Noon — justified by same-day delivery which is a critical differentiator for a QAR 5,000+ purchase (buyers want to inspect immediately). Expected volume reduction: less than 2 units/month. Expected margin gain per unit: QAR 250. This window is estimated to remain open 7-14 days until Carrefour restocks.",
        unitImpact: "-2%",
        marginImpact: "+4.6%",
        netMonthly: "+QAR 31,250",
        confidence: 87,
        competitorPrices: [
          { name: "Carrefour", price: null, outOfStock: true, signal: "higher" },
          { name: "Amazon.ae", price: 5499, signal: "match" },
          { name: "Noon", price: 5699, signal: "higher" },
          { name: "Lulu Hypermarket", price: null, outOfStock: true, signal: "higher" },
        ],
      },
      {
        id: "tz-rec-003",
        productSku: "DYSON-V15-DETECT",
        product: "Dyson V15 Detect Cordless Vacuum",
        category: "Home Appliances",
        channel: "Online",
        currentPrice: 2799,
        recommendedPrice: 2649,
        direction: "lower",
        headline: "Lower Dyson V15 to QAR 2,649 — all five active competitors are priced below you.",
        reason: "Amazon, Carrefour, Noon, Talabat Mart, and Lulu are all at QAR 2,499 to QAR 2,699. You are the most expensive listing by QAR 100. Home appliances have low delivery urgency — buyers will wait for Amazon if you're significantly higher.",
        detailedAnalysis: "Unlike smartphones or gaming, vacuum cleaners have very low delivery urgency — buyers plan the purchase and will wait 3-5 days for a cheaper Amazon delivery. Your Dyson V15 at QAR 2,799 is priced above every active competitor. Carrefour has it at QAR 2,699, Noon at QAR 2,649, Amazon at QAR 2,499, and Talabat Mart at QAR 2,649. Lulu is temporarily out of stock at Lusail but typically runs QAR 2,749. Your Snoonu same-day delivery advantage is less compelling here than for electronics. Moving to QAR 2,649 matches Noon and Talabat Mart exactly — capturing buyers who want quick delivery but will not pay the QAR 100-300 premium over Amazon for same-day service on a home appliance.",
        unitImpact: "+12%",
        marginImpact: "-2.8%",
        netMonthly: "+QAR 14,200",
        confidence: 83,
        competitorPrices: [
          { name: "Amazon.ae", price: 2499, signal: "lower" },
          { name: "Noon", price: 2649, signal: "lower" },
          { name: "Talabat Mart", price: 2649, signal: "lower" },
          { name: "Carrefour", price: 2699, signal: "lower" },
          { name: "Lulu Hypermarket", price: null, outOfStock: true, signal: "lower" },
        ],
      },
      {
        id: "tz-rec-004",
        productSku: "SONY-PS5S-D",
        product: "PlayStation 5 Slim Disc Edition",
        category: "Gaming",
        channel: "Online",
        currentPrice: 1899,
        recommendedPrice: 1999,
        direction: "raise",
        headline: "Raise PS5 Slim to QAR 1,999 — supply is tight region-wide and you are priced below market.",
        reason: "Noon and Talabat Mart have both sold out. Amazon.ae is at QAR 1,999 with 7-10 day shipping. You are the only platform with immediate availability in Doha at QAR 1,899 — a QAR 100 undercharge given your availability advantage.",
        detailedAnalysis: "The PlayStation 5 Slim remains in constrained supply across the GCC. Noon Qatar has been out of stock for 19 days. Talabat Mart sold out 6 days ago. Amazon.ae has inventory but at QAR 1,999 with 7-10 day delivery from UAE. Carrefour has units at QAR 1,999 in-store but their Doha locations report limited availability with waitlists at the Al Gharafa and Lusail branches. You are effectively the only online-order + same-day-delivery option in Doha for this product, priced at QAR 1,899. Raising to QAR 1,999 matches Amazon's online price and Carrefour's in-store price — fully justified by your exclusive delivery advantage. Expected: zero volume impact. Buyers who need it same-day have no other online option at this price.",
        unitImpact: "0%",
        marginImpact: "+5.3%",
        netMonthly: "+QAR 11,900",
        confidence: 90,
        competitorPrices: [
          { name: "Noon", price: null, outOfStock: true, signal: "higher" },
          { name: "Talabat Mart", price: null, outOfStock: true, signal: "higher" },
          { name: "Amazon.ae", price: 1999, signal: "higher" },
          { name: "Carrefour (in-store)", price: 1999, signal: "higher" },
        ],
      },
    ],
    insight: {
      headline: "Four pricing moves can add QAR 75,750 in monthly revenue — two require acting this week before competitors restock.",
      bullets: [
        "Sony WH-1000XM5 is the most abandoned audio product on the platform — 68% of views don't convert, 14 points above category average, strongly correlated with Amazon's QAR 1,149 price.",
        "MacBook Air M3 window: Carrefour has been out of stock 12 days. You are the only same-day Doha option. Current QAR 5,499 is QAR 200 below Noon for no reason.",
        "PS5 Slim: Noon and Talabat Mart are both sold out. You have exclusive same-day availability and are priced QAR 100 below Amazon with zero delivery advantage to offer Amazon.",
        "Dyson V15 is your only active listing where all five competitors price below you — home appliances don't benefit from delivery urgency, so price parity matters more here.",
      ],
      actions: [
        { title: "Raise MacBook and PS5 today", detail: "Both have exclusive availability windows that close in 7-19 days — act before competitors restock." },
        { title: "Lower Sony headphones to QAR 1,199", detail: "Matches Carrefour, recovers an estimated 95 monthly lost sales with only 2.1% margin cost." },
      ],
    },
  },

  {
    id: "moda-qatar-snoonu",
    name: "ModaQatar",
    tagline: "Fashion on Snoonu",
    platform: "Snoonu",
    platformColor: "#FF5A1F",
    category: "Fashion",
    primaryColor: "#7C3AED",
    headerBg: "linear-gradient(135deg, #1C1027 0%, #3B1F5E 100%)",
    position: 2,
    products: [
      { sku: "ZARA-LIN-SHIRT-M-L", name: "Zara Linen Blend Shirt Men's Large", category: "Men's Clothing", basePrice: 249, imageEmoji: "👔", description: "Relaxed fit, 55% linen, 45% cotton, breathable summer wear." },
      { sku: "HM-MIDI-DRESS-W-M", name: "H&M Wrap Midi Dress Women's M", category: "Women's Clothing", basePrice: 199, imageEmoji: "👗", description: "Floral print, V-neck wrap design, falls below the knee." },
      { sku: "NIKE-AM90-M-43", name: "Nike Air Max 90 Men's Size 43", category: "Footwear", basePrice: 549, imageEmoji: "👟", description: "Iconic Air cushioning, leather and mesh upper, remastered sole." },
      { sku: "ADIDAS-UB22-W-40", name: "Adidas Ultraboost 22 Women's Size 40", category: "Footwear", basePrice: 649, imageEmoji: "🥿", description: "BOOST midsole, Primeknit upper, Torsion System, carbon-neutral." },
      { sku: "MANGO-EMB-ABAYA-M", name: "Mango Embroidered Occasion Abaya M", category: "Abayas", basePrice: 399, imageEmoji: "✨", description: "Floral embroidery at hem and sleeves, open-front design." },
      { sku: "RL-POLO-M-L", name: "Ralph Lauren Polo Shirt Men's Large (White)", category: "Men's Clothing", basePrice: 349, imageEmoji: "🏅", description: "Classic mesh polo, embroidered pony, ribbed collar and cuffs." },
      { sku: "GUESS-BAG-TOTE", name: "Guess Varsity Logo Tote Bag (Black)", category: "Accessories", basePrice: 459, imageEmoji: "👜", description: "Eco PU, gold logo hardware, interior zip pocket, magnetic closure." },
      { sku: "TOMMY-BELT-M", name: "Tommy Hilfiger Classic Web Belt Men's", category: "Accessories", basePrice: 149, imageEmoji: "🔗", description: "Fabric webbing with logo buckle, 35mm width, adjustable." },
    ],
    recommendations: [
      {
        id: "mq-rec-001",
        productSku: "NIKE-AM90-M-43",
        product: "Nike Air Max 90 Men's Size 43",
        category: "Footwear",
        channel: "Online",
        currentPrice: 549,
        recommendedPrice: 499,
        direction: "lower",
        headline: "Lower Nike Air Max 90 to QAR 499 — you are QAR 50 above Amazon and losing the size-run buyer.",
        reason: "Amazon.ae has the same size at QAR 499 with 3-5 day delivery. Your Snoonu same-day advantage is less compelling for shoes — buyers often size up/down and prefer to compare prices before committing.",
        detailedAnalysis: "The Nike Air Max 90 is a heritage model with stable, predictable demand. Unlike trending sneakers, buyers research and compare. Amazon.ae consistently prices this at QAR 499 for standard sizes. SHEIN (via cross-border) has a different variant at QAR 289 which is not a direct substitute for authenticity-conscious buyers. Namshi has it at QAR 529. At QAR 549, you are the second-most expensive option among authenticated sellers. Fashion footwear has lower delivery urgency than electronics — a customer who wants Air Max 90s in size 43 will wait 3-5 days to save QAR 50. Dropping to QAR 499 matches Amazon and undercuts Namshi by QAR 30. Your Snoonu same-day delivery adds value for buyers who need the size-specific stock immediately — preserving conversion on urgent purchases while removing the price barrier for planners.",
        unitImpact: "+19%",
        marginImpact: "-3.1%",
        netMonthly: "+QAR 8,700",
        confidence: 85,
        competitorPrices: [
          { name: "Amazon.ae", price: 499, signal: "lower" },
          { name: "Namshi", price: 529, signal: "lower" },
          { name: "Noon", price: 519, signal: "lower" },
          { name: "Carrefour", price: null, outOfStock: true, signal: "lower" },
        ],
      },
      {
        id: "mq-rec-002",
        productSku: "MANGO-EMB-ABAYA-M",
        product: "Mango Embroidered Occasion Abaya M",
        category: "Abayas",
        channel: "Online",
        currentPrice: 399,
        recommendedPrice: 449,
        direction: "raise",
        headline: "Raise Mango Embroidered Abaya to QAR 449 — it is sold out at Mango.com Qatar and Via Modas.",
        reason: "Mango's own Qatar website shows this abaya as sold out in size M. Via Modas (next closest competitor) has it at QAR 469 with 2-3 day shipping. You have the only same-day option and are priced QAR 70 below Via Modas.",
        detailedAnalysis: "Mango's own direct Qatar website has sold out of this embroidered abaya in medium — the highest-demand size. Via Modas, the main regional fashion reseller, has it at QAR 469. You are positioned at QAR 399, which is QAR 70 below Via Modas and QAR 70 below the nearest restock option. For an occasion abaya, buyers often need it for a specific event and cannot wait for restocks. Your Snoonu same-day delivery is a genuine differentiator here — this is exactly the use case that justifies a premium. Raising to QAR 449 keeps you QAR 20 below Via Modas (maintaining a clear price advantage) while capturing QAR 50 of the QAR 70 available market premium. No volume impact is expected — availability is the constraint, not price.",
        unitImpact: "-1%",
        marginImpact: "+12.5%",
        netMonthly: "+QAR 9,500",
        confidence: 88,
        competitorPrices: [
          { name: "Mango Qatar (own site)", price: null, outOfStock: true, signal: "higher" },
          { name: "Via Modas", price: 469, signal: "higher" },
          { name: "Namshi", price: 459, signal: "higher" },
          { name: "Amazon.ae Fashion", price: null, outOfStock: true, signal: "higher" },
        ],
      },
      {
        id: "mq-rec-003",
        productSku: "RL-POLO-M-L",
        product: "Ralph Lauren Polo Shirt Men's Large (White)",
        category: "Men's Clothing",
        channel: "Online",
        currentPrice: 349,
        recommendedPrice: 299,
        direction: "lower",
        headline: "Lower Ralph Lauren Polo to QAR 299 — the same shirt is QAR 289 on Namshi with loyalty points.",
        reason: "Namshi prices this at QAR 289 and runs a loyalty program that effectively makes it QAR 260 for returning buyers. You are at QAR 349 with no structural reason for the premium on a widely-distributed brand.",
        detailedAnalysis: "Ralph Lauren Classic Mesh Polo (white, large) is among the most-searched fashion items on your Snoonu store. Namshi Qatar lists it at QAR 289 with additional Smart Points on purchases (effective loyalty discount of 7-10% for returning customers). Amazon.ae has it at QAR 319. Your QAR 349 price is QAR 60 above Namshi and QAR 30 above Amazon. Ralph Lauren products are not perceived as exclusive or urgency-driven on Snoonu — buyers compare. Your platform's same-day delivery advantage is partially offset by Namshi's loyalty program economics. Reducing to QAR 299 — QAR 10 above Namshi — preserves a small premium for your speed advantage while removing the large price gap that is driving abandonment. Expected unit gain: 28% based on elasticity calibration of your men's fashion segment.",
        unitImpact: "+28%",
        marginImpact: "-2.4%",
        netMonthly: "+QAR 6,300",
        confidence: 81,
        competitorPrices: [
          { name: "Namshi", price: 289, signal: "lower" },
          { name: "Amazon.ae", price: 319, signal: "lower" },
          { name: "Noon", price: 339, signal: "lower" },
          { name: "Carrefour", price: null, outOfStock: true, signal: "lower" },
        ],
      },
    ],
    insight: {
      headline: "Fashion pricing is opportunity-driven — two out-of-stock windows open right now for margin capture.",
      bullets: [
        "Mango Embroidered Abaya is sold out on Mango.com Qatar and Via Modas in size M — you have exclusive same-day availability and are QAR 70 below the next available option.",
        "Nike Air Max 90 size 43 shows the classic fashion footwear pattern: buyers compare, Amazon is QAR 50 cheaper, and delivery urgency is low — a price gap that drives abandonment.",
        "Ralph Lauren Polo has a 34% add-to-cart abandonment rate in men's — correlated with a QAR 60 Namshi gap that exceeds most buyers' same-day premium threshold.",
        "Adidas Ultraboost 22 women's holds well at QAR 649 — the only footwear SKU where you are at or below market average on all active competitors.",
      ],
      actions: [
        { title: "Raise abaya price this morning", detail: "Mango out-of-stock window is active now — QAR 50 additional margin per unit with no volume risk." },
        { title: "Close the Namshi gap on polo and Air Max", detail: "Both have high abandonment directly correlated with competitor price — combined QAR 15K monthly recovery." },
      ],
    },
  },

  {
    id: "freshbasket-talabat",
    name: "FreshBasket",
    tagline: "Grocery & Daily Essentials on Talabat",
    platform: "Talabat",
    platformColor: "#FF6B35",
    category: "Grocery",
    primaryColor: "#16A34A",
    headerBg: "linear-gradient(135deg, #052E16 0%, #14532D 100%)",
    position: 3,
    products: [
      { sku: "RAWABI-MILK-2L", name: "Al Rawabi Fresh Full Fat Milk 2L", category: "Dairy", basePrice: 8.5, imageEmoji: "🥛", description: "Farm-fresh pasteurized full fat milk, 2-day shelf life guarantee." },
      { sku: "ALM-LABNEH-400", name: "Almarai Labneh Cream Cheese 400g", category: "Dairy", basePrice: 12.5, imageEmoji: "🧀", description: "Authentic strained yogurt cheese, ideal for dipping and spreads." },
      { sku: "ANCH-CHED-200", name: "Anchor New Zealand Cheddar 200g", category: "Cheese", basePrice: 18.9, imageEmoji: "🧇", description: "Mature cheddar from New Zealand grass-fed cows, bold flavour." },
      { sku: "ARI-DET-3KG", name: "Ariel Automatic Detergent 3kg", category: "Cleaning", basePrice: 42, imageEmoji: "🫧", description: "Front & top loader formula, removes 100 stains in one wash." },
      { sku: "PEP-CAN-330-6PK", name: "Pepsi Regular 330ml Can (6-pack)", category: "Beverages", basePrice: 19.5, imageEmoji: "🥤", description: "Original Pepsi Cola, chilled on delivery." },
      { sku: "BAR-SPAG-500", name: "Barilla No.5 Spaghetti 500g", category: "Pantry", basePrice: 9.75, imageEmoji: "🍝", description: "Bronze-drawn, durum wheat semolina, cooks in 9 minutes." },
      { sku: "PAMP-TS-52", name: "Pampers Simply Dry Toddler S4 52ct", category: "Baby", basePrice: 58, imageEmoji: "🍼", description: "12-hour dryness protection, gentle on baby's skin." },
      { sku: "NESC-3IN1-30", name: "Nescafé Gold 3-in-1 (30 sticks)", category: "Beverages", basePrice: 44, imageEmoji: "☕", description: "Smooth blend of instant coffee, whitener, and sugar." },
    ],
    recommendations: [
      {
        id: "fb-rec-001",
        productSku: "ARI-DET-3KG",
        product: "Ariel Automatic Detergent 3kg",
        category: "Cleaning",
        channel: "Online",
        currentPrice: 42,
        recommendedPrice: 38.5,
        direction: "lower",
        headline: "Drop Ariel Detergent to QAR 38.50 — Carrefour is at QAR 38.50 and you are losing the bulk buyer.",
        reason: "Carrefour Talabat delivery has this at QAR 38.50. Lulu is at QAR 39.90. Detergent is a commodity purchase — buyers sort by price when adding to the weekly shop. At QAR 42, you are 8.5% above Carrefour on one of the most price-compared FMCG items.",
        detailedAnalysis: "Ariel 3kg is a classic high-frequency, low-loyalty FMCG product. On Talabat, customers typically compare detergent prices when building a weekly grocery order — the add-to-cart decision is made in seconds based on price. Carrefour Talabat delivery is at QAR 38.50, Lulu Talabat is at QAR 39.90, and Talabat Mart is at QAR 41.00. Your QAR 42 price is QAR 3.50 above Carrefour. Grocery basket analysis shows detergent is often an anchor product — buyers who choose your store for detergent also buy 3-6 other items in the same session, averaging QAR 87 basket uplift per detergent purchase. Matching Carrefour at QAR 38.50 is expected to recover 140 weekly detergent units while driving ancillary basket revenue. The margin reduction on the detergent itself is more than offset by the basket effect.",
        unitImpact: "+24%",
        marginImpact: "-4.1%",
        netMonthly: "+QAR 11,200",
        confidence: 93,
        competitorPrices: [
          { name: "Carrefour (Talabat)", price: 38.5, signal: "lower" },
          { name: "Lulu (Talabat)", price: 39.9, signal: "lower" },
          { name: "Talabat Mart", price: 41.0, signal: "lower" },
          { name: "Carrefour Direct", price: 38.5, signal: "lower" },
        ],
      },
      {
        id: "fb-rec-002",
        productSku: "RAWABI-MILK-2L",
        product: "Al Rawabi Fresh Full Fat Milk 2L",
        category: "Dairy",
        channel: "Online",
        currentPrice: 8.5,
        recommendedPrice: 7.95,
        direction: "lower",
        headline: "Match Carrefour on Al Rawabi Milk at QAR 7.95 — it is the most comparison-shopped dairy SKU on Talabat.",
        reason: "Fresh milk is the #1 most price-compared grocery item across all Talabat stores in Doha. Carrefour is at QAR 7.95, Lulu at QAR 8.25. Your QAR 8.50 is the highest price on the platform.",
        detailedAnalysis: "Al Rawabi 2L fresh milk is not just a dairy product — it is effectively a store visit driver on Talabat. Families who subscribe to weekly grocery orders tend to lock in a store based on the price of high-frequency perishables like fresh milk. At QAR 8.50, FreshBasket is the most expensive option for this SKU on Talabat by QAR 0.55 above the nearest competitor. Competitor monitoring shows Carrefour has held QAR 7.95 for 14+ weeks, suggesting a permanent price point. Lulu is at QAR 8.25. Matching Carrefour at QAR 7.95 costs QAR 0.55 per unit but drives basket anchoring worth an estimated QAR 47 in additional weekly spend for repeat milk buyers. The math is strongly positive on a lifetime-value basis.",
        unitImpact: "+31%",
        marginImpact: "-6.5%",
        netMonthly: "+QAR 6,400",
        confidence: 89,
        competitorPrices: [
          { name: "Carrefour (Talabat)", price: 7.95, signal: "lower" },
          { name: "Lulu (Talabat)", price: 8.25, signal: "lower" },
          { name: "Talabat Mart", price: 8.5, signal: "match" },
          { name: "Géant (Talabat)", price: 8.75, signal: "higher" },
        ],
      },
      {
        id: "fb-rec-003",
        productSku: "ALM-LABNEH-400",
        product: "Almarai Labneh Cream Cheese 400g",
        category: "Dairy",
        channel: "Online",
        currentPrice: 12.5,
        recommendedPrice: 11.75,
        direction: "lower",
        headline: "Lower Almarai Labneh to QAR 11.75 — Carrefour is at QAR 11.50 and this is a basket staple.",
        reason: "Labneh is a staple breakfast/dipping item purchased weekly by 60-70% of Qatari households. Carrefour Talabat has it at QAR 11.50. You are QAR 1.00 above — a noticeable gap on a QAR 12 item.",
        detailedAnalysis: "Almarai Labneh 400g has an extremely high purchase frequency in Qatar — consumed at almost every family breakfast and common as a snack accompaniment. Its price is well-known by regular buyers, making QAR 1.00 above Carrefour a visible and felt difference. Lulu Talabat has it at QAR 11.90. Géant is at QAR 12.25, above you. Lowering to QAR 11.75 splits the difference between Lulu (QAR 11.90) and Carrefour (QAR 11.50), positioning you as the second-cheapest option while maintaining a QAR 0.25 premium over the market leader. For a basket-staple item, being within QAR 0.25 of Carrefour removes the psychological pricing barrier (QAR 1.00 is noticeable; QAR 0.25 is not). The basket anchoring effect on weekly repeat buyers is the primary return.",
        unitImpact: "+18%",
        marginImpact: "-3.8%",
        netMonthly: "+QAR 4,900",
        confidence: 87,
        competitorPrices: [
          { name: "Carrefour (Talabat)", price: 11.5, signal: "lower" },
          { name: "Lulu (Talabat)", price: 11.9, signal: "lower" },
          { name: "Géant (Talabat)", price: 12.25, signal: "higher" },
          { name: "Talabat Mart", price: 12.0, signal: "lower" },
        ],
      },
    ],
    insight: {
      headline: "Commodity pricing gaps on three basket-anchor items are costing QAR 22,500 in monthly basket revenue.",
      bullets: [
        "Ariel 3kg detergent is the most price-compared FMCG on Talabat — your QAR 42 is 8.5% above Carrefour's QAR 38.50, and detergent buyers anchor their entire weekly basket to the cheapest store.",
        "Al Rawabi fresh milk is the #1 comparison-shopped grocery SKU on Talabat; you are the highest-priced option at QAR 8.50 on a product that determines which store families order from each week.",
        "Almarai Labneh shows a QAR 1.00 gap vs Carrefour — on a QAR 12 item, that 8% difference is psychologically significant for repeat weekly buyers.",
        "Barilla and Nescafé hold well at current prices — you are at or below market average on both with no recommendation needed.",
      ],
      actions: [
        { title: "Match Carrefour on all three basket staples", detail: "Ariel, Al Rawabi milk, and Almarai Labneh are all price anchors — matching Carrefour on these three drives basket loyalty across QAR 87 average weekly spend." },
        { title: "Track Ariel closely after change", detail: "Ariel has the highest basket multiplier — monitor weekly repeat buyer rate for the 3 weeks post-change to calibrate the full LTV impact." },
      ],
    },
  },

  {
    id: "grandbazaar-shopify",
    name: "Grand Bazaar",
    tagline: "Everything Store — General Merchandise on Shopify",
    platform: "Shopify",
    platformColor: "#96BF48",
    category: "General Merchandise",
    primaryColor: "#F59E0B",
    headerBg: "linear-gradient(135deg, #1C0F00 0%, #4A2500 100%)",
    position: 4,
    products: [
      { sku: "DYSON-AM09-FAN", name: "Dyson AM09 Hot + Cool Fan (White/Silver)", category: "Home Appliances", basePrice: 2199, imageEmoji: "💨", description: "10 airflow settings, sleep timer, no fast-spinning blades." },
      { sku: "NESS-VTP-B-CAP", name: "Nespresso Vertuo Pop Bundle (Black + 30 Capsules)", category: "Coffee", basePrice: 499, imageEmoji: "☕", description: "Centrifusion technology, 5 cup sizes, comes with 30 capsules." },
      { sku: "LEGO-CLS-IDS-11717", name: "LEGO Classic Ideas Set 11717 (1500pcs)", category: "Toys", basePrice: 199, imageEmoji: "🧱", description: "Creative building set with animals, vehicles, and 1500 bricks." },
      { sku: "ORAL-B-IO7-BLK", name: "Oral-B iO Series 7 Electric Toothbrush (Black)", category: "Personal Care", basePrice: 749, imageEmoji: "🦷", description: "Round brush head, 7 smart modes, AI-pressure guidance." },
      { sku: "FILA-DISC-M-43", name: "Fila Disruptor II Premium Men's Size 43", category: "Footwear", basePrice: 389, imageEmoji: "👟", description: "Chunky sole, leather upper, iconic Fila badge, casual-sport hybrid." },
      { sku: "NESC-GOLD-200", name: "Nescafé Gold Blend Instant Coffee 200g", category: "Pantry", basePrice: 44, imageEmoji: "☕", description: "Premium instant coffee with smooth golden taste, 100 servings." },
      { sku: "IKEA-LACK-SIDE", name: "IKEA LACK Side Table (White)", category: "Furniture", basePrice: 89, imageEmoji: "🪑", description: "Minimalist side table, 55x55cm, 45cm height, easy assembly." },
      { sku: "PANA-DENT-EW1411", name: "Panasonic Water Flosser EW1411 (White)", category: "Personal Care", basePrice: 349, imageEmoji: "🦷", description: "Ultrasonic water jet, 5 pressure settings, 600ml tank." },
    ],
    recommendations: [
      {
        id: "gb-rec-001",
        productSku: "ORAL-B-IO7-BLK",
        product: "Oral-B iO Series 7 Electric Toothbrush (Black)",
        category: "Personal Care",
        channel: "Online",
        currentPrice: 749,
        recommendedPrice: 679,
        direction: "lower",
        headline: "Lower Oral-B iO7 to QAR 679 — Amazon has it at QAR 649, Carrefour at QAR 679.",
        reason: "Amazon.ae is at QAR 649 and Carrefour at QAR 679. Your QAR 749 is the highest active price by QAR 70. Personal care tech is researched online before purchase — buyers compare across platforms.",
        detailedAnalysis: "The Oral-B iO Series 7 is a considered purchase in the QAR 600-800 range where price comparison is high. Amazon.ae has been consistently at QAR 649 for 6 weeks. Carrefour Qatar is at QAR 679. Noon is at QAR 699. Your QAR 749 is QAR 100 above Amazon and QAR 70 above Carrefour. There is no structural reason for this premium — all retailers receive stock from the same GCC distributor. Lowering to QAR 679 matches Carrefour exactly and keeps you QAR 30 above Amazon, justifiable by your domestic Shopify store's advantages (Qatari warranty support, local returns, faster resolution). Expected: +22% conversion uplift on this SKU within 2 weeks.",
        unitImpact: "+22%",
        marginImpact: "-2.9%",
        netMonthly: "+QAR 8,400",
        confidence: 86,
        competitorPrices: [
          { name: "Amazon.ae", price: 649, signal: "lower" },
          { name: "Carrefour", price: 679, signal: "lower" },
          { name: "Noon", price: 699, signal: "lower" },
          { name: "Lulu Hypermarket", price: 729, signal: "lower" },
        ],
      },
      {
        id: "gb-rec-002",
        productSku: "NESS-VTP-B-CAP",
        product: "Nespresso Vertuo Pop Bundle (Black + 30 Capsules)",
        category: "Coffee",
        channel: "Online",
        currentPrice: 499,
        recommendedPrice: 459,
        direction: "lower",
        headline: "Match Carrefour's QAR 459 on the Nespresso Vertuo Pop bundle.",
        reason: "Carrefour is running a bundle at QAR 459 (machine + capsules). Your QAR 499 bundle is structured identically. Coffee machine buyers compare aggressively — the capsule ecosystem lock-in means the initial machine sale determines lifetime capsule revenue.",
        detailedAnalysis: "The Nespresso Vertuo Pop is in a strategic pricing position: whoever captures the initial machine sale earns the long-term capsule revenue stream from that customer. Carrefour Qatar is selling the identical bundle (machine + 30 capsules) at QAR 459. At QAR 499, you are QAR 40 more expensive for what appears to be the same offer. Nespresso's own website has the machine at QAR 499 without capsules, making your bundle logically superior in value — but only if you close the price gap with Carrefour. The capsule LTV model means each captured machine sale is worth QAR 200-400 in annual repeat orders. Matching at QAR 459 costs QAR 40 upfront but anchors a multi-year capsule purchasing relationship.",
        unitImpact: "+28%",
        marginImpact: "-1.8%",
        netMonthly: "+QAR 12,600",
        confidence: 90,
        competitorPrices: [
          { name: "Carrefour", price: 459, signal: "lower" },
          { name: "Nespresso Qatar (direct)", price: 499, signal: "match" },
          { name: "Amazon.ae", price: 469, signal: "lower" },
          { name: "Noon", price: 479, signal: "lower" },
        ],
      },
      {
        id: "gb-rec-003",
        productSku: "DYSON-AM09-FAN",
        product: "Dyson AM09 Hot + Cool Fan (White/Silver)",
        category: "Home Appliances",
        channel: "Online",
        currentPrice: 2199,
        recommendedPrice: 2399,
        direction: "raise",
        headline: "Raise Dyson AM09 to QAR 2,399 — Noon and Lulu are out of stock, Amazon is at QAR 2,399.",
        reason: "Noon and Lulu have both depleted stock on this model. Amazon.ae is QAR 2,399 with 5-7 day delivery. You have same-day availability in Doha at QAR 200 below Amazon — an unnecessary discount.",
        detailedAnalysis: "The Dyson AM09 is a seasonal product with a consistent June-August demand spike in Qatar. Noon Qatar sold out 8 days ago and has not restocked. Lulu Hypermarket shows zero inventory in all Doha locations. Amazon.ae has stock at QAR 2,399 with 5-7 day delivery from UAE. You are at QAR 2,199 with same-day delivery — QAR 200 below Amazon for a product where your delivery advantage is maximized by the seasonal urgency. Families replacing air conditioning supplements want the unit same-day. Raising to QAR 2,399 matches Amazon and captures the same-day premium buyers are demonstrably willing to pay. This window is expected to persist through July.",
        unitImpact: "-1%",
        marginImpact: "+9.1%",
        netMonthly: "+QAR 22,800",
        confidence: 88,
        competitorPrices: [
          { name: "Noon", price: null, outOfStock: true, signal: "higher" },
          { name: "Lulu Hypermarket", price: null, outOfStock: true, signal: "higher" },
          { name: "Amazon.ae", price: 2399, signal: "higher" },
          { name: "Carrefour", price: 2249, signal: "higher" },
        ],
      },
    ],
    insight: {
      headline: "Dyson fan out-of-stock window and two underpriced household items represent QAR 43,800 in June-July opportunity.",
      bullets: [
        "Dyson AM09 fan: Noon and Lulu sold out mid-season, Amazon at QAR 2,399, you at QAR 2,199 — you are the only same-day option and undercharging by QAR 200.",
        "Nespresso Vertuo Pop bundle captures LTV from capsule repeat purchasing — losing the machine sale at QAR 499 to Carrefour's QAR 459 costs far more than the unit margin difference.",
        "Oral-B iO7 at QAR 749 is QAR 70 above Carrefour and QAR 100 above Amazon with no structural reason — personal care tech buyers research prices before committing.",
        "LEGO, Fila Disruptor, and Panasonic flosser all hold well — no action needed on these three.",
      ],
      actions: [
        { title: "Raise Dyson AM09 immediately", detail: "Seasonal stock window — Noon and Lulu won't restock until August. Match Amazon at QAR 2,399 today." },
        { title: "Match Carrefour on Nespresso and Oral-B", detail: "QAR 40 + QAR 70 combined gap is preventing conversion on QAR 500-750 considered purchases." },
      ],
    },
  },
];

export function getScenario(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}

export function getScenarioOverrides(scenarioId: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SCENARIO_STORAGE_KEY(scenarioId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function setScenarioOverride(scenarioId: string, sku: string, price: number) {
  if (typeof window === "undefined") return;
  const current = getScenarioOverrides(scenarioId);
  current[sku] = price;
  localStorage.setItem(SCENARIO_STORAGE_KEY(scenarioId), JSON.stringify(current));
}

export function clearScenarioOverride(scenarioId: string, sku: string) {
  if (typeof window === "undefined") return;
  const current = getScenarioOverrides(scenarioId);
  delete current[sku];
  localStorage.setItem(SCENARIO_STORAGE_KEY(scenarioId), JSON.stringify(current));
}

export type ScenarioDecisions = Record<string, "applied" | "dismissed" | "snoozed">;

export function getScenarioDecisions(scenarioId: string): ScenarioDecisions {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SCENARIO_DECISION_KEY(scenarioId));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function setScenarioDecision(
  scenarioId: string,
  recommendationId: string,
  decision: "applied" | "dismissed" | "snoozed",
) {
  if (typeof window === "undefined") return;
  const current = getScenarioDecisions(scenarioId);
  current[recommendationId] = decision;
  localStorage.setItem(SCENARIO_DECISION_KEY(scenarioId), JSON.stringify(current));
}

export function clearScenarioDecision(scenarioId: string, recommendationId: string) {
  if (typeof window === "undefined") return;
  const current = getScenarioDecisions(scenarioId);
  delete current[recommendationId];
  localStorage.setItem(SCENARIO_DECISION_KEY(scenarioId), JSON.stringify(current));
}
