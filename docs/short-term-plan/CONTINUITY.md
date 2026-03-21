# Continuity Ledger

- Goal (incl. success criteria):
  - Implement a "Syncing..." screen after QR code scan with a 10s timer. (DONE)
  - Fix duplicated and un-closable notifications. (DONE)
  - Create a new Cloud Run service `certificate-generator` to fill PDF certificates.
- Constraints/Assumptions:
  - Language: TypeScript/Node.js for consistency.
  - PDF library: `pdf-lib`.
  - Output: PDF or Image (as requested).
- Key decisions:
  - Separate Cloud Run service to isolate heavy PDF processing.
- State:
  - Done:
    - Initial project configuration and documentation structure.
    - Previous UI and notification fixes.
    - Certificate generation service implemented.
    ## Implementation
    - [x] Certificate Generator Service [apps/certificate-generator]
      - [x] Initialize Express/TypeScript project
      - [x] Implement PDF filling endpoint `POST /generate`
      - [x] Add PDF-to-Image conversion (PDF return)
      - [x] Deploy to Cloud Run (Ready for deploy)
  - Now:
    - Finalizing documentation and walkthrough.
  - Next:
    - Deployment and user validation.
- Open questions (UNCONFIRMED if needed):
  - Should the output be primarily PDF or Image? (User said "image", but "model" is PDF).
  - Where is the official PDF template located? (Will use placeholder for now).
- Working set (files/ids/commands):
  - `apps/certificate-generator/`

