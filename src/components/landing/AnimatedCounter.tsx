import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: string;
  className?: string;
  duration?: number;
}

const AnimatedCounter = ({ value, className = "", duration = 1500 }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Matches an optional sign, a number that may contain thousand separators
    // (space, nbsp, narrow nbsp, thin space, comma), then any suffix.
    const match = value.match(/^([^\d]*)(\d[\d\u00A0\u202F\u2009 ,]*\d|\d)(.*)$/s);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const [, prefix, numRaw, suffix] = match;
    const separatorMatch = numRaw.match(/[\u00A0\u202F\u2009 ,]/);
    const separator = separatorMatch ? separatorMatch[0] : "";
    const target = parseInt(numRaw.replace(/[^\d]/g, ""), 10);
    if (isNaN(target)) {
      setDisplayValue(value);
      return;
    }

    const format = (n: number) => {
      const digits = String(n);
      if (!separator) return digits;
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    };


    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            const startTime = performance.now();
            const startValue = 0;

            const animate = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeOutQuart = 1 - Math.pow(1 - progress, 4);
              const current = Math.floor(startValue + (target - startValue) * easeOutQuart);
              setDisplayValue(`${prefix}${format(current)}${suffix}`);

              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            };

            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, hasAnimated, ref]);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
};

export default AnimatedCounter;
