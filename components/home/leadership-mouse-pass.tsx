"use client";

import { useGSAP } from "@gsap/react";
import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import type { Group } from "three";
import { SceneErrorBoundary } from "@/components/three/scene-error-boundary";
import { WebGLContextGuard } from "@/components/three/webgl-context-guard";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { useHomeAssetFallback } from "@/lib/loading/asset-fallback";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const EDGE_FADE_FRACTION = 0.08;

function EdgeMouse({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/gaming_mouse_-_free_low_poly.glb");
  const model = useMemo(() => scene.clone(), [scene]);
  const { size, viewport } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const progress = progressRef.current;
    group.visible = progress > 0 && progress < 1;
    if (!group.visible) return;

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

  // The first render must never expose the model at its default centre position.
  return <primitive object={model} ref={groupRef} visible={false} />;
}

function CanvasInvalidator({ invalidateRef }: { invalidateRef: MutableRefObject<(() => void) | null> }) {
  const { invalidate } = useThree();

  useEffect(() => {
    invalidateRef.current = invalidate;
    invalidate();
    return () => {
      // A fast re-entry can mount a new canvas before the old root finishes cleanup.
      if (invalidateRef.current === invalidate) invalidateRef.current = null;
    };
  }, [invalidate, invalidateRef]);

  return null;
}

export function LeadershipMousePass() {
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const invalidateRef = useRef<(() => void) | null>(null);
  const inHandoffRef = useRef(false);
  const [inHandoff, setInHandoff] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [failed, setFailed] = useState(false);
  const onFailure = useCallback(() => {
    invalidateRef.current = null;
    setFailed(true);
  }, []);
  const modelFallback = useHomeAssetFallback("/gaming_mouse_-_free_low_poly.glb");
  const enabled = motionAllowed && !failed && !modelFallback;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const update = () => setMotionAllowed(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = document.querySelector(".home-executives");
    if (!enabled || !section) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      useGLTF.preload("/gaming_mouse_-_free_low_poly.glb");
      observer.disconnect();
    }, { rootMargin: "100% 0px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, [enabled]);

  useGSAP(() => {
    const root = rootRef.current;
    const section = document.querySelector<HTMLElement>(".home-executives");
    if (!root || !section || !enabled) return;

    const syncHandoff = (self: ScrollTrigger) => {
      const progress = self.progress;
      const active = self.isActive === true && progress > 0 && progress < 1;
      progressRef.current = progress;

      const fade = active ? Math.min(progress / EDGE_FADE_FRACTION, (1 - progress) / EDGE_FADE_FRACTION, 1) : 0;
      const opacity = fade * fade * (3 - 2 * fade);
      // Hide synchronously on exit, before React has committed the canvas unmount.
      root.dataset.active = String(active);
      root.style.setProperty("--mouse-opacity", String(opacity));

      if (inHandoffRef.current !== active) {
        inHandoffRef.current = active;
        setInHandoff(active);
      }
      if (active) invalidateRef.current?.();
    };

    const trigger = ScrollTrigger.create({
      id: "leadership-mouse-handoff",
      trigger: section,
      start: () => `top bottom-=${Math.min(window.innerHeight * 0.26, 250)}`,
      end: "top top",
      onUpdate: syncHandoff,
      onToggle: syncHandoff,
      onRefresh: syncHandoff,
    });
    // Restored scroll positions and direct entry need the same initial gate.
    syncHandoff(trigger);
    const refreshHandoff = () => {
      // Measure after the About pins have settled, including when this trigger
      // is recreated by a runtime motion-preference change.
      trigger.refresh();
      trigger.update();
      syncHandoff(trigger);
    };
    const refreshFrame = window.requestAnimationFrame(refreshHandoff);
    ScrollTrigger.addEventListener("refresh", refreshHandoff);

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      ScrollTrigger.removeEventListener("refresh", refreshHandoff);
      trigger.kill();
      root.dataset.active = "false";
      root.style.removeProperty("--mouse-opacity");
      invalidateRef.current = null;
      if (inHandoffRef.current) {
        inHandoffRef.current = false;
        setInHandoff(false);
      }
    };
  }, { dependencies: [enabled], scope: rootRef, revertOnUpdate: true });

  return (
    <div aria-hidden="true" className="leadership-mouse-pass" data-active={enabled && inHandoff} ref={rootRef}>
      <SceneErrorBoundary onFailure={onFailure}>
        <Suspense fallback={null}>
          {enabled && inHandoff && (
            <Canvas
              camera={{ position: [0, 0, 6], fov: 42 }}
              className="leadership-mouse-pass__canvas"
              dpr={[1, 1.25]}
              frameloop={isMenuActive ? "never" : "demand"}
              gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
              style={{ pointerEvents: "none" }}
            >
              <ambientLight intensity={2.1} />
              <directionalLight intensity={2.7} position={[3, 4, 5]} />
              <CanvasInvalidator invalidateRef={invalidateRef} />
              <WebGLContextGuard onFailure={onFailure} />
              <EdgeMouse progressRef={progressRef} />
            </Canvas>
          )}
        </Suspense>
      </SceneErrorBoundary>
    </div>
  );
}
