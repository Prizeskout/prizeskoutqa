import pg from "pg";

const { Client } = pg;
const client = new Client({
  connectionString: "postgresql://postgres.itfhekcvmcbntjndvhzg:bEnABIcvtD2KSlpw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres",
});
await client.connect();

const users = [
  "c5425fde-06c2-466c-8fab-7d3fce391c95", // ikedichiegwu@gmail.com
  "bed12406-2798-47f7-a30c-5de559e90d6d", // dvdegwu@gmail.com
];

for (const uid of users) {
  const { rows: check } = await client.query(
    `SELECT
      (SELECT COUNT(*) FROM public.overview_metrics  WHERE user_id = $1) AS overview,
      (SELECT COUNT(*) FROM public.competitor_metrics WHERE user_id = $1) AS competitor,
      (SELECT COUNT(*) FROM public.pricing_metrics   WHERE user_id = $1) AS pricing,
      (SELECT COUNT(*) FROM public.pricing_recommendations WHERE user_id = $1) AS recs`,
    [uid],
  );
  console.log(`${uid} existing:`, check[0]);

  if (Number(check[0].overview) === 0) {
    await client.query(
      `INSERT INTO public.overview_metrics (user_id,slug,label,value,value_color,footer_text,footer_color,position) VALUES
       ($1,'products_tracked','Products tracked','2,847','#1A1A18','+12% vs last month','#22C55E',0),
       ($1,'price_position','Price position','3rd / 6','#1A1A18','Rank improved by 1','#22C55E',1),
       ($1,'active_alerts','Active alerts today','14','#EA580C','3 require action','#6B6B6B',2),
       ($1,'est_savings','Estimated monthly savings','QAR 48K','#22C55E','+3.2% vs last month','#22C55E',3)`,
      [uid],
    );
    await client.query(
      `INSERT INTO public.overview_alerts (user_id,alert_type,channel,message,severity,occurred_at) VALUES
       ($1,'price','online','Carrefour dropped Sony WH-1000XM5 to QAR 1,149 (-4.2%)','action',now()-interval '2 minutes'),
       ($1,'stock','online','Lulu out of stock on Samsung Galaxy S24 Ultra. Estimated restock: 3-4 days.','opportunity',now()-interval '18 minutes'),
       ($1,'pattern','online','Talabat Eid sale detected. Matches their annual pattern. Confidence: 92%.','intel',now()-interval '1 hour'),
       ($1,'price','in-store','Carrefour Doha Festival City raised iPhone 15 Pro price by QAR 100 in-store.','intel',now()-interval '2 hours'),
       ($1,'insight','online','Your avg price response time improved to 4.2 hrs. Market average is 8.1 hrs.','intel',now()-interval '5 hours'),
       ($1,'promo','in-store','Lulu Hypermarket Lusail running 20% off on home appliances in-store only.','opportunity',now()-interval '6 hours')`,
      [uid],
    );
    await client.query(
      `INSERT INTO public.overview_channels (user_id,label,amount,share_text,percent,color,position) VALUES
       ($1,'Online','QAR 1.2M','68% of total',68,'#3B82F6',0),
       ($1,'In-Store','QAR 480K','27% of total',27,'#7C3AED',1),
       ($1,'Marketplace','QAR 89K','5% of total',5,'#EA580C',2)`,
      [uid],
    );
    await client.query(
      `INSERT INTO public.overview_quick_actions (user_id,icon,title,description,link_text,position) VALUES
       ($1,'crosshair','Price alerts need action','3 competitors have undercut your prices on tracked products.','View competitors',0),
       ($1,'trending-up','5 pricing recommendations','AI has identified 5 products where price adjustments could improve margins.','Review pricing',1),
       ($1,'map-pin','Field intel pending review','4 new price observations submitted by your field team today.','Review submissions',2)`,
      [uid],
    );
    console.log("  ✓ overview seeded");
  }

  if (Number(check[0].pricing) === 0) {
    await client.query(
      `INSERT INTO public.pricing_metrics (user_id,slug,label,value,value_color,footer_text,footer_color,position) VALUES
       ($1,'active_recs','Active recommendations','5','#1A1A18','across all categories','#6B6B6B',0),
       ($1,'monthly_impact','Total monthly impact','+QAR 71K','#22C55E','if all applied','#6B6B6B',1),
       ($1,'avg_confidence','Avg confidence score','89%','#EA580C','across recommendations','#6B6B6B',2),
       ($1,'model_maturity','Model maturity','11 months','#3B82F6','trained on your data','#6B6B6B',3)`,
      [uid],
    );
    console.log("  ✓ pricing metrics seeded");
  }

  if (Number(check[0].recs) === 0) {
    await client.query(
      `INSERT INTO public.pricing_recommendations (user_id,product,category,channel,current_price,recommended_price,reason,unit_impact,margin_impact,net_monthly,confidence,position) VALUES
       ($1,'Sony WH-1000XM5 Headphones','Electronics','Online',1299,1199,'You are 8% above market average. Carrefour and Amazon are both at 1,199. Price sensitivity is high in this bracket. Lowering to match captures an estimated 340 additional units per month without triggering a price war.','+12%','-2.1%','+QAR 18K',87,0),
       ($1,'Apple MacBook Air M3 256GB','Electronics','Online',4499,4599,'Carrefour is currently out of stock on this product. Amazon has it at 4,299 but with 5-7 day delivery vs your same-day option. Our elasticity model confirms low sensitivity at this price point.','-3%','+2.8%','+QAR 31K',91,1),
       ($1,'Ariel Detergent 3kg','Grocery','Online',42,39.9,'Grocery buyers are extremely price-sensitive. Carrefour is at 38.5 and Lulu at 39.9. At 39.9 you match Lulu and stay above Carrefour while retaining your delivery advantage.','+18%','-5%','+QAR 8K',94,2),
       ($1,'Dyson V15 Detect Vacuum','Home','Online',2799,2699,'All five competitors are priced below you. Lulu is temporarily out of stock — there is a short window to capture customers. Recommend moving now and reviewing after Lulu restocks.','+8%','-1.2%','+QAR 14K',82,3),
       ($1,'Samsung Galaxy S24 Ultra (In-Store)','Electronics','In-Store',3999,3899,'Your in-store price is QAR 100 higher than your own online price. Customers comparing on their phones in your store are seeing this gap. Carrefour in-store at Doha Festival City is at 3,849.','+5%','-0.8%','+QAR 6K',88,4)`,
      [uid],
    );
    console.log("  ✓ pricing recommendations seeded");
  }

  if (Number(check[0].competitor) === 0) {
    await client.query(
      `INSERT INTO public.competitor_metrics (user_id,slug,label,value,value_color,footer_text,footer_color,position) VALUES
       ($1,'products_monitored','Products monitored','2,847','#1A1A18','across 6 competitors','#6B6B6B',0),
       ($1,'cheapest_on','You are cheapest on','38%','#22C55E','of overlapping products','#6B6B6B',1),
       ($1,'undercut_by','Undercut by competitors','27%','#EF4444','of your catalog','#6B6B6B',2),
       ($1,'avg_price_gap','Avg price gap','-4.3%','#F59E0B','vs market average','#6B6B6B',3)`,
      [uid],
    );
    await client.query(
      `INSERT INTO public.competitor_prices (user_id,product,category,channel,your_price,talabat,carrefour,lulu,amazon,noon,signal,position) VALUES
       ($1,'Samsung Galaxy S24 Ultra 256GB','Electronics','online',3899,'3949','3799','3849','3699','3749','HOLD',0),
       ($1,'Sony WH-1000XM5 Headphones','Electronics','online',1299,'1349','1199','1249','1149','1199','LOWER',1),
       ($1,'Apple MacBook Air M3 256GB','Electronics','online',4499,'4599','4449','{"price":4399,"outOfStock":true}','4299','4349','RAISE',2),
       ($1,'Nike Air Max 90 Men','Fashion','online',549,'579','null','null','499','519','HOLD',3),
       ($1,'Dyson V15 Detect Vacuum','Home','online',2799,'2849','2699','2749','2599','2649','LOWER',4),
       ($1,'Al Rawabi Fresh Milk 2L','Grocery','online',8.5,'8.75','7.95','8.25','null','null','HOLD',5),
       ($1,'Ariel Detergent 3kg','Grocery','online',42,'44','38.5','39.9','41','40.5','LOWER',6),
       ($1,'iPad Air M2 11-inch 128GB','Electronics','online',2699,'2749','2649','2599','2549','2599','LOWER',7),
       ($1,'Samsung Galaxy S24 Ultra 256GB','Electronics','in-store',3999,'null','3849','3899','null','null','WATCH',8),
       ($1,'Dyson V15 Detect Vacuum','Home','in-store',2899,'null','2749','2799','null','null','LOWER',9),
       ($1,'The Ordinary Niacinamide Serum','Beauty','online',45,'42','null','39.9','38','41','LOWER',10),
       ($1,'Nespresso Vertuo Pop Machine','Home','in-store',479,'null','449','459','null','null','LOWER',11)`,
      [uid],
    );
    await client.query(
      `INSERT INTO public.competitor_price_history (user_id,product,month_label,position,you,talabat,carrefour,amazon) VALUES
       ($1,'Sony WH-1000XM5','Nov',0,1349,1399,1299,1249),
       ($1,'Sony WH-1000XM5','Dec',1,1299,1349,1249,1199),
       ($1,'Sony WH-1000XM5','Jan',2,1299,1299,1199,1149),
       ($1,'Sony WH-1000XM5','Feb',3,1299,1349,1199,1149),
       ($1,'Sony WH-1000XM5','Mar',4,1299,1349,1199,1149),
       ($1,'Sony WH-1000XM5','Apr',5,1299,1349,1199,1149)`,
      [uid],
    );
    await client.query(
      `INSERT INTO public.behavior_patterns (user_id,competitor,channel,category,detection_period,confidence,pattern,depth,evidence,recommendation,impact,position) VALUES
       ($1,'Carrefour','Both','Electronics','14 months of data',94,'Drops electronics prices every 3rd Thursday of the month by 8 to 12%','8-12%','[{"date":"Nov 16, 2025","description":"Electronics category dropped 9.2% across 47 products"},{"date":"Jan 18, 2026","description":"Electronics dropped 8.7% across 44 products"}]','Hold your electronics promotions until the Friday after Carrefour''s Thursday drop. Capture the residual demand at a better margin.','+QAR 14K monthly from better promotion timing',0),
       ($1,'Talabat','Online','Grocery','11 months of data',89,'Runs flash grocery discounts every Sunday between 6pm and 9pm','10-15%','[{"date":"Jan 5, 2026","description":"Grocery flash sale 6:02pm to 8:58pm, avg discount 12.4%"},{"date":"Jan 12, 2026","description":"Grocery flash sale 6:10pm to 9:05pm, avg discount 11.8%"}]','Schedule your grocery push for Monday morning. Talabat buyers have already purchased; Monday has low competition.','+QAR 8K monthly from shifted grocery promotion timing',1),
       ($1,'Amazon.ae','Online','Electronics','9 months of data',91,'Raises prices 5 to 8 days before a major sale, then discounts back to the original price','Perceived 20-30% discount, actual 3-5%','[{"date":"Nov 17, 2025","description":"Avg electronics price raised 18% across 230 products"},{"date":"Nov 25, 2025","description":"Black Friday sale launched with up to 25% off, net price 2.8% below pre-inflation"}]','Do not react to Amazon pre-sale price hikes. Hold your prices steady — when their sale launches your prices are already competitive without any margin sacrifice.','Prevents unnecessary margin erosion of 3-5%',2),
       ($1,'Lulu','In-Store','Electronics, Home','8 months of data',87,'Stocks out on premium electronics and home appliances 2 to 3 days before weekend',null,'[{"date":"Dec 18, 2025","description":"Dyson, Samsung premium range out of stock at Lusail by Wednesday"},{"date":"Jan 15, 2026","description":"Apple accessories, Dyson out of stock at Al Gharafa by Thursday"}]','Push premium electronics ads Thursday evening near Lulu locations. Their stock gaps are your conversion opportunity.','+QAR 11K monthly from capturing Lulu stock gap demand',3)`,
      [uid],
    );
    console.log("  ✓ competitor data seeded");
  }
}

await client.end();
console.log("Done.");
