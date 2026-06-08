# F-01 Demo: Sample Farm Scenarios & Crew Assignments
## For Tom Bradford Call (May 28-29, 2026)

---

## Scenario Context

**Customer Profile:** Central Valley Ag Staffing (Tom Bradford)
- **Managed Clients:** 50+ farm/orchard operations
- **Peak Season:** March–October (varies by crop)
- **Current Pain:** Manual scheduling across farms, last-minute changes, worker notification delays
- **Demo Purpose:** Show how F-01 forecasts demand and matches crews intelligently

---

## Sample Data: 15 Farm Client Scenarios

### 1. Fresno Valley Almonds (900 acres, harvest Sept 1-30)

**Farm:** Fresno Valley Almond Cooperative  
**Contact:** Maria Santos (manager)  
**Crop:** Almonds (shake & catch)  
**Peak Season:** September (harvest 4 weeks)  
**Typical Crew Size:** 120 workers (pickers + catchers + transport)  
**Skill Levels Needed:**
- Experienced pickers (6+ years): 30 workers
- General pickers: 80 workers
- Catcher/ground crew: 10 workers

**Weather Factor:** Late Aug rain → harvest delayed 3-5 days; hot weather → earlier finish (workers heat-stressed)

**F-01 Workflow:**
1. June 1: Maria enters "Sept 1-30, ~120 workers"
2. F-01 forecasts based on weather patterns → recommends 25/week ramp-up starting July 15
3. July 15-Aug 31: F-01 publishes job openings to Tom's network; workers apply + indicate availability windows
4. Aug 15: F-01 auto-assigns based on skill, location, preference → generates daily schedules
5. Sept 1: First crew of 25 arrives; daily adjustments (weather delays) → F-01 notifies all affected workers in seconds

**Success Metric:** "Instead of 4-5 hours/day manual scheduling, Maria spends 30 min/week reviewing F-01 recommendations."

---

### 2. Kings County Lettuce (200 acres, planting Mar 1-31 + harvest Apr 15-May 15)

**Farm:** Kings Valley Produce  
**Contact:** Roberto Gutierrez  
**Crop:** Iceberg lettuce (2 seasons/year)  
**Peak Demand:** March (planting) + April-May (harvest)  
**Crew Size:** 60 workers (planters + harvesters + packers)

**Skill Breakdown:**
- Experienced planters (can set transplants at 4k/hour): 20
- Harvesters (consistent quality): 30
- Packing/qa crew: 10

**Logistics:** 3 separate sites (Main field, South field, Packing house)

**F-01 Workflow:**
1. Feb 15: Roberto enters 2 seasonal events (March planting, Apr-May harvest)
2. F-01 forecasts 60 workers starting March 1, peaks April 15 (72 hours before harvest, everything must be prepped)
3. Feb 20: Workers see job openings; 45 apply for March, 38 for April-May
4. March 1: First crew assigned; F-01 matches high-skill planters to primary field (most critical for yield)
5. April 10: F-01 flags "only 32 harvesters available; need 30 min/day training for 8 new hires" → Roberto green-lights training budget
6. April 15: 38 workers show up; F-01 tracks hourly attendance + quality (spot-checks from packing crew)

**Success Metric:** "Planting and harvest completed on-time all 3 seasons; no understaffing delays."

---

### 3. Tulare County Grapes (650 acres, pruning + thinning + harvest)

**Farm:** Sierra Vineyard Trust  
**Contact:** Jennifer Walsh (operations)  
**Crop:** Wine grapes + table grapes  
**Seasons:**  
- Pruning: Jan 15 - Feb 28 (40 workers, skilled pruners)
- Thinning: May 1 - Jun 30 (80 workers, general labor)
- Harvest: Aug 1 - Sep 30 (200+ workers)

**Complexity:** 3 separate harvest windows (early-ripening fields, mid-ripening, late-ripening); weather-dependent.

**F-01 Workflow:**
1. Dec 1: Jennifer enters 3 seasonal events with estimated sizes + weather-sensitive dates
2. F-01 creates 3 independent schedules; can see skill requirements ("Pruning requires 8+ years vineyard experience")
3. Jan 2: F-01 publishes 40 pruning positions; by Jan 10, 48 apply (oversubscribed → can cherry-pick best)
4. Jan 15: Pruning crew #1 assigned to Block A (highest-value vineyard)
5. May 1: F-01 publishes 80 thinning openings; same workers from January re-apply (loyalty signal)
6. Aug 1: Harvest starts; F-01 tracks ripeness data by block + worker location → routes workers to highest-value fields first
7. Late Aug: Unexpected heat wave → harvest accelerated 1 week early
   - **Without F-01:** Manual calls to 200+ workers, confusion, no-shows
   - **With F-01:** F-01 sends 2 mass notifications (4-day warning, 1-day confirmation); 95% attendance

