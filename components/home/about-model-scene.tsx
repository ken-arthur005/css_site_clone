"use client";

import { Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Image from "next/image";
import { useMemo, useRef, type MutableRefObject } from "react";
import type { Group } from "three";

type AboutModelSceneProps = {
  progressRef: MutableRefObject<number>;
  settleProgressRef: MutableRefObject<number>;
};

function CssMark({ progressRef, settleProgressRef }: AboutModelSceneProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/CSS%20Logo%203d.glb");
  const model = useMemo(() => scene.clone(), [scene]);
  const { size, viewport } = useThree();

  useFrame((_, delta) => {
    const group = groupRef.current;
    const headerMark = document.querySelector<HTMLElement>(".site-header__logo");

    if (!group || !headerMark) {
      return;
    }

    const bounds = headerMark.getBoundingClientRect();
    const startX = ((bounds.left + bounds.width / 2 - size.width / 2) / size.width) * viewport.width;
    const startY = -((bounds.top + bounds.height / 2 - size.height / 2) / size.height) * viewport.height;
    const handoff = Math.min(progressRef.current * 2.25, 1);
    const eased = handoff * handoff * (3 - 2 * handoff);
    const settle = settleProgressRef.current;

    group.position.x = startX * (1 - eased);
    group.position.y = startY * (1 - eased) - viewport.height * 0.18 * eased * (1 - settle);
    const settleScale = size.width < 768 ? 1 : 1 + settle * 0.14;
    group.scale.setScalar((0.16 + eased * 0.94) * settleScale);
    group.rotation.y += delta * 0.62 * (1 - settle);
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

export function AboutModelScene({ progressRef, settleProgressRef }: AboutModelSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 42 }}
      className="home-about__canvas"
      dpr={[1, 1.5]}
      fallback={<div className="home-about__canvas-fallback"><Image alt="CSS KNUST logo" height={192} src="/css_logo.svg" width={370} /></div>}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={2.2} />
      <directionalLight intensity={2.6} position={[3, 4, 5]} />
      <CssMark progressRef={progressRef} settleProgressRef={settleProgressRef} />
    </Canvas>
  );
}
