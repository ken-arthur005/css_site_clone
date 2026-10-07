"use client";

import { Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Group } from "three";
import { WebGLContextGuard } from "@/components/three/webgl-context-guard";
import { useNavigationState } from "@/components/providers/navigation-state-provider";

type AboutModelSceneProps = {
  active: boolean;
  progressRef: MutableRefObject<number>;
  settleProgressRef: MutableRefObject<number>;
  pathsDockRef: MutableRefObject<number>;
  onFailure: () => void;
};

function CssMark({ active, progressRef, settleProgressRef, pathsDockRef }: Omit<AboutModelSceneProps, "onFailure">) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/CSS%20Logo%203d.glb");
  const model = useMemo(() => scene.clone(), [scene]);
  const { gl, size, viewport } = useThree();
  const dockingRef = useRef({ dockX: 0, dockY: 0 });

  useEffect(() => {
    // The burst starts at viewport centre. Only the later career scene has a
    // docking target; there is no longer a hand-off from the header logo.
    const compass = gl.domElement.closest(".home-about")?.querySelector<HTMLElement>(".home-about__compass");

    let frame = 0;
    let disposed = false;
    const measure = () => {
      frame = 0;
      if (disposed || !size.width || !size.height) return;
      const compassBounds = compass?.getBoundingClientRect();
      const toX = (x: number) => ((x - size.width / 2) / size.width) * viewport.width;
      const toY = (y: number) => -((y - size.height / 2) / size.height) * viewport.height;
      dockingRef.current = {
        dockX: compassBounds ? toX(compassBounds.left + compassBounds.width / 2) : 0,
        dockY: compassBounds ? toY(compassBounds.top + compassBounds.height / 2) : 0,
      };
    };
    const schedule = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    if (compass) observer.observe(compass);
    window.addEventListener("resize", schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    ScrollTrigger.addEventListener("refresh", schedule);
    void document.fonts.ready.then(schedule);
    measure();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.fonts.removeEventListener("loadingdone", schedule);
      ScrollTrigger.removeEventListener("refresh", schedule);
    };
  }, [active, gl, size.width, size.height, viewport.width, viewport.height]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const { dockX, dockY } = dockingRef.current;
    const handoff = Math.min(progressRef.current, 1);
    const eased = handoff * handoff * (3 - 2 * handoff);
    const settle = settleProgressRef.current;

    group.position.x = dockX * pathsDockRef.current;
    group.position.y = dockY * pathsDockRef.current;
    const settleScale = size.width < 768 ? 0.55 : 1 + settle * 0.14;
    group.scale.setScalar((0.38 + eased * 0.72) * settleScale);
    group.rotation.y += Math.min(delta, 0.05) * 0.65;
    group.rotation.x = Math.sin(performance.now() * 0.00055) * 0.12;
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={model} />
      </Center>
    </group>
  );
}

export function AboutModelScene({ active, progressRef, settleProgressRef, pathsDockRef, onFailure }: AboutModelSceneProps) {
  const { isMenuActive } = useNavigationState();

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 42 }}
      className="home-about__canvas"
      dpr={[1, 1.5]}
      frameloop={isMenuActive || !active ? "never" : "always"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={2.2} />
      <directionalLight intensity={2.6} position={[3, 4, 5]} />
      <WebGLContextGuard onFailure={onFailure} />
      <CssMark active={active} progressRef={progressRef} settleProgressRef={settleProgressRef} pathsDockRef={pathsDockRef} />
    </Canvas>
  );
}
