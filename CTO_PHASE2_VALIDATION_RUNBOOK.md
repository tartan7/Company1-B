# Phase 2 Validation Coordination Runbook
## June 9-20, 2026

**Owner**: CTO  
**Coordination Period**: June 9-20 (12 days)  
**Audience**: CTO, Backend Engineer, Customer Teams  

---

## 1. Customer Communication Plan

### Daily Operations Procedure
**Customer Issue Reporting Channel**: Dedicated Slack channel `#validation-issues` (or email: validation-support@company.jp)

**Reporting Process**:
1. Customer describes issue with:
   - Timestamp (JST)
   - Service/feature affected
   - Steps to reproduce
   - Expected vs. actual behavior
   - Severity (Critical/High/Medium)

2. CTO receives notification → triages within 15 minutes
3. CTO responds with triage level and expected response time
4. Backend Engineer begins investigation/fixes per severity SLA

### Contact Protocol & Escalation Path

| Severity | Initial Response | Fix SLA | Escalation |
|----------|-----------------|---------|------------|
| **Critical** (data loss, RLS breach, >2s queries) | 30 min | 2 hours | CTO → CEO if blocking customer operations |
| **High** (wrong calculations, missing functions, 500-2000ms latency) | 2 hours | Next business day (24h) | CTO coordinates priority |
| **Medium** (UX improvements, non-blocking issues) | Next business day | Document for Phase 4 | Document only, no fix commitment |

### Daily Status Check-ins
**Time**: 6:00 PM JST (end of business)  
**Participants**: CTO (lead) + Backend Engineer + Customer representative  
**Duration**: 10 minutes  
**Format**:
1. Summary of issues received (count by severity)
2. Issues resolved in last 24 hours
3. Issues in progress (current status)
4. Blockers or escalations needing discussion
5. Plan for next day

**Distributed via**: Status update email to all validation participants

---

## 2. Feedback Collection Templates

### Template A: VBA Migration Accuracy (June 10 Feedback Cycle)

```
FEEDBACK FORM: VBA Migration Accuracy
Date: [June 10, 2026]
Customer: [Name]
Service: [financial-statements / invoice-generator-jp / etc.]

1. TEMPLATE BEHAVIOR vs. LEGACY
   - Which VBA features did you test? [list]
   - Did outputs match legacy system? Y / N / Partial
   - Discrepancies observed: [describe]
   - Severity: Critical / High / Medium / Low
   
2. FORMULA ACCURACY
   - Which formulas/calculations were tested?
   - Results vs. legacy: Match / Minor difference / Major difference
   - Details: [specific values or percentages off]

3. AUTOMATION FEATURES
   - Which automation features did you test? [list]
   - Did they work as expected? Y / N / Partial
   - Issues: [describe]

4. OVERALL ASSESSMENT
   - Would you use this in production? Y / N / Needs fixes
   - Top 3 improvements needed: [list]

Additional notes: [open feedback]
```

### Template B: Financial Data Accuracy (June 10 & 17)

```
FEEDBACK FORM: Financial Data
Date: [June 10 or 17, 2026]
Customer: [Name]
Period: [dates tested]

1. RECONCILIATION
   - Tested account balances? Y / N
   - Match between system and source? Y / N
   - Discrepancies (if any): [amount, account, date]

2. ACCURACY CHECKS
   - Revenue calculations: Correct / Off by X% / Major errors
   - Expense categorization: Correct / Needs review / Broken
   - Tax calculations: Correct / Off by X / Missing

3. REPORTING CORRECTNESS
   - P&L statements: Accurate / Minor issues / Major issues
   - Balance sheet: Accurate / Minor issues / Major issues
   - Cash flow: Accurate / Minor issues / Major issues
   - Issues: [describe]

4. DATA INTEGRITY
   - Any missing transactions? [dates, amounts]
   - Any duplicate entries? Y / N
   - Data gaps detected? [describe]

Overall assessment: Ready for production / Needs fixes / Critical issues
```

### Template C: Performance & Responsiveness (June 10 & 17)

```
FEEDBACK FORM: Performance
Date: [June 10 or 17, 2026]
Customer: [Name]

1. QUERY PERFORMANCE
   - Which queries did you test? [list]
   - Load time: <0.5s / 0.5-1s / 1-2s / >2s
   - Acceptable? Y / N
   - Specific slow queries: [list with timing]

2. UI RESPONSIVENESS
   - Page load time: <1s / 1-2s / 2-5s / >5s
   - Button response (save/calculate/export): Instant / Delayed
   - Data entry: Smooth / Laggy
   - Issues: [describe]

3. CONCURRENT USERS
   - Did you test with multiple users? Y / N
   - Performance degradation noticed? Y / N
   - Details: [describe]

4. LOAD TIME SUMMARY
   - Home/dashboard: __ seconds
   - Main reports: __ seconds
   - Data export: __ seconds
   - Overall acceptable? Y / N

Issues requiring fixes: [list with priorities]
```

