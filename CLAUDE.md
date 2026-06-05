# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DIAN (Document Intelligence and Archive Network) is an AI-powered document retrieval assistant for government administrative staff. Users store, organize, and retrieve official correspondence using natural language search.

**Mission:** Find any document in less than 10 seconds using natural language.

## Development Workflow

DIAN uses a structured 3-phase workflow. Do not skip phases.

### Phase 1 — PRD

When a user references a work order (WO-XXX) or feature:

1. Read `docs/PROJECT.md` to understand the work order scope.
2. Ask clarifying questions before writing the PRD.
3. Generate a PRD using the structure in `templates/create-prd.md`.
4. Save as `docs/prd/prd-[feature-name].md`.
5. Wait for approval before proceeding.

Do not implement future work orders. Do not expand scope.

### Phase 2 — Task List

After PRD is approved:

1. Analyze the PRD and generate high-level parent tasks (~5).
2. Present parent tasks and wait for user to confirm with "Go".
3. Break down into sub-tasks with step-by-step descriptions.
4. Save as `docs/tasks/tasks-[prd-file-name].md`.

### Phase 3 — Implementation

- Implement **one sub-task at a time**.
- After each sub-task, mark it `[x]` and pause — wait for user to say "yes" or "y" before continuing.
- When all sub-tasks under a parent task are complete:
  1. Run the full test suite (`pnpm test`).
  2. Only if tests pass: stage changes, clean up temporary files, then commit.
  3. Commit format: `git commit -m "feat: summary" -m "- detail" -m "Related to WO-XXX"`
  4. Mark parent task `[x]`.
- Keep `Relevant Files` section in the task list accurate and up to date.

**Package manager:** pnpm

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes and Server Actions
- **Database:** PostgreSQL + pgvector
- **Storage:** Cloudflare R2 (single source of truth for documents)
- **AI:** OpenAI API (metadata extraction, summaries, embeddings)
- **PWA:** Service Worker + IndexedDB for offline-first support

## Architecture

### Offline-First

Documents uploaded offline are stored in IndexedDB with status `Local → Pending Sync`. When connectivity returns, they sync through: `Upload → Metadata Processing → Summary Generation → Embedding Generation → Indexed`.

Metadata and extracted text must be synced to IndexedDB to support offline search.

### Search

| Mode    | Methods                                             | Data Source                    |
| ------- | --------------------------------------------------- | ------------------------------ |
| Offline | Metadata filtering, keyword search, full-text match | IndexedDB                      |
| Online  | Metadata filtering, semantic/hybrid/NL search       | PostgreSQL + pgvector + OpenAI |

Offline search displays: `"Offline Mode - Searching local documents only"`

**Embeddings are generated server-side only — never in the browser.**

### Key Decisions

| ID    | Decision                                                        |
| ----- | --------------------------------------------------------------- |
| D-001 | Metadata review is mandatory before saving any document.        |
| D-002 | Embeddings are server-side only.                                |
| D-003 | OCR is not in MVP scope.                                        |
| D-004 | Natural language search is a core MVP feature.                  |
| D-007 | Cloudflare R2 is the single source of truth for document files. |
| D-008 | Offline search works without embeddings.                        |
| D-010 | Natural language search requires online connectivity.           |
| D-011 | Metadata and extracted text must be synced to IndexedDB.        |

## MVP Priority Order

1. Document Upload
2. Metadata Review
3. Search
4. Semantic Search
5. Notes

## Development Phases

| Phase | Work Orders | Focus                                                     |
| ----- | ----------- | --------------------------------------------------------- |
| 1     | WO-001–003  | Project setup, DB, Auth                                   |
| 2     | WO-004–006  | R2, Upload, Viewer                                        |
| 3     | WO-007–010  | Metadata schema, extraction, review, editing              |
| 4     | WO-011–015  | PDF text, summaries, chunking, embeddings, vector storage |
| 5     | WO-016–019  | Metadata filter, semantic, hybrid, NL search              |
| 6     | WO-020–022  | PWA, IndexedDB, sync engine                               |
| 7     | WO-023–024  | Notes, Timeline                                           |

## Metadata Schema

Core document fields: `document_number`, `document_date`, `sender`, `subject`.

## Document & Task Locations

- PRDs: `docs/prd/prd-[feature-name].md`
- Task lists: `docs/tasks/tasks-[prd-file-name].md`
- Workflow templates: `templates/`
