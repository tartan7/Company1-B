# F-01 UI Reference Guide
## Demo Walkthrough & Visual Interface Documentation

---

## 1. Dashboard Overview

### Main Screen Layout
```
┌─────────────────────────────────────────────────────────────┐
│  F-01: Seasonal Labor Scheduler          [Search] [Settings] │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Quick Stats (Cards)                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Active Farms │  │ Workers Total│  │ Shifts/Week  │       │
│  │      50      │  │    1,247     │  │     342      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  Upcoming Seasons (Table)                                     │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Farm              │ Season    │ Crew │ Start   │ Status │
│  ├──────────────────────────────────────────────────┤       │
│  │ Fresno Almonds    │ Harvest   │ 120  │ Sep 1  │ On-Track
│  │ Kings Lettuce     │ Harvest   │  60  │ Apr 15 │ Confirmed
│  │ Sun Valley Peaches│ Harvest   │  90  │ Jul 1  │ Planning
│  │ [scroll down]     │           │      │        │         │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  Action Buttons (Top Right)                                  │
│  [+ New Farm] [Import Workers] [Forecasts] [Reports]        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Metrics Displayed
- **Active Farms:** 50
- **Total Workers:** 1,247 (across all farms)
- **Shifts This Week:** 342 scheduled
- **Upcoming Seasons:** 12 active season plans
- **Staffing Gaps:** 3 flagged (click to resolve)

---

## 2. Farm Detail View

### Fresno Almonds (Harvest 2026)

```
┌─────────────────────────────────────────────────────────────┐
│  Fresno Valley Almonds                  [Edit] [Archive]    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Season Info                                                  │
│  ├─ Crop: Almonds (shake & catch)                            │
│  ├─ Dates: Sep 1-30, 2026                                    │
│  ├─ Estimated Crew: 120 workers                              │
│  ├─ Manager: Maria Santos (maria@fresnoalmond.com)           │
│  └─ Status: Forecasting [50% complete]                      │
│                                                               │
│  Crew Composition (Skill-Based)                              │
│  ┌────────────────────────────────────┐                     │
│  │ Experienced Pickers (6+ yrs)       │ 30  │ ████░░░░░░  │
│  │ General Pickers                    │ 80  │ ████████░░  │
│  │ Catcher/Ground Crew                │ 10  │ ████░░░░░░  │
│  │ [+ Add Skill Level]                │     │             │
│  └────────────────────────────────────┘                     │
│                                                               │
│  Demand Forecast (by Week)                                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Crew Size Over Time (Sep 1-30)                   │       │
│  │                                                  │       │
│  │        │                                         │       │
│  │    120 │         ╱╲                             │       │
│  │    100 │        ╱  ╲                            │       │
│  │     80 │       ╱    ╲╮                          │       │
│  │     60 │      ╱       ╲                         │       │
│  │     40 │     ╱         ╲╮                       │       │
│  │     20 │    ╱           ╲                       │       │
│  │      0 │───┴─────────────┴─────────────────────│       │
│  │        └──────────────────────────────────────────┤       │
│  │         Week 1   Week 2   Week 3   Week 4        │       │
│  │                                                  │       │
│  │ [Based on 5-year historical data + weather api] │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  Weather Impact                                              │
│  ├─ Forecast: Clear, temp 85-92°F                           │
│  ├─ Risk: Late Aug rain (35% probability)                    │
│  │  └─ Mitigation: If rain occurs, extend Week 1 by 3-5 days
│  └─ Action: Monitor forecast; adjust crew ramp if needed    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Navigation
- **Tabs:** Overview | Crew Matching | Schedule | Workers | Reports
- **Quick Actions:**
  - [Adjust Forecast] [Publish Jobs] [Import Workers] [Download Plan]

---

## 3. Crew Matching View

### Intelligent Worker Assignment

