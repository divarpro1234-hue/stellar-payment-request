'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ReactNode } from 'react';
import { useRef } from 'react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Sep7FlowMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const flowItems = gsap.utils.toArray<HTMLElement>(
          '.sep-flow-node, .sep-flow-arrow',
          scope.current,
        );
        gsap.fromTo(
          flowItems,
          { y: 10, scale: 0.97, opacity: 0.68 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            stagger: 0.1,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top 78%',
              end: 'center 58%',
              scrub: 0.6,
            },
          },
        );
      });

      return () => media.revert();
    },
    { scope },
  );

  return (
    <div className="sep7-motion-scope" ref={scope}>
      {children}
    </div>
  );
}
