# Tasks: AI Chat

Based on: `docs/prd/prd-ai-chat.md`

## Relevant Files

- `prisma/schema.prisma` - Add `ChatSession` and `ChatMessage` models
- `prisma/migrations/` - New migration for chat tables
- `src/app/api/chat/sessions/route.ts` - GET (list) and POST (create) session endpoints
- `src/app/api/chat/[sessionId]/message/route.ts` - POST streaming message endpoint with RAG pipeline
- `src/app/(app)/chat/page.tsx` - Main chat page (replaces `/asisten/page.tsx`)
- `src/app/(app)/asisten/page.tsx` - To be deleted
- `src/components/chat/session-list.tsx` - Left panel: session list + New Chat button
- `src/components/chat/chat-thread.tsx` - Right panel: message list
- `src/components/chat/message-bubble.tsx` - Individual message bubble with optional source cards
- `src/components/chat/source-card.tsx` - Source document citation card
- `src/components/chat/chat-input.tsx` - Input bar with Send button and offline guard
- `src/components/layout/sidebar.tsx` - Update nav link from `/asisten` to `/chat`
- `src/lib/generate-embeddings.ts` - Reused for query embedding (no changes needed)

### Notes

- Auth pattern: `const session = await auth()` then check `session?.user?.id` (see `src/app/(app)/documents/actions.ts`).
- Use `pnpm prisma migrate dev --name add_chat_tables` to run the migration.
- Streaming uses Next.js `ReadableStream` + OpenAI SDK stream (no Vercel AI SDK — not installed).
- Use `pnpm test` to run the full test suite before committing each parent task.

---

## Tasks

- [x] 1.0 Database: Add chat schema and migrate
  - [x] 1.1 Add `ChatSession` model to `prisma/schema.prisma`
    - Open `prisma/schema.prisma`.
    - Add the following model:
      ```prisma
      model ChatSession {
        id        String        @id @default(cuid())
        userId    String        @map("user_id")
        user      User          @relation(fields: [userId], references: [id])
        title     String
        createdAt DateTime      @default(now()) @map("created_at")
        updatedAt DateTime      @updatedAt @map("updated_at")
        messages  ChatMessage[]

        @@index([userId])
        @@map("chat_sessions")
      }
      ```
    - Add `chatSessions ChatSession[]` to the `User` model.
  - [x] 1.2 Add `ChatMessage` model to `prisma/schema.prisma`
    - Add the following model after `ChatSession`:
      ```prisma
      model ChatMessage {
        id        String      @id @default(cuid())
        sessionId String      @map("session_id")
        session   ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
        role      String
        content   String
        sources   Json?
        createdAt DateTime    @default(now()) @map("created_at")

        @@index([sessionId])
        @@map("chat_messages")
      }
      ```
    - The `sources` field is nullable JSON — only populated on `role: "assistant"` messages.
    - The `role` field is a plain `String` (values: `"user"` or `"assistant"`).
  - [x] 1.3 Run the Prisma migration
    - Run `pnpm prisma migrate dev --name add_chat_tables`.
    - Confirm the migration file is created in `prisma/migrations/`.
    - Run `pnpm prisma generate` to regenerate the client.

