#!/usr/bin/env node
/**
 * Edge Verification Pipeline — Step 3
 *
 * Takes candidate edges from discover-edges.cjs output, then:
 *   1) Searches PubMed for supporting literature
 *   2) Asks Haiku to verify the relationship based on search results
 *   3) Outputs verified edges ready for integration
 *
 * Usage:
 *   node scripts/verify-candidate-edges.cjs                   # Verify all candidates
 *   node scripts/verify-candidate-edges.cjs --limit=50        # Verify first 50
 *   node scripts/verify-candidate-edges.cjs --start=100       # Resume from index 100
 *   node scripts/verify-candidate-edges.cjs --dry-run         # Preview first candidate
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', 'alz-market-viz', '.env') });
const Anthropic = require('@anthropic-ai/sdk').default;
const path = require('path');
const fs = require('fs');
const https = require('https');

const OUT_DIR = path.join(__dirname, '..', 'output');
const CANDIDATES_PATH = path.join(OUT_DIR, 'candidate-edges.json');
const VERIFIED_PATH = path.join(OUT_DIR, 'verified-edges.json');
const REJECTED_PATH = path.join(OUT_DIR, 'rejected-edges.json');
const PROGRESS_PATH = path.join(OUT_DIR, 'verify-progress.json');

const BATCH_SIZE = 3;          // concurrent verifications
const BATCH_DELAY_MS = 4000;   // delay between batches (PubMed rate limit: 3/sec without API key)
const MAX_RETRIES = 3;

function parseArgs() {
  const args = { start: 0, limit: Infinity, dryRun: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--start=')) args.start = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--limit=')) args.limit = parseInt(arg.split('=')[1]);
    if (arg === '--dry-run') args.dryRun = true;
  }
  return args;
}

/** Search PubMed E-utilities for articles about two biological concepts */
function searchPubMed(termA, termB) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(
      `(${termA}) AND (${termB}) AND (Alzheimer OR neurodegeneration OR brain)`
    );
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=5&sort=relevance&retmode=json`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const ids = json.esearchresult?.idlist || [];
          resolve(ids);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/** Fetch article summaries from PubMed */
function fetchPubMedSummaries(pmids) {
  if (pmids.length === 0) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const ids = pmids.join(',');
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const summaries = [];
          for (const pmid of pmids) {
            const article = json.result?.[pmid];
            if (article) {
              summaries.push({
                pmid,
                title: article.title || '',
                authors: (article.authors || []).map(a => a.name).slice(0, 3).join(', '),
                source: article.source || '',
                pubdate: article.pubdate || '',
              });
            }
          }
          resolve(summaries);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

function buildVerificationPrompt(sourceLabel, targetLabel, articles) {
  const articleSection = articles.length > 0
    ? articles.map((a, i) => `  ${i + 1}. "${a.title}" (${a.authors}, ${a.source} ${a.pubdate}) [PMID: ${a.pmid}]`).join('\n')
    : '  No relevant PubMed articles found.';

  return `You are an expert in Alzheimer's disease biology and neurodegeneration.

I'm building a causal mechanistic network of Alzheimer's disease. I need you to evaluate whether there is a plausible direct causal relationship between two biological entities:

**Source**: ${sourceLabel}
**Target**: ${targetLabel}

## PubMed Search Results
${articleSection}

## Instructions

Based on the search results and your knowledge, determine:
1. Is there a plausible **direct** causal relationship between these two entities?
2. If yes, what is the **direction** (source→target, target→source, or bidirectional)?
3. What is the **relation type**? Choose from: increases, decreases, directlyIncreases, directlyDecreases, regulates, produces, degrades, binds, inhibits, disrupts, protects, catalyzes, transports, amplifies
4. What is the **evidence confidence level**? L1=RCT, L2=MR, L3=GWAS+functional, L4=animal, L5=in_vitro, L6=observational, L7=expert
5. What **method type** supports this? Choose from: RCT, MR, knockout, GWAS, animal, in_vitro, observational, review

Return a JSON object:
- If NO plausible relationship: {"supported": false, "reason": "brief explanation"}
- If YES: {"supported": true, "direction": "source_to_target"|"target_to_source"|"bidirectional", "relation": "...", "confidence": "L1"|...|"L7", "methodType": "...", "pmid": "best PMID or null", "mechanism": "1-2 sentence explanation of the mechanism", "reason": "brief justification"}

