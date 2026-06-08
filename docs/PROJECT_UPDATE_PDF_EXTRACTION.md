# PROJECT_UPDATE_PDF_EXTRACTION.md

## D-012
Extracted text quality must be validated before AI processing.

Reason:
Some PDFs contain corrupted or unmappable character encodings.

Low-quality extraction produces inaccurate summaries, metadata extraction, embeddings, and search results.

Documents failing extraction validation should continue through manual metadata workflows.

## Processing Flow
PDF
→ Extract Text
→ Validate Extraction Quality
→ Quality Passed?
→ Yes: Summary, Metadata Extraction, Embeddings
→ No: Manual Metadata Workflow

## Extraction Status
- pending
- completed
- failed
- manual_only

## Manual Metadata Workflow
PDF
→ Extraction Attempt
→ Validation Failed
→ Metadata Form
→ User Review
→ Save

Requirements:
- Manual metadata entry supported
- Document storage continues to work
- Notes remain available
- Timeline remains available

## Search Rules
Valid extraction:
- metadata search
- full-text search
- semantic search
- natural language search

Failed extraction:
- metadata search only

## UI Message
"Text extraction quality is low. This document may use unsupported fonts or encodings. Please review and enter metadata manually."

## WO-011 Acceptance Criteria Additions
- Validate extraction quality.
- Corrupted text must not proceed to AI processing.
- Failed extraction triggers manual metadata workflow.
- Failed extraction does not block document storage.
- Failed extraction does not block offline synchronization.
