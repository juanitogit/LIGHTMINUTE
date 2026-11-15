/** Align a supplementary reference to the arm silhouettes, not to a patient. */
export function armAlignment(sourceSkin: Float32Array, sourceHeight: number, targetSkin: Float32Array, targetHeight: number) {
  const start = 0.44, step = 0.02, count = 19;
  const profile = (skin: Float32Array, height: number) => Array.from({length: count}, (_, band) => {
    const y = start + band * step, samples: number[] = [];
    for (let i = 0; i < skin.length; i += 3) {
      if (Math.abs(skin[i + 1]! / height - y) <= 0.012) samples.push(Math.abs(skin[i]!) / height);
    }
    samples.sort((a,b) => a-b);
    return samples.length ? samples[Math.floor((samples.length - 1) * 0.9)]! : null;
  });
  const source = profile(sourceSkin, sourceHeight), target = profile(targetSkin, targetHeight);
  return (x: number, y: number) => {
    const nx = Math.abs(x) / targetHeight, ny = y / targetHeight;
    if (ny < start || ny > start + step * (count - 1) || nx <= 0.095) return x;
    const position = (ny - start) / step, left = Math.floor(position), right = Math.min(count - 1, left + 1), t = position - left;
    const offset = (index: number) => {
      const from = source[index], to = target[index];
      return from == null || to == null ? 0 : Math.max(0, Math.min(0.1, to - from));
    };
    const armWeight = Math.min(1, Math.max(0, (nx - 0.095) / 0.035));
    const endWeight = Math.min(1, (ny-start)/0.035, (start+step*(count-1)-ny)/0.035);
    return x + Math.sign(x) * targetHeight * (offset(left) * (1-t) + offset(right) * t) * armWeight * endWeight;
  };
}
