import { Fragment } from 'react';

/** Markdown mínimo para notas: párrafos, "## subtítulo", listas con "- ", **negrita** y [enlaces](url). */
function inline(text: string, key: string) {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={`${key}-${i++}`}>{tok.slice(2, -2)}</strong>);
    else {
      const [, label, href] = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      const safe = /^(https?:|mailto:|\/)/.test(href) ? href : '#';
      out.push(
        <a key={`${key}-${i++}`} href={safe} {...(safe.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
          {label}
        </a>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <div className="prose">
      {blocks.map((b, bi) => {
        const lines = b.split('\n').filter(Boolean);
        if (!lines.length) return null;
        const nodes: React.ReactNode[] = [];
        let list: string[] = [];
        const flush = (k: string) => {
          if (list.length) {
            nodes.push(
              <ul key={k}>
                {list.map((li, j) => (
                  <li key={j}>{inline(li, `${k}-${j}`)}</li>
                ))}
              </ul>,
            );
            list = [];
          }
        };
        let para: string[] = [];
        const flushP = (k: string) => {
          if (para.length) {
            nodes.push(<p key={k}>{inline(para.join(' '), k)}</p>);
            para = [];
          }
        };
        lines.forEach((ln, li) => {
          const k = `${bi}-${li}`;
          if (ln.startsWith('## ')) {
            flushP(k + 'p');
            flush(k + 'l');
            nodes.push(<h2 key={k}>{ln.slice(3)}</h2>);
          } else if (ln.startsWith('- ')) {
            flushP(k + 'p');
            list.push(ln.slice(2));
          } else {
            flush(k + 'l');
            para.push(ln);
          }
        });
        flushP(`${bi}-endp`);
        flush(`${bi}-endl`);
        return <Fragment key={bi}>{nodes}</Fragment>;
      })}
    </div>
  );
}
