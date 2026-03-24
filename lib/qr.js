const crypto = require('crypto');

function matrixFromPayload(payload) {
  const size = 29;
  const hash = crypto.createHash('sha256').update(payload).digest();
  const cells = [];
  for (let y = 0; y < size; y += 1) {
    const row = [];
    for (let x = 0; x < size; x += 1) {
      const finder =
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7);
      if (finder) {
        const localX = x % (size - 22);
        const localY = y % (size - 22);
        const ring = localX === 0 || localX === 6 || localY === 0 || localY === 6;
        const center = localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
        row.push(ring || center ? 1 : 0);
      } else {
        const byte = hash[(x * 7 + y * 13) % hash.length];
        row.push((byte + x + y) % 2 === 0 ? 1 : 0);
      }
    }
    cells.push(row);
  }
  return cells;
}

function renderQrDataUrl(payload) {
  const cells = matrixFromPayload(payload);
  const cell = 10;
  const margin = 18;
  const size = cells.length * cell + margin * 2;
  const rects = [];
  cells.forEach((row, y) => {
    row.forEach((filled, x) => {
      if (filled) rects.push(`<rect x="${margin + x * cell}" y="${margin + y * cell}" width="${cell}" height="${cell}" rx="1.5" />`);
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none"><rect width="${size}" height="${size}" rx="24" fill="#fff"/><g fill="#0B0B0B">${rects.join('')}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

module.exports = { renderQrDataUrl };
