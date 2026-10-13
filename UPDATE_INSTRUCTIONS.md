# Independent researched updates
Use your own deployment's configured origin and UPDATE_TOKEN, supplied by a secure secret manager. Do not use get_site or ChatGPT Sites bearer credentials with this deployment.

1. Read /api/system/instructions and /api/system/state with X-Update-Token. Stop on authorization failure; never alter access to work around a rejection.
2. Respect pause. Research all ten approved primary newsrooms, including additional source URLs. Verify exact announcements and dates. Write an original short factual headline and description; do not copy publisher articles or use publisher images.
3. Save up to twenty genuinely new source links through /api/system/sync. Avoid duplicates and irrelevant old announcements. Preserve archived suppression.
4. If lastDraft is not today's UTC date and sources support a useful topic, prepare at most one original AI-assisted 500–800 word article using UK English, headings and citations. Never invent personal experience, prices or quotations. Send it as a draft, never publish it.
5. Read /api/system/state after writing and verify saved data. Record failures through /api/system/failure without deleting existing content.
6. Do not send routine notifications; report update failures only.

Cloudflare's scheduled collector separately discovers metadata and queues news candidates for review. It is not the AI researcher. Connect the researcher before retiring the old Site automation.
