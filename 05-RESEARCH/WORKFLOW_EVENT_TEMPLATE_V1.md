# Morrow — Workflow event template (candidate, not frozen)
Date recorded: [ISO-8601]  |  Workflow ID: [stable sequential ID]
Project and authority: [Notion project URL or repository source pointer]
Original request and scope: [short public-safe description]
Task type: [retrieval / research / build / release / decision]
Prior-state source: [pointer or NONE]  |  last confirmed: [date/unknown]
Context needed: Y/N  | recovered without restating: Y/N/unknown
Evidence dependent: Y/N  | source references: [URLs or withheld restricted pointers]
Outcome: [planned / attempted / accepted / committed / verified / owner-accepted]
External write count: [integer or unknown]
Independently verified eligible writes: [integer or unknown]
Eligible evidence-backed conclusions: [integer or unknown]
Conclusions with recoverable sources: [integer or unknown]
Discovered defects: [integer or unknown]
Defects caught before delivery: [integer or unknown]
Defects discovered after delivery: [integer or unknown]
Material rework after declaring completion: Y/N/unknown
User repeated a previously recoverable constraint: Y/N/unknown
Correction type: [source mismatch / implementation / connector / misunderstanding / none / other]
What changed: [pointer or concise summary]
Independent verification receipt: [source test / runtime status / readback pointer]
Open unknowns: [explicit]
Lesson/standing guardrail: [actionable rule, not personality prediction]
Superseded state/pointer: [optional]
Next gate: [explicit stop condition and owner]

## Coding rules
- Use exact action/defect/conclusion grains for numerators and denominators. Do not count a
  single overall workflow verification as independent proof of every write it contains.
- Unknown != false; unavailable != zero; not observed != proved absent.
- Preserve chronological ordering and label retrospectively recovered cases; do not
  substitute a convenient recent workflow for an unlogged eligible earlier event.
- Separate Phase 5 (intentionally skipped) from internal accessibility/QA gates.
- Do not include private personal data, credentials, card ownership/private deck lists,
  visitor messages, unpublished manuscripts or internal cloud secrets in the public repo.
- Do not freeze Metric Definition v1 or publish a percentage improvement until 20
  chronologically eligible cases have been completely coded and the definitions validated.