```
┌─────────────────────────────────────────────────────────────┐
│  Crew Matching: Fresno Almonds                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Available Workers vs. Job Requirements                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Required: 120 workers                                │   │
│  │ Applied: 118 workers (98% fill rate)                 │   │
│  │ Perfect Matches: 84 workers (71%)                    │   │
│  │ Good Matches: 28 workers (23%)                       │   │
│  │ Requires Training: 6 workers (5%)                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Perfect Matches: Experienced Pickers (Target: 30)          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Worker Name        │ Years  │ Rating │ Location   │ Fit  │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ✓ Roberto Martinez │  8 yrs │ 4.8★   │ Fresno    │ 100% │
│  │ ✓ Maria Solis      │  6 yrs │ 4.7★   │ Fresno    │ 100% │
│  │ ✓ Juan Gutierrez   │  7 yrs │ 4.6★   │ Visalia   │ 95%  │
│  │ ✓ Carmen Lopez     │  9 yrs │ 4.9★   │ Clovis    │ 98%  │
│  │ [+26 more]         │        │        │           │      │
│  │ [Assign Selected] [Adjust Criteria] [Add More]     │      │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Good Matches: General Pickers (Target: 80)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Worker Name        │ Years  │ Rating │ Location   │ Fit  │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ✓ Luis Fernandez   │  3 yrs │ 4.2★   │ Fresno    │ 88%  │
│  │ ✓ Sofia Mendez     │  2 yrs │ 4.1★   │ Visalia   │ 85%  │
│  │ [+26 more]         │        │        │           │      │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Requires Training: New Workers (Target: 10, paired w/mentors)
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Trainee Name       │ Mentor              │ Schedule  │    │
│  ├──────────────────────────────────────────────────────┤   │
│  │ David Chen (new)   │ Roberto Martinez    │ Week 1-2  │    │
│  │ Ana Torres (new)   │ Maria Solis         │ Week 1-2  │    │
│  │ [+4 more]          │                     │           │    │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Assignment Status                                           │
│  ├─ 30 Experienced: ASSIGNED                                │
│  ├─ 80 General: ASSIGNED (28 pending acceptance)             │
│  └─ 10 Trainees: ASSIGNED (with mentors)                    │
│                                                               │
│  [CONFIRM ASSIGNMENTS] [ADJUST] [ADD MORE WORKERS]          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Matching Criteria
- **Skill Level:** Years of experience, past ratings, certifications
- **Location:** Distance from farm (minimize travel)
- **Availability:** Which weeks they can work
- **Preference:** Crops/farms they prefer
- **Mentorship:** Experienced workers paired with trainees

---

## 4. Schedule View

### Weekly Schedule (Fresno Almonds, Week 1)

```
┌─────────────────────────────────────────────────────────────┐
│  Schedule: Fresno Almonds (Sep 1-7)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Filter: [All Crews ▼] [All Dates ▼]                       │
│                                                               │
│  Sep 1 (Mon) - Sep 7 (Sun)                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Crew   │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun   │    │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Set A  │  25 │  25 │  25 │  25 │  25 │  25 │  0   │    │
│  │ (Exp.)  │     │     │     │     │     │     │      │    │
│  │        │     │     │     │     │     │     │      │    │
│  │ Set B  │  30 │  30 │  30 │  30 │  30 │  30 │  15  │    │
│  │ (Gen.)  │     │     │     │     │     │     │      │    │
│  │        │     │     │     │     │     │     │      │    │
│  │ Set C  │   8 │   8 │   8 │   8 │   8 │   8 │   8  │    │
│  │ (Catch) │     │     │     │     │     │     │      │    │
│  │        │     │     │     │     │     │     │      │    │
│  │ TOTAL  │  63 │  63 │  63 │  63 │  63 │  63 │  23  │    │
│  │ Target │  65 │  65 │  65 │  65 │  65 │  65 │  25  │    │
│  │ GAP    │  -2 │  -2 │  -2 │  -2 │  -2 │  -2 │  -2  │    │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  Actions                                                     │
│  ├─ [Gap Alert: 2 workers short Wed-Fri. Recommended: 2    │
│  │  standby workers from Set B to Cover Pool]              │
│  ├─ [Adjust Crew Size] [Add Standby Workers] [Download]    │
│  └─ [Post to Workers] (sends notifications to all assigned) │
│                                                               │
│  Worker Assignments (Detailed)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Name            │ Crew │ Mon-Fri  │ Sat │ Sun │ Wage │  │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Roberto Martinez│ Set A│ Mon-Fri  │ Sat │ OFF │ $22  │  │
│  │ Maria Solis     │ Set A│ Mon-Fri  │ Sat │ OFF │ $21  │  │
│  │ Luis Fernandez  │ Set B│ Mon-Fri  │ Sat │ Sun │ $18  │  │
│  │ Sofia Mendez    │ Set B│ Mon-Sun  │ -   │ -   │ $18  │  │
│  │ [+59 more workers]    │          │     │     │      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Schedule Features
- **Drag-to-assign:** Drop workers onto days
- **Conflict detection:** Flags double-bookings, overtime violations
- **Weather integration:** Shows weather forecast; suggests adjustments
- **One-click publish:** Posts schedule to all workers (mobile app + email)

---

## 5. Real-Time Adjustment Scenario

