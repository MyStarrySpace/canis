/**
 * Extract old node data from commit 0449462 in alz-market-viz.
 *
 * Reads each module file via `git show 0449462:src/data/mechanisticFramework/nodes/<file>.ts`,
 * parses the TypeScript to extract node objects, and writes old-nodes.json.
 *
 * Extracted fields: id, label, moduleId, category, subtype, description
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALZ_REPO = 'C:/Users/quest/Programming/alz-market-viz';
const COMMIT = '0449462';
const NODE_FILES = [
  'boundary.ts',
  'm01-mtor-autophagy.ts',
  'm02-lysosomal.ts',
  'm03-mitochondrial.ts',
  'm04-inflammasome.ts',
  'm05-microglia.ts',
  'm06-amyloid.ts',
  'm07-tau.ts',
  'm08-complement.ts',
  'm09-iron-ferroptosis.ts',
  'm10-apoe4-rest.ts',
  'm11-trem2-dam.ts',
  'm12-bbb-glymphatic.ts',
  'm13-cholinergic.ts',
  'm14-mam-calcium.ts',
  'm15-interventions.ts',
  'm16-sex-ancestry.ts',
  'm17-immunomodulatory.ts',
  'm18-astrocyte-endfoot.ts',
  'm19-post-infectious.ts',
  'm20-hormones.ts',
];

function getFileContent(filename) {
  const gitPath = `src/data/mechanisticFramework/nodes/${filename}`;
  try {
    return execSync(`git show ${COMMIT}:${gitPath}`, {
      cwd: ALZ_REPO,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    console.error(`Failed to read ${gitPath}: ${err.message}`);
    return null;
  }
}

/**
 * Parse node objects from TypeScript source.
 *
 * Strategy: Find top-level objects in the exported array by tracking brace depth.
 * Then extract the target fields using regex on each object block.
 */
function parseNodes(source, filename) {
  const nodes = [];

  // Find the start of the array: `MechanisticNode[] = [`
  const arrayStartMatch = source.match(/MechanisticNode\[\]\s*=\s*\[/);
  if (!arrayStartMatch) {
    console.warn(`  No MechanisticNode[] array found in ${filename}`);
    return nodes;
  }

  const arrayStartIndex = arrayStartMatch.index + arrayStartMatch[0].length;

  // Walk through the source to find each top-level object { ... }
  let depth = 0;
  let objectStart = -1;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = arrayStartIndex; i < source.length; i++) {
    const ch = source[i];
    const next = i + 1 < source.length ? source[i + 1] : '';

    // Handle escape sequences in strings
    if (escaped) {
      escaped = false;
      continue;
    }

    // Handle line comments
    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }

    // Handle block comments
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++; // skip the '/'
      }
      continue;
    }

    // Handle strings
    if (inString) {
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }

    // Start of comment
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    // Start of string
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }

    // Track braces
    if (ch === '{') {
      if (depth === 0) {
        objectStart = i;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        const objectBlock = source.substring(objectStart, i + 1);
        const node = extractNodeFields(objectBlock);
        if (node) {
          nodes.push(node);
        }
        objectStart = -1;
      }
    }

    // End of array
    if (depth === 0 && ch === ']') {
      break;
    }
  }

  return nodes;
}

/**
 * Extract specific fields from a node object block.
 * Only extracts simple string fields at the top level of the object.
 */
function extractNodeFields(block) {
  const fields = ['id', 'label', 'moduleId', 'category', 'subtype', 'description'];
  const result = {};

  for (const field of fields) {
    // Match field: 'value' or field: "value"
    // The value can contain escaped quotes and special characters
    const regex = new RegExp(
      `(?:^|\\n)\\s*${field}\\s*:\\s*(['"\`])([\\s\\S]*?)\\1`,
      'm'
    );
    const match = block.match(regex);
    if (match) {
      // Unescape the value
      let value = match[2];
      // Handle common escape sequences
      value = value.replace(/\\'/g, "'");
      value = value.replace(/\\"/g, '"');
      value = value.replace(/\\\\/g, '\\');
      result[field] = value;
    }
  }

  // Must have at least id to be valid
  if (!result.id) return null;

  // Fill in missing optional fields
  for (const field of fields) {
    if (!(field in result)) {
      result[field] = null;
    }
  }

  return result;
}

// Main
console.log(`Extracting nodes from commit ${COMMIT}...\n`);

const allNodes = [];

for (const file of NODE_FILES) {
  const content = getFileContent(file);
  if (!content) continue;

  const nodes = parseNodes(content, file);
  console.log(`  ${file}: ${nodes.length} nodes`);
  allNodes.push(...nodes);
}

console.log(`\nTotal nodes extracted: ${allNodes.length}`);

const outputPath = path.join(__dirname, 'old-nodes.json');
fs.writeFileSync(outputPath, JSON.stringify(allNodes, null, 2), 'utf-8');
console.log(`Written to: ${outputPath}`);
