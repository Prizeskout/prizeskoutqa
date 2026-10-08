// Controlled demonstration payload transcribed from PrizeSkout Platform.dc.html.
// It is returned only for a server-marked demo workspace and is never used as live merchant evidence.
export const dashboardV2PlatformDemo = {
  "priority": {
    "kicker": "Priority Centre",
    "title": "6 items need a decision today.",
    "sub": "QAR 41,280 of margin is at stake across them.",
    "cta": "Assign all to owners",
    "q": "margin",
    "kpis": [
      [
        "Critical",
        "2",
        "QAR 13,270 at stake",
        "neg"
      ],
      [
        "Opportunities",
        "3",
        "+QAR 14,320 / month",
        "pos"
      ],
      [
        "Needs review",
        "4",
        "Avg age 1.6 days",
        "warn"
      ],
      [
        "Resolved this week",
        "11",
        "QAR 9,860 recovered",
        "pos"
      ]
    ],
    "panels": [
      {
        "id": "pq",
        "type": "table",
        "title": "Decision queue",
        "sub": "Ranked by money at stake",
        "col": "1 / -1",
        "cols": [
          [
            "Item",
            "2.4fr"
          ],
          [
            "Category",
            "1.2fr",
            "left",
            1
          ],
          [
            "Impact",
            "1fr",
            "right"
          ],
          [
            "Source",
            "1.2fr"
          ],
          [
            "Owner",
            "1fr"
          ],
          [
            "Age",
            ".6fr",
            "right"
          ]
        ],
        "rows": [
          [
            "Talabat settlement discrepancy · 2 branches",
            "Critical",
            "QAR 8,420",
            "TB-3921 · W39",
            "Finance",
            "1d"
          ],
          [
            "Al Sadd refund rate +2.8 pts",
            "Critical",
            "QAR 4,850",
            "Odoo · Talabat",
            "Operations",
            "2d"
          ],
          [
            "Reprice 7 menu items on Talabat",
            "Opportunity",
            "+QAR 6,300/mo",
            "Menu Intelligence",
            "Commercial",
            "3h"
          ],
          [
            "Reduce merchant share on Weekend 25% Off",
            "Opportunity",
            "+QAR 7,200/mo",
            "Promotions",
            "Commercial",
            "1d"
          ],
          [
            "Snoonu unknown deduction QAR 590",
            "Needs review",
            "QAR 590",
            "SN-29401",
            "Finance",
            "2d"
          ],
          [
            "Lunch Combo below 12% margin floor",
            "Needs review",
            "QAR 1,840",
            "Guardrails",
            "Commercial",
            "4h"
          ],
          [
            "Keeta menu out of sync at Lusail",
            "Needs review",
            "QAR 640",
            "AI Store Manager",
            "Operations",
            "1h"
          ],
          [
            "Packaging costs not connected",
            "Needs review",
            "Confidence −2%",
            "Data Confidence",
            "Finance",
            "5d"
          ],
          [
            "Snoonu free-delivery campaign healthy",
            "Opportunity",
            "+QAR 820/mo",
            "Promotions",
            "Commercial",
            "6h"
          ]
        ],
        "filter": 1,
        "action": "Assign & track",
        "foot": "Every item links to its evidence pack. Click a row for details."
      }
    ]
  },
  "store": {
    "kicker": "AI Store Manager",
    "title": "Keeps every branch live, stocked and on time.",
    "sub": "Acts within the rules you set — anything bigger waits for approval.",
    "cta": "Pause agent",
    "q": "keeta",
    "kpis": [
      [
        "Actions today",
        "214",
        "198 automatic · 16 approved",
        ""
      ],
      [
        "Store uptime",
        "99.6%",
        "Across 4 platforms",
        "pos"
      ],
      [
        "Items auto-paused",
        "18",
        "Out of stock in Odoo",
        "warn"
      ],
      [
        "Revenue protected",
        "QAR 3,960",
        "Today, estimated",
        "brand"
      ]
    ],
    "panels": [
      {
        "id": "sf",
        "type": "feed",
        "title": "Live activity",
        "sub": "What the agent did, and why",
        "col": "1 / span 7",
        "feed": [
          [
            "13:42",
            "Paused Mixed Grill Platter on Keeta · Lusail",
            "Odoo stock hit 0 at 12:31; still live on Keeta menu",
            "Done",
            1
          ],
          [
            "13:38",
            "Extended prep time +6 min on Talabat · West Bay",
            "Kitchen load 94% for 8 minutes",
            "Done"
          ],
          [
            "13:21",
            "Requested approval to close Al Sadd on Snoonu",
            "POS heartbeat missing for 4 min",
            "Awaiting approval"
          ],
          [
            "13:05",
            "Resumed Chicken Fatteh on all platforms · The Pearl",
            "Stock restored in Odoo (24 portions)",
            "Done"
          ],
          [
            "12:48",
            "Switched Lusail to busy mode on Talabat",
            "Order queue > 14 with 3 riders waiting",
            "Done"
          ],
          [
            "12:30",
            "Flagged price mismatch: Falafel Wrap",
            "QAR 17 on Talabat vs 19 on Snoonu",
            "Recommended"
          ],
          [
            "11:55",
            "Opened all 12 branches on 4 platforms",
            "Matched Odoo opening hours",
            "Done"
          ]
        ]
      },
      {
        "id": "sg",
        "type": "toggles",
        "title": "Autonomy",
        "sub": "What the agent may do on its own",
        "col": "8 / span 5",
        "toggles": [
          [
            "Pause out-of-stock items everywhere",
            "When Odoo stock reaches 0",
            1,
            "Automatic"
          ],
          [
            "Resume items when stock returns",
            "Within 60 sec of Odoo update",
            1,
            "Automatic"
          ],
          [
            "Busy mode when kitchen load > 90%",
            "Per platform, per branch",
            1,
            "Automatic"
          ],
          [
            "Extend prep time during rush",
            "Max +10 min",
            1,
            "Automatic"
          ],
          [
            "Close a branch on POS outage",
            "Manager must approve",
            1,
            "Needs approval"
          ],
          [
            "Change menu prices",
            "Always routed to Commercial",
            0,
            "Needs approval"
          ]
        ]
      },
      {
        "id": "sp",
        "type": "table",
        "title": "Waiting for approval",
        "sub": "The agent stopped and asked",
        "col": "1 / -1",
        "cols": [
          [
            "Request",
            "2.4fr"
          ],
          [
            "Branch",
            "1fr"
          ],
          [
            "Platform",
            "1fr"
          ],
          [
            "Reason",
            "2fr"
          ],
          [
            "Status",
            "1fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "Close Al Sadd on Snoonu",
            "Al Sadd",
            "Snoonu",
            "POS heartbeat missing 4 min",
            "Pending"
          ],
          [
            "Raise Falafel Wrap to QAR 19",
            "All",
            "Talabat",
            "Channel price mismatch",
            "Pending"
          ],
          [
            "Pause Lunch Combo campaign",
            "Lusail",
            "Keeta",
            "Below 12% margin floor",
            "Pending"
          ]
        ],
        "action": "Approve",
        "foot": "Approvals are logged to the Audit Log with the evidence the agent used."
      }
    ]
  },
  "profit": {
    "kicker": "Intelligence · Profit Intelligence",
    "title": "QAR 795,420 true contribution.",
    "sub": "43.2% of gross sales reaches the business after every cost.",
    "cta": "Export bridge",
    "q": "margin",
    "kpis": [
      [
        "Gross sales",
        "QAR 1.84M",
        "↑ 11.4%",
        "pos"
      ],
      [
        "Net revenue",
        "QAR 1.70M",
        "After promotions & refunds",
        ""
      ],
      [
        "True contribution",
        "QAR 795,420",
        "↑ 8.4%",
        "pos"
      ],
      [
        "Contribution margin",
        "43.2%",
        "↓ 1.2 pts",
        "neg"
      ]
    ],
    "panels": [
      {
        "id": "pb",
        "type": "bars",
        "title": "Profit bridge",
        "sub": "Gross sales to true contribution",
        "col": "1 / span 7",
        "bars": [
          [
            "Gross sales",
            0,
            100,
            "var(--ink-2)",
            "QAR 1.84M",
            600
          ],
          [
            "Commission",
            84.6,
            15.4,
            "var(--neg-bar)",
            "−284K"
          ],
          [
            "Promotions",
            77.8,
            6.8,
            "var(--neg-bar)",
            "−126K"
          ],
          [
            "Platform fees",
            75.5,
            2.3,
            "var(--neg-bar)",
            "−42K"
          ],
          [
            "Refunds",
            74.5,
            1,
            "var(--warn)",
            "−18K"
          ],
          [
            "COGS",
            46.4,
            28.1,
            "var(--cogs, #BDB9B0)",
            "−517K"
          ],
          [
            "Adjustments",
            43.2,
            3.1,
            "var(--warn)",
            "−58K"
          ],
          [
            "True contribution",
            0,
            43.2,
            "var(--brand)",
            "QAR 795K",
            600
          ]
        ]
      },
      {
        "id": "pm",
        "type": "bars",
        "title": "Margin by brand",
        "sub": "Contribution margin",
        "col": "8 / span 5",
        "bars": [
          [
            "Shawarma House",
            0,
            92,
            "var(--brand)",
            "46.1%"
          ],
          [
            "Grill District",
            0,
            84,
            "var(--brand)",
            "42.0%"
          ],
          [
            "Saj & Co",
            0,
            80,
            "var(--brand)",
            "40.3%"
          ],
          [
            "Lemon Mint Café",
            0,
            70,
            "var(--neg-bar)",
            "35.2%"
          ]
        ]
      },
      {
        "id": "pt",
        "type": "table",
        "title": "Contribution by brand",
        "sub": "Last 30 days",
        "col": "1 / -1",
        "cols": [
          [
            "Brand",
            "1.6fr"
          ],
          [
            "Branches",
            ".7fr",
            "right"
          ],
          [
            "Gross sales",
            "1fr",
            "right"
          ],
          [
            "Platform costs",
            "1fr",
            "right"
          ],
          [
            "COGS",
            "1fr",
            "right"
          ],
          [
            "Contribution",
            "1fr",
            "right"
          ],
          [
            "Margin",
            ".8fr",
            "right"
          ],
          [
            "Trend",
            ".8fr",
            "right"
          ]
        ],
        "rows": [
          [
            "Shawarma House",
            "4",
            "QAR 682K",
            "−QAR 168K",
            "−QAR 181K",
            "QAR 314K",
            "46.1%",
            "+2.1 pts"
          ],
          [
            "Grill District",
            "3",
            "QAR 548K",
            "−QAR 139K",
            "−QAR 164K",
            "QAR 230K",
            "42.0%",
            "−0.8 pts"
          ],
          [
            "Saj & Co",
            "3",
            "QAR 391K",
            "−QAR 96K",
            "−QAR 112K",
            "QAR 158K",
            "40.3%",
            "+0.4 pts"
          ],
          [
            "Lemon Mint Café",
            "2",
            "QAR 219K",
            "−QAR 67K",
            "−QAR 60K",
            "QAR 77K",
            "35.2%",
            "−3.6 pts"
          ]
        ],
        "foot": "Matched across Snoonu, Talabat, Keeta, Odoo and QNB · 98% confidence"
      }
    ]
  },
  "leakage": {
    "kicker": "Intelligence · Margin Leakage",
    "title": "QAR 41,280 of margin at risk this month.",
    "sub": "23 issues, each with orders and evidence.",
    "cta": "Export leakage report",
    "q": "margin",
    "kpis": [
      [
        "At risk",
        "QAR 41,280",
        "23 issues",
        "neg"
      ],
      [
        "Recoverable",
        "QAR 27,450",
        "With evidence",
        "brand"
      ],
      [
        "Recovered this month",
        "QAR 9,860",
        "11 resolved",
        "pos"
      ],
      [
        "Avg confidence",
        "94%",
        "Across sources",
        ""
      ]
    ],
    "panels": [
      {
        "id": "lb",
        "type": "bars",
        "title": "Where it leaks",
        "sub": "By category",
        "col": "1 / span 5",
        "bars": [
          [
            "Unprofitable promotions",
            0,
            100,
            "var(--neg-bar)",
            "14,600"
          ],
          [
            "Commission variance",
            0,
            61,
            "var(--neg-bar)",
            "8,900"
          ],
          [
            "Price mismatch",
            0,
            51,
            "var(--warn)",
            "7,420"
          ],
          [
            "Other fees",
            0,
            36,
            "var(--warn)",
            "5,260"
          ],
          [
            "Refund leakage",
            0,
            35,
            "var(--warn)",
            "5,100"
          ]
        ]
      },
      {
        "id": "lt",
        "type": "table",
        "title": "Issues",
        "sub": "Click any issue to see its evidence",
        "col": "6 / span 7",
        "cols": [
          [
            "Issue",
            "2.2fr"
          ],
          [
            "At risk",
            "1fr",
            "right"
          ],
          [
            "Branch",
            "1fr"
          ],
          [
            "Platform",
            ".9fr"
          ],
          [
            "Conf.",
            ".6fr",
            "right"
          ],
          [
            "Status",
            "1.2fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "Weekend 25% Off over-funded",
            "QAR 7,200",
            "4 branches",
            "Talabat",
            "96%",
            "Action required"
          ],
          [
            "Commission 22.4% vs 19.0%",
            "QAR 6,240",
            "All",
            "Talabat",
            "98%",
            "Under review"
          ],
          [
            "Shawarma underpriced",
            "QAR 2,480",
            "All",
            "Talabat",
            "91%",
            "Recommended"
          ],
          [
            "Unknown deduction SN-DED-7781",
            "QAR 590",
            "3 branches",
            "Snoonu",
            "98%",
            "Under review"
          ],
          [
            "Refund rate +2.8 pts",
            "QAR 2,100",
            "Al Sadd",
            "Talabat",
            "89%",
            "Action required"
          ],
          [
            "Discount stacking on combos",
            "QAR 1,320",
            "Lusail",
            "Keeta",
            "87%",
            "Needs review"
          ],
          [
            "Missing promo credit",
            "QAR 1,420",
            "3 branches",
            "Keeta",
            "95%",
            "Action required"
          ],
          [
            "Service fee not in contract",
            "QAR 380",
            "3 branches",
            "Keeta",
            "93%",
            "Resolved"
          ]
        ],
        "filter": 5,
        "action": "Investigate",
        "foot": "Recommended actions are reviewed before any platform or price changes."
      }
    ]
  },
  "menu": {
    "kicker": "Intelligence · Menu Intelligence",
    "title": "6 items are underpriced on Talabat.",
    "sub": "+QAR 7,420 a month at Snoonu price parity.",
    "cta": "Export SKU matrix",
    "q": "reprice",
    "kpis": [
      [
        "SKUs tracked",
        "214",
        "Recipe COGS from Odoo",
        ""
      ],
      [
        "Stars",
        "38",
        "High margin, high volume",
        "pos"
      ],
      [
        "Margin traps",
        "17",
        "Popular, low margin",
        "neg"
      ],
      [
        "Pricing upside",
        "+QAR 7,420",
        "per month",
        "brand"
      ]
    ],
    "panels": [
      {
        "id": "mt",
        "type": "table",
        "title": "SKU profitability matrix",
        "sub": "True contribution per item, by channel",
        "col": "1 / -1",
        "cols": [
          [
            "Item",
            "1.6fr"
          ],
          [
            "Class",
            "1.2fr",
            "left",
            1
          ],
          [
            "POS",
            ".6fr",
            "right"
          ],
          [
            "Snoonu",
            ".7fr",
            "right"
          ],
          [
            "Talabat",
            ".7fr",
            "right"
          ],
          [
            "Keeta",
            ".6fr",
            "right"
          ],
          [
            "COGS",
            ".7fr",
            "right"
          ],
          [
            "Talabat margin",
            ".9fr",
            "right"
          ],
          [
            "Orders",
            ".7fr",
            "right"
          ],
          [
            "Recommendation",
            "1.6fr"
          ]
        ],
        "rows": [
          [
            "Chicken Shawarma",
            "Margin trap",
            "QAR 25",
            "QAR 30",
            "QAR 28",
            "QAR 29",
            "QAR 11.20",
            "12.1%",
            "1,240",
            "Talabat → QAR 30 · +2,480/mo"
          ],
          [
            "Mixed Grill Platter",
            "Pricing opportunity",
            "QAR 68",
            "QAR 76",
            "QAR 72",
            "QAR 74",
            "QAR 27.40",
            "15.0%",
            "465",
            "Talabat → QAR 76 · +1,860/mo"
          ],
          [
            "Falafel Wrap",
            "Margin trap",
            "QAR 16",
            "QAR 19",
            "QAR 17",
            "QAR 18",
            "QAR 5.90",
            "9.8%",
            "560",
            "Talabat → QAR 19 · +1,120/mo"
          ],
          [
            "Chicken Fatteh",
            "Pricing opportunity",
            "QAR 32",
            "QAR 38",
            "QAR 35",
            "QAR 36",
            "QAR 13.10",
            "13.4%",
            "313",
            "Talabat → QAR 38 · +940/mo"
          ],
          [
            "Hummus Beiruti",
            "Star",
            "QAR 18",
            "QAR 22",
            "QAR 22",
            "QAR 22",
            "QAR 3.80",
            "38.6%",
            "1,880",
            "Keep · feature in campaigns"
          ],
          [
            "Lamb Kofta",
            "Volume driver",
            "QAR 42",
            "QAR 48",
            "QAR 45",
            "QAR 47",
            "QAR 17.80",
            "14.9%",
            "187",
            "Talabat → QAR 48 · +560/mo"
          ],
          [
            "Fresh Lemon Mint",
            "Loss maker",
            "QAR 14",
            "QAR 17",
            "QAR 15",
            "QAR 16",
            "QAR 3.20",
            "−1.4%",
            "230",
            "Exclude from promotions"
          ],
          [
            "Kunafa",
            "Star",
            "QAR 24",
            "QAR 28",
            "QAR 28",
            "QAR 28",
            "QAR 6.10",
            "34.2%",
            "910",
            "Keep"
          ]
        ],
        "filter": 1,
        "action": "Simulate price",
        "foot": "Margins include commission, promotion share and platform fees per channel."
      }
    ]
  },
  "orders": {
    "kicker": "Operations · Orders",
    "title": "22,252 orders this month.",
    "sub": "3.1% of them lost money.",
    "cta": "Export orders",
    "q": "margin",
    "kpis": [
      [
        "Orders",
        "22,252",
        "↑ 11.4%",
        "pos"
      ],
      [
        "Avg order value",
        "QAR 82.70",
        "↑ QAR 1.40",
        "pos"
      ],
      [
        "Avg contribution / order",
        "QAR 35.74",
        "↓ QAR 0.90",
        "neg"
      ],
      [
        "Loss-making orders",
        "3.1%",
        "690 orders",
        "neg"
      ]
    ],
    "panels": [
      {
        "id": "ot",
        "type": "table",
        "title": "Order profitability",
        "sub": "Click an order to inspect every line",
        "col": "1 / -1",
        "cols": [
          [
            "Order",
            "1fr"
          ],
          [
            "Channel",
            ".8fr",
            "left",
            1
          ],
          [
            "Branch",
            ".9fr"
          ],
          [
            "Time",
            ".6fr"
          ],
          [
            "Gross",
            ".8fr",
            "right"
          ],
          [
            "Discount",
            ".8fr",
            "right"
          ],
          [
            "Commission & fees",
            "1fr",
            "right"
          ],
          [
            "COGS",
            ".8fr",
            "right"
          ],
          [
            "Contribution",
            ".9fr",
            "right"
          ],
          [
            "Margin",
            ".6fr",
            "right"
          ]
        ],
        "rows": [
          [
            "#PS-84217",
            "Snoonu",
            "West Bay",
            "12:42",
            "QAR 186.00",
            "−QAR 18.00",
            "−QAR 32.18",
            "−QAR 72.40",
            "QAR 63.42",
            "34.1%"
          ],
          [
            "#TB-55102",
            "Talabat",
            "Lusail",
            "12:39",
            "QAR 142.00",
            "−QAR 35.50",
            "−QAR 31.81",
            "−QAR 58.20",
            "QAR 16.49",
            "11.6%"
          ],
          [
            "#K-49210",
            "Keeta",
            "Lusail",
            "13:42",
            "QAR 214.00",
            "−QAR 0.00",
            "−QAR 38.52",
            "−QAR 88.60",
            "QAR 86.88",
            "40.6%"
          ],
          [
            "#TB-55098",
            "Talabat",
            "Al Sadd",
            "12:31",
            "QAR 58.00",
            "−QAR 14.50",
            "−QAR 12.99",
            "−QAR 32.40",
            "−QAR 1.89",
            "−3.3%"
          ],
          [
            "#POS-77310",
            "Direct",
            "The Pearl",
            "12:28",
            "QAR 96.00",
            "−QAR 0.00",
            "−QAR 1.92",
            "−QAR 38.10",
            "QAR 55.98",
            "58.3%"
          ],
          [
            "#SN-60341",
            "Snoonu",
            "Al Sadd",
            "12:20",
            "QAR 74.00",
            "−QAR 7.40",
            "−QAR 13.47",
            "−QAR 29.80",
            "QAR 23.33",
            "31.5%"
          ],
          [
            "#JZ-11820",
            "Jahez",
            "West Bay",
            "12:14",
            "QAR 121.00",
            "−QAR 12.10",
            "−QAR 24.20",
            "−QAR 47.30",
            "QAR 37.40",
            "30.9%"
          ],
          [
            "#TB-55071",
            "Talabat",
            "West Bay",
            "12:02",
            "QAR 39.00",
            "−QAR 9.75",
            "−QAR 8.74",
            "−QAR 22.60",
            "−QAR 2.09",
            "−5.4%"
          ]
        ],
        "filter": 1,
        "action": "Open order detail",
        "foot": "Live from platform order APIs and Odoo POS · contribution recalculated on settlement."
      }
    ]
  },
  "branches": {
    "kicker": "Operations · Branches",
    "title": "Al Sadd needs attention.",
    "sub": "Margin 10.8% vs a group average of 17.9%.",
    "cta": "Export branch report",
    "q": "branches",
    "kpis": [
      [
        "Branches",
        "12",
        "4 brands",
        ""
      ],
      [
        "Best margin",
        "West Bay 22.4%",
        "↑ 0.6 pts",
        "pos"
      ],
      [
        "Lowest margin",
        "Al Sadd 10.8%",
        "↓ 3.1 pts",
        "neg"
      ],
      [
        "Flags",
        "3",
        "Promotions · refunds · variance",
        "warn"
      ]
    ],
    "panels": [
      {
        "id": "bb",
        "type": "bars",
        "title": "Contribution margin by branch",
        "sub": "Last 30 days",
        "col": "1 / span 5",
        "bars": [
          [
            "West Bay",
            0,
            100,
            "var(--brand)",
            "22.4%"
          ],
          [
            "The Pearl",
            0,
            88,
            "var(--brand)",
            "19.7%"
          ],
          [
            "Msheireb",
            0,
            84,
            "var(--brand)",
            "18.8%"
          ],
          [
            "Lusail",
            0,
            77,
            "var(--brand)",
            "17.3%"
          ],
          [
            "Al Wakrah",
            0,
            72,
            "var(--brand)",
            "16.1%"
          ],
          [
            "Al Sadd",
            0,
            48,
            "var(--neg-bar)",
            "10.8%"
          ]
        ]
      },
      {
        "id": "bt",
        "type": "table",
        "title": "Branch comparison",
        "sub": "Click a branch for its drivers",
        "col": "6 / span 7",
        "cols": [
          [
            "Branch",
            "1.1fr"
          ],
          [
            "Revenue",
            ".9fr",
            "right"
          ],
          [
            "Margin",
            ".7fr",
            "right"
          ],
          [
            "Promo intensity",
            ".9fr",
            "right"
          ],
          [
            "Refunds",
            ".7fr",
            "right"
          ],
          [
            "Variance",
            ".9fr",
            "right"
          ],
          [
            "Status",
            ".9fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "West Bay",
            "QAR 248K",
            "22.4%",
            "8.1%",
            "0.9%",
            "QAR 210",
            "Healthy"
          ],
          [
            "The Pearl",
            "QAR 214K",
            "19.7%",
            "9.4%",
            "1.2%",
            "QAR 0",
            "Healthy"
          ],
          [
            "Msheireb",
            "QAR 176K",
            "18.8%",
            "10.2%",
            "1.1%",
            "QAR 340",
            "Healthy"
          ],
          [
            "Lusail",
            "QAR 231K",
            "17.3%",
            "12.6%",
            "1.4%",
            "QAR 1,180",
            "Watch"
          ],
          [
            "Al Wakrah",
            "QAR 139K",
            "16.1%",
            "11.8%",
            "1.6%",
            "QAR 420",
            "Watch"
          ],
          [
            "Al Sadd",
            "QAR 162K",
            "10.8%",
            "18.0%",
            "3.7%",
            "QAR 3,420",
            "Attention"
          ]
        ],
        "filter": 6,
        "action": "Open branch review",
        "foot": "Showing 6 of 12 branches · sorted by margin."
      }
    ]
  },
  "channels": {
    "kicker": "Commercial · Channels",
    "title": "Revenue is not profit.",
    "sub": "Talabat sells the most; Snoonu earns the most per riyal.",
    "cta": "Export channel report",
    "q": "channel",
    "kpis": [
      [
        "Channels",
        "5",
        "4 delivery + direct",
        ""
      ],
      [
        "Highest revenue",
        "Talabat QAR 396K",
        "14.2% margin",
        "neg"
      ],
      [
        "Highest margin",
        "Snoonu 21.8%",
        "QAR 284K revenue",
        "pos"
      ],
      [
        "Effective commission",
        "19.7%",
        "Weighted average",
        ""
      ]
    ],
    "panels": [
      {
        "id": "ct",
        "type": "table",
        "title": "Channel profitability",
        "sub": "Sort by any column",
        "col": "1 / -1",
        "cols": [
          [
            "Channel",
            "1fr"
          ],
          [
            "Revenue",
            ".9fr",
            "right"
          ],
          [
            "Orders",
            ".7fr",
            "right"
          ],
          [
            "AOV",
            ".7fr",
            "right"
          ],
          [
            "Eff. commission",
            ".9fr",
            "right"
          ],
          [
            "Promo cost",
            ".8fr",
            "right"
          ],
          [
            "COGS",
            ".8fr",
            "right"
          ],
          [
            "Contribution",
            ".9fr",
            "right"
          ],
          [
            "Margin",
            ".6fr",
            "right"
          ],
          [
            "Variance",
            ".8fr",
            "right"
          ]
        ],
        "rows": [
          [
            "Snoonu",
            "QAR 284K",
            "3,412",
            "QAR 83.2",
            "18.2%",
            "QAR 14.2K",
            "QAR 79.5K",
            "QAR 61.9K",
            "21.8%",
            "QAR 2,510"
          ],
          [
            "Talabat",
            "QAR 396K",
            "4,980",
            "QAR 79.5",
            "22.4%",
            "QAR 47.5K",
            "QAR 111K",
            "QAR 56.2K",
            "14.2%",
            "QAR 4,470"
          ],
          [
            "Keeta",
            "QAR 187K",
            "2,310",
            "QAR 81.0",
            "19.5%",
            "QAR 13.1K",
            "QAR 52.4K",
            "QAR 32.9K",
            "17.6%",
            "QAR 1,960"
          ],
          [
            "Jahez",
            "QAR 92K",
            "1,106",
            "QAR 83.2",
            "20.0%",
            "QAR 5.5K",
            "QAR 25.8K",
            "QAR 17.3K",
            "18.8%",
            "QAR 0"
          ],
          [
            "Direct / POS",
            "QAR 881K",
            "10,444",
            "QAR 84.4",
            "2.0%",
            "QAR 9.7K",
            "QAR 248K",
            "QAR 627K",
            "71.2%",
            "QAR 0"
          ]
        ],
        "action": "Compare in Copilot",
        "foot": "Contribution = net sales − commission − fees − merchant-funded promotions − refunds − COGS."
      }
    ]
  },
  "settlements": {
    "kicker": "Finance · Settlements",
    "title": "QAR 8,940 unexplained across 3 payouts.",
    "sub": "Expected vs platform statement vs bank, order by order.",
    "cta": "Export reconciliation",
    "q": "payout",
    "kpis": [
      [
        "Expected",
        "QAR 247,800",
        "Week 39 · 5 platforms",
        ""
      ],
      [
        "Received",
        "QAR 238,860",
        "QNB deposits",
        ""
      ],
      [
        "Variance",
        "QAR 8,940",
        "3 discrepancies",
        "neg"
      ],
      [
        "Payouts matched",
        "38 / 41",
        "This month",
        "pos"
      ]
    ],
    "panels": [
      {
        "id": "st",
        "type": "table",
        "title": "Payout cycles",
        "sub": "Click a payout for its breakdown",
        "col": "1 / -1",
        "cols": [
          [
            "Settlement",
            "1fr"
          ],
          [
            "Platform",
            ".8fr"
          ],
          [
            "Period",
            "1fr"
          ],
          [
            "Expected",
            ".9fr",
            "right"
          ],
          [
            "Statement",
            ".9fr",
            "right"
          ],
          [
            "Bank",
            ".9fr",
            "right"
          ],
          [
            "Variance",
            ".8fr",
            "right"
          ],
          [
            "Status",
            "1fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "SN-29401",
            "Snoonu",
            "22–28 Sep",
            "QAR 84,920",
            "QAR 82,410",
            "QAR 82,410",
            "−QAR 2,510",
            "Action required"
          ],
          [
            "TB-3921",
            "Talabat",
            "22–28 Sep",
            "QAR 131,640",
            "QAR 127,170",
            "QAR 127,170",
            "−QAR 4,470",
            "Under review"
          ],
          [
            "KT-3907",
            "Keeta",
            "22–28 Sep",
            "QAR 31,240",
            "QAR 29,280",
            "QAR 29,280",
            "−QAR 1,960",
            "Action required"
          ],
          [
            "SN-29317",
            "Snoonu",
            "15–21 Sep",
            "QAR 79,310",
            "QAR 79,310",
            "QAR 79,310",
            "QAR 0",
            "Matched"
          ],
          [
            "JZ-3842",
            "Jahez",
            "15–21 Sep",
            "QAR 21,880",
            "QAR 21,620",
            "QAR 21,880",
            "QAR 0",
            "Resolved"
          ],
          [
            "TB-3874",
            "Talabat",
            "15–21 Sep",
            "QAR 126,920",
            "QAR 126,920",
            "QAR 126,920",
            "QAR 0",
            "Matched"
          ]
        ],
        "filter": 7,
        "action": "Flag for review",
        "foot": "Drill down: settlement → orders → fees → evidence."
      }
    ]
  },
  "reports": {
    "kicker": "Finance · Reports",
    "title": "Reports that write themselves.",
    "sub": "Scheduled, evidence-backed and sent to the right people.",
    "cta": "New report",
    "q": "margin",
    "kpis": [
      [
        "Scheduled",
        "9",
        "4 teams",
        ""
      ],
      [
        "Sent this month",
        "34",
        "100% on time",
        "pos"
      ],
      [
        "Recipients",
        "18",
        "Finance · Ops · Exec · Sales",
        ""
      ],
      [
        "Next send",
        "Sun 08:00",
        "Weekly margin bridge",
        "brand"
      ]
    ],
    "panels": [
      {
        "id": "rt",
        "type": "table",
        "title": "Report library",
        "sub": "Click a report to send or download",
        "col": "1 / -1",
        "cols": [
          [
            "Report",
            "1.6fr"
          ],
          [
            "Audience",
            "1fr"
          ],
          [
            "Frequency",
            ".9fr"
          ],
          [
            "Format",
            ".7fr"
          ],
          [
            "Last sent",
            ".9fr"
          ],
          [
            "Status",
            ".8fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "Weekly margin bridge",
            "Executive",
            "Weekly · Sun",
            "PDF",
            "29 Sep 08:00",
            "Scheduled"
          ],
          [
            "Settlement exceptions",
            "Finance",
            "Daily",
            "XLSX",
            "Today 07:00",
            "Sent"
          ],
          [
            "Channel profitability",
            "Executive · Sales",
            "Monthly",
            "PDF",
            "1 Oct",
            "Sent"
          ],
          [
            "Promotion health",
            "Sales",
            "Weekly · Mon",
            "PDF",
            "30 Sep",
            "Scheduled"
          ],
          [
            "Branch performance",
            "Operations",
            "Weekly · Sat",
            "PDF",
            "28 Sep",
            "Sent"
          ],
          [
            "Automation exceptions",
            "Operations",
            "Daily",
            "Email",
            "Today 07:00",
            "Sent"
          ],
          [
            "Month-end reconciliation pack",
            "Finance · Audit",
            "Monthly",
            "XLSX + PDF",
            "1 Oct",
            "Sent"
          ],
          [
            "Board summary",
            "Executive",
            "Quarterly",
            "PDF",
            "1 Jul",
            "Scheduled"
          ]
        ],
        "action": "Send now",
        "foot": "Every figure in a report links back to its evidence ID."
      }
    ]
  },
  "integrations": {
    "kicker": "Infrastructure · Integrations",
    "title": "5 systems connected.",
    "sub": "One source of financial truth.",
    "cta": "Add connection",
    "q": "channel",
    "kpis": [
      [
        "Connected",
        "5",
        "Healthy",
        "pos"
      ],
      [
        "Pilot",
        "2",
        "In validation",
        "warn"
      ],
      [
        "Records today",
        "1.2M",
        "98% matched",
        ""
      ],
      [
        "Last full sync",
        "1 min ago",
        "Snoonu · Talabat · Odoo",
        ""
      ]
    ],
    "panels": [
      {
        "id": "it",
        "type": "table",
        "title": "Connections",
        "sub": "Click a connection for data coverage",
        "col": "1 / -1",
        "cols": [
          [
            "Connection",
            "1.1fr"
          ],
          [
            "Category",
            "1fr",
            "left",
            0
          ],
          [
            "Status",
            ".9fr",
            "left",
            1
          ],
          [
            "Locations",
            ".7fr",
            "right"
          ],
          [
            "Last sync",
            ".8fr"
          ],
          [
            "Data available",
            "2fr"
          ],
          [
            "Health",
            ".8fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "Snoonu",
            "Delivery",
            "Connected",
            "3",
            "2 min ago",
            "Orders · Line items · Promotions · Settlements · Catalog",
            "Healthy"
          ],
          [
            "Talabat",
            "Delivery",
            "Connected",
            "4",
            "1 min ago",
            "Orders · Promotions · Settlements · Catalog",
            "Healthy"
          ],
          [
            "Keeta",
            "Delivery",
            "Connected",
            "3",
            "3 min ago",
            "Orders · Promotions · Settlements",
            "Healthy"
          ],
          [
            "Jahez",
            "Delivery",
            "Pilot",
            "2",
            "1 h ago",
            "Orders · Settlements",
            "Degraded"
          ],
          [
            "Odoo",
            "POS / ERP",
            "Connected",
            "12",
            "1 min ago",
            "POS · Inventory · Recipe COGS · GL",
            "Healthy"
          ],
          [
            "Oracle MICROS",
            "POS / ERP",
            "Pilot",
            "—",
            "—",
            "POS transactions",
            "Pending"
          ],
          [
            "Deliverect",
            "Middleware",
            "Planned",
            "—",
            "—",
            "Order routing · Menus",
            "Pending"
          ],
          [
            "QNB bank feed",
            "Financial",
            "Connected",
            "2 accts",
            "14 min ago",
            "Payouts · Remittance refs",
            "Healthy"
          ],
          [
            "Xero",
            "Accounting",
            "Planned",
            "—",
            "—",
            "Journals · Chart of accounts",
            "Pending"
          ]
        ],
        "filter": 1,
        "action": "Sync now",
        "foot": "Merchant-authorised · read-only first · credentials encrypted and revocable."
      }
    ]
  },
  "api": {
    "kicker": "Infrastructure · API / Developers",
    "title": "Build on PrizeSkout.",
    "sub": "REST API and webhooks for profitability, settlements and actions.",
    "cta": "Create API key",
    "q": "channel",
    "kpis": [
      [
        "API calls · 24h",
        "182,400",
        "↑ 6%",
        ""
      ],
      [
        "p95 latency",
        "212 ms",
        "Within SLO",
        "pos"
      ],
      [
        "Error rate",
        "0.04%",
        "Last 24h",
        "pos"
      ],
      [
        "Webhooks",
        "6",
        "All delivering",
        "pos"
      ]
    ],
    "panels": [
      {
        "id": "ak",
        "type": "table",
        "title": "API keys",
        "sub": "Scoped, rotatable, audited",
        "col": "1 / span 7",
        "cols": [
          [
            "Name",
            "1.2fr"
          ],
          [
            "Env",
            ".7fr",
            "left",
            1
          ],
          [
            "Scopes",
            "1.8fr"
          ],
          [
            "Last used",
            ".9fr"
          ]
        ],
        "rows": [
          [
            "ERP sync",
            "Live",
            "settlements:read · orders:read",
            "2 min ago"
          ],
          [
            "BI warehouse",
            "Live",
            "profit:read · menu:read",
            "1 h ago"
          ],
          [
            "Ops bot",
            "Live",
            "automation:read · actions:write",
            "6 min ago"
          ],
          [
            "Sandbox",
            "Pilot",
            "all:read",
            "3 d ago"
          ]
        ],
        "action": "Rotate key",
        "foot": "Keys never expose platform credentials."
      },
      {
        "id": "wh",
        "type": "table",
        "title": "Webhooks",
        "sub": "Events delivered",
        "col": "8 / span 5",
        "cols": [
          [
            "Event",
            "1.6fr"
          ],
          [
            "Delivered",
            ".8fr",
            "right"
          ],
          [
            "Status",
            ".8fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "settlement.variance_detected",
            "41",
            "Healthy"
          ],
          [
            "order.held",
            "96",
            "Healthy"
          ],
          [
            "promotion.guardrail_breached",
            "12",
            "Healthy"
          ],
          [
            "action.approved",
            "58",
            "Healthy"
          ],
          [
            "integration.degraded",
            "3",
            "Healthy"
          ],
          [
            "report.sent",
            "34",
            "Healthy"
          ]
        ],
        "action": "Send test event",
        "foot": "Signed with HMAC-SHA256."
      }
    ]
  },
  "settings": {
    "kicker": "Settings",
    "title": "How PrizeSkout calculates your numbers.",
    "sub": "Changes apply to every report and recommendation.",
    "cta": "Save changes",
    "q": "margin",
    "kpis": [
      [
        "Currency",
        "QAR",
        "Reporting",
        ""
      ],
      [
        "Fiscal year",
        "Jan–Dec",
        "Calendar",
        ""
      ],
      [
        "Timezone",
        "Asia/Qatar",
        "GMT+3",
        ""
      ],
      [
        "Data retention",
        "7 years",
        "Audit-ready",
        ""
      ]
    ],
    "panels": [
      {
        "id": "sg2",
        "type": "toggles",
        "title": "Financial rules",
        "sub": "Used in every calculation",
        "col": "1 / span 6",
        "toggles": [
          [
            "Include packaging in COGS",
            "Not connected yet · lowers confidence 2%",
            0,
            "Off"
          ],
          [
            "Treat platform-funded promos as revenue",
            "Matches finance policy",
            1,
            "On"
          ],
          [
            "Allocate delivery fees to order",
            "Per-order contribution",
            1,
            "On"
          ],
          [
            "Exclude test & cancelled orders",
            "Before settlement",
            1,
            "On"
          ]
        ]
      },
      {
        "id": "sg3",
        "type": "toggles",
        "title": "Guardrails & alerts",
        "sub": "Applied across modules",
        "col": "7 / span 6",
        "toggles": [
          [
            "Margin floor 12%",
            "Promotions below require approval",
            1,
            "Require approval"
          ],
          [
            "Merchant-funded share > 50%",
            "Warn finance team",
            1,
            "Notify"
          ],
          [
            "Settlement variance > QAR 500",
            "Create Priority item",
            1,
            "Notify"
          ],
          [
            "Discount > 30%",
            "Manager approval",
            1,
            "Require approval"
          ]
        ]
      },
      {
        "id": "sb",
        "type": "table",
        "title": "Brands & branches",
        "sub": "Organisation structure",
        "col": "1 / -1",
        "cols": [
          [
            "Brand",
            "1.4fr"
          ],
          [
            "Branches",
            ".7fr",
            "right"
          ],
          [
            "Country",
            ".8fr"
          ],
          [
            "POS",
            ".8fr"
          ],
          [
            "Channels",
            "1.6fr"
          ],
          [
            "Status",
            ".8fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "Shawarma House",
            "4",
            "Qatar",
            "Odoo",
            "Snoonu · Talabat · Keeta · Jahez",
            "Active"
          ],
          [
            "Grill District",
            "3",
            "Qatar",
            "Odoo",
            "Snoonu · Talabat · Keeta",
            "Active"
          ],
          [
            "Saj & Co",
            "3",
            "Qatar",
            "Odoo",
            "Talabat · Keeta",
            "Active"
          ],
          [
            "Lemon Mint Café",
            "2",
            "Qatar",
            "Odoo",
            "Snoonu · Talabat",
            "Active"
          ]
        ],
        "action": "Edit brand",
        "foot": "Add brands, countries and branches without re-connecting sources."
      }
    ]
  },
  "access": {
    "kicker": "Store Access",
    "title": "Who can see and do what, in which store.",
    "sub": "Access is set per brand and branch.",
    "cta": "Invite user",
    "q": "branches",
    "kpis": [
      [
        "Users",
        "18",
        "4 teams",
        ""
      ],
      [
        "Roles",
        "5",
        "Least privilege",
        ""
      ],
      [
        "Branches covered",
        "12 / 12",
        "",
        "pos"
      ],
      [
        "Pending invites",
        "2",
        "Expire in 6 days",
        "warn"
      ]
    ],
    "panels": [
      {
        "id": "au",
        "type": "table",
        "title": "Users",
        "sub": "Click a user to change access",
        "col": "1 / -1",
        "cols": [
          [
            "Name",
            "1.2fr"
          ],
          [
            "Role",
            "1fr",
            "left",
            1
          ],
          [
            "Team",
            ".9fr"
          ],
          [
            "Stores",
            "1.4fr"
          ],
          [
            "Last active",
            ".8fr"
          ],
          [
            "Status",
            ".8fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "John Doe",
            "Owner",
            "Executive",
            "All 12 branches",
            "Now",
            "Active"
          ],
          [
            "Sara Al-Mansoori",
            "Finance admin",
            "Finance",
            "All 12 branches",
            "12 min ago",
            "Active"
          ],
          [
            "Omar Haddad",
            "Finance analyst",
            "Finance",
            "All 12 branches",
            "1 h ago",
            "Active"
          ],
          [
            "Priya Nair",
            "Operations manager",
            "Operations",
            "West Bay · The Pearl · Lusail",
            "5 min ago",
            "Active"
          ],
          [
            "Khalid Rahman",
            "Branch manager",
            "Operations",
            "Al Sadd",
            "22 min ago",
            "Active"
          ],
          [
            "Lina Farouk",
            "Commercial lead",
            "Sales",
            "All brands · pricing only",
            "2 h ago",
            "Active"
          ],
          [
            "Ahmed Saleh",
            "Branch manager",
            "Operations",
            "Lusail",
            "—",
            "Invited"
          ],
          [
            "Mariam Yusuf",
            "Viewer",
            "Executive",
            "Board pack only",
            "—",
            "Invited"
          ]
        ],
        "filter": 2,
        "action": "Edit access",
        "foot": "Changes are logged to the Audit Log."
      },
      {
        "id": "ar",
        "type": "table",
        "title": "Role permissions",
        "sub": "What each role can do",
        "col": "1 / -1",
        "cols": [
          [
            "Role",
            "1.2fr"
          ],
          [
            "Financial data",
            ".9fr",
            "left",
            1
          ],
          [
            "Approve actions",
            ".9fr",
            "left",
            1
          ],
          [
            "Automation rules",
            ".9fr",
            "left",
            1
          ],
          [
            "Prices & promos",
            ".9fr",
            "left",
            1
          ],
          [
            "Integrations",
            ".9fr",
            "left",
            1
          ]
        ],
        "rows": [
          [
            "Owner",
            "✓",
            "✓",
            "✓",
            "✓",
            "✓"
          ],
          [
            "Finance admin",
            "✓",
            "✓",
            "—",
            "—",
            "✓"
          ],
          [
            "Operations manager",
            "Branch only",
            "✓",
            "✓",
            "—",
            "—"
          ],
          [
            "Branch manager",
            "Branch only",
            "Branch only",
            "—",
            "—",
            "—"
          ],
          [
            "Commercial lead",
            "Margins only",
            "✓",
            "—",
            "✓",
            "—"
          ]
        ],
        "action": "Edit role",
        "foot": "Platform credentials are only visible to Owner and Finance admin."
      }
    ]
  },
  "audit": {
    "kicker": "Audit Log",
    "title": "Every number, decision and change — traceable.",
    "sub": "Immutable, exportable, evidence-linked.",
    "cta": "Export audit log",
    "q": "payout",
    "kpis": [
      [
        "Events · 30 days",
        "4,812",
        "Retained 7 years",
        ""
      ],
      [
        "Approvals",
        "58",
        "All with evidence",
        "pos"
      ],
      [
        "Agent actions",
        "6,140",
        "AI Store Manager",
        ""
      ],
      [
        "Access changes",
        "7",
        "Store Access",
        ""
      ]
    ],
    "panels": [
      {
        "id": "at",
        "type": "table",
        "title": "Events",
        "sub": "Click an event to see its evidence",
        "col": "1 / -1",
        "cols": [
          [
            "Time",
            ".9fr"
          ],
          [
            "Actor",
            "1.1fr"
          ],
          [
            "Type",
            ".8fr",
            "left",
            1
          ],
          [
            "Action",
            "2fr"
          ],
          [
            "Object",
            "1fr"
          ],
          [
            "Evidence",
            ".8fr"
          ]
        ],
        "rows": [
          [
            "Today 13:42",
            "AI Store Manager",
            "Agent",
            "Paused Mixed Grill Platter on Keeta",
            "Lusail",
            "EV-91032"
          ],
          [
            "Today 13:30",
            "John Doe",
            "User",
            "Flagged settlement for review",
            "SN-29401",
            "EV-29401"
          ],
          [
            "Today 13:21",
            "AI Store Manager",
            "Agent",
            "Requested approval to close branch",
            "Al Sadd · Snoonu",
            "EV-91027"
          ],
          [
            "Today 12:58",
            "Lina Farouk",
            "User",
            "Saved promotion recommendation",
            "Weekend 25% Off",
            "SIM-1042"
          ],
          [
            "Today 12:10",
            "Order Automation",
            "System",
            "Auto-accept rule executed 312×",
            "Rule R-01",
            "Batch"
          ],
          [
            "Today 09:14",
            "Sara Al-Mansoori",
            "User",
            "Approved dispute pack",
            "TB-3921",
            "EV-28844"
          ],
          [
            "Today 08:02",
            "Integrations",
            "System",
            "Jahez sync degraded — retried",
            "Jahez",
            "INT-552"
          ],
          [
            "Yesterday 17:40",
            "John Doe",
            "User",
            "Invited Ahmed Saleh as Branch manager",
            "Lusail",
            "ACC-207"
          ]
        ],
        "filter": 2,
        "action": "Download evidence",
        "foot": "Detected → Reviewed → Actioned → Resolved, for every insight."
      }
    ]
  }
} as const;

export type DashboardV2PlatformDemoScreen = keyof typeof dashboardV2PlatformDemo;
export type DashboardV2PlatformDemoPayload = typeof dashboardV2PlatformDemo;
