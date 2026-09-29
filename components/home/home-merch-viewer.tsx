"use client";

import { Center, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Mesh, MeshStandardMaterial, SRGBColorSpace } from "three";
import type { MerchVariant } from "@/types/merch";
import type { ContentAsset } from "@/types/content";

type HomeMerchViewerProps = {
  model: ContentAsset;
  variant: MerchVariant;
  textureSources: readonly string[];
  onReady: () => void;
  onFailure: () => void;
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

function ShirtModel({ modelSource, textureSource, onReady }: Pick<HomeMerchViewerProps, "onReady"> & {
  modelSource: string;
  textureSource: string;
}) {
  const { scene } = useGLTF(modelSource, false, true);
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

    onReady();
    return () => texture.dispose();
  }, [model, onReady, texture]);

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

function ViewerScene({
  modelSource,
  textureSource,
  autoRotate,
  onInteractionStart,
  onInteractionEnd,
  onReady,
}: Pick<HomeMerchViewerProps, "onReady"> & {
  modelSource: string;
  textureSource: string;
  autoRotate: boolean;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}) {
  const { size } = useThree();
  const modelScale = size.width < 768 ? 0.45 : 0.65;

  return (
    <>
      <hemisphereLight args={["#ffffff", "#c6c9d2", 1.5]} />
      <directionalLight intensity={2.4} position={[4, 5, 5]} />
      <directionalLight color="#b8cdf8" intensity={0.75} position={[-4, 1, 2]} />
      <Suspense fallback={null}>
        <Center>
          <group position={[0, -0.1, 0]} scale={modelScale}>
            <ShirtModel modelSource={modelSource} onReady={onReady} textureSource={textureSource} />
          </group>
        </Center>
      </Suspense>
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={0.32}
        dampingFactor={0.075}
        enableDamping
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

export function HomeMerchViewer({ model, variant, textureSources, onReady, onFailure }: HomeMerchViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const [isNear, setIsNear] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsNear(entry.isIntersecting),
      { rootMargin: "110% 0px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setIsPageVisible(!document.hidden);

    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isNear) return;

    useGLTF.preload(model.src, false, true);
    textureSources.forEach((source) => useTexture.preload(source));
  }, [isNear, model.src, textureSources, variant.texture.src]);

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

  const isActive = isNear && isPageVisible;
  const autoRotate = isActive && !reducedMotion && !isInteracting;

  return (
    <div className="home-merch-viewer" ref={rootRef}>
      {isNear && (
        <ViewerErrorBoundary onFailure={onFailure}>
          <Canvas
            camera={{ fov: 36, position: [0, 0, 7.2] }}
            dpr={[1, 1.5]}
            frameloop={isActive ? "always" : "never"}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          >
            <ViewerScene
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