**Success Metric:** "No field left unharvested due to crew gaps; net crop value +$2.3M YoY (better timing, less weather loss)."

---

### 4. Kern County Cotton (1200 acres, defoliation + picking)

**Farm:** Bakersfield Cotton Co-op  
**Contact:** David Chen  
**Crop:** Cotton (mechanical harvest, but needs prep crew)  
**Peak Season:** Oct 1 - Nov 30 (8-week defoliation + picking)  
**Crew:** 150 workers (primarily defoliation crew; mechanical pickers do harvesting)

**Unique Factor:** Defoliation timing is critical; done too early = regrowth; too late = mechanical pickers can't operate efficiently.

**F-01 Workflow:**
1. July 1: David enters "Oct 1 - Nov 30, 150 workers, defoliation specialists"
2. F-01 flags: "Defoliation window is tight (7-10 days before mechanical harvest). Weather forecast: Oct rain risk 35%, Nov cold risk 20%. Recommend starting Oct 1 with 120 workers, scaling to 180 if Oct forecast clears."
3. Sept 1: David reviews F-01 forecast; agrees to 3-tier workforce plan (flex to 80-220 based on weather)
4. Oct 1: Crew starts; F-01 integrates with weather API → "Rain predicted Oct 8-10; recommend pre-positioning crews at Blocks 2&3 (covered irrigation available)"
5. Oct 7: Rain confirmed; F-01 auto-rebalances schedule; workers notified of site change + extra pay (+$12/day for covered work)
6. Oct 25: Mechanical harvest begins; F-01 ensures defoliation crew is 100% pulled off (coordination with mechanical contractor)

**Success Metric:** "Zero delays to mechanical harvest; 97% on-time defoliation completion; workers earn +$1,800 (rain-day premium)."

---

### 5. Fresno County Peaches (300 acres, thinning + harvest)

**Farm:** Sun Valley Orchards  
**Contact:** Lisa Moreno  
**Crop:** Fresh peaches (Fresno varietals, 10-week season)  
**Peak:** June (thinning) + July-Aug (harvest)  
**Crew:** 90 workers (thinners + pickers + graders)

**Challenge:** Peach harvest is extremely time-sensitive; ripe peaches bruise easily; need gentle pickers + fast turnaround.

**F-01 Workflow:**
1. April 1: Lisa enters June thinning + July-Aug harvest schedules
2. F-01 flags: "Thinning is labor-intensive; high-skill sorters needed to thin correctly (remove wrong peaches = lost yield). Recommend 60 experienced thinners + 30 new worker trainees (1:2 ratio)."
3. May 15: Job postings go out; F-01 notes "20 peach-thinning specialists responded; that's 33% over-subscription → recruit new trainees with mentorship slots"
4. June 1: Thinning starts; F-01 pairs each new trainee with a specialist for the first 3 days
5. July 1: Harvest begins; F-01 tracks quality metrics per worker (bruise rate, speed); notifies managers if quality dips (possible fatigue → rotate workers)
6. July 20: Heat wave arrives; peaches ripen 3 days early
   - **F-01 action:** Escalate from 80 to 95 workers by July 22; notify standby crew to be ready
   - **Lisa's response:** Confirms; F-01 contacts standby workers; 14 of 18 standby accept
   - **Result:** Zero harvest delays; peak ripeness captured

**Success Metric:** "Harvest window closed 5 days early due to heat; captured premium early-season price (+$450k revenue). Zero bruising complaints from retailers."

---

### 6. Kings County Dairy Support Labor (year-round)

**Farm:** Westside Dairy Association (1,000 head)  
**Contact:** Miguel Reyes  
**Crop:** Dairy (feed prep, cleaning, calf care)  
**Crew:** 25 full-time + 15 seasonal peaks  
**Seasonal Peaks:** Summer (heat = more water management); winter (disease prevention in calves)

**F-01 Workflow:**
1. Q1 annually: Miguel enters base crew + seasonal adjustment factors
2. F-01 tracks 25 FTE + seasonal fluctuations (May-Sep peak = +8 workers; Dec-Jan = +7 workers)
3. F-01 handles shift scheduling (3-person teams, 6 AM + 2 PM + 10 PM shifts, 7 days/week)
4. Real-time: If a FTE calls out → F-01 flags "Shift 2 PM understaffed" → contacts 3 standby workers in priority order (distance, skill, past reliability)
5. Payroll integration: F-01 logs all hours → feeds into Tom's payroll system

