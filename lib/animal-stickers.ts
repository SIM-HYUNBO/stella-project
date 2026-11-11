import type { CustomSticker, StickerMotion } from "./custom-stickers";

function pack(id: string, label: string, icon: string, poses: [string, StickerMotion][]) {
  return {
    id, label, icon,
    stickers: poses.map(([pose, motion], index): CustomSticker => ({
      id: `animal-${id}-${index + 1}`,
      name: `${label} · ${pose}`,
      image: `/stickers/animals/${id}-${index + 1}.png`,
      motion,
    })),
  };
}

export const ANIMAL_STICKER_PACKS = [
  pack("rabbit", "토끼", "🐰", [["안녕", "bounce"], ["당근 냠냠", "pulse"], ["수줍은 하트", "pulse"], ["엉엉", "wiggle"], ["삐짐", "wiggle"], ["잘 자", "float"]]),
  pack("cat", "치즈 고양이", "🐱", [["안녕", "bounce"], ["빵 터짐", "bounce"], ["깜짝", "wiggle"], ["흘깃", "float"], ["아이고", "wiggle"], ["만세", "bounce"]]),
  pack("otter", "아기 수달", "🦦", [["안녕", "bounce"], ["내 조개", "float"], ["좋아", "pulse"], ["첨벙", "bounce"], ["부탁해", "pulse"], ["쿨쿨", "float"]]),
];
