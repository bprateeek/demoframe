export interface GifInfo {
  width: number;
  height: number;
  frameCount: number;
  durationS: number;
  loopsForever: boolean;
}

export function parseGif(buffer: Buffer): GifInfo {
  if (buffer.subarray(0, 3).toString('ascii') !== 'GIF') {
    throw new Error('not a GIF file');
  }
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  const flags = buffer[10];
  let pos = 13;
  if (flags & 0x80) pos += 3 * 2 ** ((flags & 0x07) + 1);

  let frameCount = 0;
  let durationCs = 0;
  let loopsForever = false;

  const skipSubBlocks = () => {
    while (pos < buffer.length) {
      const size = buffer[pos];
      pos += 1;
      if (size === 0) break;
      pos += size;
    }
  };

  while (pos < buffer.length) {
    const block = buffer[pos];
    if (block === 0x3b) break;
    if (block === 0x21) {
      const label = buffer[pos + 1];
      pos += 2;
      if (label === 0xf9) {
        durationCs += buffer.readUInt16LE(pos + 2);
        pos += buffer[pos] + 1;
        pos += 1;
      } else if (label === 0xff) {
        const size = buffer[pos];
        const appId = buffer.subarray(pos + 1, pos + 1 + size).toString('ascii');
        pos += size + 1;
        if (appId.startsWith('NETSCAPE')) {
          const subSize = buffer[pos];
          if (subSize >= 3 && buffer[pos + 1] === 1 && buffer.readUInt16LE(pos + 2) === 0) {
            loopsForever = true;
          }
        }
        skipSubBlocks();
      } else {
        skipSubBlocks();
      }
    } else if (block === 0x2c) {
      frameCount += 1;
      const localFlags = buffer[pos + 9];
      pos += 10;
      if (localFlags & 0x80) pos += 3 * 2 ** ((localFlags & 0x07) + 1);
      pos += 1;
      skipSubBlocks();
    } else {
      pos += 1;
    }
  }

  return { width, height, frameCount, durationS: durationCs / 100, loopsForever };
}
