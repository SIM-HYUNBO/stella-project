/** React escapes text; only explicit HTTP(S) links are clickable. */
export default function AITextLinks({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+)/g);
  return <>{parts.map((part, i) => {
    const markdown = part.match(/^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/);
    const url = markdown?.[2] || (/^https?:\/\//.test(part) ? part : null);
    if (!url) return <span key={i}>{part}</span>;
    return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="break-words text-sky-600 underline decoration-sky-200 underline-offset-4 hover:decoration-sky-500">{markdown?.[1] || part}</a>;
  })}</>;
}
