import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";

const variants = (key: "hair" | "eyes" | "mouth" | "glasses"): string[] => {
  const field = adventurer.schema.properties[key] as { items: { enum: string[] } };
  return field.items.enum;
};
export const DICE_OPTIONS = {
  hair: variants("hair"),
  eyes: variants("eyes"),
  mouth: variants("mouth"),
  glasses: ["none", ...variants("glasses")],
  hairColor: ["2c1b18", "724133", "b58143", "d6b370", "592454", "3e5b80"],
  skinColor: ["f2d3b1", "ecad80", "9e5622", "763900"],
  background: ["e6f4fd", "fff4d2", "fcebf1", "e8f5ed", "eeeafb"],
};
export type DiceAvatar = { [K in keyof typeof DICE_OPTIONS]: string };
export const DEFAULT_DICE_AVATAR: DiceAvatar = { hair: "long01", eyes: "variant01", mouth: "variant01", glasses: "none", hairColor: "724133", skinColor: "f2d3b1", background: "e6f4fd" };
export function normalizeDiceAvatar(input: unknown): DiceAvatar {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(DEFAULT_DICE_AVATAR).map(([key, fallback]) => [key, (DICE_OPTIONS[key as keyof DiceAvatar] as readonly unknown[]).includes(value[key]) ? value[key] : fallback])) as DiceAvatar;
}
export function diceAvatarUri(input: unknown): string {
  const a = normalizeDiceAvatar(input);
  return createAvatar(adventurer, {
    seed: "wagie", size: 320, hair: [a.hair] as NonNullable<Parameters<typeof adventurer.create>[0]["options"]["hair"]>,
    eyes: [a.eyes] as NonNullable<Parameters<typeof adventurer.create>[0]["options"]["eyes"]>,
    mouth: [a.mouth] as NonNullable<Parameters<typeof adventurer.create>[0]["options"]["mouth"]>,
    glasses: (a.glasses === "none" ? ["variant01"] : [a.glasses]) as NonNullable<Parameters<typeof adventurer.create>[0]["options"]["glasses"]>,
    glassesProbability: a.glasses === "none" ? 0 : 100, earringsProbability: 0, featuresProbability: 0,
    hairProbability: 100, hairColor: [a.hairColor], skinColor: [a.skinColor], backgroundColor: [a.background],
  }).toDataUri();
}
export async function diceAvatarPng(input: unknown): Promise<string> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(Error("아바타를 준비하지 못했어. 다시 시도해 줘.")); image.src = diceAvatarUri(input); });
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 320;
  const context = canvas.getContext("2d"); if (!context) throw Error("아바타를 저장하지 못했어.");
  context.drawImage(image, 0, 0, 320, 320);
  return canvas.toDataURL("image/png");
}
