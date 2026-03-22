# Orchestration Funnel & Document Handoffs

To eliminate hallucination and chaos, agents in the UHNWI+ Right Hands OS do not "talk" to each other in a vacuum. They pass structured paperwork (Markdown documents) along a strict assembly line.

All operational files live inside `/company_files/`.

## The Conveyor Belt (Workflow)

**Stage 1: The Mandate (UHNWI -> CEO)**
- UHNWI writes a 1-paragraph goal in `company_files/active_projects/current_mandate.md`.
- CEO reads the mandate.

**Stage 2: Operational Breakdown (CEO -> C-Suite)**
- CEO creates `company_files/documents/master_plan_v1.md` using `company_files/templates/master_plan_template.md`.
- CEO tags the CPO, CMO, and CFO to fill out their respective sections in the document.

**Stage 3: Assembly (CPO, CMO, CFO -> COO)**
- CPO writes the technical specs.
- CMO writes the copy blocks.
- CFO writes the pricing matrix.
- The COO reads the compiled document, checks it against `company_files/sops/01_execution_pipeline.md`, and signs off.

**Stage 4: The Crucible (COO -> The Market)**
- The COO moves the approved `master_plan_v1.md` into `company_files/crucible_testing/`.
- The Target Buyer, Unaware Audience, and Competitor Simulator read the file.
- They generate brutal feedback logs and save them to `company_files/crucible_testing/feedback_logs/`.

**Stage 5: The Audit & Iteration (The Shield -> CEO)**
- The Auditor reads the `feedback_logs` and summarizes the failure rate in `company_files/documents/audit_report.md`.
- The CEO reads the audit report. If the product failed (which it usually does on V1), the CEO copies `master_plan_v1.md` to `master_plan_v2.md` and forces the Company to fix the exact flaws identified in the feedback logs.

**Stage 6: Final Presentation**
- Once The Market scores a passing grade, the CEO presents the finalized `master_plan_vX.md` to the UHNWI.
