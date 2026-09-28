"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { useRef, type CSSProperties } from "react";

gsap.registerPlugin(useGSAP);

type TechSymbol = {
  file: string;
  label: string;
  x: string;
  y: string;
  mobileX: string;
  mobileY: string;
  size: string;
  mobile: boolean;
  driftX: number;
  driftY: number;
  rotation: number;
  duration: number;
  depth: number;
};

const techSymbols: TechSymbol[] = [
  { file: "python-fill.svg", label: "Python", x: "18%", y: "25%", mobileX: "7%", mobileY: "18%", size: "clamp(2.5rem, 4.8vw, 5.3rem)", mobile: true, driftX: 28, driftY: -34, rotation: -15, duration: 4.8, depth: 0.72 },
  { file: "react.svg", label: "React", x: "60%", y: "16%", mobileX: "75%", mobileY: "13%", size: "clamp(2.5rem, 4.6vw, 5rem)", mobile: true, driftX: -32, driftY: 24, rotation: 17, duration: 5.6, depth: 0.5 },
  { file: "docker.svg", label: "Docker", x: "76%", y: "29%", mobileX: "86%", mobileY: "42%", size: "clamp(2.25rem, 4.1vw, 4.5rem)", mobile: true, driftX: 27, driftY: -22, rotation: -15, duration: 5.1, depth: 0.84 },
  { file: "terminal.svg", label: "Terminal", x: "76%", y: "51%", mobileX: "64%", mobileY: "56%", size: "clamp(2.1rem, 3.8vw, 4.2rem)", mobile: true, driftX: -25, driftY: 31, rotation: 16, duration: 6.1, depth: 0.56 },
  { file: "github.svg", label: "GitHub", x: "18%", y: "57%", mobileX: "11%", mobileY: "51%", size: "clamp(2.3rem, 4.3vw, 4.7rem)", mobile: true, driftX: 29, driftY: 27, rotation: -16, duration: 5.3, depth: 0.64 },
  { file: "figma-bold.svg", label: "Figma", x: "27%", y: "76%", mobileX: "29%", mobileY: "73%", size: "clamp(1.9rem, 3.3vw, 3.7rem)", mobile: true, driftX: -23, driftY: -26, rotation: 18, duration: 4.9, depth: 0.42 },
  { file: "js.svg", label: "JavaScript", x: "57%", y: "80%", mobileX: "54%", mobileY: "69%", size: "clamp(2rem, 3.5vw, 3.9rem)", mobile: true, driftX: 24, driftY: -30, rotation: -15, duration: 5.8, depth: 0.48 },
  { file: "linux-outlined.svg", label: "Linux", x: "10%", y: "40%", mobileX: "", mobileY: "", size: "clamp(2.35rem, 4.7vw, 5.1rem)", mobile: false, driftX: -22, driftY: 29, rotation: 14, duration: 6.4, depth: 0.78 },
  { file: "vscode-fill.svg", label: "VS Code", x: "85%", y: "70%", mobileX: "", mobileY: "", size: "clamp(2.1rem, 3.9vw, 4.25rem)", mobile: false, driftX: -28, driftY: -22, rotation: -17, duration: 5.2, depth: 0.59 },
  { file: "openai-chatgpt.svg", label: "AI", x: "46%", y: "13%", mobileX: "", mobileY: "", size: "clamp(2rem, 3.7vw, 4rem)", mobile: false, driftX: 31, driftY: 21, rotation: 15, duration: 4.6, depth: 0.67 },
  { file: "git.svg", label: "Git", x: "28%", y: "44%", mobileX: "", mobileY: "", size: "clamp(1.9rem, 3.3vw, 3.65rem)", mobile: false, driftX: 21, driftY: -27, rotation: -14, duration: 6, depth: 0.45 },
  { file: "aws-solid.svg", label: "Cloud", x: "67%", y: "68%", mobileX: "", mobileY: "", size: "clamp(2.3rem, 4.1vw, 4.5rem)", mobile: false, driftX: -26, driftY: 25, rotation: 16, duration: 5.4, depth: 0.75 },
];

