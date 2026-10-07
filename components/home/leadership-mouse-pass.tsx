"use client";

import { useGSAP } from "@gsap/react";
import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Box3, Vector3, type Group } from "three";
import { SceneErrorBoundary } from "@/components/three/scene-error-boundary";
import { WebGLContextGuard } from "@/components/three/webgl-context-guard";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { useHomeAssetFallback } from "@/lib/loading/asset-fallback";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type MousePose = { angle: number; reaction: number };

function EdgeMouse({ poseRef, onReady }: { poseRef: MutableRefObject<MousePose>; onReady: () => void }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/gaming_mouse_-_free_low_poly.glb");
  const { invalidate } = useThree();
  const { model, scale } = useMemo(() => {
    const model = scene.clone();
    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    model.position.sub(bounds.getCenter(new Vector3()));
    return { model, scale: 3 / Math.max(size.x, size.y, size.z) };
  }, [scene]);

  useEffect(() => { onReady(); invalidate(); }, [onReady, invalidate]);
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const pose = poseRef.current;
    group.rotation.set(0.12 + pose.reaction, -0.58 + pose.reaction * 0.6, -pose.angle);
    // A few demand frames settle the tilt, then the parked model stops rendering.
    pose.reaction *= Math.exp(-Math.min(delta || 1 / 60, 0.05) * 12);
    if (Math.abs(pose.reaction) > 0.001) invalidate();
    else pose.reaction = 0;
  });

  return <group ref={groupRef} scale={scale}><primitive object={model} dispose={null} /></group>;
}

function CanvasInvalidator({ invalidateRef }: { invalidateRef: MutableRefObject<(() => void) | null> }) {
  const { invalidate } = useThree();
  useEffect(() => {
    invalidateRef.current = invalidate;
    invalidate();
    return () => { if (invalidateRef.current === invalidate) invalidateRef.current = null; };
  }, [invalidate, invalidateRef]);
  return null;
}

function MouseFallback() {
  return <svg className="leadership-mouse-pass__fallback" viewBox="0 0 100 100" fill="none">
    <path d="M32 18C20 21 16 33 17 48l3 25c2 13 11 19 25 17l17-3c13-2 20-11 18-24l-4-25C74 23 65 14 51 15Z" fill="#171e28" stroke="#84aaf4" strokeWidth="2" />
    <path d="m45 17 4 31m-31 4 59-9" stroke="#84aaf4" strokeWidth="2" />
    <rect x="40" y="26" width="8" height="15" rx="4" transform="rotate(-8 40 26)" fill="#84aaf4" />
  </svg>;
}

export function LeadershipMousePass() {
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<MousePose>({ angle: 0, reaction: 0 });
  const invalidateRef = useRef<(() => void) | null>(null);
  const blockedRef = useRef(false);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const modelFallback = useHomeAssetFallback("/gaming_mouse_-_free_low_poly.glb");
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => { invalidateRef.current = null; setFailed(true); }, []);

  useEffect(() => {
    blockedRef.current = isMenuActive;
    if (!isMenuActive) invalidateRef.current?.();
  }, [isMenuActive]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let intersects = false;
    const sync = () => setNear(intersects && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      sync();
    }, { rootMargin: "100% 0px" });
    observer.observe(root);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, []);

  useGSAP(() => {
    const root = rootRef.current;
    const mouse = mouseRef.current;
    if (!root || !mouse) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const xTo = gsap.quickSetter(mouse, "x", "px");
    const yTo = gsap.quickSetter(mouse, "y", "px");
    let frame = 0;
    let previousY = window.scrollY;
    let mouseSize = mouse.offsetWidth;
    const sync = () => {
      frame = 0;
      const bounds = root.getBoundingClientRect();
      const scrollDelta = window.scrollY - previousY;
      previousY = window.scrollY;
      const start = window.innerHeight - bounds.height - mouseSize / 2;
      const end = mouseSize / 2;
      const progress = reduceMotion.matches ? 0 : gsap.utils.clamp(0, 1, (start - bounds.top) / Math.max(1, start - end));
      const inset = mouseSize / 2 + 4;
      const x = gsap.utils.interpolate(inset, Math.max(inset, bounds.width - inset), progress);
      const y = bounds.height * (1 - x / bounds.width);
      poseRef.current.angle = Math.atan2(bounds.height, bounds.width);
      mouse.style.setProperty("--mouse-angle", `${-poseRef.current.angle}rad`);
      root.dataset.progress = progress.toFixed(3);
      xTo(x - mouseSize / 2);
      yTo(y - mouseSize / 2);
      if (bounds.bottom > -mouseSize && bounds.top < window.innerHeight + mouseSize && !blockedRef.current && !document.hidden) {
        poseRef.current.reaction = reduceMotion.matches ? 0 : gsap.utils.clamp(-0.14, 0.14, scrollDelta / 500);
        invalidateRef.current?.();
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    const measure = () => { mouseSize = mouse.offsetWidth; schedule(); };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(mouse);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("pageshow", schedule);
    reduceMotion.addEventListener("change", schedule);
    ScrollTrigger.addEventListener("refresh", schedule);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("pageshow", schedule);
      reduceMotion.removeEventListener("change", schedule);
      ScrollTrigger.removeEventListener("refresh", schedule);
      gsap.set(mouse, { clearProps: "transform" });
    };
  }, { scope: rootRef });

  return <div aria-hidden="true" className="leadership-mouse-pass" ref={rootRef}>
    <div className="leadership-mouse-pass__mouse" data-ready={ready && !failed && !modelFallback} ref={mouseRef}>
      <MouseFallback />
      <SceneErrorBoundary onFailure={onFailure}>
        <Suspense fallback={null}>
          {near && !failed && !modelFallback && <Canvas
            camera={{ position: [0, 0, 6], fov: 42 }}
            className="leadership-mouse-pass__canvas" dpr={[1, 1.25]}
            frameloop={isMenuActive ? "never" : "demand"}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          >
            <ambientLight intensity={2.1} />
            <directionalLight intensity={2.7} position={[3, 4, 5]} />
            <CanvasInvalidator invalidateRef={invalidateRef} />
            <WebGLContextGuard onFailure={onFailure} />
            <EdgeMouse poseRef={poseRef} onReady={onReady} />
          </Canvas>}
        </Suspense>
      </SceneErrorBoundary>
    </div>
  </div>;
}
