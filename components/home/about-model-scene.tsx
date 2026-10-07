"use client";

import { Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import type { Group } from "three";
import { WebGLContextGuard } from "@/components/three/webgl-context-guard";
import { useNavigationState } from "@/components/providers/navigation-state-provider";

type AboutModelSceneProps = {
  active: boolean;
  progressRef: MutableRefObject<number>;
  settleProgressRef: MutableRefObject<number>;
  onFailure: () => void;
};

function CssMark({ progressRef, settleProgressRef }: Pick<AboutModelSceneProps, "progressRef" | "settleProgressRef">) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF("/CSS%20Logo%203d.glb");
  const model = useMemo(() => scene.clone(), [scene]);
  const { size } = useThree();

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const handoff = Math.min(progressRef.current, 1);
    const eased = handoff * handoff * (3 - 2 * handoff);
    const settle = settleProgressRef.current;

    const settleScale = size.width < 768 ? 0.55 : 1 + settle * 0.14;
    group.scale.setScalar((0.38 + eased * 0.72) * settleScale);
    group.rotation.y += Math.min(delta, 0.05) * 0.65;
    group.rotation.x = Math.sin(performance.now() * 0.00055) * 0.12;
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={model} dispose={null} />
      </Center>
    </group>
  );
}

export function AboutModelScene({ active, progressRef, settleProgressRef, onFailure }: AboutModelSceneProps) {
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
      <CssMark progressRef={progressRef} settleProgressRef={settleProgressRef} />
    </Canvas>
  );
}
