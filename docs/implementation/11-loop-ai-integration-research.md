# How Loop AI connected to so many restaurant systems

Date: 2026-10-03

## The short answer

Loop almost certainly did **not** negotiate a deep partnership with every company whose data it can read.

The public evidence shows a mixed approach:

1. direct connections where an approved interface is available;
2. secure file feeds for larger customers;
3. customer-authorized collection from web portals where no suitable interface exists;
4. ordinary spreadsheet, statement, and historical-file imports;
5. a smaller number of formal relationships where writing data back or reaching many customers makes that worthwhile.

In plain English: Loop built many ways to collect a restaurant's own records. It did not wait for every platform to become a formal partner.

## What is firmly supported by public evidence

### 1. “Connector” does not mean “partnership”

Loop currently advertises 96+ live native connectors and elsewhere says 100+. Its own business-intelligence page explains that sources can be connected by an API **or SFTP**, with old records brought in as part of setup. SFTP is simply a secure way for a business to send files automatically. This means at least part of the connector catalogue consists of data feeds, not app-store partnerships.

### 2. Loop uses web-portal collection as part of its ingestion system

A Loop engineering recruitment post says the company maintains “ingestion and scraping infrastructure” and names tools used to automate websites. This is the clearest public clue about how Loop covers systems that do not offer a convenient reporting connection.

This does not prove which named platforms are collected this way. It does prove that portal collection is part of Loop's overall method.

### 3. The restaurant's permission is central

Loop's terms say customers may have to authenticate separately to outside services. The terms also say those services are ones with which the customer already has its own contract. They explicitly place responsibility on the customer for its authorization and instructions concerning those services.

That is consistent with a model where the restaurant permits Loop to retrieve the restaurant's own records. It is not evidence of a blanket commercial partnership between Loop and every source.

### 4. Some connections are formal and approved

Loop is listed in the Sage Intacct Marketplace. The listing says Loop uses its partner Sender ID and can post delivery journal entries into Sage. This is a genuine platform relationship, not merely a file import.

Official DoorDash and Uber material also shows why formal access is needed for some connections. DoorDash's reporting interface requires approval and store assignment. Uber says production reporting access may require written approval and that an app must be approved for the required permissions.

The sensible conclusion is that Loop has **some** formal provider relationships, but there is no public evidence that all 96+ sources are formal partnerships.

### 5. Loop combines all incoming records into one common structure

Loop says that every source lands on one governed model, with agreed definitions, mappings, checks, and lineage. This is more important than the raw connector count. Once sales, fees, payouts, locations, dates, and products are translated into the same house format, one new source can feed all of Loop's finance, operations, and marketing products.

### 6. This has taken people, operating effort, and capital

Loop was founded in 2022, raised $6 million in 2024, and announced a $14 million Series A in 2026. Its public roles show customer-success staff managing implementations and integrations, engineers building ingestion pipelines, and operations staff handling exceptions. This is not a catalogue of 100 effortless plug-ins. It is software supported by an implementation and operations team.

## The likely operating playbook

The following is the best-supported reconstruction of Loop's method. The first four points are directly evidenced; the exact internal order is an informed conclusion.

1. Win a multi-location restaurant group with a valuable finance problem.
2. Ask which systems that restaurant already uses.
3. Use the best lawful route available for each system: approved connection, secure file feed, customer export, or customer-authorized portal collection.
4. Bring historical records in during onboarding instead of waiting months for new data.
5. Translate every source into one standard internal format.
6. Have people check mappings, fix exceptions, and keep feeds running.
7. Reuse each connector for the next restaurant with the same system.
8. Seek a formal provider relationship when customer demand is proven or when a write-back action requires it.

That sequence explains how a young company can cover many systems without signing 100 strategic partnerships first.

## What the public evidence does **not** prove

- It does not identify which of Loop's named connectors use an approved interface, a file feed, a portal, or a manual import.
- It does not prove that Loop has a commercial partnership with DoorDash, Uber Eats, Toast, or every logo shown on its site.
- It does not show the reliability, depth, geographic coverage, or freshness of each connector.
- It does not show whether “96+” counts different products from one provider, different feed types, or every source at the same level of capability.
- It does not let us judge the authenticated product or onboarding flow; this review used public material only.

These gaps matter. PrizeSkout should not copy a connector-count claim unless each listed capability is documented and supportable.

## What PrizeSkout should do

PrizeSkout can reach broad coverage without waiting for every platform partnership, while staying safer and more truthful than a connector race.

### Start with records the merchant already controls

For each target platform, support this order:

1. forwarded statements and invoices;
2. scheduled reports sent by email;
3. spreadsheet, PDF, and payout-file upload;
4. secure recurring file delivery for larger groups;
5. approved read-only connections where available;
6. formal partnerships for scale or protected write actions.

This fits PrizeSkout's core promise. Talabat contract material describes merchant summary reports; Deliveroo allows order and invoice downloads in CSV and PDF; Uber Eats Manager provides detailed payment reports. Those existing merchant records can create real coverage before a direct connection exists.

### Treat portal automation as a last-mile option, not the foundation

