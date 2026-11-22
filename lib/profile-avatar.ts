export const AVATAR_OPTIONS = {
  face: ["round", "oval", "square"],
  eyes: ["bright", "roundEyes", "slimEyes"],
  nose: ["button", "wide", "long"],
  brows: ["arched", "straight", "bold"],
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
export const DEFAULT_AVATAR: ProfileAvatar = { face: "round", eyes: "bright", nose: "button", brows: "arched", hair: "bob", expression: "smile", outfit: "hoodie", accessory: "none", skin: "#fce0cc", hairColor: "#39302e", outfitColor: "#8bc9ee", background: "#e6f4fd" };
export function normalizeAvatar(value: unknown): ProfileAvatar {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(DEFAULT_AVATAR).map(key => [key, (AVATAR_OPTIONS[key as keyof ProfileAvatar] as readonly unknown[]).includes(input[key]) ? input[key] : DEFAULT_AVATAR[key as keyof ProfileAvatar]])) as ProfileAvatar;
}
function shade(hex: string, amount: number) {
  const target = amount > 0 ? 255 : 0, weight = Math.abs(amount);
  return "#" + [1, 3, 5].map(index => Math.round(parseInt(hex.slice(index, index + 2), 16) * (1 - weight) + target * weight).toString(16).padStart(2, "0")).join("");
}
export function avatarSvg(value: unknown) {
  const a = normalizeAvatar(value), ink = "#34313d", skinShadow = shade(a.skin, -.12), hairShadow = shade(a.hairColor, -.14);
  const faces: Record<ProfileAvatar["face"], string> = {
    round: "M70 127C70 69 107 43 160 43s90 26 90 84v28c0 55-36 86-90 86s-90-31-90-86Z",
    oval: "M84 126c0-54 27-85 76-85s76 31 76 85v34c0 54-28 83-76 83s-76-29-76-83Z",
    square: "M73 111C73 62 102 45 160 45s87 17 87 66v76q0 54-54 54h-66q-54 0-54-54Z",
  };
  const hairBack = a.hair === "bob" ? `<path d="M67 137C52 64 96 29 160 29s110 36 94 108l9 89q2 22-24 23H81q-26-1-24-23Z" fill="${a.hairColor}"/><path d="m78 185-4 47h35m133-47 4 47h-35" stroke="${hairShadow}" stroke-width="9" fill="none" stroke-linecap="round"/>` : a.hair === "wave" ? `<path d="M64 137C43 78 82 27 146 28c73-12 124 31 108 107 21 19 12 41 1 48 25 25 7 56-20 54-14 25-47 17-55 3h-40c-14 17-48 23-61-2-28 2-45-28-23-51-13-15-10-35 8-50Z" fill="${a.hairColor}"/>` : "";
  const fringe: Record<ProfileAvatar["hair"], string> = {
    bob: "M69 131C52 63 95 29 158 29c70 0 111 38 93 105-26-3-55-25-70-57-22 32-60 52-112 54Z",
    short: "M69 128C50 83 82 36 137 34l41-15 2 21c60-4 91 40 71 91-19-4-38-20-52-41-12 24-34 28-49 12-20 19-46 29-81 26Z",
    wave: "M68 133C48 90 80 35 140 31c77-13 123 34 110 104-30 4-36-16-53-39-11 29-45 37-63 9-17 23-35 31-66 28Z",
    bun: "M71 119C61 68 100 36 159 36c62 0 102 34 91 87-41-2-72-31-87-54-18 31-50 47-92 50Z",
    crop: "M73 108C65 60 103 33 160 33c54 0 94 29 86 79-28-19-56-29-85-29-30 0-58 10-88 25Z",
    none: "",
  };
  const brow = (x: number, right = false) => a.brows === "bold" ? `<rect x="${x-16}" y="119" width="32" height="9" rx="4.5" fill="${a.hairColor}" transform="rotate(${right ? 9 : -9} ${x} 124)"/>` : `<path d="M${x-14} 126q14 ${a.brows === "straight" ? -2 : -12} 28 0" stroke="${a.hairColor}" stroke-width="${a.brows === "straight" ? 6 : 5}" stroke-linecap="round" fill="none"/>`;
  const eye = (x: number, wink = false) => {
    if (wink || a.expression === "happy") return `<path d="M${x-13} 155q13-19 26 0" stroke="${ink}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
    const rx = a.eyes === "roundEyes" ? 21 : a.eyes === "slimEyes" ? 14 : 18;
    if (a.expression === "calm") return `<path d="M${x-13} 151q13 9 26 0" stroke="${ink}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
    return `<ellipse cx="${x}" cy="154" rx="${rx}" ry="${a.eyes === "slimEyes" ? 24 : 22}" fill="#fff"/><rect x="${x-8}" y="143" width="16" height="25" rx="8" fill="${ink}"/><circle cx="${x-2}" cy="148" r="3" fill="#fff"/>`;
  };
  const nose = a.nose === "wide" ? `<rect x="144" y="177" width="35" height="21" rx="10.5" fill="${skinShadow}"/><path d="M151 181h11" stroke="${shade(a.skin,.12)}" stroke-width="5" stroke-linecap="round"/>` : a.nose === "long" ? `<path d="M157 165c-2 11-10 20-8 29 3 8 20 10 26 1-10 0-12-8-12-30Z" fill="${skinShadow}"/>` : `<ellipse cx="162" cy="185" rx="13" ry="15" fill="${skinShadow}"/><ellipse cx="159" cy="179" rx="5" ry="3" fill="${shade(a.skin,.12)}"/>`;
  const mouth = a.expression === "happy" ? `<path d="M133 208q27 1 54 0c-2 26-13 31-27 31s-25-5-27-31Z" fill="${ink}"/><path d="M139 209h42v8q-20 5-42 0Z" fill="#fff"/><path d="M146 235q14-16 28 0" fill="#ec879a"/>` : a.expression === "calm" ? `<path d="M149 214h24" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>` : `<path d="M138 207q23 29 46 0" stroke="${ink}" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="135" cy="206" r="2.5" fill="${ink}"/><circle cx="187" cy="206" r="2.5" fill="${ink}"/>`;
  const outfit = a.outfit === "hoodie" ? `<path d="m136 229-28 21 31 25 21-20 21 20 31-25-28-21" fill="${shade(a.outfitColor,-.1)}"/><path d="m138 231-19 18 20 15 21-19 21 19 20-15-19-18" fill="${shade(a.outfitColor,.22)}"/><path d="M146 266v24m28-24v24" stroke="#ffffffd9" stroke-width="4" stroke-linecap="round"/><path d="M129 314v-13q31-14 62 0v13" fill="${shade(a.outfitColor,-.08)}"/>` : a.outfit === "collar" ? `<path d="m137 232-25 16 28 25 20-21 20 21 28-25-25-16" fill="#fff"/><path d="M160 253v65" stroke="#fff" stroke-opacity=".45" stroke-width="3"/><circle cx="169" cy="289" r="3" fill="#fff"/><circle cx="169" cy="308" r="3" fill="#fff"/>` : `<path d="M132 233q28 37 56 0" fill="none" stroke="${shade(a.outfitColor,-.12)}" stroke-width="12"/><path d="M79 292h162" stroke="#fff" stroke-opacity=".3" stroke-width="13"/>`;
  const duck = `<g transform="translate(211 281)"><ellipse cy="6" rx="10" ry="7" fill="#ffe7a0"/><circle cx="-4" cy="-2" r="6" fill="#ffe7a0"/><path d="m-8-2-6 2 6 2" fill="#e8a85d"/><circle cx="-5" cy="-3" r="1.2" fill="#66523f"/></g>`;
  const accessory = a.accessory === "glasses" ? `<g stroke="#5d5269" stroke-width="5" fill="none"><rect x="98" y="132" width="50" height="46" rx="17"/><rect x="172" y="132" width="50" height="46" rx="17"/><path d="M148 148q12-7 24 0M98 143l-23-6m147 6 23-6"/></g>` : a.accessory === "headphones" ? `<path d="M65 150C53 20 267 20 255 150" stroke="#57769a" stroke-width="14" fill="none"/><path d="M70 108C95 38 225 38 250 108" stroke="#a1cae9" stroke-width="5" fill="none"/><rect x="55" y="133" width="26" height="53" rx="13" fill="#7caacf"/><rect x="239" y="133" width="26" height="53" rx="13" fill="#7caacf"/>` : a.accessory === "cap" ? `<path d="M66 104c3-92 185-94 188 0Z" fill="#7aa9d2"/><path d="M65 103q91-36 187 0l25 15c-65 14-152-1-212-15Z" fill="#557da6"/><rect x="147" y="67" width="30" height="20" rx="7" fill="#d4e8f6"/><path d="m155 80 7-6 7 6" stroke="#7097b9" stroke-width="3" stroke-linecap="round" fill="none"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="340" viewBox="0 0 320 340"><rect x="2" y="2" width="316" height="336" rx="64" fill="${a.background}"/><circle cx="160" cy="145" r="124" fill="#fff" opacity=".32"/><ellipse cx="160" cy="316" rx="100" ry="11" fill="#6d91ad" opacity=".12"/>${hairBack}${a.hair === "bun" ? `<ellipse cx="160" cy="36" rx="34" ry="29" fill="${a.hairColor}"/><path d="M143 22q18-7 32 5" stroke="${shade(a.hairColor,.14)}" stroke-width="7" stroke-linecap="round" fill="none"/>` : ""}<path d="M61 316c3-58 34-94 99-94s96 36 99 94q-99 18-198 0Z" fill="${a.outfitColor}"/><path d="M90 271q-10 18-12 39m152-39q10 18 12 39" stroke="${shade(a.outfitColor,-.08)}" stroke-width="8" stroke-linecap="round" fill="none"/><rect x="139" y="215" width="42" height="40" rx="17" fill="${a.skin}"/><path d="M139 224q21 17 42 0v12q-21 17-42 0Z" fill="${skinShadow}"/>${outfit}${duck}<ellipse cx="72" cy="158" rx="17" ry="22" fill="${a.skin}"/><ellipse cx="248" cy="158" rx="17" ry="22" fill="${a.skin}"/><path d="M68 150q-6 7 0 15m184-15q6 7 0 15" stroke="${skinShadow}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="${faces[a.face]}" fill="${a.skin}"/>${fringe[a.hair] ? `<path d="${fringe[a.hair]}" fill="${a.hairColor}"/>` : ""}${brow(124)}${brow(196,true)}${eye(124)}${eye(196,a.expression === "wink")}<ellipse cx="101" cy="189" rx="13" ry="7" fill="#ed939c" opacity=".4"/><ellipse cx="219" cy="189" rx="13" ry="7" fill="#ed939c" opacity=".4"/>${nose}${mouth}${accessory}</svg>`;
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
