/**
 * Chunking for retrieval.
 *
 * Exam generation must not send whole documents to the model. A 30-page script
 * is tens of thousands of tokens, most of them irrelevant to the three topics
 * a student picked, and paying for that on every generation is what makes
 * AI features uneconomical.
 *
 * So documents are split once at upload, embedded, and then only the passages
 * that match the selected topics are retrieved at generation time.
 *
 * Chunking rules
 *   - Split on paragraph boundaries, never mid-sentence, so a chunk reads as a
 *     coherent passage on its own.
 *   - Carry the nearest preceding heading into every chunk. A passage that
 *     says "this follows from the above" is useless without knowing what
 *     section it belongs to.
 *   - Overlap consecutive chunks slightly so a fact stated across a paragraph
 *     boundary is retrievable from either side.
 *
 * Pure and side-effect free.
 */

export type Chunk = {
  index: number;
  content: string;
  heading: string | null;
  tokenEstimate: number;
};

/** Roughly 800 tokens: large enough to hold an argument, small enough that a
 *  handful fit in a prompt alongside curriculum context. */
const TARGET_CHARS = 3_200;
const MIN_CHARS = 400;
const OVERLAP_CHARS = 300;

/**
 * German averages closer to 3 characters per token than English's 4, because
 * of compound nouns and umlauts. Used for budgeting, not billing.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.3);
}

/**
 * Recognises a heading.
 *
 * Deliberately conservative: a false positive turns a normal sentence into a
 * section title and mislabels every chunk beneath it.
 */
export function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 90) return false;
  // Real sentences end in punctuation; headings usually do not.
  if (/[.!?;:,]$/.test(trimmed)) return false;

  // Markdown heading.
  if (/^#{1,6}\s+\S/.test(trimmed)) return true;
  // Numbered section: "2.", "3.1", "IV." followed by words.
  if (/^(\d+(\.\d+)*|[IVXLC]+)[.)]?\s+\p{Lu}/u.test(trimmed)) return true;
  // Short line in title case or all caps with no terminal punctuation.
  if (/^\p{Lu}[\p{L}\p{N}\s,'’()\-/&]{2,}$/u.test(trimmed)) {
    const words = trimmed.split(/\s+/);
    if (words.length <= 10) return true;
  }
  return false;
}

function cleanHeading(line: string): string {
  return line.trim().replace(/^#{1,6}\s+/, "").slice(0, 120);
}

/**
 * Splits text into overlapping, heading-aware chunks.
 */
export function chunkText(text: string): Chunk[] {
  const normalised = text.trim();
  if (normalised.length === 0) return [];

  // A short document is one chunk. Splitting it would lose more in context
  // than it gains in precision.
  if (normalised.length <= TARGET_CHARS) {
    return [
      {
        index: 0,
        content: normalised,
        heading: findFirstHeading(normalised),
        tokenEstimate: estimateTokens(normalised),
      },
    ];
  }

  const blocks = splitIntoBlocks(normalised);
  const chunks: Chunk[] = [];

  let buffer: string[] = [];
  let bufferLength = 0;
  let currentHeading: string | null = null;
  let chunkHeading: string | null = null;

  const flush = () => {
    if (buffer.length === 0) return;
    const content = buffer.join("\n\n").trim();
    if (content.length === 0) {
      buffer = [];
      bufferLength = 0;
      return;
    }

    chunks.push({
      index: chunks.length,
      content,
      heading: chunkHeading,
      tokenEstimate: estimateTokens(content),
    });

    // Carry the tail of this chunk into the next one so a statement spanning
    // the boundary stays retrievable from both sides.
    const tail = content.slice(-OVERLAP_CHARS);
    const sentenceStart = tail.search(/[.!?]\s+\p{Lu}/u);
    const carry =
      sentenceStart >= 0 ? tail.slice(sentenceStart + 1).trim() : "";

    buffer = carry.length > 0 ? [carry] : [];
    bufferLength = carry.length;
    chunkHeading = currentHeading;
  };

  for (const block of blocks) {
    if (block.isHeading) {
      currentHeading = block.text;
      // A heading starts a new section; break here if we already have enough.
      if (bufferLength >= MIN_CHARS) flush();
      chunkHeading ??= currentHeading;
      buffer.push(block.text);
      bufferLength += block.text.length;
      continue;
    }

    chunkHeading ??= currentHeading;

    // A single oversized paragraph has to be split on sentences.
    if (block.text.length > TARGET_CHARS) {
      if (bufferLength > 0) flush();
      for (const piece of splitLongParagraph(block.text)) {
        buffer.push(piece);
        bufferLength += piece.length;
        if (bufferLength >= TARGET_CHARS) flush();
      }
      continue;
    }

    if (bufferLength + block.text.length > TARGET_CHARS && bufferLength >= MIN_CHARS) {
      flush();
      chunkHeading ??= currentHeading;
    }

    buffer.push(block.text);
    bufferLength += block.text.length;
  }

  flush();

  return chunks.map((chunk, index) => ({ ...chunk, index }));
}

type Block = { text: string; isHeading: boolean };

function splitIntoBlocks(text: string): Block[] {
  const paragraphs = text.split(/\n\s*\n/);
  const blocks: Block[] = [];

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n");
    // A paragraph whose first line is a heading and which has more content
    // becomes two blocks.
    const first = lines[0];
    if (first && lines.length > 1 && isHeading(first)) {
      blocks.push({ text: cleanHeading(first), isHeading: true });
      const rest = lines.slice(1).join("\n").trim();
      if (rest.length > 0) blocks.push({ text: rest, isHeading: false });
      continue;
    }

    const trimmed = paragraph.trim();
    if (trimmed.length === 0) continue;
    blocks.push({
      text: isHeading(trimmed) ? cleanHeading(trimmed) : trimmed,
      isHeading: isHeading(trimmed),
    });
  }

  return blocks;
}

function splitLongParagraph(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [paragraph];
  const pieces: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > TARGET_CHARS && current.length > 0) {
      pieces.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim().length > 0) pieces.push(current.trim());

  return pieces;
}

function findFirstHeading(text: string): string | null {
  for (const line of text.split("\n").slice(0, 5)) {
    if (isHeading(line)) return cleanHeading(line);
  }
  return null;
}

/**
 * Builds the text that actually gets embedded.
 *
 * Prefixing the heading means a query about "Photosynthese" can match a chunk
 * that never repeats the word but sits under that heading.
 */
export function embeddingTextFor(chunk: Pick<Chunk, "content" | "heading">): string {
  return chunk.heading ? `${chunk.heading}\n\n${chunk.content}` : chunk.content;
}

/**
 * Trims retrieved chunks to a token budget.
 *
 * Retrieval returns chunks ranked by similarity; this keeps taking them until
 * the prompt budget is spent. Without a cap, a student who selected ten
 * materials would produce a prompt that costs more than the subscription.
 */
export function fitToBudget<T extends { content: string; heading?: string | null }>(
  chunks: readonly T[],
  maxTokens: number,
): T[] {
  const kept: T[] = [];
  let used = 0;

  for (const chunk of chunks) {
    const cost = estimateTokens(chunk.content) + 20;
    if (used + cost > maxTokens) {
      if (kept.length === 0) kept.push(chunk);
      break;
    }
    kept.push(chunk);
    used += cost;
  }

  return kept;
}
