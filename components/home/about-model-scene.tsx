"use client";

import { Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Image from "next/image";
import { useMemo, useRef, type MutableRefObject } from "react";
import type { Group } from "three";

type AboutModelSceneProps = {
  progressRef: MutableRefObject<number>;
  settleProgressRef: MutableRefObject<number>;
  pathsDockRef: MutableRefObject<number>;
};

function CssMark({ progressRef, settleProgressRef, pathsDockRef }: AboutModelSceneProps) {
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

    const prePathsX = startX * (1 - eased);
    const prePathsY = startY * (1 - eased) - viewport.height * 0.18 * eased * (1 - settle);
    const compass = document.querySelector<HTMLElement>(".home-about__compass");
    const compassBounds = compass?.getBoundingClientRect();
    const dockX = compassBounds ? ((compassBounds.left + compassBounds.width / 2 - size.width / 2) / size.width) * viewport.width : 0;
    const dockY = compassBounds ? -((compassBounds.top + compassBounds.height / 2 - size.height / 2) / size.height) * viewport.height : 0;

    group.position.x = prePathsX * (1 - pathsDockRef.current) + dockX * pathsDockRef.current;
    group.position.y = prePathsY * (1 - pathsDockRef.current) + dockY * pathsDockRef.current;
    const settleScale = size.width < 768 ? 0.55 : 1 + settle * 0.14;
    group.scale.setScalar((0.16 + eased * 0.94) * settleScale);
    group.rotation.y += delta * 0.38;
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

export function AboutModelScene({ progressRef, settleProgressRef, pathsDockRef }: AboutModelSceneProps) {
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
      <CssMark progressRef={progressRef} settleProgressRef={settleProgressRef} pathsDockRef={pathsDockRef} />
    </Canvas>
  );
}