**Success Metric:** "Zero unscheduled closures due to staffing gaps; payroll errors drop 80% (F-01 is single source of truth for hours)."

---

### 7. Tulare County Asparagus (150 acres, spring cut + fall clean)

**Farm:** Tulare Fresh Asparagus  
**Contact:** Frank DiMarco  
**Crop:** Asparagus (labor-intensive hand-cutting + sorting)  
**Season:** March 1 - May 31 (spring cut); Sept 15 - Oct 31 (fern burn-down)  
**Crew:** 80 workers (cutters + sorters)

**Specialty:** Asparagus must be hand-cut and cold-packed within 4 hours or quality degrades.

**F-01 Workflow:**
1. Feb 1: Frank enters March-May schedule (80 workers, 6-day weeks)
2. F-01 notes: "Asparagus cutting has 2-person harvesting teams; 1 cutter + 1 sorter/bundler. Recommend recruiting as pairs."
3. Feb 15: 42 applicants (21 pairs + 2 unpaired); F-01 matches unpaired workers + recommends pairing strategy
4. March 1: Cutting begins; F-01 tracks:
   - Cut rate per team (target: 400 lbs/day/team)
   - Cold-chain time (harvest → ice → truck; must be < 4 hours)
   - Quality (% bruised/broken)
5. Late Mar: One sorter quits unexpectedly; F-01 flags "Team 7 (cutter Michael + sorter Ana) now 1/2. Recommend pairing Michael with standby sorter Carla; Ana's original cutter (David) pairs with new sorter trainee."
6. Quality maintained; no harvest delays

**Success Metric:** "Spring and fall harvests 100% on-schedule; quality metrics consistent (< 2% bruising); 95% worker retention season-to-season."

---

### 8-15. Additional Scenarios (Compact View)

| # | Farm | Crop | Season | Crew Size | F-01 Key Value |
|---|------|------|--------|-----------|-----------------|
| 8 | Kern Valley Tomatoes | Tomatoes (field) | May-Oct | 110 | Real-time ripeness matching; hot-weather crew management |
| 9 | Kings Citrus Packing | Oranges/lemons | Nov-Apr | 75 | Multi-site coordination (field + packing house); cold-weather adaptations |
| 10 | Fresno Berries Co-op | Strawberries + raspberries | Feb-Jun | 200+ | Ultra-high-turnover labor pool; daily rate planning |
| 11 | Tulare Walnut Harvest | Walnuts (shake + pick) | Aug-Sep | 95 | Multi-skill matching (pickers vs. equipment operators); ripeness forecasting |
| 12 | Kern Processing Plant | Raisin processing | July-Oct | 120 | Indoor facility; climate control needs; shift-based 24/7 operations |
| 13 | Fresno Alfalfa | Alfalfa hay (cutting + baling) | Apr-Oct (4-5 cuts) | 65 | Repetitive multi-cycle planning; equipment operator + labor crew sync |
| 14 | Kings Flower Farm | Cut flowers (tulips, roses) | Year-round (peak: Jan-Feb) | 45 | Specialty crop; hand-harvesting skill; seasonal spikes predictable |
| 15 | Tulare Processing Facility | Fruit drying (apricots, prunes) | July-Sep | 150 | Facility-based; production-line rhythm; continuous crew requirement |

---

## Demo Narrative: How F-01 Saves Tom Time & Money

### The Problem (Before F-01)
Tom manages 50 farms with 1,200+ peak-season workers. Every spring and summer:
- **Sunday evening:** 5 hours on the phone + email chain with farm managers
- **Monday:** Manual spreadsheet updates across 15 Excel files
- **Tuesday:** "Maria's farm is understaffed; we need 10 pickers by Thursday"
  - Tom texts his network; waits 2 hours for responses
  - 6 workers respond; 4 actually show up
  - Maria's harvest delayed 1 day; cost: $15K lost produce
- **By week's end:** Tom is exhausted; at least one farm isn't optimized; some workers are frustrated with last-minute notifications

### The Solution (With F-01)
Same scenario with F-01:
- **Feb 1:** Tom enters all 50 farms' seasonal plans in F-01 (one-time data entry, then reuse templates)
  - Forecasts: 1,200 workers needed; shows week-by-week ramp
- **March 1:** F-01 publishes job openings; workers apply from phone/app
- **March 15:** F-01 auto-matches workers to jobs based on:
  - Skill (past ratings, experience level, certifications)
  - Location (minimize drive time)
  - Availability (which weeks they can work)
  - Preference (workers specify farms/crops they prefer)
