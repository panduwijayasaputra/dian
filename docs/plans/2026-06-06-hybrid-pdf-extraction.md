# Hybrid PDF Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix garbled text extraction on BSrE-signed PDFs by falling back to OpenAI vision when pdf-parse produces unreadable output.

**Architecture:** After pdf-parse runs, score the extracted text for readability. If readable chars are below 50% of total, upload the raw PDF buffer to the OpenAI Files API and call the Responses API with gpt-4o-mini to extract both clean text and metadata in one shot. Clean PDFs continue through the existing text-based path unchanged.

**Tech Stack:** OpenAI SDK v6 (Responses API + Files API), existing pdf-parse, existing R2 client.

---

### Task 1: Add `isGarbled` and `getBufferFromR2` to `pdf.ts`

**Files:**
- Modify: `src/lib/pdf.ts`

**Step 1: Add `isGarbled` helper**

Open `src/lib/pdf.ts` and add this function after the imports:

```typescript
export function isGarbled(text: string): boolean {
  if (!text || text.length < 50) return true
  const readable = (text.match(/[\p{L}\p{N}\s.,\-()/:"'!?]/gu) ?? []).length
  return readable / text.length < 0.5
}
```

This uses Unicode property escapes (`\p{L}` = any letter, `\p{N}` = any number) so it works on Indonesian characters too. If less than half the characters are "readable", the text is garbled.

**Step 2: Add `getBufferFromR2` function**

Add this function to `src/lib/pdf.ts` after `extractTextFromR2`:

```typescript
export async function getBufferFromR2(r2Key: string): Promise<Buffer | null> {
  try {
    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2Key,
      }),
    )
    if (!response.Body) return null
    return streamToBuffer(response.Body as Readable)
  } catch {
    return null
  }
}
```

**Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors related to `pdf.ts`.

**Step 4: Commit**

```bash
git add src/lib/pdf.ts
git commit -m "feat: add isGarbled detection and getBufferFromR2 to pdf lib"
```

---

### Task 2: Add `extractFromPDFVision` to `extract-metadata.ts`

**Files:**
- Modify: `src/lib/extract-metadata.ts`

**Step 1: Add the vision extraction function**

Add this function at the bottom of `src/lib/extract-metadata.ts`, before the final closing. It uploads the PDF buffer to OpenAI, calls the Responses API asking for both clean text and metadata, then deletes the uploaded file:

```typescript
export async function extractFromPDFVision(buffer: Buffer): Promise<{
  text: string
  result: ExtractionResult
}> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  let fileId: string | null = null

  try {
    const uploaded = await client.files.create({
      file: new File([buffer], 'document.pdf', { type: 'application/pdf' }),
      purpose: 'user_data',
    })
    fileId = uploaded.id

    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_file', file_id: fileId },
            {
              type: 'input_text',
              text: `You are processing an Indonesian government document (surat dinas).
Return a JSON object with exactly two keys:
1. "text": the full readable text content of the document, preserving structure.
2. "metadata": an object with these eight keys, each having "value" and "confidence" ("high"/"medium"/"low"):
   - documentNumber: the surat number (nomor surat), or null
   - documentDate: date in YYYY-MM-DD format, or null
   - sender: the sending office/person, or null
   - receiver: the addressee (look for "Kepada Yth.", "Kepada:"), or null
   - subject: the subject/perihal, or null
   - documentType: one of INCOMING_LETTER, OUTGOING_LETTER, DISPOSITION, MEMO, REPORT, DECREE, OTHER, or null
   - urgency: one of BIASA, SEGERA, SANGAT_SEGERA, or null (look for "Sifat:")
   - security: one of BIASA, TERBATAS, RAHASIA, SANGAT_RAHASIA, or null (look for "Klasifikasi:")
Use "high" confidence when clearly stated, "medium" when inferred, "low" when guessing.`,
            },
          ],
        },
      ],
      text: { format: { type: 'json_object' } },
    })

    const raw = response.output_text
    if (!raw) return { text: '', result: FALLBACK }

    const parsed = JSON.parse(raw) as {
      text?: string
      metadata?: Record<string, { value: unknown; confidence: string }>
    }

    const metadataParsed = extractionSchema.safeParse(parsed.metadata ?? {})

    return {
      text: typeof parsed.text === 'string' ? parsed.text : '',
      result: metadataParsed.success ? (metadataParsed.data as ExtractionResult) : FALLBACK,
    }
  } catch {
    return { text: '', result: FALLBACK }
  } finally {
    if (fileId) {
      try {
        await client.files.delete(fileId)
      } catch {
        // best-effort cleanup
      }
    }
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/extract-metadata.ts
git commit -m "feat: add extractFromPDFVision using OpenAI Files API and Responses API"
```

---

### Task 3: Wire hybrid logic into `extractDocumentMetadata`

**Files:**
- Modify: `src/app/(app)/documents/actions.ts`

**Step 1: Update imports**

At the top of `src/app/(app)/documents/actions.ts`, update the import from `@/lib/pdf`:

```typescript
import { extractTextFromR2, isGarbled, getBufferFromR2 } from '@/lib/pdf'
```

Also update the import from `@/lib/extract-metadata` to add the new function:

```typescript
import { extractMetadataFromText, extractFromPDFVision, type ExtractionResult } from '@/lib/extract-metadata'
```

**Step 2: Replace the extraction block in `extractDocumentMetadata`**

Find these three lines in `extractDocumentMetadata` (around line 73–75):

```typescript
const text = await extractTextFromR2(document.r2Key)
const result = await extractMetadataFromText(text)
const summary = await generateSummary(text)
```

Replace with:

```typescript
const rawText = await extractTextFromR2(document.r2Key)

let extractedText = rawText
let result: ExtractionResult

if (isGarbled(rawText)) {
  const buffer = await getBufferFromR2(document.r2Key)
  if (buffer) {
    const vision = await extractFromPDFVision(buffer)
    extractedText = vision.text
    result = vision.result
  } else {
    result = await extractMetadataFromText(rawText)
  }
} else {
  result = await extractMetadataFromText(rawText)
}

const summary = await generateSummary(extractedText)
```

**Step 3: Update all downstream uses of `text` to use `extractedText`**

In the same function, find the `prisma.document.update` call that sets `extractedText: text` and the `chunkText(text)` call. Replace both `text` references with `extractedText`:

```typescript
// In prisma.document.update:
extractedText: extractedText || null,

// In chunk creation:
const chunks = chunkText(extractedText)
```

**Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add src/app/(app)/documents/actions.ts
git commit -m "feat: hybrid PDF extraction - vision fallback for garbled text"
```

---

### Task 4: Manual verification

**Step 1: Start the dev server**

```bash
pnpm dev
```

**Step 2: Upload a BSrE-signed PDF**

Upload the problematic document (e.g. the Dinas Lingkungan Hidup letter). Watch the metadata review sheet:
- `documentNumber` should now have a real value (not null)
- `documentDate` should be populated
- `subject` should be populated
- `sender` should still show the office name

**Step 3: Upload a normal PDF**

Upload any standard PDF without BSrE signing. Confirm:
- It still extracts correctly via the normal text path
- The metadata review sheet works as before

**Step 4: Check logs for the garbled path**

In the terminal running `pnpm dev`, look for no errors during extraction. The vision path is silent by design — failures fall back to FALLBACK metadata rather than crashing.
