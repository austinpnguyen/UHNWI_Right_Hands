/**
 * brain/rag_ingestor.js
 * Watches the 00_FOUNDER_INSTRUCTION directory for new/changed files.
 * On detection: chunks the file, fetches embeddings via Together AI,
 * optionally translates non-English content, and stores in SQLite.
 *
 * Must be initialized with the Together AI client and a function to resolve
 * the active company_id at ingest time.
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { insertRagChunk, deleteRagByFilename } = require('./db');

// ─── Text chunking ─────────────────────────────────────────────────────────
const CHUNK_SIZE = 400;   // approximate words per chunk
const CHUNK_OVERLAP = 50; // overlap to preserve context at boundaries

/**
 * Split text into overlapping word-based chunks.
 * @param {string} text
 * @returns {string[]}
 */
function chunkText(text) {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks = [];
    let start = 0;
    while (start < words.length) {
        const end = Math.min(start + CHUNK_SIZE, words.length);
        chunks.push(words.slice(start, end).join(' '));
        if (end === words.length) break;
        start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks;
}

// ─── Language detection (simple heuristic) ─────────────────────────────────
const VIETNAMESE_PATTERNS = /[àáảãạăắặẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
const CHINESE_PATTERNS = /[\u4e00-\u9fff]/;

/**
 * Detect the likely language of a text chunk.
 * Returns 'vi', 'zh', or 'en'.
 */
function detectLanguage(text) {
    if (CHINESE_PATTERNS.test(text)) return 'zh';
    if (VIETNAMESE_PATTERNS.test(text)) return 'vi';
    return 'en';
}

// ─── Core ingestor class ───────────────────────────────────────────────────

class RAGIngestor {
    /**
     * @param {Object} opts
     * @param {Object} opts.together        - Together AI client instance
     * @param {Function} opts.getCompanyId  - () => string — returns active company_id
     * @param {string} opts.watchDir        - Directory to watch
     * @param {string} [opts.embedModel]    - Embedding model to use
     */
    constructor({ together, getCompanyId, watchDir, embedModel = 'togethercomputer/m2-bert-80M-8k-retrieval' }) {
        this.together = together;
        this.getCompanyId = getCompanyId;
        this.watchDir = watchDir;
        this.embedModel = embedModel;
        this.watcher = null;
    }

    /**
     * Get an embedding vector for a text string.
     * Falls back to null (text-only storage) if embedding API unavailable.
     * @param {string} text
     * @returns {number[]|null}
     */
    async getEmbedding(text) {
        try {
            const resp = await this.together.embeddings.create({
                model: this.embedModel,
                input: text,
            });
            return resp?.data?.[0]?.embedding ?? null;
        } catch (err) {
            console.warn(`[RAG] Embedding failed (will store text-only): ${err.message}`);
            return null;
        }
    }

    /**
     * Translate a non-English chunk to English for LLM context.
     * Uses Together AI with a lightweight model to keep costs low.
     * @param {string} text
     * @param {string} lang - source language code ('vi' | 'zh')
     * @returns {string}
     */
    async translate(text, lang) {
        const langNames = { vi: 'Vietnamese', zh: 'Chinese' };
        const langName = langNames[lang] || 'the detected language';
        try {
            const resp = await this.together.chat.completions.create({
                model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional translator. Translate the given text accurately to English. Reply with ONLY the translated text, no explanations.',
                    },
                    {
                        role: 'user',
                        content: `Translate this ${langName} text to English:\n\n${text}`,
                    },
                ],
                max_tokens: 1024,
                temperature: 0.1,
            });
            return resp.choices?.[0]?.message?.content?.trim() ?? text;
        } catch (err) {
            console.warn(`[RAG] Translation failed: ${err.message}`);
            return text; // fallback: store original
        }
    }

    /**
     * Process a single file: chunk → detect language → translate if needed → embed → store.
     * @param {string} filePath - Absolute path to the file
     * @param {string} companyId
     */
    async ingestFile(filePath, companyId) {
        const filename = path.basename(filePath);
        let content;
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch (err) {
            console.warn(`[RAG] Cannot read file ${filename}: ${err.message}`);
            return;
        }

        const chunks = chunkText(content);
        console.log(`[RAG] Ingesting "${filename}" → ${chunks.length} chunk(s) for company "${companyId}"`);

        for (let i = 0; i < chunks.length; i++) {
            const originalText = chunks[i];
            const lang = detectLanguage(originalText);

            // Translate non-English content to English for better LLM context
            let translatedText = originalText;
            if (lang !== 'en') {
                console.log(`[RAG] Translating chunk ${i + 1}/${chunks.length} (lang: ${lang})...`);
                translatedText = await this.translate(originalText, lang);
            }

            // Get embedding (non-blocking — null is fine, FTS still works)
            const embedding = await this.getEmbedding(translatedText);

            const rowId = insertRagChunk({
                companyId,
                filename,
                originalLang: lang,
                originalText,
                translatedText: lang !== 'en' ? translatedText : null,
                chunkIndex: i,
                embeddingModel: embedding ? this.embedModel : null,
                embeddingJson: embedding,
            });

            if (rowId) {
                console.log(`[RAG] ✓ Chunk ${i + 1}/${chunks.length} stored (id: ${rowId})`);
            } else {
                console.log(`[RAG] ~ Chunk ${i + 1}/${chunks.length} already exists, skipped`);
            }
        }

        console.log(`[RAG] Done ingesting "${filename}"`);
    }

    /**
     * Start watching the directory for new/changed files.
     * Ignores dotfiles and non-.md/.txt files.
     */
    start() {
        if (this.watcher) return; // already running

        this.watcher = chokidar.watch(this.watchDir, {
            ignored: /(^|[/\\])\../,     // ignore dotfiles
            persistent: true,
            awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 }, // wait for full write
        });

        this.watcher
            .on('add', async (filePath) => {
                if (!/\.(md|txt)$/i.test(filePath)) return;
                const companyId = this.getCompanyId();
                if (!companyId) {
                    console.warn('[RAG] No active company — skipping ingest for', path.basename(filePath));
                    return;
                }
                await this.ingestFile(filePath, companyId);
            })
            .on('change', async (filePath) => {
                if (!/\.(md|txt)$/i.test(filePath)) return;
                const companyId = this.getCompanyId();
                if (!companyId) return;
                // Delete old chunks for this file, then re-ingest
                console.log(`[RAG] File changed: "${path.basename(filePath)}" — re-ingesting...`);
                deleteRagByFilename(companyId, path.basename(filePath));
                await this.ingestFile(filePath, companyId);
            })
            .on('error', (err) => console.error('[RAG] Watcher error:', err));

        console.log(`[RAG] File watcher started on: ${this.watchDir}`);
    }

    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            console.log('[RAG] File watcher stopped.');
        }
    }
}

module.exports = { RAGIngestor, chunkText, detectLanguage };
