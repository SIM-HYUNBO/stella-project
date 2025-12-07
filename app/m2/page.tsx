"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/PageContainer";
import { db, auth } from "../firebase";
import {
collection,
addDoc,
query,
orderBy,
onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const miniTests = {
  "국어": [
    { "q": "다음 중 올바른 맞춤법을 고르세요: '되여', '되어', '돼여'", "options": ["되여","되어","돼여"], "a": "되어" },
    { "q": "다음 문장에서 주어를 찾으세요: '철수가 학교에 갔다.'", "options": ["철수","학교","갔다"], "a": "철수" },
    { "q": "다음 중 문장 부호가 올바른 것은?", "options": ["안녕하세요.","안녕하세요!","안녕하세요,"], "a": "안녕하세요." },
    { "q": "다음 중 맞는 띄어쓰기를 고르세요.", "options": ["학교에가다","학교에 가다","학교 에 가다"], "a": "학교에 가다" },
    { "q": "다음 중 관형사는?", "options": ["크다","큰","크게"], "a": "큰" },
    { "q": "다음 문장에서 동사를 찾으세요: '민수가 달린다.'", "options": ["민수","달린다","없음"], "a": "달린다" },
    { "q": "다음 중 한자어는?", "options": ["전화","밥","사랑"], "a": "전화" },
    { "q": "다음 문장에서 부사를 찾으세요: '철수는 빨리 달린다.'", "options": ["철수","빨리","달린다"], "a": "빨리" },
    { "q": "다음 중 올바른 맞춤법을 고르세요: '바래다', '바라다', '바레다'", "options": ["바래다","바라다","바레다"], "a": "바라다" },
    { "q": "다음 문장에서 목적어를 찾으세요: '철수가 사과를 먹었다.'", "options": ["철수","사과","먹었다"], "a": "사과" },
    { "q": "다음 중 반의어 쌍이 맞는 것은?", "options": ["크다-작다","크다-크게","크다-커"], "a": "크다-작다" },
    { "q": "다음 중 비슷한 의미의 단어는?", "options": ["친구-동료","학교-집","사랑-미움"], "a": "친구-동료" },
    { "q": "다음 중 속담으로 맞는 것은?", "options": ["호랑이도 제 말 하면 온다","호랑이도 제 말 하면 간다","호랑이도 말하면 온다"], "a": "호랑이도 제 말 하면 온다" },
    { "q": "다음 중 접속사를 고르세요.", "options": ["그리고","학교","달린다"], "a": "그리고" },
    { "q": "다음 중 올바른 맞춤법은?", "options": ["설레이다","설레인다","설레여"], "a": "설레이다" },
    { "q": "다음 문장에서 서술어를 찾으세요: '철수가 웃었다.'", "options": ["철수","웃었다","없음"], "a": "웃었다" },
    { "q": "다음 중 의성어를 고르세요.", "options": ["멍멍","학교","달리다"], "a": "멍멍" },
    { "q": "다음 중 올바른 문장 부호는?", "options": ["오늘 날씨가 좋다.","오늘 날씨가 좋다!","오늘 날씨가 좋다,"], "a": "오늘 날씨가 좋다." },
    { "q": "다음 중 올바른 띄어쓰기: '책상위에'", "options": ["책상위에","책상 위에","책상 위 에"], "a": "책상 위에" },
    { "q": "다음 문장에서 조사를 찾으세요: '철수가 학교에 갔다.'", "options": ["철수","학교에","갔다"], "a": "학교에" },
    { "q": "다음 중 올바른 맞춤법을 고르세요: '되길','돼길','되기를'", "options": ["되길","돼길","되기를"], "a": "되기를" },
    { "q": "다음 문장에서 보어를 찾으세요: '철수는 학생이다.'", "options": ["철수","학생","이다"], "a": "학생" },
    { "q": "다음 중 관형사형 어미를 고르세요.", "options": ["-는","-다","-게"], "a": "-는" },
    { "q": "다음 중 올바른 맞춤법을 고르세요: '앉아있다','앉아 있다','앉아있어'", "options": ["앉아있다","앉아 있다","앉아있어"], "a": "앉아 있다" },
    { "q": "다음 문장에서 연결어미를 찾으세요: '먹고 놀았다.'", "options": ["먹고","놀았다","없음"], "a": "먹고" },
    { "q": "다음 중 올바른 맞춤법은?", "options": ["치르다","치루다","치뤄다"], "a": "치르다" },
    { "q": "다음 중 시제에 맞는 동사는?", "options": ["먹었다","먹는다","먹기"], "a": "먹었다" },
    { "q": "다음 중 올바른 맞춤법: '안되다'", "options": ["안되다","안 돼다","안돼다"], "a": "안되다" },
    { "q": "다음 문장에서 수식어를 찾으세요: '철수가 빠르게 달린다.'", "options": ["철수","빠르게","달린다"], "a": "빠르게" },
    { "q": "다음 중 올바른 맞춤법: '말리다'", "options": ["말리다","말하다","말려다"], "a": "말리다" }
  ],
  "영어": [
    { "q": "Choose the correct plural form: baby", "options": ["babies","babys","babyes"], "a": "babies" },
    { "q": "Choose the correct past tense of 'go'", "options": ["goed","went","gone"], "a": "went" },
    { "q": "Choose the correct article: ___ apple", "options": ["a","an","the"], "a": "an" },
    { "q": "Choose the correct form: He ___ a book.", "options": ["reads","read","reading"], "a": "reads" },
    { "q": "Choose the synonym of 'happy'", "options": ["sad","joyful","angry"], "a": "joyful" },
    { "q": "Choose the antonym of 'big'", "options": ["small","large","huge"], "a": "small" },
    { "q": "Choose the correct preposition: I go ___ school.", "options": ["to","at","in"], "a": "to" },
    { "q": "Choose the plural of 'mouse'", "options": ["mouses","mice","mouse"], "a": "mice" },
    { "q": "Select the correct sentence.", "options": ["He don't like it.","He doesn't like it.","He not like it."], "a": "He doesn't like it." },
    { "q": "Choose the correct tense: I ___ my homework yesterday.", "options": ["do","did","done"], "a": "did" },
    { "q": "Choose the correct plural: child", "options": ["childs","children","childes"], "a": "children" },
    { "q": "Choose the correct spelling: receive", "options": ["recieve","receive","reseive"], "a": "receive" },
    { "q": "Choose the synonym of 'fast'", "options": ["quick","slow","late"], "a": "quick" },
    { "q": "Choose the correct word: I have ___ money.", "options": ["some","any","no"], "a": "some" },
    { "q": "Choose the correct form: They ___ football every week.", "options": ["plays","play","playing"], "a": "play" },
    { "q": "Choose the correct sentence.", "options": ["She can sings.","She can sing.","She can sang."], "a": "She can sing." },
    { "q": "Choose the past tense of 'see'", "options": ["saw","seen","seeed"], "a": "saw" },
    { "q": "Choose the correct question form: ___ you like ice cream?", "options": ["Do","Does","Did"], "a": "Do" },
    { "q": "Choose the correct comparative: fast", "options": ["faster","fastest","more fast"], "a": "faster" },
    { "q": "Choose the superlative: happy", "options": ["happier","happiest","most happy"], "a": "happiest" },
    { "q": "Choose correct form: He has ___ book.", "options": ["a","an","the"], "a": "a" },
    { "q": "Choose the synonym of 'angry'", "options": ["mad","sad","happy"], "a": "mad" },
    { "q": "Choose the antonym of 'hot'", "options": ["cold","warm","cool"], "a": "cold" },
    { "q": "Choose correct plural: fox", "options": ["foxs","foxes","foxe"], "a": "foxes" },
    { "q": "Choose the correct sentence: They ___ to school.", "options": ["goes","go","going"], "a": "go" },
    { "q": "Choose correct form: I ___ my friend yesterday.", "options": ["meet","met","meeted"], "a": "met" },
    { "q": "Choose correct article: I saw ___ elephant.", "options": ["a","an","the"], "a": "an" },
    { "q": "Choose the correct tense: She ___ a cake now.", "options": ["bakes","is baking","baked"], "a": "is baking" },
    { "q": "Choose the correct form: We ___ to the park every Sunday.", "options": ["go","goes","going"], "a": "go" },
    { "q": "Choose the past tense of 'write'", "options": ["writed","wrote","written"], "a": "wrote" }
  ],
  "수학": [
    { "q": "2x + 5 = 13, x의 값은?", "options": ["3","4","5"], "a": "4" },
    { "q": "5x - 7 = 18, x는?", "options": ["5","4","6"], "a": "5" },
    { "q": "다음 중 소수는?", "options": ["0.5","1/2","둘다"], "a": "둘다" },
    { "q": "다음 중 약수는?", "options": ["6의 약수:1,2,3,6","6의 약수:1,2,6","6의 약수:1,3,6"], "a": "6의 약수:1,2,3,6" },
    { "q": "다음 중 배수는?", "options": ["3의 배수:3,6,9","3의 배수:3,6,8","3의 배수:3,5,9"], "a": "3의 배수:3,6,9" },
    { "q": "7 + 6 x 2 = ?", "options": ["26","19","20"], "a": "19" },
    { "q": "다음 중 정답은?", "options": ["(-3)²=9","(-3)²=-9","(-3)²=3"], "a": "(-3)²=9" },
    { "q": "다음 중 분수 계산: 1/2 + 1/3 =", "options": ["5/6","2/5","3/5"], "a": "5/6" },
    { "q": "다음 중 소수점 자리까지 계산: 0.3 + 0.7 =", "options": ["1","0.1","0.9"], "a": "1" },
    { "q": "다음 중 비례식의 옳은 값: 3:6 = x:12, x=?", "options": ["6","8","9"], "a": "6" },
    { "q": "2^3 =", "options": ["6","8","9"], "a": "8" },
    { "q": "다음 중 삼각형의 내각의 합은?", "options": ["180도","360도","90도"], "a": "180도" },
    { "q": "다음 중 원의 반지름과 지름 관계는?", "options": ["지름=2x반지름","지름=반지름","지름=반지름/2"], "a": "지름=2x반지름" },
    { "q": "다음 중 직각삼각형의 특징은?", "options": ["한 각이 90도","세 각이 90도","두 각이 90도"], "a": "한 각이 90도" },
    { "q": "다음 중 평행사변형의 성질은?", "options": ["마주보는 변 평행","모든 변 평행","마주보는 각 90도"], "a": "마주보는 변 평행" },
    { "q": "다음 중 합동 삼각형 조건은?", "options": ["SSS","AAA","SAA"], "a": "SSS" },
    { "q": "다음 중 약분 후 결과: 4/8 =", "options": ["1/2","2/4","4/2"], "a": "1/2" },
    { "q": "다음 중 분수 곱셈: 2/3 x 3/4 =", "options": ["1/2","1/3","1/4"], "a": "1/2" },
    { "q": "다음 중 합계: 15+27 =", "options": ["42","41","43"], "a": "42" },
    { "q": "다음 중 소수 곱셈: 0.5 x 0.2 =", "options": ["0.1","0.7","0.2"], "a": "0.1" },
    { "q": "다음 중 분수 덧셈: 3/5 + 1/5 =", "options": ["4/5","3/5","1/5"], "a": "4/5" },
    { "q": "다음 중 정답: 12 ÷ 3 =", "options": ["4","3","6"], "a": "4" },
    { "q": "다음 중 나머지 계산: 17 ÷ 5 =", "options": ["2","3","4"], "a": "2" },
    { "q": "다음 중 제곱근: √16 =", "options": ["4","8","2"], "a": "4" },
    { "q": "다음 중 배수 찾기: 4의 배수", "options": ["4,8,12","4,9,13","4,6,10"], "a": "4,8,12" },
    { "q": "다음 중 몫: 20 ÷ 4 =", "options": ["5","4","6"], "a": "5" },
    { "q": "다음 중 합동 조건: SAS", "options": ["맞음","틀림","불확실"], "a": "맞음" }
  ],
  "사회": [
    { "q": "우리나라 삼권분립에서 입법권은?", "options": ["국회","대통령","법원"], "a": "국회" },
    { "q": "행정권은?", "options": ["대통령","국회","법원"], "a": "대통령" },
    { "q": "사법권은?", "options": ["법원","국회","대통령"], "a": "법원" },
    { "q": "우리나라의 수도는?", "options": ["서울","부산","대전"], "a": "서울" },
    { "q": "대한민국의 대통령 임기는?", "options": ["5년","4년","6년"], "a": "5년" },
    { "q": "국회의원 임기는?", "options": ["4년","5년","6년"], "a": "4년" },
    { "q": "우리나라 통화 단위는?", "options": ["원","달러","엔"], "a": "원" },
    { "q": "우리나라 공식 언어는?", "options": ["한국어","영어","중국어"], "a": "한국어" },
    { "q": "선거권 연령은?", "options": ["18세","19세","20세"], "a": "18세" },
    { "q": "지방자치단체를 말하면?", "options": ["시,군,구","서울,부산,대전","도,광역시"], "a": "시,군,구" },
    { "q": "대한민국의 국가 상징은?", "options": ["태극기","성조기","일장기"], "a": "태극기" },
    { "q": "헌법이 보장하는 기본권은?", "options": ["자유권","의무권","규제권"], "a": "자유권" },
    { "q": "산업혁명과 관련된 나라는?", "options": ["영국","프랑스","독일"], "a": "영국" },
    { "q": "세계 1차 대전이 시작된 연도는?", "options": ["1914","1939","1945"], "a": "1914" },
    { "q": "세계 2차 대전이 끝난 연도는?", "options": ["1945","1939","1918"], "a": "1945" },
    { "q": "한국 전쟁 발발 연도는?", "options": ["1950","1945","1960"], "a": "1950" },
    { "q": "조선왕조 최초 왕은?", "options": ["태조","세종","정조"], "a": "태조" },
    { "q": "대한민국의 수도는?", "options": ["서울","부산","인천"], "a": "서울" },
    { "q": "대공황은 어느 연대?", "options": ["1930년대","1920년대","1940년대"], "a": "1930년대" },
    { "q": "민주주의의 원리는?", "options": ["법의 지배","권력 집중","독재"], "a": "법의 지배" },
    { "q": "산업혁명의 시작 국가는?", "options": ["영국","프랑스","독일"], "a": "영국" },
    { "q": "삼권분립에서 사법권은?", "options": ["법원","국회","대통령"], "a": "법원" },
    { "q": "산업혁명 시기를 약 200년 전으로 본 나라는?", "options": ["영국","미국","일본"], "a": "영국" },
    { "q": "대한민국의 수도는? (중복문항)", "options": ["서울","부산","대전"], "a": "서울" },
    { "q": "광복된 연도는?", "options": ["1945","1940","1950"], "a": "1945" },
    { "q": "한국 전쟁이 끝난 해는?", "options": ["1953","1950","1955"], "a": "1953" },
    { "q": "대한민국 헌법 제정 연도는?", "options": ["1948","1950","1945"], "a": "1948" },
    { "q": "4·19 혁명이 일어난 해는?", "options": ["1960","1950","1970"], "a": "1960" },
    { "q": "6·25 전쟁이 발발한 해는?", "options": ["1950","1945","1953"], "a": "1950" }
  ],
  "과학": [
    { q: "지구가 스스로 도는 움직임을 무엇이라고 하나요?", options: ["공전", "자전", "회전", "반작용"], a: "자전" },
    { q: "물의 세 가지 상태가 아닌 것은?", options: ["고체", "액체", "기체", "플라스마"], a: "플라스마" },
    { q: "다음 중 힘의 작용이 아닌 것은?", options: ["당기기", "밀기", "비비기", "누르기"], a: "비비기" },
    { q: "식물의 뿌리가 하는 일이 아닌 것은?", options: ["양분 흡수", "물 흡수", "지지", "광합성"], a: "광합성" },
    { q: "사람의 호흡 기관은?", options: ["폐", "위", "심장", "간"], a: "폐" },
    { q: "빛이 통과하지 못하는 물체는?", options: ["투명", "반투명", "불투명", "아크릴"], a: "불투명" },
    { q: "지렁이는 어떤 동물에 속하나요?", options: ["척추동물", "무척추동물", "포유류", "파충류"], a: "무척추동물" },
    { q: "철이 녹스는 현상을 무엇이라 하나요?", options: ["증발", "부식", "응고", "융해"], a: "부식" },
    { q: "태양에서 나온 빛과 열이 지구에 도달하는 방법은?", options: ["전도", "대류", "복사", "압력"], a: "복사" },
    { q: "달의 모양이 변하는 이유는?", options: ["지구 자전", "달 공전", "태양 움직임", "지구 기울기"], a: "달 공전" },
    { q: "에너지원 중 재생 가능 에너지가 아닌 것은?", options: ["태양광", "풍력", "석유", "수력"], a: "석유" },
    { q: "다음 중 동물의 생활 중 겨울잠에 해당하는 것은?", options: ["철새 이동", "월동", "동면", "낙엽"], a: "동면" },
    { q: "사람의 소화 기관이 아닌 것은?", options: ["위", "간", "폐", "소장"], a: "폐" },
    { q: "전구가 켜지려면 무엇이 필요할까요?", options: ["절연체", "도체", "건전지와 회로", "고무"], a: "건전지와 회로" },
    { q: "고체가 액체가 되는 변화는?", options: ["응고", "기화", "융해", "승화"], a: "융해" },
    { q: "다음 중 포유류는?", options: ["개구리", "참새", "고래", "뱀"], a: "고래" },
    { q: "번개가 치는 이유는?", options: ["온도 차", "구름 간의 미끄러짐", "전기의 방전", "소리 충돌"], a: "전기의 방전" },
    { q: "물이 끓는 온도는?", options: ["0℃", "50℃", "80℃", "100℃"], a: "100℃" },
    { q: "나뭇잎의 기공은 어떤 일을 하나요?", options: ["물 저장", "양분 생성", "기체 교환", "뿌리 보호"], a: "기체 교환" },
    { q: "지진을 일으키는 지각의 큰 조각을 무엇이라 하나요?", options: ["층", "대륙", "판", "암석"], a: "판" },
    { q: "고래는 어떤 방식으로 새끼를 낳나요?", options: ["알", "세포 분열", "새끼 출산", "변태"], a: "새끼 출산" },
    { q: "별이 반짝여 보이는 이유는?", options: ["온도 변화", "대기 흔들림", "별의 움직임", "구름"], a: "대기 흔들림" },
    { q: "전기 회로에서 전류의 방향은?", options: ["(-) → (+)", "(+) → (-)", "아무 방향 없음", "왔다 갔다 한다"], a: "(+) → (-)" },
    { q: "작용과 반작용은 항상?", options: ["같은 방향", "힘의 크기가 다름", "한쪽만 존재", "크기는 같고 방향은 반대"], a: "크기는 같고 방향은 반대" },
    { q: "태양계의 중심은?", options: ["지구", "달", "태양", "금성"], a: "태양" },
    { q: "식물에서 광합성이 일어나는 부분은?", options: ["뿌리", "줄기", "잎", "꽃"], a: "잎" },
    { q: "다음 중 혼합물이 아닌 것은?", options: ["소금물", "설탕물", "공기", "증류수"], a: "증류수" },
    { q: "지구의 자전으로 생기는 것은?", options: ["계절 변화", "밤과 낮", "달의 위상", "밀물"], a: "밤과 낮" },
    { q: "온도계를 사용해 측정하는 것은?", options: ["열의 양", "온도", "속도", "무게"], a: "온도" },
    { q: "녹색 식물이 만드는 에너지원은?", options: ["단백질", "산소", "포도당", "지방"], a: "포도당" },
  ],  
}


export default function MiniTestPage() {
const subjects = Object.keys(miniTests);
const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
const [currentIndex, setCurrentIndex] = useState(0);
const [answers, setAnswers] = useState({});
const [showResult, setShowResult] = useState(false);
const [startTime, setStartTime] = useState<Date | null>(null);
const [user, setUser] = useState<any>(null);

const [chatInput, setChatInput] = useState("");
const [messages, setMessages] = useState<any[]>([]);

useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, setUser);
return () => unsubscribe();
}, []);

