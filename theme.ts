export const theme = {
  bg: "#0c0c0c",
  border: "#262626",
  text: "#e8e8e8",
  dim: "#8a8a8a",
  accent: "#ff4d00",
  green: "#28c840",
  red: "#f85149",
  font: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const CARD_W = 420;
export const CARD_H = 200;

/** Terminal-window chrome shared by every card. */
export function card(title: string, body: string, w = CARD_W, h = CARD_H): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${theme.font}">
<rect width="${w}" height="${h}" rx="8" fill="${theme.bg}" stroke="${theme.border}"/>
<circle cx="18" cy="16" r="5" fill="#ff5f57"/>
<circle cx="36" cy="16" r="5" fill="#febc2e"/>
<circle cx="54" cy="16" r="5" fill="#28c840"/>
<text x="${w / 2}" y="20" text-anchor="middle" font-size="11" fill="${theme.dim}">${title}</text>
<line x1="0" y1="30" x2="${w}" y2="30" stroke="${theme.border}"/>
${body}
</svg>`;
}
