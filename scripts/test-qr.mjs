// Checks the QR encoder against published reference values (run: npm test).
import { reedSolomonDivisor, reedSolomonRemainder, formatBits, versionBits, alignmentPositions, makeQr } from '../src/qr.js';
import { config } from '../src/config.js';

let failures = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n     got      ${JSON.stringify(actual)}\n     expected ${JSON.stringify(expected)}`}`);
};

// "HELLO WORLD" as version 1-M: the data codewords and their 10 error correction codewords (the worked example
// in the QR Code tutorial at thonky.com, which follows ISO/IEC 18004).
const hello = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
check('Reed-Solomon, HELLO WORLD 1-M', reedSolomonRemainder(hello, reedSolomonDivisor(10)), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);

// The format information strings for level M, masks 0-7 (ISO/IEC 18004 table C.1).
const expectedFormats = ['101010000010010', '101000100100101', '101111001111100', '101101101001011',
  '100010111111001', '100000011001110', '100111110010111', '100101010100000'];
check('format bits, level M', [0, 1, 2, 3, 4, 5, 6, 7].map((m) => formatBits(m).toString(2).padStart(15, '0')), expectedFormats);

// Versions grow with the text, up to 213 bytes (version 10-M).
check('version for a short link', makeQr('https://example.com').version, 2);
check('version for 213 bytes', makeQr('x'.repeat(213)).version, 10);
let threw = false;
try { makeQr('x'.repeat(214)); } catch { threw = true; }
check('214 bytes is refused', threw, true);

// The finder patterns sit in three corners, with the dark module beside the bottom-left one.
const { size, modules } = makeQr('https://example.com/habulan');
const finderAt = (x0, y0) => [0, 1, 2, 3, 4, 5, 6].every((i) => modules[y0][x0 + i] && modules[y0 + 6][x0 + i] && modules[y0 + i][x0] && modules[y0 + i][x0 + 6]);
check('three finder patterns', [finderAt(0, 0), finderAt(size - 7, 0), finderAt(0, size - 7)], [true, true, true]);
check('dark module', modules[size - 8][8], true);

// Version information for version 7 (ISO/IEC 18004 table D.1) and alignment pattern centres (table E.1).
check('version bits, version 7', versionBits(7).toString(16), '7c94');
check('alignment centres, versions 2 / 7 / 10', [alignmentPositions(2, 25), alignmentPositions(7, 45), alignmentPositions(10, 57)], [[6, 18], [6, 22, 38], [6, 28, 50]]);

// Round trip: read each code back from its modules the way a scanner does (format bits, unmask, zigzag,
// de-interleave), check every block's error correction, and decode the bytes.
const ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
function readBack(qr) {
  const { size, modules, isFunction, version } = qr;
  const at = (x, y) => (modules[y][x] ? 1 : 0);
  let format = 0;
  const first = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  first.forEach(([x, y], i) => (format |= at(x, y) << i));
  let second = 0;
  for (let i = 0; i < 8; i++) second |= at(size - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) second |= at(8, size - 15 + i) << i;
  if (format !== second) throw new Error('the two format copies differ');
  const mask = ((format ^ 0x5412) >>> 10) & 7;
  if (((format ^ 0x5412) >>> 13) !== 0) throw new Error('not level M');
  if (formatBits(mask) !== format) throw new Error('format BCH check failed');
  const masks = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
  const bits = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
        if (!isFunction[y][x]) bits.push(at(x, y) ^ (masks[mask](x, y) ? 1 : 0));
      }
    }
  }
  const total = Math.floor(bits.length / 8);
  const codewords = [];
  for (let i = 0; i < total; i++) codewords.push(bits.slice(i * 8, i * 8 + 8).reduce((a, b) => (a << 1) | b, 0));
  const numBlocks = BLOCKS[version];
  const eccLen = ECC[version];
  const shortCount = numBlocks - (total % numBlocks);
  const shortLen = Math.floor(total / numBlocks);
  const blocks = Array.from({ length: numBlocks }, (_, b) => new Array(shortLen + (b < shortCount ? 0 : 1)));
  let k = 0;
  const dataLens = blocks.map((blk) => blk.length - eccLen);
  for (let i = 0; i < Math.max(...dataLens); i++) for (let b = 0; b < numBlocks; b++) if (i < dataLens[b]) blocks[b][i] = codewords[k++];
  for (let i = 0; i < eccLen; i++) for (let b = 0; b < numBlocks; b++) blocks[b][dataLens[b] + i] = codewords[k++];
  const data = [];
  blocks.forEach((blk, b) => {
    const dat = blk.slice(0, dataLens[b]);
    const ecc = reedSolomonRemainder(dat, reedSolomonDivisor(eccLen));
    if (JSON.stringify(ecc) !== JSON.stringify(blk.slice(dataLens[b]))) throw new Error(`block ${b}: error correction mismatch`);
    data.push(...dat);
  });
  const stream = data.flatMap((c) => [7, 6, 5, 4, 3, 2, 1, 0].map((i) => (c >>> i) & 1));
  const take = (n) => stream.splice(0, n).reduce((a, b) => (a << 1) | b, 0);
  if (take(4) !== 0b0100) throw new Error('not byte mode');
  const count = take(version < 10 ? 8 : 16);
  return new TextDecoder().decode(Uint8Array.from({ length: count }, () => take(8)));
}
// The site's own QR link (config.qrUrl, or the download link) is checked too.
const siteQr = config.qrUrl || config.downloadUrl;
for (const text of ['https://example.com/habulan', 'https://habulan.example.com/download?from=qr', `https://example.com/${'p'.repeat(120)}`, 'x'.repeat(213), 'Takbo! Ikaw naman ang taya. ñ', ...(siteQr ? [siteQr] : [])]) {
  const qr = makeQr(text);
  let decoded;
  try { decoded = readBack(qr); } catch (error) { decoded = `ERROR: ${error.message}`; }
  check(`round trip, version ${qr.version}, mask ${qr.mask}, ${text.length} chars`, decoded, text);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll QR checks passed.');
