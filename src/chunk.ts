export const CHUNK_SEP = '$_CHUNK_$';

interface ChunkingOptions {
    /** Desirable chunk size */
    chunkSize: number,
    /**
     * If provided, specifies the minimum length of a quote that should be
     * extract to a separate chunk
     */
    extractQuotes: number | null,
}

const SENTENCE_BOUNDARIES = new Set([
    '\n',
    '.', '?', '!',
    '。', '？', '！',
    '．',
    '…', '―', '—'
].map((c) => c.charCodeAt(0)));

/**
 * Splits the text into chunks on sentence boundaries
 *
 * Some chunks may end up being larger that the desirable chunk size.
 *
 * @param text input text
 * @param chunkSize desirable chunk size
 */
function splitSentences(text: string, chunkSize: number): Array<string> {
    if (chunkSize <= 0)
        throw new RangeError('chunkSize must be > 0');

    const chunks: Array<string> = [];
    const len = text.length;
    let start = 0;
    let i = 0;
    let lastBoundary = -1;

    const advanceBoundaryRunEnd = (idx: number) => {
        // Take all the trailing punctuation
        let j = idx;
        while (j < len && SENTENCE_BOUNDARIES.has(text.charCodeAt(j)))
            j++;
        return j;
    };


    while (i < len) {
        if (SENTENCE_BOUNDARIES.has(text.charCodeAt(i)))
            lastBoundary = i;
        i++;

        if (i - start >= chunkSize) {
            if (lastBoundary >= start) {
                const end = advanceBoundaryRunEnd(lastBoundary);
                chunks.push(text.slice(start, end));
                start = i = end;
            } else {
                let j = i;
                let found = -1;
                while (j < len) {
                    if (SENTENCE_BOUNDARIES.has(text.charCodeAt(j))) {
                        found = j;
                        break;
                    }
                    j++;
                }
                if (found >= 0) {
                    const end = advanceBoundaryRunEnd(found);
                    chunks.push(text.slice(start, end));
                    start = i = end;
                } else {
                    // no further boundary: remainder is final chunk
                    chunks.push(text.slice(start));
                    return chunks;
                }
            }
            lastBoundary = -1;
        }
    }

    if (start < len)
        chunks.push(text.slice(start));
    return chunks;
}

const OPEN_QUOTE = 0x300c; // 「
const CLOSE_QUOTE = 0x300d; // 」

/**
 * Split text into quoted and unquoted parts
 *
 * Only Japanese single quotes (「」) are searched.
 *
 * Only quotes that are longer than `minQuotedLength` are extracted into a
 * separate chunk. Quote marks are included into the chunk.
 *
 * @param text input text
 * @param minQuotedLength minimal length of a quote to be extracted
 */
export function splitQuotes(text: string, minQuotedLength: number): Array<string> {
    const chunks: Array<string> = [];
    const len = text.length;
    let start = 0;
    let depth = 0;
    let openIdx = -1;

    for (let i = 0; i < len; i++) {
        const ch = text.charCodeAt(i);
        if (ch === OPEN_QUOTE) {
            if (depth === 0)
                openIdx = i;
            depth++;
        } else if (ch === CLOSE_QUOTE) {
            if (depth > 0) {
                depth--;
                if (depth === 0 && openIdx >= 0) {
                    const closeIdx = i;
                    const quoteLen = closeIdx - openIdx - 1;
                    if (quoteLen >= minQuotedLength) {
                        if (start < openIdx)
                            chunks.push(text.slice(start, openIdx));
                        chunks.push(text.slice(openIdx, closeIdx + 1));
                        start = closeIdx + 1;
                    }
                    openIdx = -1;
                }
            }
        }
    }

    if (depth > 0 && openIdx >= 0) {
        const quoteLen = len - openIdx - 1;
        if (quoteLen >= minQuotedLength) {
            if (start < openIdx)
                chunks.push(text.slice(start, openIdx));
            chunks.push(text.slice(openIdx))
            start = len;
        }
    }

    if (start < len)
        chunks.push(text.slice(start));

    return chunks;
}


/*
 * Split text into small chunks
 *
 * AivisSpeech's documentation recommends that the text provided to the TTS be
 * sliced into chunks under 500 Japanese characters. Also, it is suggested to
 * split the text by ‘meaning breaks’ (e.g. paragraph breaks) to produce more
 * natural results.
 *
 * SillyTavern currently does not pass newlines to a TTS provider.
 *
 * @param text input text
 * @returns chunks of text to provide to the TTS
 */
export function chunkText(text: string, opts: ChunkingOptions): Array<string> {
    let chunks = text.split(CHUNK_SEP);
    if (opts.extractQuotes != null) {
        chunks = chunks.flatMap((chunk) =>
            splitQuotes(chunk, opts.extractQuotes!)
        );
    }
    return chunks.flatMap((chunk) => splitSentences(chunk, opts.chunkSize));
}