### Template D: RLS (Row-Level Security) Behavior (June 10 & 17)

```
FEEDBACK FORM: RLS & Data Isolation
Date: [June 10 or 17, 2026]
Customer: [Name]

1. DATA ISOLATION
   - Tested cross-company data visibility? Y / N
   - Can user A see user B's data? Y / N
   - Isolation working correctly? Y / N
   - Issues: [describe]

2. PERMISSION LEVELS
   - Admin users: Can access all data? Y / N
   - Read-only users: Prevented from editing? Y / N
   - Custom roles: Working as expected? Y / N
   - Issues: [describe]

3. MULTI-TENANT ISOLATION
   - Can Company A see Company B data? Y / N
   - RLS enforced at database level? Y / N
   - Issues: [describe]

4. AUDIT TRAIL
   - Can you verify who accessed which data? Y / N
   - Audit logs accurate? Y / N
   - Issues: [describe]

Overall: RLS working correctly / Needs review / Critical breach detected
```

### Template E: Bug Reports (Ongoing - June 9-20)

```
FEEDBACK FORM: Bug Report
Date: [Date]
Customer: [Name]
Severity: Critical / High / Medium

1. ISSUE DESCRIPTION
   - Feature/service affected: [name]
   - What were you trying to do? [steps]
   - What happened instead? [actual behavior]
   - Expected behavior: [what should happen]

2. REPRODUCTION
   - Can you reproduce it? Always / Sometimes / Rarely / Cannot reproduce
   - Steps to reproduce: [numbered list]
   - Data sample (if applicable): [attach or describe]

3. ENVIRONMENT
   - Browser: [name/version]
   - Device: [desktop/mobile]
   - Operating system: [OS]
   - Any special setup? [describe]

4. IMPACT
   - Does this block your work? Y / N / Partially
   - How many users affected? [estimate]
   - Business impact: [describe]

5. ATTACHMENTS
   - Screenshots: [yes/no - attach if yes]
   - Error logs: [yes/no - attach if yes]
```

---

## 3. Bug Triage Procedures

### Severity Definitions

**CRITICAL** → Escalate Immediately (CTO + Backend Engineer respond within 30 min)
- Data loss detected or imminent
- RLS/security breach (unauthorized data access)
- Queries >2 seconds consistently
- Service completely non-functional
- Action: CTO notifies Backend Engineer, escalates to CEO if blocking customer operations

**HIGH** → Backend Engineer Next Business Day (response within 24h)
- Calculation errors affecting financial data
- Missing functions/features required for validation
- Query latency 500-2000ms
- UI crashes or critical errors
- Action: CTO creates work item, Backend Engineer picks up next business day

**MEDIUM** → Document for Phase 4 (no commitment to fix during validation)
- UX/UI improvements
- Non-blocking bugs
- Nice-to-have features
- Minor performance improvements
- Action: CTO documents in Phase 4 backlog, explain to customer

### Triage Process

1. **Initial Report** (CTO, 15 min)
   - Receive issue via Slack or email
   - Determine severity using definitions above
   - Ask clarifying questions if needed
   - Respond to customer with:
     - Confirmed severity level
     - Expected resolution timeframe
     - Assigned engineer (if High/Critical)

2. **Work Assignment** (CTO)
   - Create Paperclip issue with template (see below)
   - Assign to Backend Engineer
   - Add to daily standup agenda if Critical/High

3. **Resolution** (Backend Engineer)
   - Investigate and implement fix
   - Test with customer data if applicable
   - Notify CTO and customer when resolved

4. **Follow-up** (CTO)
   - Verify fix meets customer expectations
   - Document outcome
   - Update customer in next daily standup

### Triage Work Item Template

```
Title: [VALIDATION] [SEVERITY] Brief description

Description:
Customer: [Name]
Reported: [Date/Time]
Severity: [Critical/High/Medium]
Service: [affected service]

Issue:
[Full description from customer report]

Reproduction:
[Steps to reproduce]

Expected Response:
- Critical: 30 min response, 2h fix SLA
- High: 2h response, 24h fix SLA
- Medium: Document for Phase 4

Impact:
[Business/operational impact]

Next Steps:
1. [action 1]
2. [action 2]
```

---

## 4. Backend Engineer On-Call Schedule

