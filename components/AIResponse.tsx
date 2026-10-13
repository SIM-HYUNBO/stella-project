import AITextLinks from "./AITextLinks";

/** Render a small, safe Markdown subset without interpreting arbitrary HTML. */
export default function AIResponse({ text }: { text: string }) {
  const lines = text.replace(/\\([*~<>])/g, "$1").split("\n");
  const inline = (value: string) => value.split(/<br\s*\/?\s*>/i).map((part, i) => <span key={i}>{i > 0 && <br />}<AITextLinks text={part} /></span>);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line.startsWith("|") && line.endsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i++].trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map(cell => cell.trim());
        if (!cells.every(cell => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
      }
      if (rows.length) nodes.push(<div key={i} className="my-4 overflow-x-auto rounded-xl border border-sky-100"><table className="w-full border-collapse text-left text-sm"><thead><tr>{rows[0].map((cell, j) => <th key={j} className="border-b border-sky-100 bg-sky-50 px-3 py-2 font-semibold">{inline(cell)}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k} className="border-b border-slate-100 px-3 py-2 align-top leading-6">{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^#{1,6}\s/.test(line)) nodes.push(<h3 key={i} className="mb-2 mt-5 font-semibold text-slate-800">{inline(line.replace(/^#{1,6}\s+/, ""))}</h3>);
    else if (/^[-*]\s|^\d+[.)]\s/.test(line)) nodes.push(<div key={i} className="my-2 flex gap-3"><span aria-hidden="true" className="text-sky-400">•</span><div className="min-w-0">{inline(line.replace(/^([-*]|\d+[.)])\s+/, ""))}</div></div>);
    else if (line.startsWith("> ")) nodes.push(<blockquote key={i} className="my-3 border-l-2 border-sky-200 pl-4 text-slate-600">{inline(line.slice(2))}</blockquote>);
    else nodes.push(<p key={i} className="my-2 break-words">{inline(lines[i])}</p>);
    i++;
  }
  return <>{nodes}</>;
}
