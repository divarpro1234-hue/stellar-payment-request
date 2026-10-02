'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ReactNode } from 'react';
import { useRef } from 'react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function HeroMotion({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const layerTravel: Record<string, number> = {
          back: -5,
          left: -9,
          center: -3,
          right: -7,
        };

        gsap.utils
          .toArray<SVGElement>('[data-hero-layer]', scope.current)
          .forEach((layer) => {
            const depth = layer.dataset.heroLayer ?? 'center';
            gsap.to(layer, {
              yPercent: layerTravel[depth] ?? -4,
              ease: 'none',
              scrollTrigger: {
                trigger: scope.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 0.7,
              },
            });
          });
      });

      return () => media.revert();
    },
    { scope },
  );

  return (
    <div className="hero-motion-scope" ref={scope}>
      {children}
    </div>
  );
}