useEffect(() => {
const q = query(collection(db, "chat"), orderBy("timestamp", "asc"));
const unsubscribe = onSnapshot(q, (snapshot) => {
setMessages(snapshot.docs.map((doc) => doc.data()));
});
return () => unsubscribe();
}, []);

const questions = miniTests[selectedSubject];
const currentQ = questions[currentIndex];

const handleAnswer = (option: string) =>
setAnswers({ ...answers, [currentIndex]: option });
const handleNext = () =>
currentIndex < questions.length - 1 && setCurrentIndex(currentIndex + 1);
const handlePrev = () =>
currentIndex > 0 && setCurrentIndex(currentIndex - 1);

const handleSubmit = async () => {
setShowResult(true);
const endTime = new Date().getTime();
const elapsed = startTime ? Math.floor((endTime - startTime.getTime()) / 1000) : 0;

const score = questions.reduce(
  (score, q, idx) => (answers[idx] === q.a ? score + 1 : score),
  0
);

if (user) {
  await addDoc(collection(db, "scores"), {
    uid: user.uid,
    nickname: user.displayName,
    subject: selectedSubject,
    score,
    total: questions.length,
    startTime,
    endTime,
    elapsedSeconds: elapsed,
  });
}


};

const handleChatSend = async () => {
if (!chatInput.trim() || !user) return;
await addDoc(collection(db, "chat"), {
uid: user.uid,
nickname: user.displayName,
message: chatInput.trim(),
timestamp: new Date(),
});
setChatInput("");
};

