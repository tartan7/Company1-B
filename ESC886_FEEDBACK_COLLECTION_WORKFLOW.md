# ESC-886: Phase 2 Feedback Cycle 1 Collection Workflow
**Date**: June 10, 2026  
**Issue**: ESC-886  
**Owner**: CTO (Coordination)  
**Deadline**: Feedback responses by June 10 EOD (or June 11 AM if overnight submission)

---

## 1. Pre-Launch Checklist (Due June 9, 2026)

### Customer Roster Confirmation
- [ ] Validate 3 validation customer names and primary contacts
- [ ] Confirm email addresses and Slack handles for each
- [ ] Note any timezone considerations (JST for Japan-based customers)
- [ ] Document preferred communication method per customer

**Owner**: Customer Liaison (ESC-883 confirmation)  
**Status**: BLOCKED - Pending ESC-883 completion

### Form Distribution Method
- [ ] Decide format: Google Form? Shared doc? Email template?
- [ ] Prepare 5 feedback form copies (VBA, Financial, Performance, RLS, Bug Report)
- [ ] Create completion checklist for tracking responses
- [ ] Set up response collection channel (#validation-feedback or email folder)

**Owner**: Customer Liaison / Operations  
**Status**: READY - Templates exist in runbook

### Team Readiness
- [ ] Backend Engineer confirms on-call availability June 10 (ESC-881)
- [ ] Operations Manager reviews triage process and dashboard (ESC-882)
- [ ] Escalation contacts (CEO) are briefed on potential critical issues

**Owner**: CTO (coordinate confirmations)  
**Status**: BLOCKED - Pending ESC-881, ESC-882

---

## 2. Form Distribution Schedule (June 10)

### Morning (9:00-10:00 AM JST)
**Action**: Send feedback forms to 3 customers  
**Method**: [To be determined - email/form link/shared doc]  
**Template**: Use all 5 templates from CTO_PHASE2_VALIDATION_RUNBOOK.md

**Communication Message**:
```
Subject: Phase 2 Validation Feedback - June 10

Dear [Customer Name],

Thank you for participating in our Phase 2 validation testing (June 9-20).

To ensure we capture your experience accurately, please complete the attached feedback forms by EOD TODAY (June 10, 2026) or by 9:00 AM JST tomorrow (June 11).

Forms included:
1. VBA Migration Accuracy
2. Financial Data Accuracy
3. Performance & Responsiveness
4. RLS & Data Isolation
5. Bug Reports (if any issues encountered)

Please provide ratings on each dimension using the 1-5 scale format where applicable.

Send completed forms to: [validation-support@company.jp] or reply in #validation-feedback Slack channel

Thank you!
CTO
```

**Owner**: Customer Liaison (or CTO if urgent)

### Timeline
- **9:00 AM JST**: Forms sent
- **5:00 PM JST**: First check-in (any immediate questions?)
- **EOD June 10**: Ideally all responses in
- **9:00 AM June 11**: Fallback deadline for any overnight submissions

---

## 3. Response Collection & Triage Process

### Response Intake (CTO, Real-Time as responses arrive)

For each customer response:
1. **Acknowledge receipt** → Brief thank you message confirming we got their feedback
2. **Extract bug reports** → Flag any Critical/High severity bugs for immediate triage
3. **Log feedback** → Record ratings/comments in Master Feedback Spreadsheet
4. **Trigger escalations** → If any Critical bugs reported, invoke triage immediately

### Critical Bug Fast-Track (CTO)
**IF Critical bug is reported:**
- [ ] Notify Backend Engineer within 15 minutes (phone + Slack)
- [ ] Escalate to CEO if customer operations blocked
- [ ] Create Paperclip issue with [VALIDATION][CRITICAL] tag immediately
- [ ] Set 30-min response, 2-hour fix SLA

**Owner**: CTO  
**SLA**: 15-minute detection, 30-minute response

---

## 4. Feedback Aggregation & Analysis

### Master Feedback Spreadsheet
Create a shared document with structure:

| Customer | Dimension | Rating (1-5) | Comments | Priority |
|----------|-----------|-------------|----------|----------|
| [Name] | VBA Accuracy | [1-5] | [Notes] | [Critical/High/Medium] |
| [Name] | Financial Accuracy | [1-5] | [Notes] | [Critical/High/Medium] |
| [Name] | Performance | [1-5] | [Notes] | [Critical/High/Medium] |
| [Name] | RLS & Isolation | [1-5] | [Notes] | [Critical/High/Medium] |
| [Name] | Overall Readiness | [1-5] | [Notes] | [Critical/High/Medium] |

### Bug Triage Checklist
For each reported bug:
- [ ] Severity classification (Critical/High/Medium per runbook definitions)
- [ ] Create Paperclip issue if Critical/High
- [ ] Assign to Backend Engineer
- [ ] Customer notified of expected response time
- [ ] Track in rolling journal

---

## 5. Daily Standup Integration (6:00 PM JST, June 10)

**Agenda Item**: Feedback Collection Status
- Responses received from: [Customer 1: ✅ / Customer 2: ✅ / Customer 3: ⏳]
- Critical bugs reported: [count]
- High bugs reported: [count]
- Medium feedback items: [list for Phase 4]
- Any escalations: [yes/no + details]

**Owner**: CTO (lead)

---

## 6. Deliverables Due June 11

- [ ] All 3 customer responses collected
- [ ] Bug triage complete (Critical/High bugs have Paperclip issues)
- [ ] Master Feedback Spreadsheet updated
- [ ] Team notified via standup and async update
- [ ] Critical bug assignments confirmed with Backend Engineer
- [ ] Rolling journal entry completed
- [ ] Summary email sent to Phase 4 product team

---

## 7. Contact List (To Be Filled In)

| Role | Name | Phone | Slack | Email |
|------|------|-------|-------|-------|
| Customer 1 | [TBD] | [TBD] | [TBD] | [TBD] |
| Customer 2 | [TBD] | [TBD] | [TBD] | [TBD] |
| Customer 3 | [TBD] | [TBD] | [TBD] | [TBD] |
| Customer Liaison | [TBD] | [TBD] | [TBD] | [TBD] |
| Backend Engineer (On-Call) | [TBD] | [TBD] | [TBD] | [TBD] |
| CEO | [TBD] | [TBD] | [TBD] | [TBD] |

---

## 8. Blockers & Dependencies

| Blocker | Owner | Due | Issue | Impact |
|---------|-------|-----|-------|--------|
| Customer Roster Confirmation | Customer Liaison | June 7 | ESC-883 | Cannot send forms without customer list |
| On-Call Schedule Confirmation | Backend Engineer | June 6 | ESC-881 | Need coverage for bug triage June 10 |
| Ops Review (Triage Dashboard) | Ops Manager | June 6 | ESC-882 | Need defined triage process & tooling |
| Form Distribution Method Decided | [TBD] | June 9 | N/A | Need email/form link ready |

---

## 9. Success Criteria (June 10 EOD)

- ✅ All 3 customers sent feedback forms
- ✅ Responses collected from all 3 customers
- ✅ All Critical/High bugs identified and triaged
- ✅ Paperclip issues created for Critical/High bugs
- ✅ Backend Engineer assigned to bug issues
- ✅ Master Feedback Spreadsheet completed
- ✅ Rolling journal entry for June 10 completed
- ✅ Daily standup held with team and customer
- ✅ Phase 4 product team notified of findings

---

## Document History

| Date | Version | Status |
|------|---------|--------|
| May 27, 2026 | 1.0 | Draft - Ready for team confirmation |

**Next Step**: Wait for ESC-881, ESC-882, ESC-883 confirmations, then finalize customer roster and form distribution method.
