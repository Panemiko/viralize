import { fs } from "zx";

const MAX_WORDS_PER_LINE = 2; // Maximum 2 words per screen for high dynamism

/**
 * Converts Whisper JSON output to an ASS subtitle file with karaoke effects.
 * @param {object} whisperJson The JSON output from Whisper.
 * @param {string} outputPath The path to save the .ass file.
 * @param {object} style Options for styling.
 */
export async function generateAssKaraoke(whisperJson, outputPath, style = {}) {
  const header = buildAssHeader(style);
  const processedSegments = preProcessSegments(whisperJson.segments || []);
  const events = processedSegments.map(buildDialogueLine).join("");

  await fs.writeFile(outputPath, `${header}${events}`);
}

/**
 * Builds the ASS file header.
 */
function buildAssHeader(style) {
  const {
    fontName = "Noto Sans",
    fontSize = 24,
    primaryColor = "&H00ABFF",
    secondaryColor = "&HFFFFFF",
    outlineColor = "&H000000",
    shadowColor = "&H000000",
    marginV = 150,
  } = style;

  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},${secondaryColor},${outlineColor},${shadowColor},1,0,0,0,100,100,2,0,1,5,2,2,10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

/**
 * Pre-processes segments by splitting long ones into smaller chunks.
 */
function preProcessSegments(segments) {
  const result = [];

  for (const segment of segments) {
    if (segment.words && segment.words.length > MAX_WORDS_PER_LINE) {
      result.push(...splitSegmentIntoChunks(segment.words));
    } else {
      result.push(segment);
    }
  }

  return result;
}

/**
 * Splits a list of words into smaller chunks for dynamic display.
 */
function splitSegmentIntoChunks(words) {
  const chunks = [];
  for (let i = 0; i < words.length; i += MAX_WORDS_PER_LINE) {
    const chunkWords = words.slice(i, i + MAX_WORDS_PER_LINE);
    chunks.push({
      start: chunkWords[0].start,
      end: chunkWords[chunkWords.length - 1].end,
      words: chunkWords,
      text: chunkWords.map((w) => w.word).join(" "),
    });
  }
  return chunks;
}

/**
 * Builds a single Dialogue line for the ASS script.
 */
function buildDialogueLine(segment) {
  const start = formatTime(segment.start);
  const end = formatTime(segment.end);
  const karaokeText = buildKaraokeText(segment);

  return `Dialogue: 0,${start},${end},Default,,0,0,0,,${karaokeText}\n`;
}

/**
 * Builds the karaoke effect text for a segment.
 */
function buildKaraokeText(segment) {
  // Dynamic pop animation: growth spurt followed by settle
  let text = "{\\fscx90\\fscy90\\t(0,80,\\fscx110\\fscy110)\\t(80,160,\\fscx100\\fscy100)}";

  if (!segment.words || segment.words.length === 0) {
    return `${text}${segment.text.trim()}`;
  }

  let currentTime = segment.start;

  for (let i = 0; i < segment.words.length; i++) {
    const wordData = segment.words[i];
    const word = wordData.word.trim();
    const duration = Math.max(1, Math.round((wordData.end - wordData.start) * 100));
    const gap = Math.max(0, Math.round((wordData.start - currentTime) * 100));

    if (gap > 0) text += `{\\k${gap}} `;
    text += `{\\k${duration}}${word}`;

    if (i < segment.words.length - 1) text += " ";
    currentTime = wordData.end;
  }

  return text.trim();
}

/**
 * Formats seconds to ASS time format: H:MM:SS.CC
 */
function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const c = Math.floor((seconds % 1) * 100);

  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${c.toString().padStart(2, "0")}`;
}