const formatTime = (date: Date | null) =>
date ? new Date(date).toLocaleTimeString() : "--:--:--";

useEffect(() => setStartTime(new Date()), [selectedSubject]);

return ( <PageContainer>
<h1 style={{ color: "#333", marginBottom: "8px" }}>과목별 테스트</h1>
<p style={{ color: "#555" }}>시작 시간: {formatTime(startTime)}</p>


  <div style={{ marginBottom: "16px" }}>
    {subjects.map((subj) => (
      <button
        key={subj}
        onClick={() => {
          setSelectedSubject(subj);
          setCurrentIndex(0);
          setAnswers({});
          setShowResult(false);
          setStartTime(new Date());
        }}
        style={{
          marginRight: "8px",
          padding: "8px 14px",
          borderRadius: "20px",
          border: "none",
          cursor: "pointer",
          fontWeight: "bold",
          transition: "0.2s",
          backgroundColor: subj === selectedSubject ? "#4caf50" : "#f0f0f0",
          color: subj === selectedSubject ? "#fff" : "#333",
        }}
      >
        {subj}
      </button>
    ))}
  </div>

  {!showResult ? (
    <div style={{
      padding: "16px",
      borderRadius: "8px",
      backgroundColor: "#fafafa",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      marginBottom: "20px"
    }}>
      <h2 style={{ marginBottom: "12px", color: "#222" }}>
        문제 {currentIndex + 1}/{questions.length}
      </h2>
      <p style={{ marginBottom: "16px", color: "#444" }}>{currentQ.q}</p>
      <div>
        {currentQ.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            style={{
              display: "block",
              margin: "8px 0",
              padding: "10px 14px",
              borderRadius: "6px",
              width: "100%",
              textAlign: "left",
              fontWeight: "500",
              border: "1px solid #ccc",
              cursor: "pointer",
              backgroundColor: answers[currentIndex] === opt ? "#2196f3" : "#fff",
              color: answers[currentIndex] === opt ? "#fff" : "#333",
              transition: "0.2s",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <div style={{ marginTop: "16px" }}>
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            backgroundColor: "#fff",
            cursor: currentIndex === 0 ? "not-allowed" : "pointer",
            marginRight: "8px",
          }}
        >
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === questions.length - 1}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            backgroundColor: "#fff",
            cursor: currentIndex === questions.length - 1 ? "not-allowed" : "pointer",
            marginRight: "8px",
          }}
        >
          다음
        </button>
        <button
          onClick={handleSubmit}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#4caf50",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          제출
        </button>
      </div>
    </div>
  ) : (
    <div style={{
      padding: "16px",
      borderRadius: "8px",
      backgroundColor: "#f0f9f0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      marginBottom: "20px"
    }}>
      <h2 style={{ color: "#222" }}>결과</h2>
      <p style={{ color: "#444" }}>
        총 점수: {questions.reduce(
          (score, q, idx) => (answers[idx] === q.a ? score + 1 : score),
          0
        )} / {questions.length}
      </p>
      <p style={{ color: "#444" }}>
        소요 시간: {Math.floor((new Date().getTime() - startTime!.getTime()) / 1000)}초
      </p>
    </div>
  )}

  <hr style={{ margin: "20px 0" }} />
  <h2 style={{ color: "#333" }}>채팅방</h2>
  <div style={{
    maxHeight: "200px",
    overflowY: "scroll",
    borderRadius: "8px",
    padding: "12px",
    backgroundColor: "#fefefe",
    boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
    marginBottom: "8px"
  }}>
    {messages.map((msg, idx) => (
      <div key={idx} style={{ marginBottom: "6px" }}>
        <strong style={{ color: "#2196f3" }}>{msg.nickname}</strong>{" "}
        [{formatTime(msg.timestamp)}]: <span>{msg.message}</span>
      </div>
    ))}
  </div>
  <div style={{ display: "flex", gap: "8px" }}>
    <input
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      placeholder="메시지 입력..."
      style={{
        flex: 1,
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #ccc",
      }}
    />
    <button
      onClick={handleChatSend}
      style={{
        padding: "8px 16px",
        borderRadius: "6px",
        border: "none",
        backgroundColor: "#4caf50",
        color: "#fff",
        fontWeight: "bold",
      }}
    >
      전송
    </button>
  </div>
</PageContainer>


);
}
