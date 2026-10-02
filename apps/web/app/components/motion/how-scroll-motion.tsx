'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ReactNode } from 'react';
import { useRef } from 'react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HowScrollMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils
          .toArray<HTMLElement>('[data-how-visual]', scope.current)
          .forEach((visual) => {
            gsap.fromTo(
              visual,
              { scaleY: 0.82, opacity: 0.76, transformOrigin: 'center top' },
              {
                scaleY: 1,
                opacity: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: visual,
                  start: 'top 88%',
                  end: 'center 55%',
                  scrub: 0.55,
                },
              },
            );
          });
      });

      return () => media.revert();
    },
    { scope },
  );

  return (
    <div className="how-motion-scope" ref={scope}>
      {children}
    </div>
  );
}
