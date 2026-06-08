# PRD: AI Chat

## 1. Introduction / Overview

DIAN currently has a placeholder `/asisten` page with no real functionality. This feature replaces it with a fully working AI chat at `/chat` — a RAG-powered conversational assistant that answers questions about documents in the archive.

Users type a question in natural language. The system retrieves the most relevant document chunks from pgvector, builds a context-aware prompt, and streams a full answer back — citing the source documents. Conversations are saved to the database and users can manage multiple sessions.

**Goal:** Give users a fast, conversational way to get answers from their document archive without needing to know which document contains the information.

---

## 2. Goals

1. Replace the `/asisten` placeholder with a working AI chat at `/chat`.
2. Answer user questions using document content (RAG), not general LLM knowledge.
3. Cite the source documents in every AI response.
4. Persist conversation history to the database.
5. Allow users to start new conversations and switch between past sessions.

---

## 3. User Stories

- As a staff member, I want to ask "What did the letter from BPK in March say about the audit findings?" and get a direct answer with the source document cited, so I don't have to open every document manually.
- As a staff member, I want my past conversations saved so I can refer back to previous answers without re-asking.
- As a staff member, I want to start a new conversation for a different topic so my sessions stay organized.
- As a staff member, I want to see which documents the AI used to answer my question so I can verify or open the full document.

---

## 4. Functional Requirements

### Route & Navigation
1. The chat feature must be accessible at `/chat`.
2. The sidebar navigation must link to `/chat` (replacing the old `/asisten` link).
3. The old `/asisten` route must be removed.

### Session Management
4. Users must be able to start a new chat session via a "New Chat" button.
5. Each session must have an auto-generated title derived from the user's first message (truncated to ~60 characters).
6. The left panel must list all past sessions for the current user, sorted by most recently updated.
7. Users must be able to switch between sessions by clicking them in the session list.
8. Sessions must be scoped to the logged-in user — users cannot see other users' sessions.

### Messaging
9. Users must be able to type a message and send it via the Enter key or a Send button.
10. Sent messages must be saved to the database immediately.
11. The AI response must stream to the UI token-by-token (no waiting for the full response).
12. The full AI response and its sources must be saved to the database after streaming completes.

### RAG Pipeline
13. On each user message, the system must embed the query using OpenAI embeddings (server-side only).
14. The system must retrieve the top-5 most relevant document chunks from pgvector.
15. The system must build a system prompt containing the retrieved chunks and document metadata.
16. The system must call OpenAI chat completions with that context and stream the response.

### Source Citations
17. Each AI response must include the list of source documents used (document_number, subject, a short excerpt).
18. Source documents must be rendered as cards below the AI message in the UI.
19. If no relevant documents are found, the AI must respond with a fallback message indicating no matching documents were found.

### Online-Only
20. The chat feature must only function when the user is online.
21. When offline, the chat input must be disabled and an "Online only" notice must be shown.

---

## 5. Non-Goals (Out of Scope)

- Offline chat or offline AI responses.
- Deleting or renaming chat sessions.
- Sharing conversations between users.
- Chat with a specific document (document-scoped Q&A is a separate feature).
- Streaming via WebSockets — standard HTTP streaming (Vercel AI SDK or native `ReadableStream`) is sufficient.
- Voice input.

---

## 6. Design Considerations

- Reuse the existing chat bubble UI from `/asisten/page.tsx` as the starting point.
- Two-panel layout: left sidebar (~260px) for session list, right panel for the chat thread.
- User bubbles: right-aligned, primary color background.
- AI bubbles: left-aligned, slate-100 background, with source cards beneath (collapsible or always-visible).
- Input bar pinned to the bottom of the right panel.
- Empty state (no session selected): centered prompt — "Start a new conversation".
- Loading state during streaming: show a typing indicator (animated dots) in the AI bubble.
- Follow existing shadcn/ui component patterns used throughout the app.

---

## 7. Technical Considerations

- **Database:** Add `chat_sessions` and `chat_messages` tables via a new Drizzle migration.
- **Embeddings:** Reuse the existing OpenAI embedding logic (server-side only, per D-002).
- **Vector search:** Query the existing `document_chunks` table in pgvector (assumes WO-013–015 are complete).
- **Streaming:** Use the Vercel AI SDK (`ai` package) or Next.js native streaming response — whichever is already in use in this project.
- **API routes:**
  - `POST /api/chat/sessions` — create session
  - `GET /api/chat/sessions` — list sessions
  - `POST /api/chat/[sessionId]/message` — send message, stream response
- **Auth:** All routes must be protected; session must belong to the current user.

---

## 8. Success Metrics

- A user can ask a question and receive a streamed, sourced answer within 5 seconds.
- Conversations persist across page reloads and browser sessions.
- Source document references are accurate (point to actual documents in the archive).

---

## 9. Open Questions

- Should the session title be the raw first 60 characters of the user's message, or should a separate LLM call generate a cleaner title? (Recommendation: raw truncation for MVP — simpler and no extra API call.)
- Should source cards link directly to the document viewer (`/documents/[id]`)? (Recommendation: yes.)
- Maximum number of sessions to display in the sidebar before pagination is needed? (Recommendation: show the 20 most recent for MVP.)
