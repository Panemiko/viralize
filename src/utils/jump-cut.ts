export function getJumpCutFilter(silenceLogs: string, totalDuration: number) {
  const silenceStartRegex = /silence_start: ([\d.]+)/g;
  const silenceEndRegex = /silence_end: ([\d.]+)/g;

  const starts = [...silenceLogs.matchAll(silenceStartRegex)].map(function (m) {
    return parseFloat(m[1]!);
  });
  const ends = [...silenceLogs.matchAll(silenceEndRegex)].map(function (m) {
    return parseFloat(m[1]!);
  });

  const segments: { start: number; end: number }[] = [];
  let lastEnd = 0;

  // Criar segmentos com som
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]!;
    if (start > lastEnd + 0.1) {
      // Pequena margem para evitar cortes micro
      segments.push({ start: lastEnd, end: start });
    }
    lastEnd = ends[i]!;
  }

  // Adicionar o último segmento até o fim do vídeo
  if (totalDuration > lastEnd + 0.1) {
    segments.push({ start: lastEnd, end: totalDuration });
  }

  if (segments.length === 0) return null;

  // Gerar o filter_complex para trim e concat
  let videoParts = "";
  let audioParts = "";
  let concat = "";

  segments.forEach(function (seg, i) {
    videoParts += `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS[v${i}];`;
    audioParts += `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${i}];`;
    concat += `[v${i}][a${i}]`;
  });

  concat += `concat=n=${segments.length}:v=1:a=1[v_cut][a_cut]`;

  return {
    filter: videoParts + audioParts + concat,
    hasCuts: true,
  };
}
