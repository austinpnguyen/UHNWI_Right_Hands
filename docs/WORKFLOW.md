# Flow of Execution (Workflow)

To completely eliminate hallucination, agents pass information using explicit Markdown files in the `company_files/` directory.

## The Conveyor Belt

### Phase 1: Initiation
1. The Founder inputs a goal into `00_FOUNDER_INPUT/01_project_idea_sample.md` (e.g., "Launch a premium real estate fund" or "Create a luxury security agency").
2. The **Chief of Staff (CoS)** reads it and passes the operational directive to the **CEO**.
3. (Optional) The **Whisperer** reads it to ensure the Founder isn't just launching a project out of spite because a rival launched one.

### Phase 2: Assembly (V1 Draft)
1. The CEO splits the mandate into strict constraints and assigns tasks to the CPO, CMO, and CFO.
2. They collaboratively fill out `company_files/templates/master_plan_template.md`.
3. The **CISO** scans the CPO's physical/digital architecture for vulnerabilities. The **COO** verifies the team can build the prototype in 3 days.

### Phase 3: The Market Crucible
1. The COO pushes the assembled `master_plan_v1.md` into `company_files/crucible_testing/`.
2. The **Unaware Audience** tests the hook. (Result: Scroll / Stop).
3. The **Target Buyer** tests the price vs value. (Result: Pass / Buy).
4. The **Competitor Simulator** tests the "Moat". (Result: Cloneable / Uncloneable).
5. All results are logged into `feedback_logs/`.

### Phase 4: The Audit & Forced Iteration
1. The **Auditor** verifies if the Target Buyer actually said "Yes - I Buy".
2. The **CLO** flags any false advertising the CMO tried to use.
3. The CEO reads the Audit. If the launch failed, the CEO duplicates the file to `master_plan_v2.md` and brutally commands the C-Suite to fix the exact flaws identified in the logs.
4. *Repeat Phase 2-4 until Market passing grade is achieved.*

### Phase 5: Funding Authorization
1. When V3 (or V4) finally secures a "Buy" from the Target Buyer, the **CEO** presents the final, validated plan to the **CoS**.
2. The **CoS** compresses the 20-page plan into exactly 3 bullet points.
3. The **CIO** reads the ROI projection and authorizes the wire transfer.
4. The Founder types "[Y]" to launch.