- **April 1:** F-01 posts daily schedules; workers see full season upfront → fewer surprises + better planning
- **May 15:** Maria texts Tom "Harvest moved up 3 days due to heat"
  - **Tom's action:** 2-click change in F-01 (new harvest dates)
  - **F-01 handles:** Auto-notifies 200+ affected workers + managers; reroutes crews; updates payroll setup
  - **Result:** 95% crew shows up; 0-day delay
- **By summer's end:** Tom spends ~2 hours/week on coordination (not 5+ hours/day)

---

## Key Demo Talking Points

### 1. **Demand Forecasting**
- **Show:** Historical data for a farm (e.g., "Fresno Almonds, 5-year history")
- **Explain:** "F-01 learns your patterns—weather, crop maturity, labor availability. For Fresno Almonds, we forecast Sept 1 harvest ± 3 days, labor ramp ± 5%."
- **Benefit:** "Tom can tell Maria in June exactly how many workers to expect in Sept → Maria hires contractors early, avoids last-minute panic hiring."

### 2. **Intelligent Crew Matching**
- **Show:** A job opening (e.g., "100 peach pickers needed, July 1-31")
- **Explain:** "F-01 matches 40 experienced pickers (proven quality) + 30 general pickers + 30 trainees (each paired with a mentor). It avoids pairing inexperienced workers with complex crops."
- **Benefit:** "Quality stays high; trainee retention improves; experienced workers earn premium wages (proven value)."

### 3. **Real-Time Adjustments**
- **Show:** A weather change (e.g., "Cold front moves in; grape thinning delayed 1 week")
- **Explain:** "F-01 recalculates schedule → notifies 80 workers + 3 managers in 60 seconds. Workers see new dates in the app; managers see 'Gap on May 8-10, 12 workers available as backup'."
- **Benefit:** "Tom doesn't have to call everyone manually. Workers trust the app because it's accurate and fast."

### 4. **Compliance & Payroll**
- **Show:** Hours logged + compliance checklist (breaks, meal periods, wage compliance)
- **Explain:** "F-01 logs every shift. California ag labor rules require meal breaks every 4 hours, max 10-hour days. F-01 flags violations before payroll."
- **Benefit:** "Tom avoids fines. His accountant gets audit-ready payroll data automatically."

### 5. **Mobile Experience**
- **Show:** Worker app (schedule view, shift check-in, hours logged, direct message from manager)
- **Explain:** "Workers see their schedule 2 weeks ahead. They can swap shifts with peers (manager approves). They check in with a photo (time + location logged). No more 'Did he actually show up?' guessing."
- **Benefit:** "Workers feel valued (they know the plan). Tom has accountability (photo + location proof)."

---

## Success Criteria for Tom Bradford's Pilot

1. **Forecast Accuracy:** F-01 predicts labor demand ± 10% vs. actual
2. **Speed:** Tom spends <3 hours/week on scheduling (vs. current 15+ hours)
3. **Worker Retention:** 80%+ of workers re-book for next season (vs. current 60%)
4. **Zero Understaffing:** No delays due to crew gaps
5. **Payroll Accuracy:** 100% compliance-ready labor logs (vs. current 92% with manual tracking)

---

## How to Use This Data in the Live Demo

**Opening:** "Tom, I want to show you F-01 using real farm scenarios from the Central Valley. I've set up 15 farms—some like yours, some different—so you can see how it handles different crops and crew sizes."

**Demo Flows:**
1. **Fresno Almonds:** Show forecast, seasonal ramp, skill matching
2. **Kings Lettuce:** Show multi-site coordination + 2-season complexity
3. **Sun Valley Peaches:** Show real-time adjustments (heat wave scenario)
4. **Westside Dairy:** Show year-round base crew + emergency coverage

**Q&A Likely:**
- "Can I use this with my existing worker database?" → Yes, F-01 imports + enriches
- "What if a farm uses a different payroll system?" → F-01 exports standard format; integrations available
- "How much does this cost?" → Pilot is free; after, pricing is per-farm-per-season
- "Can my workers use this on old phones?" → Responsive web + iOS/Android apps

---

## File Manifest for Demo

- **This file:** F01_DEMO_SAMPLE_DATA.md (scenarios + talking points)
- **Next file:** F01_DEMO_MOCKUPS.md (UI screenshots / wireframes if live app unavailable)
- **Backup:** F01_PRODUCT_OVERVIEW.md (feature reference, already exists)
- **Call script:** ESC-272 (demo outline, once unblocked by ESC-270)

