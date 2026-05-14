function normalizeSize(str) {
  return str.replace(/(\d+(?:\.\d+)?)\s*TB/gi, (_, num) => `${parseFloat(num) * 1024}GB`);
}

export function sortOptions(options) {
  if (!options) return [];
  return [...options].sort((a, b) => {
    const aNorm = normalizeSize(a);
    const bNorm = normalizeSize(b);
    return aNorm.localeCompare(bNorm, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });
}
