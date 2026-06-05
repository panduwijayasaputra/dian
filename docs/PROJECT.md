# PROJECT.md

# DIAN

Document Intelligence and Archive Network

## Vision

DIAN is an AI-powered document retrieval assistant for government administrative staff.

The purpose of DIAN is to help users store, organize, and retrieve official correspondence using natural language search.

In many offices, people do not search for documents.

They search for the person who knows where the documents are.

DIAN transforms that institutional knowledge into a searchable system.

---

# Product Story

When someone needs a document, they often ask:

"Where is that letter?"

The answer is usually:

"Ask Dian."

DIAN aims to become the digital equivalent of that trusted administrative officer who always knows where documents are located.

The goal is not to replace government correspondence systems.

The goal is to make document retrieval effortless.

---

# Mission

Enable users to find any document in less than 10 seconds using natural language.

---

# Current Stage

MVP

Priority Order:

1. Document Upload
2. Metadata Review
3. Search
4. Semantic Search
5. Notes

Everything else is secondary.

---

# MVP Scope

Included:

- PDF upload
- Metadata extraction
- Metadata review
- Document storage
- AI summary
- Natural language search
- Semantic search
- Notes
- Timeline
- Offline-first support
- Document viewer

Out of Scope:

- OCR
- Excel import
- Folder import
- Folder watcher
- SRIKANDI integration
- Disposition workflow
- E-signatures
- Notifications
- Analytics dashboards
- Multi-organization support
- Native mobile apps

---

# Product Principles

## Search First

Search is the most important feature.

## Human Verified Metadata

AI suggests. Humans decide.

## Simplicity Over Features

Avoid feature creep.

## Offline Resilience

Users must never lose work due to connectivity issues.

---

# Technical Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

## Application Type

- Progressive Web App (PWA)
- Offline-first architecture
- Service Worker
- IndexedDB

## Backend

- Next.js API Routes
- Server Actions

## Database

- PostgreSQL
- pgvector

## Storage

- Cloudflare R2

## Hosting

- VPS (self-hosted)

## AI

- OpenAI API
- OpenAI Embeddings

---

# Offline Architecture

When offline:

PDF
→ IndexedDB
→ Pending Sync

Status:

- Local
- Pending Sync

When online:

Pending Sync
→ Upload
→ Metadata Processing
→ Summary Generation
→ Embedding Generation
→ Indexed

Status:

- Synced
- Processing
- Ready
- Failed

Embeddings are generated only on the server.

Embeddings are never generated in the browser.

## Offline Search

Supported:

- document number
- sender
- subject
- document date
- document summary
- extracted document text

Search methods:

- metadata filtering
- keyword search
- full-text matching

Not supported:

- semantic search
- vector similarity search
- OpenAI query interpretation
- natural language search

Display:

"Offline Mode - Searching local documents only"

---

# Search Architecture

## Offline Search

Uses:

- metadata filtering
- keyword search
- full-text search

Data source:

- IndexedDB

## Online Search

Uses:

- metadata filtering
- semantic search
- hybrid search
- natural language query interpretation

Data source:

- PostgreSQL
- pgvector
- OpenAI

## Hybrid Search

Combines:

1. Metadata filtering
2. Vector similarity search

---

# Development Roadmap

## Phase 1 - Foundation

### WO-001 Project Setup

Deliverables:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- ESLint
- Prettier

### WO-002 Database Setup

Deliverables:

- PostgreSQL
- pgvector
- migrations

### WO-003 Authentication

Deliverables:

- login
- logout
- protected routes

## Phase 2 - Document Management

### WO-004 Cloudflare R2 Integration

### WO-005 Document Upload

### WO-006 Document Viewer

## Phase 3 - Metadata

### WO-007 Metadata Schema

Fields:

- document_number
- document_date
- sender
- subject

### WO-008 Metadata Extraction

### WO-009 Metadata Review

Mandatory before save.

### WO-010 Metadata Editing

## Phase 4 - AI Processing

### WO-011 PDF Text Extraction

Acceptance Criteria:

- Extracted text is stored for search indexing.
- Extracted text is available for offline full-text search.
- Extraction failures do not prevent metadata review.
- Extraction failures do not prevent document storage.

### WO-012 Summary Generation

### WO-013 Document Chunking

### WO-014 Embedding Generation

### WO-015 Vector Storage

## Phase 5 - Search

### WO-016 Metadata Filtering

### WO-017 Semantic Search

### WO-018 Hybrid Search

### WO-019 Natural Language Search

## Phase 6 - Offline First

### WO-020 PWA Setup

### WO-021 IndexedDB Storage

### WO-022 Sync Engine

## Phase 7 - Productivity

### WO-023 Notes

### WO-024 Timeline

---

# MVP Completion Criteria

The MVP is complete when a user can:

1. Upload a PDF.
2. Review and edit metadata.
3. Save the document.
4. Search documents online using natural language.
5. Search local documents offline using metadata and keyword search.
6. Open the document.
7. Retrieve the document in less than 10 seconds.

---

# Decision Log

## D-001

Metadata review is mandatory.

## D-002

Embeddings are generated server-side only.

## D-003

OCR is not part of MVP.

## D-004

Natural language search is a core MVP feature.

## D-005

DIAN is not a SRIKANDI replacement.

## D-006

Offline support is required.

## D-007

Cloudflare R2 is the single source of truth for document storage.

## D-008

Offline search is supported without embeddings.

## D-009

Extracted document text is stored locally when available.

## D-010

Natural language search is available only when online.

## D-011

Metadata and extracted text must be synchronized to IndexedDB.

---

# Claude Code Workflow

1. Read PROJECT.md.
2. Focus only on the requested work order.
3. Generate a detailed implementation PRD.
4. Wait for approval before coding.
5. Do not implement future work orders.
6. Do not expand scope.
7. Prefer simple solutions.

---

# Success Criteria

A user uploads a document today.

One month later, the same document can be found in less than 10 seconds using natural language search.

If this goal is achieved, the MVP is successful.
