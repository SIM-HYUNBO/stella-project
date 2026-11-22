export const AVATAR_OPTIONS = {
  hair: ["bob", "short", "wave", "bun", "crop", "none"],
  expression: ["smile", "happy", "wink", "calm"],
  outfit: ["hoodie", "tee", "collar"],
  accessory: ["none", "glasses", "headphones", "cap"],
  skin: ["#fce0cc", "#efc3a3", "#c58e6c", "#875b48"],
  hairColor: ["#39302e", "#775340", "#c69766", "#394c70", "#b38bba"],
  outfitColor: ["#8bc9ee", "#f5d579", "#e8a6bb", "#9ac9ae", "#a8a1d7", "#405a78"],
  background: ["#e6f4fd", "#fff4d2", "#fcebf1", "#e8f5ed", "#eeeafb"],
} as const;
export type ProfileAvatar = { [K in keyof typeof AVATAR_OPTIONS]: typeof AVATAR_OPTIONS[K][number] };
export const DEFAULT_AVATAR: ProfileAvatar = { hair: "bob", expression: "smile", outfit: "hoodie", accessory: "none", skin: "#fce0cc", hairColor: "#39302e", outfitColor: "#8bc9ee", background: "#e6f4fd" };
export function normalizeAvatar(value: unknown): ProfileAvatar {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(DEFAULT_AVATAR).map(key => [key, (AVATAR_OPTIONS[key as keyof ProfileAvatar] as readonly unknown[]).includes(input[key]) ? input[key] : DEFAULT_AVATAR[key as keyof ProfileAvatar]])) as ProfileAvatar;
}
function shade(hex: string, amount: number) {
  const target = amount > 0 ? 255 : 0, weight = Math.abs(amount);
  return "#" + [1, 3, 5].map(index => Math.round(parseInt(hex.slice(index, index + 2), 16) * (1 - weight) + target * weight).toString(16).padStart(2, "0")).join("");
}
export function avatarSvg(value: unknown) {
  const a = normalizeAvatar(value), ink = "#453b3a", hairLight = shade(a.hairColor, .2), hairDark = shade(a.hairColor, -.15);
  const gradient = (id: string, start: string, end: string) => `<linearGradient id="${id}" x1=".15" y1="0" x2=".8" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient>`;
  const back: Partial<Record<ProfileAvatar["hair"], string>> = {
    bob: "M80 147C65 73 101 40 159 39c65-1 94 39 82 112l8 61q3 26-19 29l-32-8h-77l-29 8q-22-1-16-25Z",
    wave: "M76 149C57 85 96 33 156 36c69-8 106 38 89 110 17 15 13 33 1 43 22 28-1 56-27 49-8 18-37 13-45-1h-31c-23 22-54 5-52-11-32-2-38-30-23-49-7-7-3-22 8-28Z",
  };
  const fringe: Record<ProfileAvatar["hair"], string> = {
    bob: "M82 136C67 70 106 42 157 42c62-1 97 34 79 96-25-3-47-24-61-49-16 27-51 45-93 47Z",
    short: "M83 134C65 89 93 44 146 43l34-11 2 17c53-2 69 42 55 83-20-6-34-20-43-37-11 23-30 28-43 14-19 19-43 26-68 25Z",
    wave: "M81 140C61 97 88 44 143 40c71-11 111 32 95 101-25 3-30-16-46-36-9 28-43 36-59 8-14 20-30 29-52 27Z",
    bun: "M85 127C72 79 110 49 160 49c54 0 87 32 75 82-34 0-61-24-73-45-14 26-42 41-77 41Z",
    crop: "M85 120C77 70 111 44 159 44c46 0 81 27 76 74-25-16-46-28-74-28-29 0-52 12-76 30Z",
    none: "",
  };
  const hairHighlights: Record<ProfileAvatar["hair"], string> = {
    bob: "M96 91c13-23 36-33 59-33M204 78q21 16 23 40",
    short: "M97 91q17-24 44-28M180 66q32 1 43 27",
    wave: "M91 99q12-35 48-39M177 58q38 2 47 33",
    bun: "M101 89q18-22 44-25M177 64q27 3 40 25",
    crop: "M102 86q27-27 59-25M180 65q24 6 35 21",
    none: "",
  };
  const eye = (x: number, wink = false) => wink || a.expression === "happy"
    ? `<path d="M${x-8} 155q8-12 16 0" stroke="${ink}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
    : a.expression === "calm" ? `<path d="M${x-7} 152q7 4 14 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${x}" cy="153" rx="6.5" ry="9" fill="${ink}"/><ellipse cx="${x-1.5}" cy="150" rx="2.2" ry="2.7" fill="#fff"/><circle cx="${x+2}" cy="157" r="1.2" fill="#b7a2a0"/>`;
  const mouth = a.expression === "happy" ? `<path d="M146 177q14 24 28 0Z" fill="${ink}"/><path d="M151 186q9-6 18 0" stroke="#ef969f" stroke-width="5" stroke-linecap="round"/>` : `<path d="M151 179q9 ${a.expression === "calm" ? 5 : 11} 18 0" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/><path d="M157 190h6" stroke="#de9892" stroke-width="2" stroke-linecap="round" opacity=".35"/>`;
  const patch = `<g transform="translate(188 264)"><rect x="-12" y="-10" width="25" height="24" rx="9" fill="#fff" opacity=".28"/><ellipse cy="3" rx="7" ry="5" fill="#fff1b5"/><circle cx="-3" cy="-3" r="5" fill="#fff1b5"/><path d="m-6-3-5 2 5 1" fill="#e8b06a"/><circle cx="-4" cy="-4" r=".8" fill="#74614e"/><path d="m6 2 4-2-1 5" fill="#fff1b5"/></g>`;
  const clothing = a.outfit === "hoodie" ? `<path d="m141 220-25 15 27 28 17-16 17 16 27-28-25-15" fill="${shade(a.outfitColor, .35)}"/><path d="m122 237 21 20 17-16 17 16 21-20" stroke="#fff" stroke-opacity=".4" stroke-width="2" fill="none"/><path d="M149 247v24m22-24v24" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><path d="M148 270v4m24-4v4" stroke="${shade(a.outfitColor, -.25)}" stroke-width="4" stroke-linecap="round"/><path d="M132 300v-13q28-13 56 0v13" stroke="${shade(a.outfitColor, -.12)}" stroke-width="2.5" fill="none"/>${patch}` : a.outfit === "collar" ? `<path d="m142 220-22 15 25 23 15-17 15 17 25-23-22-15" fill="#ffffffdf"/><path d="M160 244v61" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><g fill="#fff"><circle cx="168" cy="269" r="2.2"/><circle cx="168" cy="287" r="2.2"/></g><path d="M186 266h16v14q-8 7-16 0Z" stroke="#ffffff70" fill="none" stroke-width="2"/>` : `<path d="M135 224q25 30 50 0" stroke="${shade(a.outfitColor, -.12)}" stroke-width="10" fill="none"/><path d="M136 222q24 28 48 0" stroke="#ffffff80" stroke-width="5" fill="none"/><path d="M98 279h124M94 291h132" stroke="#fff" stroke-opacity=".22" stroke-width="5"/>${patch}`;
  const accessory = a.accessory === "glasses" ? `<g stroke="#776455" stroke-width="3.5"><circle cx="128" cy="153" r="21" fill="#fff" fill-opacity=".09"/><circle cx="192" cy="153" r="21" fill="#fff" fill-opacity=".09"/><path d="M149 151q11-8 22 0m-64-4-17-5m123 5 17-5" fill="none"/><path d="m117 140 7-4m56 4 7-4" stroke="#fff" stroke-width="3" stroke-opacity=".7" stroke-linecap="round"/></g>` : a.accessory === "headphones" ? `<path d="M77 146C65 37 255 37 243 146" fill="none" stroke="#536d8a" stroke-width="12"/><path d="M80 110C92 45 226 45 240 110" stroke="#9cc7e5" stroke-width="4" fill="none"/><rect x="67" y="131" width="24" height="49" rx="12" fill="url(#phones)" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><rect x="229" y="131" width="24" height="49" rx="12" fill="url(#phones)" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><path d="M75 141v27m163-27v27" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>` : a.accessory === "cap" ? `<path d="M79 108c4-88 158-91 163 0Z" fill="url(#phones)"/><path d="M84 108q76-29 155 0l26 13c-62 11-127-1-181-13Z" fill="#5d84a7"/><path d="M159 47v39" stroke="#fff" stroke-opacity=".3" stroke-width="2"/><rect x="148" y="72" width="25" height="15" rx="5" fill="#ffffff88"/><path d="m156 81 4-5 5 5" stroke="#6f91ad" stroke-width="2" fill="none"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="340" viewBox="0 0 320 340"><defs>${gradient("scene", shade(a.background,.5), a.background)}${gradient("skin",shade(a.skin,.13),shade(a.skin,-.035))}${gradient("hair",hairLight,hairDark)}${gradient("cloth",shade(a.outfitColor,.25),shade(a.outfitColor,-.08))}${gradient("phones","#a5cfe8","#6d95ba")}<radialGradient id="blush"><stop stop-color="#ed8e98" stop-opacity=".38"/><stop offset="1" stop-color="#ed8e98" stop-opacity="0"/></radialGradient><filter id="soft" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#4e6e89" flood-opacity=".12"/></filter></defs>
<rect x="3" y="3" width="314" height="334" rx="64" fill="url(#scene)" stroke="#fff" stroke-width="2"/><path d="M36 200C16 85 79 23 160 23c85 0 146 78 127 177" fill="#fff" opacity=".32"/><ellipse cx="160" cy="312" rx="91" ry="10" fill="#6887a1" opacity=".12"/><ellipse cx="160" cy="313" rx="63" ry="5" fill="#fff" opacity=".45"/>
<g fill="#fff" opacity=".8"><circle cx="42" cy="123" r="4"/><circle cx="274" cy="188" r="3"/><path d="m270 73 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/></g><path d="m52 205 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#e8c976" opacity=".7"/>
<g filter="url(#soft)">${back[a.hair] ? `<path d="${back[a.hair]}" fill="url(#hair)"/>` : ""}${a.hair === "bun" ? `<circle cx="161" cy="46" r="29" fill="url(#hair)"/><path d="M147 28q18-7 30 9" stroke="${hairLight}" stroke-width="5" stroke-linecap="round" fill="none"/>` : ""}<path d="M76 303c0-57 24-88 84-88s84 31 84 88q-81 15-168 0Z" fill="url(#cloth)"/><path d="M106 242c-14 13-19 31-20 54m128-54c14 13 19 31 20 54" stroke="#fff" stroke-opacity=".32" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M143 203v25q17 16 34 0v-25" fill="url(#skin)"/><path d="M143 210q17 11 34 0v9q-17 10-34 0Z" fill="${shade(a.skin,-.12)}" opacity=".35"/>${clothing}<circle cx="86" cy="152" r="15" fill="url(#skin)"/><circle cx="234" cy="152" r="15" fill="url(#skin)"/><path d="M84 146q-7 1-5 11m157-11q7 1 5 11" stroke="${shade(a.skin,-.16)}" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M88 123c0-45 29-68 72-68s72 23 72 68v36c0 43-30 66-72 66s-72-23-72-66Z" fill="url(#skin)"/><path d="M101 119c3-35 23-49 49-52" stroke="#fff" stroke-opacity=".25" stroke-width="5" fill="none" stroke-linecap="round"/>${fringe[a.hair] ? `<path d="${fringe[a.hair]}" fill="url(#hair)"/><path d="${hairHighlights[a.hair]}" stroke="${shade(a.hairColor,.42)}" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" fill="none"/>` : ""}<path d="M119 136q8-4 16-1m49 0q8-3 16 1" stroke="${a.hairColor}" stroke-opacity=".5" stroke-width="2.5" stroke-linecap="round" fill="none"/><ellipse cx="111" cy="174" rx="20" ry="12" fill="url(#blush)"/><ellipse cx="209" cy="174" rx="20" ry="12" fill="url(#blush)"/>${eye(128)}${eye(192,a.expression === "wink")}<path d="M158 165q3 4 6 0" stroke="#ad735b" stroke-opacity=".35" stroke-width="2.3" fill="none" stroke-linecap="round"/>${mouth}${accessory}</g></svg>`;
}
export const avatarDataUri = (value: unknown) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(value))}`;
export async function avatarProfileImage(value: unknown): Promise<string> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(Error("아바타를 준비하지 못했어.")); image.src = avatarDataUri(value); });
  const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 320;
  const ctx = canvas.getContext("2d"); if (!ctx) throw Error("아바타를 저장하지 못했어.");
  ctx.drawImage(image, 0, 10, 320, 320, 0, 0, 320, 320);
  return canvas.toDataURL("image/png");
}