Be strict: only confirm relationships with clear biological basis. Indirect associations don't count.
Return ONLY the JSON object.`;
}

async function queryHaiku(client, prompt, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = response.content[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (attempt < retries - 1) {
        const delay = (attempt + 1) * 2000;
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

async function verifyCandidate(client, candidate) {
  // Step 1: Search PubMed
  const pmids = await searchPubMed(candidate.sourceLabel, candidate.targetLabel);
  await new Promise(r => setTimeout(r, 400)); // PubMed rate limit

  // Step 2: Fetch summaries
  const articles = await fetchPubMedSummaries(pmids);
  await new Promise(r => setTimeout(r, 400));

  // Step 3: Ask Haiku to verify
  const prompt = buildVerificationPrompt(candidate.sourceLabel, candidate.targetLabel, articles);
  const result = await queryHaiku(client, prompt);

  return {
    ...candidate,
    pubmedHits: pmids.length,
    articles,
    verification: result,
  };
}

async function main() {
  const args = parseArgs();

  if (!fs.existsSync(CANDIDATES_PATH)) {
    console.error(`ERROR: No candidate edges found at ${CANDIDATES_PATH}`);
    console.error('Run discover-edges.cjs first.');
    process.exit(1);
  }

  const candidates = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf-8'));
  console.log(`Loaded ${candidates.length} candidate edges`);

  if (args.dryRun) {
    const c = candidates[0];
    console.log('\n=== DRY RUN: First candidate ===');
    console.log(`${c.sourceLabel} ↔ ${c.targetLabel}`);
    console.log('\nSearching PubMed...');
    const pmids = await searchPubMed(c.sourceLabel, c.targetLabel);
    console.log(`Found ${pmids.length} PMIDs: ${pmids.join(', ')}`);
    const articles = await fetchPubMedSummaries(pmids);
    articles.forEach(a => console.log(`  - ${a.title} [${a.pmid}]`));
    const prompt = buildVerificationPrompt(c.sourceLabel, c.targetLabel, articles);
    console.log(`\nPrompt length: ${prompt.length} chars`);
    console.log('\n--- Prompt ---');
    console.log(prompt);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable required');
    process.exit(1);
  }

  const client = new Anthropic();

  // Load existing results
  let verified = [];
  let rejected = [];
  if (fs.existsSync(VERIFIED_PATH)) {
    verified = JSON.parse(fs.readFileSync(VERIFIED_PATH, 'utf-8'));
  }
  if (fs.existsSync(REJECTED_PATH)) {
    rejected = JSON.parse(fs.readFileSync(REJECTED_PATH, 'utf-8'));
  }

  // Track already-processed pairs
  const processedPairs = new Set([
    ...verified.map(v => `${v.source}→${v.target}`),
    ...rejected.map(r => `${r.source}→${r.target}`),
  ]);

  const toProcess = candidates
    .slice(args.start)
    .filter(c => !processedPairs.has(`${c.source}→${c.target}`))
    .slice(0, args.limit);

  console.log(`To process: ${toProcess.length} (skipping ${candidates.length - toProcess.length} already done)`);
  console.log(`Batch size: ${BATCH_SIZE}, delay: ${BATCH_DELAY_MS}ms\n`);

  let verifiedCount = 0;
  let rejectedCount = 0;

  for (let batchStart = 0; batchStart < toProcess.length; batchStart += BATCH_SIZE) {
    const batch = toProcess.slice(batchStart, batchStart + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(c => verifyCandidate(client, c))
    );

    for (let i = 0; i < results.length; i++) {
      const c = batch[i];
      const r = results[i];

      if (r.status === 'rejected') {
        console.error(`  [ERROR] ${c.sourceLabel} ↔ ${c.targetLabel}: ${r.reason}`);
        rejected.push({ ...c, error: r.reason?.message || String(r.reason) });
        rejectedCount++;
        continue;
      }

      const result = r.value;
      const v = result.verification;

      if (v.supported) {
        verified.push(result);
        verifiedCount++;
        console.log(`  [✓ ${batchStart + i + 1}/${toProcess.length}] ${c.sourceLabel} → ${c.targetLabel}: ${v.relation} (${v.confidence}) — ${v.pmid || 'no PMID'}`);
      } else {
        rejected.push(result);
        rejectedCount++;
        console.log(`  [✗ ${batchStart + i + 1}/${toProcess.length}] ${c.sourceLabel} ↔ ${c.targetLabel}: ${v.reason}`);
      }
    }

    // Save after each batch
    fs.writeFileSync(VERIFIED_PATH, JSON.stringify(verified, null, 2));
    fs.writeFileSync(REJECTED_PATH, JSON.stringify(rejected, null, 2));
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify({
      totalCandidates: candidates.length,
      processed: processedPairs.size + batchStart + batch.length,
      verified: verified.length,
      rejected: rejected.length,
      timestamp: new Date().toISOString(),
    }, null, 2));

    if (batchStart + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log('\n=== Verification Complete ===');
  console.log(`Verified (new edges): ${verified.length}`);
  console.log(`Rejected: ${rejected.length}`);
  console.log(`Verified: ${VERIFIED_PATH}`);
  console.log(`Rejected: ${REJECTED_PATH}`);
}

main().catch(console.error);
