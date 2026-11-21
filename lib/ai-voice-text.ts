export const VOICE_RESPONSE_STYLE = `지금은 화면에 글을 보여주지 않는 실시간 음성 대화야.
친구에게 직접 말하듯 자연스러운 한국어 구어체로 답해. 기본은 짧은 1~3문장이고, 자세한 설명을 요청하면 말로 이해할 수 있게 이어서 설명해.
제목, 요약 라벨, 글머리표, 번호 목록, 표, 마크다운, 이모지, 괄호 속 지문, HTML, 코드, 링크, URL, 인용 토큰을 출력하지 마.
기호나 수식은 소리 내어 이해할 수 있는 말로 풀어 줘. 출력 형식이나 네가 느끼는 감정의 지문을 읽지 마.
반복 인사나 끝마다 붙이는 상투적인 질문은 피하고 사용자가 한 말에 바로 반응해.
검색이 필요하면 검색하되 출처는 꼭 필요할 때 기관이나 매체 이름만 자연스러운 문장에 넣어. 모르는 내용은 솔직히 말해.
`;

export function spokenAIText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\s\S]*?/g, " ")
    .replace(/【[^】]*】|\[\^?\d+\]/g, " ")
    .replace(/^\s*#{1,6}\s+.*$/gm, " ")
    .replace(/^\s*\|.*\|\s*$/gm, " ")
    .replace(/^\s*(?:[-*+•>]\s+|\d+[.)]\s+)/gm, "")
    .replace(/[*#_`|]/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(new RegExp("[\\p{Extended_Pictographic}\\uFE0F\\u200D]", "gu"), " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, " 그리고 ")
    .replace(/\s+/g, " ").trim();
}