Loop's hiring material suggests portal automation helped broaden its reach. PrizeSkout may assess the same route, but only when the platform permits it, the merchant clearly authorizes it, credentials are handled safely, access is read-only, and the feed can be monitored. If those conditions are not met, PrizeSkout should use forwarded reports or uploads instead.

### Build a repeatable “source kit”

Each new source should have the same small package:

- what record the merchant provides;
- what period and locations it covers;
- the original file kept unchanged;
- a clear mapping of sales, refunds, fees, promotions, taxes, and payout;
- automatic checks for changed layouts, missing days, duplicates, and stale data;
- a visible status saying whether the result is verified, partial, or blocked.

This turns a one-off customer setup into a reusable PrizeSkout connector.

### Prioritize depth before logo count

For the GCC launch, build excellent coverage for the few sources that dominate a merchant's money flow: Talabat, Deliveroo, HungerStation, Jahez, Keeta, Snoonu, Zid, Salla, the merchant's POS, and its accounting or bank evidence. The exact order should come from pilot merchants, not from a generic logo list.

A source should count as “ready” only when PrizeSkout can reliably collect it, retain the original evidence, detect changes, show coverage and freshness, and stop safely when something is wrong.

### Use customer demand to unlock official access

PrizeSkout should approach platforms with evidence, not only a proposal: named consenting merchants, combined location count, required read-only reports, security controls, and the value to the platform's merchants. That gives the provider a practical reason to approve access. Formal access can then replace a file-based route without changing the merchant experience.

## Recommended 90-day move

### Days 1–30: prove the collection ladder

- Interview five to ten real multi-location merchants and inventory the exact reports they already receive.
- Select the top three marketplace statement formats and one POS export.
- Complete email forwarding, upload, original-file retention, and clear coverage/freshness status for those sources.

### Days 31–60: make each source reusable

- Create and test a standard source kit for each selected format.
- Add change detection and a human review queue when a provider changes its report.
- Backfill historical records for pilot merchants and produce the first verified findings.

### Days 61–90: turn proof into access

- Publish a truthful capability register: automated, file-assisted, pilot, or planned.
- Take verified merchant demand to the top two providers and request approved read-only reporting access.
- Add secure recurring file delivery for larger groups.
- Do not add write actions until the provider permits them and PrizeSkout's merchant-approval and readback controls are proven.

## Bottom line

Loop's advantage is not a secret agreement with everyone. The evidence points to a disciplined collection machine: several access methods, one common data model, strong onboarding, people handling exceptions, and formal partnerships only where they are necessary or valuable.

PrizeSkout can follow the same broad strategy. Its stronger position should be trust: preserve the original record, say exactly what is and is not covered, never turn a batch difference into an order claim without evidence, and never describe a source as live or verified when it is not.

## Sources reviewed

- [Loop homepage and connector claims](https://www.loopai.com/)
- [Loop business-intelligence page: API, SFTP, historical backfill, governance and monitoring](https://www.loopai.com/bi)
- [Loop terms: customer-authorized third-party services](https://www.loopai.com/terms-of-service)
- [Loop ingestion and scraping engineering role](https://www.jobaaj.com/job/loop-ai-delivery-intelligence-platform-software-engineer-internal-toolings-support-karnataka-5-to-9-years-950721)
- [Loop jobs: integration onboarding, ingestion pipelines and operations](https://builtin.com/company/loop-ai-delivery-intelligence-platform/jobs)
- [Sage Intacct's official Loop listing](https://marketplace.intacct.com/MPListing?lid=a2D6S00000hUKYXUA4)
- [Loop's MIXT case study: marketplace reconciliation and Restaurant365 posting](https://www.loopai.com/case-study/mixt-from-bottlenecks-to-breakthroughs)
- [DoorDash official reporting-access requirements](https://developer.doordash.com/en-US/docs/reporting/how_to/get_access/)
- [DoorDash merchant explanation of direct and preferred-partner access](https://help.doordash.com/en-ca/merchants/article/how-can-i-access-the-doordash-reporting-api)
- [Uber Eats official reporting guide](https://developer.uber.com/docs/eats/guides/reporting)
- [Uber Eats official authentication and approval requirements](https://developer.uber.com/docs/eats/guides/authentication)
- [Deliveroo official report and CSV-export guide](https://help.deliveroo.com/en/articles/6463245-how-to-view-and-use-reports-in-hub-excluding-deliveroo-express-partners)
- [Deliveroo official invoice delivery and download guide](https://help.deliveroo.com/en/articles/3206697-why-am-i-not-receiving-my-deliveroo-invoices)
- [Uber Eats Manager payment-report guide](https://help.uber.com/merchants-and-restaurants/article/sales-tab?nodeId=7384c412-3011-40cd-8988-f2ed04198936)
- [Talabat restaurant terms describing monthly summary reports](https://www.talabat.com/page/vendor/terms/restaurants/egypt)
- [Loop's 2024 funding announcement](https://www.loopai.com/blog/loop-raises-6m-to-champion-and-unlock-third-party-delivery-profitability-for-restaurants)
- [Loop's 2026 funding announcement](https://www.loopai.com/blog/loop-ai-raises-14m-series-a)
