import fs from 'node:fs/promises';

// Real file type from the first bytes ("magic bytes"), not from the name the user chose
export async function isRealImage(filePath) {
  const handle = await fs.open(filePath, 'r');
  const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);
  await handle.close();

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return isJpeg || isPng || isWebp;
}