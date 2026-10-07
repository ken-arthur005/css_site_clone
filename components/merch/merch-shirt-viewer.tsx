"use client";

import { Center, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from "react";
import { Mesh, MeshStandardMaterial, SRGBColorSpace } from "three";
import type { MerchVariant } from "@/types/merch";
import type { ContentAsset } from "@/types/content";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { WebGLContextGuard } from "@/components/three/webgl-context-guard";

type MerchShirtViewerProps = {
  model: ContentAsset;
  variant: MerchVariant;
  textureSources: readonly string[];
  onReady: () => void;
  onFailure: () => void;
  motion?: "system" | "full";
};

type ViewerErrorBoundaryProps = {
  children: ReactNode;
  onFailure: () => void;
};

type ViewerErrorBoundaryState = { failed: boolean };

class ViewerErrorBoundary extends Component<ViewerErrorBoundaryProps, ViewerErrorBoundaryState> {
  state: ViewerErrorBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("CSS shirt viewer could not load.", error, info);
    }
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ShirtModel({ modelSource, textureSource }: {
  modelSource: string;
  textureSource: string;
}) {
  const { scene } = useGLTF(modelSource, false, true);
  const { invalidate } = useThree();
  const sourceTexture = useTexture(textureSource);
  const texture = useMemo(() => {
    const clone = sourceTexture.clone();
    clone.colorSpace = SRGBColorSpace;
    clone.flipY = false;
    clone.anisotropy = 4;
    clone.needsUpdate = true;
    return clone;
  }, [sourceTexture]);
  const model = useMemo(() => {
    const clone = scene.clone(true);

    // useGLTF caches the source scene, so each mounted viewer owns its material.
    clone.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const mesh = node;

      const sourceMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const material = sourceMaterial.clone() as MeshStandardMaterial;
      material.color.set("#ffffff");
      material.metalness = 0;
      material.roughness = 0.82;
      material.needsUpdate = true;
      mesh.material = material;
    });

    return clone;
  }, [scene]);

  useEffect(() => {
    model.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const mesh = node;

      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial;
      material.map = texture;
      material.needsUpdate = true;
    });

    invalidate();
    return () => texture.dispose();
  }, [invalidate, model, texture]);

  useEffect(() => {
    return () => {
      model.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        const mesh = node;

        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        material.dispose();
      });
    };
  }, [model]);

  return <primitive object={model} />;
}

function CanvasWarmup({ active, onReady }: Pick<MerchShirtViewerProps, "onReady"> & { active: boolean }) {
  const { camera, gl, invalidate, scene } = useThree();
  const renderedFrames = useRef(0);
  const hasCompleted = useRef(false);
  const hasCompiled = useRef(false);

  useEffect(() => {
    if (!active || hasCompiled.current) return;
    hasCompiled.current = true;
    gl.compile(scene, camera);
    invalidate();
  }, [active, camera, gl, invalidate, scene]);

  useFrame(() => {
    if (!active || hasCompleted.current) return;

    renderedFrames.current += 1;
    if (renderedFrames.current < 2) {
      invalidate();
      return;
    }

    hasCompleted.current = true;
    onReady();
  });

  return null;
}

function ViewerScene({
  modelSource,
  textureSource,
  active,
  autoRotate,
  onInteractionStart,
  onInteractionEnd,
  onReady,
}: Pick<MerchShirtViewerProps, "onReady"> & {
  modelSource: string;
  textureSource: string;
  active: boolean;
  autoRotate: boolean;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}) {
  const { size } = useThree();
  const modelScale = size.width < 768 ? 0.8 : 0.65;

  return (
    <>
      <hemisphereLight args={["#ffffff", "#c6c9d2", 1.5]} />
      <directionalLight intensity={2.4} position={[4, 5, 5]} />
      <directionalLight color="#b8cdf8" intensity={0.75} position={[-4, 1, 2]} />
      <Suspense fallback={null}>
        <Center>
          <group position={[0, -0.1, 0]} scale={modelScale}>
            <ShirtModel modelSource={modelSource} textureSource={textureSource} />
          </group>
        </Center>
        <CanvasWarmup key={textureSource} active={active} onReady={onReady} />
      </Suspense>
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.32}
        dampingFactor={0.075}
        enableDamping
        enabled={active}
        enablePan={false}
        maxPolarAngle={Math.PI * 0.63}
        minPolarAngle={Math.PI * 0.37}
        enableZoom={false}
        onEnd={onInteractionEnd}
        onStart={onInteractionStart}
        rotateSpeed={0.7}
      />
    </>
  );
}

function subscribeMotionPreference(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function MerchShirtViewer({ model, variant, onReady, onFailure, motion = "system" }: MerchShirtViewerProps) {
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const [isNear, setIsNear] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenNear, setHasBeenNear] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const reducedMotion = useSyncExternalStore(
    (listener) => motion === "full" ? () => {} : subscribeMotionPreference(listener),
    () => motion !== "full" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNear(entry.isIntersecting);
        if (entry.isIntersecting) setHasBeenNear(true);
      },
      { rootMargin: "110% 0px" },
    );
    observer.observe(root);
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
    );
    visibilityObserver.observe(root);
    return () => {
      observer.disconnect();
      visibilityObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsPageVisible(!document.hidden);

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isNear) return;

    useGLTF.preload(model.src, false, true);
    useTexture.preload(variant.texture.src);
  }, [isNear, model.src, variant.texture.src]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  const pauseAutoRotation = () => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    setIsInteracting(true);
  };

  const resumeAutoRotation = () => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false);
      resumeTimerRef.current = null;
    }, 2400);
  };

  const isActive = isVisible && isPageVisible && !isMenuActive;
  const autoRotate = isActive && !reducedMotion && !isInteracting;

  return (
    <div className="home-merch-viewer" ref={rootRef} data-active={isActive}>
      {hasBeenNear && (
        <ViewerErrorBoundary onFailure={onFailure}>
          <Canvas
            camera={{ fov: 36, position: [0, 0, 7.2] }}
            dpr={[1, 1.5]}
            frameloop={!isActive ? "never" : autoRotate ? "always" : "demand"}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          >
            <WebGLContextGuard onFailure={onFailure} />
            <ViewerScene
              active={isActive}
              autoRotate={autoRotate}
              modelSource={model.src}
              onInteractionEnd={resumeAutoRotation}
              onInteractionStart={pauseAutoRotation}
              onReady={onReady}
              textureSource={variant.texture.src}
            />
          </Canvas>
        </ViewerErrorBoundary>
      )}
    </div>
  );
}