- [x] 2.0 API: Session management endpoints
  - [x] 2.1 Create `GET /api/chat/sessions` — list sessions
    - Create `src/app/api/chat/sessions/route.ts`.
    - Use `auth()` from `@/auth` to get the current user. Return `401` if not authenticated.
    - Query `prisma.chatSession.findMany` where `userId === session.user.id`, ordered by `updatedAt desc`, limit 20.
    - Return `{ sessions: [...] }` as JSON.
  - [x] 2.2 Create `POST /api/chat/sessions` — create session
    - In the same `route.ts`, export a `POST` handler.
    - Use `auth()` to authenticate. Return `401` if not authenticated.
    - Read `title` from the request body (string, max 60 chars — the caller passes the user's first message truncated).
    - Create a new `ChatSession` record via `prisma.chatSession.create`.
    - Return `{ session: { id, title, createdAt, updatedAt } }` with status `201`.

- [x] 3.0 API: Streaming message endpoint with RAG pipeline
  - [x] 3.1 Create the route file and authenticate
    - Create `src/app/api/chat/[sessionId]/message/route.ts`.
    - Export a `POST` handler.
    - Use `auth()` to get the current user. Return `401` if not authenticated.
    - Read `sessionId` from `params` and `content` from the request body.
    - Verify the session exists and belongs to `session.user.id` via `prisma.chatSession.findFirst`. Return `404` if not found.
  - [x] 3.2 Save the user message
    - Create a `ChatMessage` record with `role: "user"`, `content`, `sessionId`.
    - Update `chatSession.updatedAt` by calling `prisma.chatSession.update` with `updatedAt: new Date()`.
  - [x] 3.3 Embed the user query and run vector search
    - Import `generateEmbedding` from `@/lib/generate-embeddings`.
    - Call `generateEmbedding(content)` to get a `number[]` vector.
    - If embedding fails, skip vector search and set chunks to `[]`.
    - Run a raw Prisma query to find the top-5 most similar `DocumentChunk` records:
      ```sql
      SELECT dc.id, dc.content, dc."chunkIndex",
             d.id AS "documentId", d."documentNumber", d.subject,
             dc.embedding <=> $1::vector AS distance
      FROM document_chunks dc
      JOIN documents d ON d.id = dc."documentId"
      WHERE dc.embedding IS NOT NULL
      ORDER BY dc.embedding <=> $1::vector
      LIMIT 5
      ```
    - Use `prisma.$queryRaw` with `Prisma.sql` template tag and pass the embedding as a formatted vector string `[x,y,z,...]`.
  - [x] 3.4 Build the system prompt with context
    - If chunks were found, format them into a context block:
      ```
      Kamu adalah DIAN, asisten dokumen pemerintah. Jawab pertanyaan berdasarkan dokumen berikut saja.
      Jika jawaban tidak ada dalam dokumen, katakan dengan jelas bahwa kamu tidak menemukan dokumen yang relevan.

      Konteks dokumen:
      [1] Nomor: <documentNumber>, Perihal: <subject>
      Isi: <content>
      ...
      ```
    - If no chunks found, use the same prompt but state there are no matching documents.
    - Build the messages array: system prompt + all previous messages in this session (fetched from DB) + the new user message.
  - [x] 3.5 Stream the OpenAI response
    - Create an OpenAI client using `new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`.
    - Call `client.chat.completions.create` with `model: "gpt-4o-mini"`, `stream: true`, and the messages array.
    - Create a `ReadableStream` that encodes each token chunk as `data: <token>\n\n` (SSE format).
    - Return a `Response` with `Content-Type: text/event-stream` and the stream as the body.
    - After the stream ends, collect the full response text and the source document list, then save the assistant message to DB:
      - `role: "assistant"`, `content: fullText`, `sources: JSON array of { documentId, documentNumber, subject, excerpt (first 200 chars of chunk content) }`.
      - Update `chatSession.updatedAt`.
    - Note: saving to DB after streaming is done via a fire-and-forget `Promise` that doesn't block the stream.

- [x] 4.0 UI: Two-panel chat page at `/chat`
  - [x] 4.1 Create the `/chat` page shell
    - Create `src/app/(app)/chat/page.tsx`.
    - Mark it `'use client'`.
    - Import and compose `SessionList` (left panel) and `ChatThread` (right panel) side by side.
    - State: `activeSessionId: string | null` (lifted here, passed down as props).
    - Layout: `flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-border bg-white`.
    - Left panel: fixed width `w-64 shrink-0 border-r`.
    - Right panel: `flex-1 min-w-0`.
  - [x] 4.2 Create `SessionList` component
    - Create `src/components/chat/session-list.tsx`, mark `'use client'`.
    - Props: `activeSessionId`, `onSelect(id: string)`, `onNewChat()`.
    - On mount, fetch `GET /api/chat/sessions` and store sessions in local state.
    - Render a "Chat Baru" button at the top (full width, outlined).
    - Render the list of sessions below: each item shows the `title` and relative time (`updatedAt`).
    - Active session gets a highlighted background (`bg-accent`).
    - Expose a `refresh()` method via `useImperativeHandle` so the parent can trigger a refresh after a new session is created.
  - [x] 4.3 Create `ChatThread` component
    - Create `src/components/chat/chat-thread.tsx`, mark `'use client'`.
    - Props: `sessionId: string | null`, `onSessionCreated(id: string, title: string)`.
    - When `sessionId` is null, render an empty state: centered Bot icon + "Mulai percakapan baru" text.
    - When `sessionId` changes, fetch all messages for that session from the DB (add a server action `getChatMessages(sessionId)` in the page or a separate actions file).
    - Render messages using `MessageBubble`.
    - Auto-scroll to bottom on new messages using a `bottomRef`.
    - Render `ChatInput` pinned at the bottom.
    - On send: if `sessionId` is null, call `POST /api/chat/sessions` to create one first (title = first 60 chars of message), then call `onSessionCreated`. Then stream the message.
    - Streaming: call `POST /api/chat/[sessionId]/message` with `fetch` and read the response body as a `ReadableStream`. Parse SSE lines (`data: <token>`) and append tokens to a temporary streaming message in state. When the stream ends, replace the temporary message with the saved one from DB (or just keep the streamed content).
  - [x] 4.4 Create `MessageBubble` component
    - Create `src/components/chat/message-bubble.tsx`.
    - Props: `role: "user" | "assistant"`, `content: string`, `sources?: Source[]`, `isStreaming?: boolean`.
    - User bubble: right-aligned, primary bg, white text, `rounded-2xl rounded-tr-sm`.
    - Assistant bubble: left-aligned, `bg-slate-100`, slate text, `rounded-2xl rounded-tl-sm`. Show a Bot avatar icon to the left.
    - If `isStreaming` is true, show an animated dots indicator at the end of the content.
    - If `sources` is non-empty, render a list of `SourceCard` components below the bubble.
  - [x] 4.5 Create `SourceCard` component
    - Create `src/components/chat/source-card.tsx`.
    - Props: `documentId: string`, `documentNumber: string | null`, `subject: string | null`, `excerpt: string`.
    - Render as a small card: `bg-white border rounded-lg p-3 text-xs`.
    - Show document number and subject as the card title.
    - Show the excerpt (truncated to ~120 chars) as body text.
    - Wrap the card in a `Link` pointing to `/documents?highlight=<documentId>` (or just `/documents` for now).
  - [x] 4.6 Create `ChatInput` component
    - Create `src/components/chat/chat-input.tsx`, mark `'use client'`.
    - Props: `onSend(text: string)`, `disabled?: boolean`, `isOnline: boolean`.
    - Use `useOnlineStatus` hook (or `navigator.onLine` + `online`/`offline` event listeners) to detect connectivity.
    - When offline: disable the input and show a small notice `"Fitur ini memerlukan koneksi internet"` above the input bar.
    - When `disabled` (streaming in progress): disable the input and button.
    - Enter key submits (no shift+Enter), same as the existing `/asisten` page.

- [ ] 5.0 Route: Remove `/asisten`, update navigation
  - [ ] 5.1 Delete the `/asisten` route
    - Delete the file `src/app/(app)/asisten/page.tsx`.
    - Delete the directory `src/app/(app)/asisten/`.
  - [ ] 5.2 Update the sidebar navigation
    - Open `src/components/layout/sidebar.tsx`.
    - In `menuUtama`, change `href: '/asisten'` to `href: '/chat'` and `label: 'Asisten'` to `label: 'Chat'`.
    - No other changes needed — the icon (`MessageSquare`) stays the same.