**Schedule Period**: June 9-20, 2026 (12 calendar days = 2 weeks)

**Primary On-Call**: [Backend Engineer Name]  
**Backup On-Call**: [TBD - discuss with Backend Engineer]

**Response Targets**:
- Critical: 30-minute response, 2-hour fix
- High: 2-hour response, next business day fix

**Daily Responsibilities** (during on-call week):
1. Check Slack/email by 9:00 AM JST for overnight issues
2. Triage any new issues immediately
3. Provide status updates in daily 6 PM standup
4. Be available during business hours (9 AM - 7 PM JST)
5. For after-hours critical issues: contact CTO for escalation decision

**On-Call Switchover**: End of day June 20, 2026

**Confirmation Needed**: Backend Engineer acknowledgment of schedule and SLAs

---

## 5. Daily Monitoring Routine

### Morning Review (9:00 AM JST)
**Owner**: CTO  
**Duration**: 30 minutes

**Checklist**:
- [ ] Check dashboard: Performance metrics (query latency, error rates)
- [ ] Review RLS monitoring: Any unauthorized access attempts?
- [ ] Check activity logs: Volume of usage, any anomalies?
- [ ] Read overnight issues: Triage anything that arrived <9 AM
- [ ] Scan error logs: Any patterns or spikes?
- [ ] Review yesterday's issues: Any still open? Status?

**Output**: Morning brief (1-2 bullets) for daily standup

### Afternoon Review (3:00 PM JST)
**Owner**: Backend Engineer  
**Duration**: 15 minutes

**Checklist**:
- [ ] Check system health: All services running normally?
- [ ] Review current issues: Anything stuck or needing escalation?
- [ ] Performance trending: Better or worse than yesterday?
- [ ] Prepare for 6 PM standup: Status update

### Daily Standup (6:00 PM JST)
**Participants**: CTO, Backend Engineer, Customer Rep  
**Duration**: 10 minutes

**Agenda**:
1. Issues received today: [count] Critical, [count] High, [count] Medium
2. Issues resolved: [list]
3. Issues in progress: [status of each]
4. Blockers: [any preventing resolution?]
5. Plan for tomorrow

### Rolling Journal (CTO maintains)
**Format**: Daily entry in shared document

```
## [Date] - Validation Day [X/12]

### Issues
- [Issue 1]: [Description] → Status: [Resolved/In Progress/Blocked]
- [Issue 2]: [Description] → Status: [Resolved/In Progress/Blocked]

### Patterns/Themes
- [Any recurring issues?]
- [Performance trends?]
- [Customer feedback patterns?]

### Actions Taken
- [Action 1]
- [Action 2]

### Phase 4 Notes
- [Items to document for Phase 4 planning]
```

---

## 6. Escalation and Incident Management

### CTO Actions for Critical Issues

1. **Within 30 minutes**:
   - Notify Backend Engineer
   - Begin investigation or have engineer begin
   - Brief customer on status and ETA

2. **At 1-hour mark** (if not resolved):
   - Consider CEO escalation if customer operations blocked
   - Discuss workarounds with customer
   - Adjust fix ETA if needed

3. **At 2-hour mark**:
   - Issue must be resolved or customer must have workaround
   - Document root cause for Phase 4 analysis

### CEO Escalation Criteria
- Customer operational continuity at risk
- Data loss or security incident confirmed
- Cannot meet 2-hour fix SLA

**Escalation Method**: Phone call to CEO + detailed summary

---

## 7. Validation Success Criteria

Validation Phase 2 is **successful** when:
- ✅ All Critical issues resolved within 2-hour SLA
- ✅ All High issues resolved within 24-hour SLA
- ✅ Feedback templates completed for June 10 & 17 cycles
- ✅ Customer communication plan executed (daily standups held)
- ✅ RLS behavior verified secure
- ✅ Performance acceptable to customer (all queries <2s)
- ✅ No data loss or corruption detected
- ✅ Rolling journal completed for Phase 4 analysis

---

## 8. Contact Information

| Role | Name | Phone | Slack | Email |
|------|------|-------|-------|-------|
| CTO | [Your Name] | [Phone] | @cto | cto@company.jp |
| Backend Engineer | [Name] | [Phone] | @backend | backend@company.jp |
| Customer Liaison | [Name] | [Phone] | @customer-lead | customer@company.jp |
| CEO | [Name] | [Phone] | @ceo | ceo@company.jp |

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| May 27, 2026 | 1.0 | Initial runbook created |
| | | Ready for June 9 launch |

---

**Status**: ✅ Ready for Phase 2 Validation Execution  
**Last Updated**: May 27, 2026 at 9:00 AM JST
