"use client";

import { Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { SceneErrorBoundary } from "@/components/three/scene-error-boundary";
import { WebGLContextGuard } from "@/components/three/webgl-context-guard";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { useHomeAssetFallback } from "@/lib/loading/asset-fallback";

function RotatingMark({ active }: { active: boolean }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/CSS%20Logo%203d.glb");
  const model = useMemo(() => scene.clone(), [scene]);

  useFrame((_, delta) => {
    if (!active || !groupRef.current) return;

    groupRef.current.rotation.y += delta * 0.45;
    groupRef.current.rotation.x = Math.sin(performance.now() * 0.0005) * 0.08;
  });

  return (
    <group ref={groupRef} rotation={[-0.1, -0.45, 0]}>
      <Center>
        <primitive object={model} />
      </Center>
    </group>
  );
}

function RenderScheduler({ active }: { active: boolean }) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    let lastRender = 0;
    const render = (time: number) => {
      if (time - lastRender >= 33) {
        lastRender = time;
        invalidate();
      }
      frame = requestAnimationFrame(render);
    };

    invalidate();
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [active, invalidate]);

  return null;
}

export function FooterLogoScene() {
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [failed, setFailed] = useState(false);
  const modelFallback = useHomeAssetFallback("/CSS%20Logo%203d.glb");
  const onFailure = useCallback(() => setFailed(true), []);
  const fallback = <Image alt="CSS KNUST logo" fill sizes="(max-width: 47.99rem) 15rem, 28rem" src="/css_logo.svg" />;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(query.matches);
    const preloadObserver = new IntersectionObserver(([entry]) => setNearViewport(entry.isIntersecting), { rootMargin: "360px 0px" });
    const visibilityObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.08 });

    updateMotion();
    query.addEventListener("change", updateMotion);
    if (rootRef.current) {
      preloadObserver.observe(rootRef.current);
      visibilityObserver.observe(rootRef.current);
    }

    return () => {
      query.removeEventListener("change", updateMotion);
      preloadObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  return (
    <div className="site-footer__logo-scene" ref={rootRef}>
      <SceneErrorBoundary fallback={fallback} onFailure={onFailure}>
        <Suspense fallback={fallback}>
          {failed || modelFallback || reducedMotion || !nearViewport ? (
            fallback
          ) : (
            <Canvas
              camera={{ position: [0, 0, 5.75], fov: 40 }}
              dpr={[1, 1.25]}
              frameloop={isMenuActive ? "never" : "demand"}
              gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            >
              <ambientLight intensity={2.4} />
              <directionalLight intensity={2.8} position={[3, 4, 5]} />
              <WebGLContextGuard onFailure={onFailure} />
              <RotatingMark active={visible && !isMenuActive} />
              <RenderScheduler active={visible && !isMenuActive} />
            </Canvas>
          )}
        </Suspense>
      </SceneErrorBoundary>
    </div>
  );
}