export function HeroTechField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    const field = fieldRef.current;
    const hero = field?.closest<HTMLElement>(".home-hero");
    const icons = iconRefs.current.filter((icon): icon is HTMLDivElement => icon !== null);

    if (!field || !hero || !icons.length) {
      return;
    }

    techSymbols.forEach((symbol, index) => {
      const float = icons[index]?.querySelector<HTMLElement>(".hero-tech-field__float");

      if (!float) {
        return;
      }

      gsap.to(float, {
        x: symbol.driftX,
        y: symbol.driftY,
        rotation: symbol.rotation,
        duration: symbol.duration,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    });

    const media = gsap.matchMedia();

    media.add("(hover: hover) and (pointer: fine)", () => {
      const quickSetters = icons.map((icon) => ({
          x: gsap.quickTo(icon, "x", { duration: 0.75, ease: "power3.out" }),
          y: gsap.quickTo(icon, "y", { duration: 0.75, ease: "power3.out" }),
          scale: gsap.quickTo(icon, "scale", { duration: 0.6, ease: "power3.out" }),
      }));

      let frame = 0;
      let pointerX = 0;
      let pointerY = 0;

      const updateField = () => {
        frame = 0;

        icons.forEach((icon, index) => {
          const rect = icon.getBoundingClientRect();
          const deltaX = rect.left + rect.width / 2 - pointerX;
          const deltaY = rect.top + rect.height / 2 - pointerY;
          const distance = Math.hypot(deltaX, deltaY);
          const influence = Math.max(0, 1 - distance / 230);
          const symbol = techSymbols[index];
          const push = influence * (17 + symbol.depth * 16);
          const parallaxX = (pointerX / window.innerWidth - 0.5) * symbol.depth * 8;
          const parallaxY = (pointerY / window.innerHeight - 0.5) * symbol.depth * 8;

          quickSetters[index].x((distance ? (deltaX / distance) * push : 0) + parallaxX);
          quickSetters[index].y((distance ? (deltaY / distance) * push : 0) + parallaxY);
          quickSetters[index].scale(1 + influence * 0.1);
        });
      };

      const handlePointerMove = (event: PointerEvent) => {
        pointerX = event.clientX;
        pointerY = event.clientY;

        if (!frame) {
          frame = window.requestAnimationFrame(updateField);
        }
      };

      const resetField = () => {
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }

        quickSetters.forEach((setter) => {
          setter.x(0);
          setter.y(0);
          setter.scale(1);
        });
      };

      hero.addEventListener("pointermove", handlePointerMove, { passive: true });
      hero.addEventListener("pointerleave", resetField, { passive: true });

      return () => {
        if (frame) {
          window.cancelAnimationFrame(frame);
        }
        hero.removeEventListener("pointermove", handlePointerMove);
        hero.removeEventListener("pointerleave", resetField);
      };
    });

    return () => media.revert();
  }, { scope: fieldRef });

  return (
    <div ref={fieldRef} aria-hidden="true" className="hero-tech-field">
      {techSymbols.map((symbol, index) => {
        const style = {
          "--hero-icon-x": symbol.x,
          "--hero-icon-y": symbol.y,
          "--hero-icon-mobile-x": symbol.mobileX || symbol.x,
          "--hero-icon-mobile-y": symbol.mobileY || symbol.y,
          "--hero-icon-size": symbol.size,
        } as CSSProperties;

        return (
          <div
            className="hero-tech-field__icon"
            data-mobile={symbol.mobile}
            key={symbol.file}
            ref={(element) => {
              iconRefs.current[index] = element;
            }}
            style={style}
          >
            <div className="hero-tech-field__float">
              <Image alt="" height={128} src={`/tech_icons/${symbol.file}`} width={128} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
