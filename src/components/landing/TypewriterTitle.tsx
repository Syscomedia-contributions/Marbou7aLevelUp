import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

type Token =
  | { type: "text"; text: string }
  | { type: "br" }
  | { type: "tag"; name: "grad" | "gold" | "nowrap"; children: Token[] };

function parse(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    if (input.startsWith("<br/>", i) || input.startsWith("<br />", i)) {
      tokens.push({ type: "br" });
      i += input.startsWith("<br/>", i) ? 5 : 6;
      continue;
    }
    const openMatch = /^<(grad|gold|nowrap)>/.exec(input.slice(i));
    if (openMatch) {
      const name = openMatch[1] as "grad" | "gold" | "nowrap";
      const closeTag = `</${name}>`;
      const start = i + openMatch[0].length;
      const end = input.indexOf(closeTag, start);
      const inner = input.slice(start, end);
      tokens.push({ type: "tag", name, children: parse(inner) });
      i = end + closeTag.length;
      continue;
    }
    // text until next tag
    const nextTag = input.slice(i).search(/<(grad|gold|nowrap|br\s*\/)/);
    const end = nextTag === -1 ? input.length : i + nextTag;
    tokens.push({ type: "text", text: input.slice(i, end) });
    i = end;
  }
  return tokens;
}

function totalLength(tokens: Token[]): number {
  let n = 0;
  for (const t of tokens) {
    if (t.type === "text") n += t.text.length;
    else if (t.type === "tag") n += totalLength(t.children);
  }
  return n;
}

function render(
  tokens: Token[],
  remaining: { n: number },
  isAr: boolean,
  textShadow: string | undefined,
  keyPrefix = "",
  nowrapContext = false,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  tokens.forEach((t, idx) => {
    const k = `${keyPrefix}-${idx}`;
    if (remaining.n <= 0) return;
    if (t.type === "br") {
      out.push(<br key={k} />);
    } else if (t.type === "text") {
      const take = Math.min(t.text.length, remaining.n);
      remaining.n -= take;
      out.push(
        <span key={k} style={textShadow ? { textShadow } : undefined}>
          {t.text.slice(0, take)}
        </span>,
      );
    } else if (t.type === "tag") {
      const childShadow = t.name === "grad" || t.name === "gold" ? undefined : textShadow;
      const children = render(t.children, remaining, isAr, childShadow, k, nowrapContext || t.name === "nowrap");
      if (t.name === "grad") {
        out.push(
          <span key={k} className={`text-gradient ${!isAr && !nowrapContext ? "lg:block lg:text-center" : ""}`}>
            {children}
          </span>,
        );
      } else if (t.name === "gold") {
        out.push(
          <span key={k} className="text-gold-gradient">
            {children}
          </span>,
        );
      } else {
        out.push(
          <span key={k} className="whitespace-nowrap">
            {children}
          </span>,
        );
      }
    }
  });
  return out;
}

interface Props {
  className?: string;
  speedMs?: number;
}

const TypewriterTitle = ({ className, speedMs = 45 }: Props) => {
  const { t } = useTranslation();
  const raw = t("hero.heroTitle");
  // AR uses the exact same layout as FR/EN — only the text is translated.
  const isAr = false;
  const isMobile = useIsMobile();

  const tokens = useMemo(() => parse(raw), [raw]);
  const total = useMemo(() => totalLength(tokens), [tokens]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= total) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, speedMs);
    return () => window.clearInterval(id);
  }, [total, speedMs, raw]);

  const shadowValue = isMobile
    ? "0 1px 3px rgba(0,0,0,0.75), 0 3px 10px rgba(0,0,0,0.55)"
    : "0 2px 12px rgba(0,0,0,0.45)";
  const nodes = render(tokens, { n: count }, !!isAr, shadowValue);
  const fullNodes = render(tokens, { n: total }, !!isAr, shadowValue, "full");
  const done = count >= total;

  return (
    <h1
      className={`${className ?? ""} relative grid grid-cols-[minmax(0,1fr)] max-w-full min-w-0 [overflow-wrap:anywhere] overflow-hidden`}
      aria-label={raw.replace(/<[^>]+>/g, "")}
    >
      {/* Invisible full-size placeholder reserves the final layout height so CTAs
          below (and the gift) never shift during the typewriter animation. */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1 pointer-events-none min-w-0 max-w-full">
        {fullNodes}
      </span>
      {/* Visible text is overlaid absolutely so intermediate wrapping can never
          grow the container beyond the placeholder's reserved height. */}
      <span className="absolute inset-0 min-w-0 max-w-full">
        {nodes}
        {!done && (
          <span
            aria-hidden="true"
            className="inline-block w-[0.08em] h-[0.9em] align-[-0.1em] ms-1 bg-current"
          />
        )}
      </span>
    </h1>
  );
};


export default TypewriterTitle;
