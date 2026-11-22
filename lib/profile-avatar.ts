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
export function avatarSvg(value: unknown) {
  const a = normalizeAvatar(value), dark = "#343746";
  const backHair = a.hair === "bob" || a.hair === "wave" ? `<path d="M82 155C64 62 113 39 162 39c63 0 94 42 83 125l11 77c-26 16-44 15-64 6l-67 2c-20 5-39 4-51-5Z" fill="${a.hairColor}"/>` : "";
  const fringe: Record<ProfileAvatar["hair"], string> = {
    bob: 'M85 133C70 68 109 44 160 44c58 0 91 33 77 91-22-2-49-30-61-47-15 30-53 46-91 45Z',
    short: 'M85 135C63 83 104 39 157 44l27-12 1 19c52 2 65 40 52 81-16-7-31-23-40-39-9 25-34 30-45 16-15 17-43 27-67 26Z',
    wave: 'M82 143C62 99 90 42 145 40c68-8 108 31 94 99-31 7-33-25-49-38-11 36-45 39-55 9-11 21-28 34-53 33Z',
    bun: 'M87 128C75 79 111 50 160 50c53 0 84 34 74 82-37-2-57-25-69-44-15 27-43 39-78 40Z',
    crop: 'M87 119C78 68 115 45 159 45c46 0 78 27 76 71-24-19-46-30-74-30-29 0-50 12-74 33Z',
    none: '',
  };
  const eye = (x: number, wink = false) => wink ? `<path d="M${x-8} 155q8-8 16 0" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round"/>` : a.expression === "happy" ? `<path d="M${x-8} 155q8-13 16 0" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round"/>` : `<ellipse cx="${x}" cy="153" rx="5.5" ry="8" fill="${dark}"/><circle cx="${x+1.5}" cy="150" r="1.7" fill="white"/>`;
  const mouth = a.expression === "happy" ? `<path d="M145 177q15 26 30 0Z" fill="${dark}"/><path d="M150 187q10-7 20 0" stroke="#ef9397" stroke-width="5"/>` : `<path d="M149 179q11 ${a.expression === "calm" ? 4 : 12} 22 0" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`;
  const accessory = a.accessory === "glasses" ? `<g stroke="${dark}" stroke-width="4" fill="none"><circle cx="128" cy="153" r="21"/><circle cx="192" cy="153" r="21"/><path d="M149 151q11-8 22 0M107 148l-17-5M213 148l17-5"/></g>` : a.accessory === "headphones" ? `<path d="M78 146C66 38 254 38 242 146" fill="none" stroke="#536d8a" stroke-width="12"/><rect x="70" y="129" width="22" height="53" rx="11" fill="#6fa6ce"/><rect x="228" y="129" width="22" height="53" rx="11" fill="#6fa6ce"/>` : a.accessory === "cap" ? `<path d="M79 111c2-91 160-94 163 0Z" fill="#6d9fca"/><path d="M78 109q82-27 164 0l24 12c-54 14-122 2-188-12" fill="#527ca5"/><path d="M160 44v43" stroke="white" stroke-opacity=".3" stroke-width="3"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="340" viewBox="0 0 320 340"><rect width="320" height="340" rx="64" fill="${a.background}"/><circle cx="161" cy="142" r="118" fill="white" opacity=".38"/><circle cx="54" cy="79" r="9" fill="white" opacity=".8"/><path d="m270 59 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="white"/><ellipse cx="160" cy="309" rx="93" ry="13" fill="#405a78" opacity=".08"/>${backHair}${a.hair === "bun" ? `<circle cx="161" cy="46" r="33" fill="${a.hairColor}"/>` : ""}<path d="M76 303c0-64 23-92 84-92s84 28 84 92" fill="${a.outfitColor}"/><path d="M104 240c-18 16-22 37-23 61M216 240c18 16 22 37 23 61" stroke="white" stroke-opacity=".26" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M143 203v25q17 17 34 0v-25" fill="${a.skin}"/>${a.outfit === "hoodie" ? `<path d="m141 220-24 15 27 31 16-17 16 17 27-31-24-15" fill="white" opacity=".28"/><path d="M147 250v25m26-25v25" stroke="white" stroke-width="4" stroke-linecap="round"/><path d="M132 299v-13q28-14 56 0v13" stroke="white" stroke-opacity=".3" stroke-width="3" fill="none"/>` : a.outfit === "collar" ? `<path d="m141 220-20 14 25 25 14-17 14 17 25-25-20-14" fill="white" opacity=".9"/><path d="M160 247v52" stroke="white" stroke-opacity=".5" stroke-width="3"/><circle cx="167" cy="270" r="2" fill="white"/>` : `<path d="M133 222q27 32 54 0" stroke="white" stroke-width="8" stroke-opacity=".6" fill="none"/>`}<circle cx="85" cy="151" r="16" fill="${a.skin}"/><circle cx="235" cy="151" r="16" fill="${a.skin}"/><path d="M87 124c0-50 31-70 73-70s73 20 73 70v35c0 43-30 67-73 67s-73-24-73-67Z" fill="${a.skin}"/><path d="M96 126c0-45 29-60 64-60" fill="none" stroke="white" stroke-opacity=".22" stroke-width="7" stroke-linecap="round"/>${fringe[a.hair] ? `<path d="${fringe[a.hair]}" fill="${a.hairColor}"/>` : ""}<ellipse cx="110" cy="174" rx="13" ry="7" fill="#ed939c" opacity=".4"/><ellipse cx="210" cy="174" rx="13" ry="7" fill="#ed939c" opacity=".4"/>${eye(128)}${eye(192, a.expression === "wink")}<path d="M157 164q3 5 7 0" fill="none" stroke="#ac7457" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>${mouth}${accessory}</svg>`;
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
