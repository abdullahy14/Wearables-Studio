function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildMatrix(input, size = 29) {
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const seed = hashString(input);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const finderZone = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
      if (finderZone) {
        const localX = x % (size - 22);
        const localY = y % (size - 22);
        matrix[y][x] = Number(localX === 0 || localX === 6 || localY === 0 || localY === 6 || ((localX >= 2 && localX <= 4) && (localY >= 2 && localY <= 4)));
      } else {
        const n = hashString(`${seed}:${x}:${y}:${input[(x + y) % input.length] || '0'}`);
        matrix[y][x] = n % 2;
      }
    }
  }
  return matrix;
}

export function generateQrSvg(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const matrix = buildMatrix(text);
  const cell = 8;
  const size = matrix.length * cell + 32;
  const rects = [];
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix.length; x += 1) {
      if (matrix[y][x]) {
        rects.push(`<rect x="${16 + x * cell}" y="${16 + y * cell}" width="${cell}" height="${cell}" rx="1" />`);
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="#0B0B0B"><rect width="100%" height="100%" fill="#FFFFFF" rx="24"/>${rects.join('')}</svg>`;
}

export function generateQrDataUrl(payload) {
  return `data:image/svg+xml;base64,${Buffer.from(generateQrSvg(payload)).toString('base64')}`;
}
