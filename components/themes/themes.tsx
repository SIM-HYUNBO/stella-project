export type Theme = {
  name: string;

  bg: string;
  panel: string;

  text: string;
  subText: string;

  mineBubble: string;
  otherBubble: string;

  border: string;
  input: string;

  vipAccent: string;
};

/* ======================
   기본 테마
====================== */
export const lightTheme: Theme = {
  name: "light",

  bg: "bg-gray-100",
  panel: "bg-white",

  text: "text-gray-900",
  subText: "text-gray-500",

  mineBubble: "bg-red-100",
  otherBubble: "bg-gray-200",

  border: "border-gray-300",
  input: "bg-white border-gray-300",

  vipAccent: "from-yellow-400 to-orange-400",
};

/* ======================
   다크 테마
====================== */
export const darkTheme: Theme = {
  name: "dark",

  bg: "bg-black",
  panel: "bg-gray-900",

  text: "text-white",
  subText: "text-gray-400",

  mineBubble: "bg-gray-700",
  otherBubble: "bg-gray-800",

  border: "border-gray-700",
  input: "bg-gray-800 border-gray-700",

  vipAccent: "from-purple-500 to-pink-500",
};

/* ======================
   VIP 전용 강화 테마
====================== */
export const vipTheme: Theme = {
  name: "vip",

  bg: "bg-gradient-to-br from-yellow-50 to-orange-50",
  panel: "bg-white",

  text: "text-gray-900",
  subText: "text-gray-600",

  mineBubble: "bg-yellow-100 border border-yellow-300",
  otherBubble: "bg-white",

  border: "border-yellow-300",
  input: "bg-white border-yellow-300",

  vipAccent: "from-yellow-400 to-orange-500",
};