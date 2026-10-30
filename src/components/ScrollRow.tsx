// A row that scrolls sideways and shows that it does: the edge with more to see
// fades out, computers get arrow buttons, and with `dots` a dot per card shows
// where you are.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ScrollRow({
  className,
  children,
  dots,
  scrollerRef,
  label,
}: {
  className: string;
  children: ReactNode;
  dots?: boolean;
  scrollerRef?: RefObject<HTMLDivElement | null>;
  label?: string;
}) {
  const own = useRef<HTMLDivElement>(null);
  const ref = scrollerRef ?? own;
  const [edges, setEdges] = useState({ left: false, right: false });
  const [page, setPage] = useState({ at: 0, count: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
      if (!dots) return;
      const kids = [...el.children] as HTMLElement[];
      let at = 0;
      kids.forEach((k, i) => {
        if (Math.abs(k.offsetLeft - el.offsetLeft - el.scrollLeft) < Math.abs(kids[at].offsetLeft - el.offsetLeft - el.scrollLeft)) at = i;
      });
      setPage({ at, count: kids.length });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [ref, dots]);

  const go = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const toCard = (i: number) => {
    const el = ref.current;
    const kid = el?.children[i] as HTMLElement | undefined;
    if (el && kid) el.scrollTo({ left: kid.offsetLeft - el.offsetLeft - 18, behavior: 'smooth' });
  };

  return (
    <div className={`scroll-row ${edges.left ? 'more-left' : ''} ${edges.right ? 'more-right' : ''}`}>
      <div ref={ref} className={className} aria-label={label}>
        {children}
      </div>
      {edges.left && (
        <button className="scroll-btn left" onClick={() => go(-1)} aria-label="Scroll left" tabIndex={-1}>
          <ChevronLeft size={20} />
        </button>
      )}
      {edges.right && (
        <button className="scroll-btn right" onClick={() => go(1)} aria-label="Scroll right" tabIndex={-1}>
          <ChevronRight size={20} />
        </button>
      )}
      {dots && page.count > 1 && (
        <div className="scroll-dots">
          {Array.from({ length: page.count }, (_, i) => (
            <button key={i} className={i === page.at ? 'on' : ''} onClick={() => toCard(i)} aria-label={`Card ${i + 1} of ${page.count}`} />
          ))}
        </div>
      )}
    </div>
  );
}
