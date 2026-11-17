import sharp from 'sharp';

export async function imageBytes(format: string): Promise<Buffer> {
  const pipeline = sharp({
    create: {
      width: 2,
      height: 2,
      channels: 3,
      background: { r: 20, g: 80, b: 160 },
    },
  });

  if (format === 'png') {
    return pipeline.png().toBuffer();
  }
  return pipeline.webp().toBuffer();
}
