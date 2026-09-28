"use client";

import { useGSAP } from "@gsap/react";
import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { Group } from "three";

gsap.registerPlugin(useGSAP, ScrollTrigger);

function EdgeMouse({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/gaming_mouse_-_free_low_poly.glb");
  const model = useMemo(() => scene.clone(), [scene]);
  const { size, viewport } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const progress = progressRef.current;
    const edgeDepth = Math.min(size.height * 0.26, 250);
    const x = gsap.utils.interpolate(0, size.width, progress);
    const edgeY = edgeDepth * (1 - gsap.utils.clamp(0, 1, x / size.width));
    // The transition starts as the lower-left endpoint enters the viewport.
    const sectionTop = (size.height - edgeDepth) * (1 - progress);
    const y = sectionTop + edgeY;

    group.position.x = ((x - size.width / 2) / size.width) * viewport.width;
    group.position.y = -((y - size.height / 2) / size.height) * viewport.height;
    group.rotation.set(0.12, -0.58, -Math.atan2(edgeDepth, size.width));
    group.scale.setScalar(Math.min(viewport.width * 0.12, 0.82));
  });

  return <primitive object={model} ref={groupRef} />;
}

function CanvasInvalidator({ invalidateRef }: { invalidateRef: MutableRefObject<(() => void) | null> }) {
  const { invalidate } = useThree();

  useEffect(() => {
    invalidateRef.current = invalidate;
    return () => {
      invalidateRef.current = null;
    };
  }, [invalidate, invalidateRef]);

  return null;
}

export function LeadershipMousePass() {
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const invalidateRef = useRef<(() => void) | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (enabled) {
      useGLTF.preload("/gaming_mouse_-_free_low_poly.glb");
    }
  }, [enabled]);

  useGSAP(() => {
    const section = document.querySelector<HTMLElement>(".home-executives");
    if (!section || !enabled) return;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: () => `top bottom-=${Math.min(window.innerHeight * 0.26, 250)}`,
      end: "top top",
      onUpdate: (self) => {
        progressRef.current = self.progress;
        invalidateRef.current?.();
      },
      onRefresh: (self) => {
        progressRef.current = self.progress;
        invalidateRef.current?.();
      },
    });

    return () => trigger.kill();
  }, { dependencies: [enabled], scope: rootRef, revertOnUpdate: true });

  return (
    <div aria-hidden="true" className="leadership-mouse-pass" ref={rootRef}>
      {enabled && (
        <Canvas
          camera={{ position: [0, 0, 6], fov: 42 }}
          className="leadership-mouse-pass__canvas"
          dpr={[1, 1.25]}
          frameloop="demand"
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ pointerEvents: "none" }}
        >
          <ambientLight intensity={2.1} />
          <directionalLight intensity={2.7} position={[3, 4, 5]} />
          <CanvasInvalidator invalidateRef={invalidateRef} />
          <EdgeMouse progressRef={progressRef} />
        </Canvas>
      )}
    </div>
  );
}
