# RetailIQ Sales Guidebook: Promotion Performance

This guidebook explains how the RetailIQ analytics team measures promotions, which benchmark ranges count as healthy, and what to recommend for each diagnosis. Use it together with the KPI tools: the tools give the numbers, this guide explains what they mean.

## How a promotion is evaluated

Every promotion is judged against what the same SKUs would have sold without it. RetailIQ uses an equal-length **baseline window** immediately before the promotion starts. For a promotion running 10 to 20 March, the baseline is the 11 days ending 9 March. The same targeted SKUs are measured in both windows, so differences come from the promotion rather than from a change in the product mix.

Always look at the five KPIs together. A promotion can show a large unit uplift and still lose money. It can also look weak only because it ran out of stock. Read uplift first, then discount efficiency, then the post-promotion period, stock and audience.

## Incremental sales uplift

Unit uplift = (promotion units - baseline units) / baseline units.
Revenue uplift = (promotion revenue - baseline revenue) / baseline revenue, where revenue is the price actually paid after discount.

The result falls into one of four classes:

- **Clean win**: units and revenue both rose. The discount created more demand than it gave away.
- **Volume up, revenue down**: more units sold but revenue fell. The discount was deeper than the demand it created. This is the most common failure of deep-discount and BOGO mechanics.
- **Dud**: units and revenue were flat or down. The offer did not move shoppers at all.
- **Mixed**: revenue rose while units fell. This is rare; check for a price or mix change.

If the baseline window has no sales, the uplift cannot be computed. Treat the promotion as unverified rather than as a win or a loss.

## Discount efficiency

Discount efficiency = incremental revenue / total discount given.

Total discount given is the list-price value minus what customers actually paid on promoted sales. Incremental revenue is promotion revenue minus baseline revenue.

- **Above 1.0x**: the promotion paid for its own discount. Every dollar of discount returned more than a dollar of extra revenue.
- **0 to 1.0x**: the promotion grew revenue, but by less than the money it gave away.
- **Below 0**: revenue fell versus baseline. The discount bought nothing.

Use discount efficiency to rank promotions by cost-effectiveness. Two promotions with the same uplift can have very different efficiency if one used a much deeper discount.

## Post-promotion dip and pull-forward

Post-period ratio = units sold in the equal-length period after the promotion / baseline units.

- **0.90 to 1.10**: healthy. Demand returned to normal after the promotion.
- **0.75 to 0.90**: a mild hangover. Note it, but it is usually seasonal noise.
- **Below 0.75**: **pull-forward**. Shoppers bought ahead at the promoted price and then stopped buying. Part of the uplift was borrowed from future weeks rather than created.

Pull-forward is most likely on products that are easy to stockpile: cleansers, moisturisers, shampoo and sunscreen. It is also most likely on short, deep, heavily advertised events like Black Friday and flash sales. When you see it, subtract the post-period shortfall from the uplift before calling the promotion a success.

## Stockouts during a promotion

The stockout trace walks each targeted SKU through the promotion window. It starts from the opening stock (deliveries received minus units sold before the start), adds deliveries and subtracts sales day by day. A **stockout** means the shelf ran empty while promotion days were still left.

When a SKU stocks out, the tool estimates **missed units**: the daily sales rate before the stockout, multiplied by the days remaining, minus anything sold after a restock.

How to read it:

- A stockout means the measured uplift **understates** true demand. The promotion may have been a clean win that supply capped.
- A stockout early in the window (in the first third) is a planning failure. The forecast or the replenishment order was far too small.
- A stockout late in the window (the last day or two) is usually acceptable and shows a well-sized order.
- Check the next restock date. If it falls after the promotion, the stockout also depresses the post-promotion period, which can look like pull-forward.

## Redemption demographics

The demographics tool compares the share of promoted sales made by customers under 25 against the under-25 share of the whole customer base. Guest checkouts (no customer record) count as redemptions but have no age.

- A gap of **15 percentage points or more** means the promotion **over-indexed** with younger shoppers.
- Over-indexing is a success when the brief targeted students or new-to-brand customers. Otherwise it can signal that the offer was mostly picked up by bargain-seekers outside the core audience.

## Benchmarks by promotion type

These ranges come from RetailIQ's historical calendar and describe typical healthy results.

| Promotion type | Typical discount | Healthy unit uplift | Healthy revenue uplift | Pull-forward risk |
|---|---|---|---|---|
| Percentage Off | 10-30% | +40% to +120% | +15% to +70% | Low |
| Seasonal Sale | 15-30% | +60% to +150% | +30% to +90% | Low to medium |
| Flash Sale | 30-50% | +80% to +200% | 0% to +60% | High |
| BOGO | Effective 50% | +70% to +170% | -10% to +35% | Medium |

A BOGO usually needs about twice the units to break even on revenue, because each pair is sold at half price. Judge BOGO mainly on discount efficiency and on whether it brought in new customers.

A flash sale is judged on traffic and new customers as much as revenue. A flat revenue result is acceptable if the post-promotion period holds up.

## Diagnostic playbook: clean win

- Repeat or extend the promotion if discount efficiency is above 1.0x; it pays for its own discount.
- Test a slightly lower discount next time. If the uplift holds, margin improves.
- Check the post-promotion period before celebrating: a dip below 0.75x means part of the win was pull-forward.
- Rule out a seasonal peak or a stockout on competing products before crediting the promotion.

## Diagnostic playbook: volume up, revenue down

- Use a shallower discount next time (for example 30% instead of 50%), or a spend threshold such as "20% off when you buy two".
- For BOGO, test "buy two, get one free" or a gift-with-purchase; both protect revenue per unit.
- If the brief was traffic or new customers, judge it on redemption demographics and new-customer share before calling it a failure.

## Diagnostic playbook: dud

- Do not repeat the mechanic on the same SKUs; move the discount budget to promotions with efficiency above 1.0x.
- Check media support first: promotions on slow-moving SKUs with no paid media or display space rarely move.
- For clearance events, measure success by stock cleared rather than uplift.

## Diagnostic playbook: pull-forward

- Judge the promotion on its uplift net of the post-period shortfall, not on the headline uplift.
- Shorten the window, exclude easy-to-stockpile SKUs, or cap units per customer.
- Keep the same SKUs off promotion for at least six weeks so the next baseline is not depressed.

## Diagnostic playbook: stockout

- Treat the measured uplift as a floor: true demand was higher than the stock allowed.
- Build stock before the next promotion: order at least 1.5 times the forecast promotion demand and confirm deliveries before launch.
- If a supplier delay is known before launch, postpone the promotion or swap in substitute SKUs that are in stock.
- Do not cut the promotion's budget because of a supply-capped result.

## Recommendation guidelines

- Lead with the decision: repeat, adjust or stop.
- Every recommendation must cite the KPI that supports it.
- Prefer small, testable changes: one discount level, one SKU set, one channel.
- Flag any data limitation: no baseline, very low volumes (under 30 baseline units), or overlapping events.

## Glossary

- **Baseline**: the equal-length period immediately before a promotion, used as the "no promotion" comparison.
- **Incremental revenue**: promotion revenue minus baseline revenue.
- **Cannibalisation**: sales a promotion takes from other products in the same category rather than creating new demand.
- **Halo effect**: extra sales of non-promoted products caused by the promotion's traffic.
- **Pull-forward**: purchases moved earlier in time because of the promotion, followed by a dip.
- **BOGO**: buy one, get one free.
- **Flash sale**: a short promotion, usually one to four days, with a deep discount.
- **SKU**: stock-keeping unit, one specific size or shade of a product.
- **ROI**: return on investment; for promotions, discount efficiency is the working proxy.
