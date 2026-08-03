# Deferred Items — Phase 5 (Storage durável / MinIO no cluster)

Items discovered during execution that are out of scope for the current task (per executor
Scope Boundary rule) and are logged here rather than auto-fixed.

## 1. REQUIREMENTS.md traceability table shows STO-01/STO-02 as "Complete" while their checkboxes are unchecked

**Found during:** 05-04 execution (self-check before final commit).

**Issue:** `.planning/REQUIREMENTS.md` has two representations of requirement status that
disagree for STO-01 and STO-02:
- The requirement checkbox list (lines ~19-23) shows both as `[ ]` (not done), with explicit
  notes that they only become true after the human applies the cluster manifests.
- The `## Traceability` table (near the end of the file) shows both as `Complete`.

This inconsistency predates plan 05-04 — it was already present when this plan started
(likely introduced during 05-02's execution, which wrote the manifests but did not apply
them). Plan 05-04 only touched STO-04 and STO-06 via `requirements mark-complete`, and did
not modify the STO-01/STO-02 rows.

**Not fixed here:** out of scope per the executor's Scope Boundary rule (pre-existing issue,
not caused by 05-04's changes). Correcting it would require either flipping the traceability
table back to "Pending" for STO-01/STO-02, or resolving which representation is authoritative.

**Recommended fix:** once the human completes the "Ações humanas pendentes" runbook in
`05-04-SUMMARY.md` and confirms STO-01/STO-02/STO-05 in production, run
`requirements mark-complete STO-01 STO-02 STO-05` to bring both representations into
agreement truthfully. Until then, the checkbox list (unchecked) is the accurate source —
the traceability table entries for STO-01/STO-02 are currently overstating completion.
