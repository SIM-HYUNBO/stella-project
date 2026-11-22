export const SECRET_GAMES = [
  { id: "reaction", label: "반응속도", sub: "초록빛이 켜지면 터치" },
  { id: "number", label: "숫자 맞히기", sub: "숨겨진 숫자를 찾아 봐" },
  { id: "rps", label: "가위바위보", sub: "오늘의 운을 시험해 봐" },
  { id: "math", label: "암산 챌린지", sub: "머릿속 계산기를 켜 봐" },
  { id: "parity", label: "홀짝 판별", sub: "홀수일까, 짝수일까?" },
  { id: "compare", label: "큰 수 찾기", sub: "가장 큰 숫자를 골라" },
  { id: "dots", label: "점 세기", sub: "작은 점들을 세어 봐" },
  { id: "missing", label: "수열 탐정", sub: "빈칸 속 숫자의 비밀" },
  { id: "prime", label: "소수 사냥", sub: "숨어 있는 소수 찾기" },
  { id: "equation", label: "계산 OX", sub: "이 계산, 맞는 걸까?" },
  { id: "dice", label: "주사위 합", sub: "굴러온 눈을 더해 봐" },
  { id: "reverse", label: "거꾸로 숫자", sub: "반대로 읽으면 어떤 수?" },
  { id: "color", label: "색깔 함정", sub: "글자 말고 색을 봐" },
  { id: "memory", label: "순간 기억", sub: "사라진 암호를 기억해" },
  { id: "alphabet", label: "알파벳 빈칸", sub: "다음에 올 글자는?" },
  { id: "clock", label: "시간 여행", sub: "몇 분 뒤에는 몇 시?" },
  { id: "product", label: "곱셈 대결", sub: "더 큰 곱을 찾아 봐" },
  { id: "binary", label: "이진수 해독", sub: "0과 1의 암호 풀기" },
  { id: "percent", label: "할인 계산", sub: "할인 후 가격을 맞혀" },
  { id: "fraction", label: "분수 대결", sub: "더 큰 분수 고르기" },
] as const;
export type SecretGameId = typeof SECRET_GAMES[number]["id"];
export function pickSecretGames(random = Math.random) {
  const pool = [...SECRET_GAMES];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
export type SecretQuestion = { prompt: string; choices: string[]; answer: string; preview?: string; color?: string };
const int = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
function question(prompt: string, answer: string | number, choices?: string[]): SecretQuestion {
  const offset = int(1, 9);
  const options = new Set(choices || [String(answer), String(Number(answer) + offset), String(Number(answer) - offset)]);
  options.add(String(answer));
  return { prompt, answer: String(answer), choices: Array.from(options).sort(() => Math.random() - .5) };
}
export function makeSecretQuestion(id: SecretGameId): SecretQuestion {
  const a = int(2, 19), b = int(2, 9);
  switch (id) {
    case "math": return question(`${a} + ${b} × 2 = ?`, a + b * 2);
    case "parity": return question(`${a * b + 1}은?`, (a * b + 1) % 2 ? "홀수" : "짝수", ["홀수", "짝수"]);
    case "compare": { const values = [a * 11, b * 13, a * b + 3]; return question("가장 큰 숫자는?", Math.max(...values), values.map(String)); }
    case "dots": { const n = int(4, 15); return question(Array.from({ length: n }, () => "●").join(" "), n); }
    case "missing": return question(`${a}, ${a + b}, ?, ${a + 3 * b}`, a + 2 * b);
    case "prime": { const primes = [11, 13, 17, 19, 23, 29]; const n = primes[int(0, 5)]; return question("1과 자기 자신으로만 나누어지는 수는?", n, [String(n), String(b * 4), String(a * 6)]); }
    case "equation": { const correct = Math.random() < .5; return question(`${a} × ${b} = ${a * b + (correct ? 0 : 1)}`, correct ? "O" : "X", ["O", "X"]); }
    case "dice": { const x = int(1, 6), y = int(1, 6), faces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]; return question(`${faces[x - 1]} + ${faces[y - 1]} = ?`, x + y); }
    case "reverse": { const n = int(100, 999); return question(`${n}을 거꾸로 읽으면?`, String(n).split("").reverse().join(""), [String(n).split("").reverse().join(""), String(n + 7), String(n + 23)]); }
    case "color": { const colors = [{ name: "하늘", hex: "#7dd3fc" }, { name: "분홍", hex: "#f9a8d4" }, { name: "초록", hex: "#86efac" }], n = int(0, 2); return { ...question(colors[(n + 1) % 3].name, colors[n].name, colors.map(c => c.name)), color: colors[n].hex }; }
    case "memory": { const n = int(1000, 9999); return { ...question("방금 본 암호는?", n, [String(n), String(n + 11), String(n - 9)]), preview: String(n) }; }
    case "alphabet": { const n = int(0, 20); return question(`${String.fromCharCode(65 + n)}, ${String.fromCharCode(66 + n)}, ?`, String.fromCharCode(67 + n), [String.fromCharCode(67 + n), String.fromCharCode(68 + n), String.fromCharCode(69 + n)]); }
    case "clock": { const hour = int(1, 12), minutes = int(1, 5) * 15; const answer = `${(hour + Math.floor(minutes / 60)) % 24}:${String(minutes % 60).padStart(2, "0")}`; return question(`${hour}:00에서 ${minutes}분 뒤는?`, answer, [answer, `${hour}:05`, `${hour + 2}:30`]); }
    case "product": { const x = `${a} × ${b}`, y = `${a + 1} × ${b - 1}`; return question("어느 쪽의 곱이 더 클까?", a * b === (a + 1) * (b - 1) ? "같아" : a * b > (a + 1) * (b - 1) ? x : y, [x, y, "같아"]); }
    case "binary": { const n = int(2, 15); return question(`이진수 ${n.toString(2)}을 십진수로 바꾸면?`, n); }
    case "percent": { const price = int(2, 9) * 1000, discount = int(1, 5) * 10; const answer = price * (100 - discount) / 100; return question(`${price.toLocaleString()}원에서 ${discount}% 할인하면?`, answer, [String(answer), String(answer + 500), String(answer + 1000)]); }
    case "fraction": return question("어느 분수가 더 클까?", a > b ? `${a}/${a + 1}` : a < b ? `${b}/${b + 1}` : "같아", [`${a}/${a + 1}`, `${b}/${b + 1}`, "같아"]);
    default: throw Error("이 게임은 전용 화면에서 시작해 줘.");
  }
}