### Weather Change: Heat Wave (In-Demo Simulation)

```
BEFORE: Sep 7 (Tuesday)
┌─────────────────────────────────────────────────────────────┐
│  Forecast Updated: HEAT WAVE detected                        │
│  ⚠ Alert: Temperature expected 102-105°F Wed-Fri            │
│                                                               │
│  Current Schedule Impact                                     │
│  ├─ Original target (Wed-Fri): 63 workers/day               │
│  ├─ Adjusted recommendation: 55 workers/day                  │
│  │  (Reduce hours; increase breaks; prevent heat illness)   │
│  ├─ Wage impact: +$2.50/hr heat premium (12 hr shifts)     │
│  └─ Estimated cost increase: $980 for 3 days                │
│                                                               │
│  Action Required                                             │
│  ├─ [CONFIRM ADJUSTED SCHEDULE] → sends new schedule to    │
│  │  all 55 workers (notifies of heat premium pay)           │
│  └─ [MONITOR] → F-01 tracks heat-related absences/illness   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

AFTER: [CONFIRM ADJUSTED SCHEDULE] clicked
┌─────────────────────────────────────────────────────────────┐
│  ✓ Schedule Updated & Notifications Sent                    │
│                                                               │
│  Notification Summary                                        │
│  ├─ 55 workers notified (in-app + SMS)                      │
│  │  Message: "Heat wave Wed-Fri. New schedule: 8am-8pm with │
│  │           2-hour midday break. Heat premium: +$2.50/hr.  │
│  │           Bring water + hat. Questions? Reply here."     │
│  ├─ Response rate: 48 accepted within 15 min, 5 pending     │
│  │ 2 unable to work (family emergency, ...)                │
│  └─ Standby pool: 8 workers on alert; 3 confirmed available │
│                                                               │
│  Revised Schedule (Wed-Fri)                                  │
│  ├─ Original: 63 workers/day                                │
│  ├─ Adjusted: 55 workers/day                                │
│  ├─ Gap due to 2 no-shows: 2 standby workers called          │
│  └─ Final: 57 workers (97% coverage despite heat)           │
│                                                               │
│  Maria Santos (Farm Manager) sees dashboard update:          │
│  "Wed: 57 workers confirmed | Heat protocol active | Check-in
│   via app. No manual calls needed."                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Demo Talking Point
"You can see how F-01 handles real-world changes. Instead of calling 63 workers on Tuesday night and hoping they answer, Maria just confirms one schedule change. F-01 handles all the notifications. Workers get accurate, timely information. No one is surprised at harvest time."

---

## 6. Mobile App View

### Worker Dashboard (iOS/Android)

```
┌──────────────────────────┐
│  F-01 Worker App         │
├──────────────────────────┤
│                          │
│  [Profile: Luis F.]      │
│  ☆ 4.2 stars            │
│  Fresno area             │
│                          │
│  ──────────────────────  │
│                          │
│  My Schedule (Next 14d)  │
│  ┌────────────────────┐  │
│  │ Mon 9/1  Fresno A. │  │
│  │ $22/hr × 8h        │  │
│  │ 8:00 AM - 5:00 PM  │  │
│  │ [Check In]         │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ Tue 9/2  Fresno A. │  │
│  │ $22/hr × 8h        │  │
│  │ 8:00 AM - 5:00 PM  │  │
│  │ [Check In]         │  │
│  └────────────────────┘  │
│  [+ 12 more shifts]      │
│                          │
│  ──────────────────────  │
│                          │
│  My Earnings (This Week) │
│  ┌────────────────────┐  │
│  │ Mon: $176 (8 hrs)  │  │
│  │ Tue: $176 (8 hrs)  │  │
│  │ ────────────────   │  │
│  │ Total: $352 earned │  │
│  │                    │  │
│  │ Est. Total (5 days)│  │
│  │ $880 (40 hrs)      │  │
│  └────────────────────┘  │
│                          │
│  Messages                │
│  ┌────────────────────┐  │
│  │ Maria Santos:      │  │
│  │ "Heat wave Wed-Fri │  │
│  │ New schedule +$2.50│  │
│  │ /hr. See app."     │  │
│  │ [Read] [Reply]     │  │
│  └────────────────────┘  │
│                          │
│  [Check In] [Messages]   │
│  [Schedule] [Earnings]   │
│                          │
└──────────────────────────┘
```

### Key Mobile Features
1. **Schedule View:** Full season + next 2 weeks detail
2. **Check-In:** Photo + location logged automatically
3. **Hours Tracking:** Real-time earnings estimate
4. **Direct Messaging:** Farm manager can send alerts/questions
5. **Language Support:** English + Spanish (toggle in settings)

---

## 7. Reports & Analytics

### Sample Report: Staffing Performance

```
Report: Fresno Almonds - Sep 1-30 Staffing Summary
═════════════════════════════════════════════════

