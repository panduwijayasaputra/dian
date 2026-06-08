# AI Chat Design

**Date:** 2026-06-08
**Route:** `/chat` (renamed from `/asisten`)

## Overview

RAG-powered conversational AI assistant. Users ask questions in natural language; the AI retrieves relevant document chunks, answers fully from document content, and cites sources. Conversations are persisted in the database. Users can start new conversations and switch between them.

Online-only feature (consistent with D-010).

---

## Database Schema

### `chat_sessions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | primary key |
| `user_id` | uuid | FK to users |
| `title` | text | auto-generated from first message (first 60 chars) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | updated on each new message |

### `chat_messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | primary key |
| `session_id` | uuid | FK to chat_sessions |
| `role` | text | `user` or `assistant` |
| `content` | text | message text |
| `sources` | jsonb | array of `{ document_id, document_number, subject, excerpt }` — only on assistant messages |
| `created_at` | timestamptz | |

---

## UI Layout

Two-panel layout on `/chat`:

**Left panel (~260px)**
- "New Chat" button at the top
- List of past sessions: auto-generated title + relative timestamp
- Active session highlighted
- Sorted by `updated_at` descending

**Right panel (main)**
- Chat thread: user bubbles right-aligned, AI bubbles left-aligned
- Each AI message may have collapsible source cards below it (document_number, subject, excerpt)
- Input bar pinned to the bottom
- Empty state when no session is active

---

## Backend / RAG Pipeline

**`POST /api/chat/sessions`** — create new session

**`GET /api/chat/sessions`** — list sessions for current user

**`POST /api/chat/[sessionId]/message`** — handle one user turn (streaming)

Turn flow:
1. Save user message → `chat_messages`
2. Embed query → OpenAI embeddings (server-side only)
3. Vector search → top-5 relevant document chunks from pgvector
4. Build system prompt with retrieved context + document metadata
5. Stream response → OpenAI chat completions
6. Save assistant message + sources → `chat_messages` after stream completes

---

## Route Change

- Delete `src/app/(app)/asisten/`
- Create `src/app/(app)/chat/`
- Update sidebar nav: `/asisten` → `/chat`, label "Asisten" → "Chat"
