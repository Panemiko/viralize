import { fs } from "zx";

/**
 * Converts Whisper JSON output to an ASS subtitle file with karaoke effects.
 * @param {object} whisperJson The JSON output from Whisper.
 * @param {string} outputPath The path to save the .ass file.
 * @param {object} style Options for styling.
 */
export async function generateAssKaraoke(whisperJson, outputPath, style = {}) {
  const {
    fontName = "Noto Sans",
    fontSize = 24,
    primaryColor = "&H00ABFF", // Pinkish highlight
    secondaryColor = "&HFFFFFF", // White base
    outlineColor = "&H000000",
    shadowColor = "&H000000",
    marginV = 150,
  } = style;

  // ASS Header
  let assContent = `[Script Info]
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

  // Chunking segments to have fewer words for a more dynamic look
  const MAX_WORDS_PER_LINE = 2; // Maximum 2 words per screen for high dynamism
  const processedSegments = [];

  for (const segment of whisperJson.segments || []) {
    if (segment.words && segment.words.length > MAX_WORDS_PER_LINE) {
      for (let i = 0; i < segment.words.length; i += MAX_WORDS_PER_LINE) {
        const chunk = segment.words.slice(i, i + MAX_WORDS_PER_LINE);
        processedSegments.push({
          start: chunk[0].start,
          end: chunk[chunk.length - 1].end,
          words: chunk,
          text: chunk.map(w => w.word).join(" ")
        });
      }
    } else {
      processedSegments.push(segment);
    }
  }

  for (const segment of processedSegments) {
    const start = formatTime(segment.start);
    const end = formatTime(segment.end);
    
    // Dynamic pop animation: growth spurt followed by settle
    let dialogueText = "{\\fscx90\\fscy90\\t(0,80,\\fscx110\\fscy110)\\t(80,160,\\fscx100\\fscy100)}";
    
    if (segment.words && segment.words.length > 0) {
      let currentPosTime = segment.start;
      
      for (let i = 0; i < segment.words.length; i++) {
        const wordData = segment.words[i];
        const word = wordData.word.trim();
        const wordStart = wordData.start;
        const wordEnd = wordData.end;
        
        // Duration from word start to word end (the "singing" duration)
        const wordDuration = Math.max(1, Math.round((wordEnd - wordStart) * 100));
        
        // Time between the end of the last word (or start of segment) and the start of this word
        const gapDuration = Math.max(0, Math.round((wordStart - currentPosTime) * 100));
        
        if (gapDuration > 0) {
          dialogueText += `{\\k${gapDuration}} `;
        }
        
        // The word itself with its duration
        dialogueText += `{\\k${wordDuration}}${word}`;
        
        // Add a space after the word if not the last one
        if (i < segment.words.length - 1) {
          dialogueText += " ";
        }
        
        currentPosTime = wordEnd;
      }
    } else {
      dialogueText += segment.text.trim();
    }

    assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${dialogueText.trim()}\n`;
  }

  await fs.writeFile(outputPath, assContent);
}

/**
 * Formats seconds to ASS time format: H:MM:SS.CC
 * @param {number} seconds 
 * @returns {string}
 */
function formatTime(seconds) {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const c = Math.floor((seconds % 1) * 100);
  
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${c.toString().padStart(2, "0")}`;
}
