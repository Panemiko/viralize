import { SubtitleStyle } from "../../types.ts";
import { SHORTS_WIDTH, SHORTS_HEIGHT } from "../../common/constants.ts";

/**
 * Generates an Advanced Substation Alpha (ASS) file with "pop in" effects.
 */
export async function generateAssKaraoke(
  data: any,
  outputPath: string,
  style: SubtitleStyle,
) {
  const { fs } = await import("zx");

  const fontName = style.fontName || "The Bold Font";
  const fontSize = style.fontSize || 90;
  const primaryColor = style.primaryColor || "&H00FFFFFF";
  const secondaryColor = style.secondaryColor || "&H00FFFFFF";
  const highlightColor = style.highlightColor || "&H00FFFFFF";
  const outlineColor = style.outlineColor || "&H00000000";
  const shadowColor = style.shadowColor || "&H00000000";
  const marginV = style.marginV || 600;
  const outlineWidth = style.outlineWidth ?? 2;
  const shadowDepth = style.shadowDepth ?? 0;
  const alignment = style.alignment ?? 2;
  const bold = style.bold ? -1 : 0;
  const italic = style.italic ? -1 : 0;

  let assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: ${SHORTS_WIDTH}
PlayResY: ${SHORTS_HEIGHT}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},${secondaryColor},${outlineColor},${shadowColor},${bold},${italic},0,0,100,100,0,0,1,${outlineWidth},${shadowDepth},${alignment},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  if (data.segments) {
    for (const segment of data.segments) {
      if (!segment.words || segment.words.length === 0) {
        const start = formatTime(segment.start);
        const end = formatTime(segment.end);
        const text = segment.text.trim().toUpperCase();
        // Simple display for segments without word data
        assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
        continue;
      }

      const words = segment.words;
      // Show 2 words at a time for high engagement
      for (let i = 0; i < words.length; i += 2) {
        const wordGroup = words.slice(i, i + 2);
        
        // Duration of this 2-word group
        // But we still want to highlight each word individually within the group
        for (let j = 0; j < wordGroup.length; j++) {
          const activeWord = wordGroup[j];
          const start = formatTime(activeWord.start);
          const end = formatTime(activeWord.end);

          let karaokeText = "";
          for (let k = 0; k < wordGroup.length; k++) {
            const w = wordGroup[k];
            const text = w.word.trim().toUpperCase();
            
            if (k < j) {
              // Words already spoken: White (highlightColor)
              karaokeText += `{\\1c${highlightColor}}${text}{\\1c${primaryColor}} `;
            } else if (k === j) {
              // Currently spoken word: White (highlightColor)
              karaokeText += `{\\1c${highlightColor}}${text}{\\1c${primaryColor}} `;
            } else {
              // Future words in this group: Gray (primaryColor)
              karaokeText += `${text} `;
            }
          }
          
          assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${karaokeText.trim()}\n`;
        }
      }
    }
  }

  await fs.writeFile(outputPath, assContent);
}

function formatTime(seconds: number): string {
  const date = new Date(0);
  date.setSeconds(seconds);
  const ms = Math.floor((seconds % 1) * 100);
  const time = date.toISOString().substr(11, 8);
  return `${time}.${ms.toString().padStart(2, "0")}`;
}