1. Forecast Accuracy
   Target Crew Size: 120 (avg across 4 weeks)
   Actual Crew Size: 118 (avg)
   ├─ Accuracy: 98.3% ✓
   ├─ Week 1: 120 actual vs. 120 forecast (100%)
   ├─ Week 2: 119 actual vs. 120 forecast (99.2%)
   ├─ Week 3: 118 actual vs. 120 forecast (98.3%)
   └─ Week 4: 115 actual vs. 120 forecast (95.8%)

2. Crew Retention
   ├─ Workers who completed season: 115 of 118 (97.5%)
   ├─ Workers returning next season: 108 of 115 (93.9%)
   ├─ New workers vs. Returning: 12 new, 103 returning
   └─ Recommendation: "Experienced crew loyalty is strong;
                       invest in retention bonuses for top 20%"

3. Schedule Compliance
   ├─ Shifts posted on-time: 28 of 28 (100%)
   ├─ Avg. notice to workers: 8.2 days
   ├─ Schedule changes mid-season: 3 (all due to weather)
   ├─ Crew adjustment time: <1 hour (via F-01)
   └─ Workers notified within 30 min: 100% (automated)

4. Cost Analysis
   ├─ Total Hours: 3,760 (120 workers × 4 weeks × 5 days × 8 hrs)
   ├─ Total Wages: $71,400 (avg $19/hr, $21/hr for experienced)
   ├─ Heat Premium Days: 3 days (Wed-Fri, Sep 15-17)
   │  └─ Heat premium cost: $980 extra
   ├─ Overtime: 0 hrs (perfect scheduling prevented unneeded OT)
   └─ Estimated Savings (vs. manual scheduling): $3,200
       (prevented 2 days understaffing × 10 workers × $160/day)

5. Quality Metrics
   ├─ Worker injuries (heat-related): 0 ✓
   ├─ Absenteeism rate: 1.7% (2 workers x 1 day each)
   ├─ Quality complaints from Maria: 0 ✓
   └─ Worker satisfaction (post-season): 4.6★ (survey of 50)

6. Key Insights
   ├─ Forecast was highly accurate (98%); adjust 2026 model slightly
   ├─ Experienced worker retention is your competitive advantage
   ├─ Heat wave management was seamless (F-01 automation)
   └─ Next season: Consider 8-week pre-planning (add 2 weeks upfront)

✓ HARVEST SUCCESSFUL: On-time, on-budget, zero safety incidents.
```

---

## 8. Key UI Patterns for Demo

### Pattern 1: "One-Click Batch Action"
**Demo:** "I'm going to change the harvest date from Sep 1 to Sep 4. Watch."
- Click farm name
- Click "Edit Dates"
- Change "Sep 1" to "Sep 4"
- Click "Update & Notify Workers"
- **Result:** In 30 seconds, all 118 workers get notification of 3-day delay + option to adjust availability

### Pattern 2: "Intelligent Gap Detection"
**Demo:** "F-01 constantly watches for gaps. See this? We're short 2 workers Wed-Fri."
- Dashboard shows red warning: "Gap: 2 workers, Sep 15-17"
- Click warning
- F-01 auto-suggests: "2 standby workers from Set B available"
- One-click assignment

### Pattern 3: "Worker Profile Deep-Dive"
**Demo:** "Let's look at Roberto's profile—this is how F-01 learns who's best for what."
- Click worker name
- See: experience, ratings, past seasons, certifications, location, wage
- F-01 match score shown alongside (e.g., "99% match for almond picking")

### Pattern 4: "Weather-Driven Forecasting"
**Demo:** "F-01 watches the weather API. When forecasts change, it recalculates."
- Show forecast map (animated if possible)
- "Rain predicted Oct 8. F-01 flags early finish possibility."
- Show adjusted schedule recommendation

---

## Notes for Demo

1. **Emphasize speed:** "What took Tom 4 hours of phone calls now takes 5 minutes."
2. **Show real data:** Use the 15-farm scenarios; they're realistic Central Valley farms.
3. **Interactive moment:** Let Tom click a worker to see their profile during the call.
4. **Mobile moment:** Switch to phone app; show worker view; emphasize "Workers see everything."
5. **One great story:** Use Sun Valley Peaches heat wave scenario; it shows problem → real-time solution.

