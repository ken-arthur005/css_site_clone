"use client";

import { Bvh, Center, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ErrorInfo, type ReactNode } from "react";
import { Group, Mesh, MeshStandardMaterial, SRGBColorSpace } from "three";
import type { MerchVariant } from "@/types/merch";
import type { ContentAsset } from "@/types/content";
import { useNavigationState } from "@/components/providers/navigation-state-provider";
import { WebGLContextGuard } from "@/components/three/webgl-context-guard";
import { ShirtProximityControls, type ShirtCanvasFrame, type ShirtSurfaceSize } from "./shirt-proximity-controls";

type MerchShirtViewerProps = {
  model: ContentAsset;
  variant: MerchVariant;
  textureSources: readonly string[];
  onReady: () => void;
  onFailure: () => void;
  motion?: "system" | "full";
  interaction?: "standard" | "shirt-only";
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

function ShirtModel({ modelSource, textureSource, ownGeometry = false }: {
  modelSource: string;
  textureSource: string;
  ownGeometry?: boolean;
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
      // The proximity viewer owns its BVH geometry; no shared loader cache or
      // other viewer can have its indices/raycast tree modified or disposed.
      if (ownGeometry) mesh.geometry = mesh.geometry.clone();

      const sourceMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const material = sourceMaterial.clone() as MeshStandardMaterial;
      material.color.set("#ffffff");
      material.metalness = 0;
      material.roughness = 0.82;
      material.needsUpdate = true;
      mesh.material = material;
    });

    return clone;
  }, [ownGeometry, scene]);

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
        if (ownGeometry) mesh.geometry.dispose();
      });
    };
  }, [model, ownGeometry]);

  return <primitive object={model} dispose={null} />;
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
  focused,
  surface,
  onFrame,
  label,
}: Pick<MerchShirtViewerProps, "onReady"> & {
  modelSource: string;
  textureSource: string;
  active: boolean;
  autoRotate: boolean;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  focused: boolean;
  surface: ShirtSurfaceSize;
  onFrame: (frame: ShirtCanvasFrame) => void;
  label: string;
}) {
  const { size } = useThree();
  const rigRef = useRef<Group>(null);
  const modelScale = (focused ? surface.width : size.width) < 768 ? 0.8 : 0.65;

  return (
    <>
      <hemisphereLight args={["#ffffff", "#c6c9d2", 1.5]} />
      <directionalLight intensity={2.4} position={[4, 5, 5]} />
      <directionalLight color="#b8cdf8" intensity={0.75} position={[-4, 1, 2]} />
      <Suspense fallback={null}>
        {focused ? <>
          <Bvh firstHitOnly indirect>
            <group ref={rigRef}>
              <Center cacheKey={modelScale}>
                <group position={[0, -0.1, 0]} scale={modelScale}>
                  <ShirtModel modelSource={modelSource} textureSource={textureSource} ownGeometry />
                </group>
              </Center>
            </group>
          </Bvh>
          <ShirtProximityControls modelRef={rigRef} surface={surface} active={active} autoRotate={autoRotate} onFrame={onFrame} onInteractionStart={onInteractionStart} onInteractionEnd={onInteractionEnd} label={label} />
        </> : <Center>
          <group position={[0, -0.1, 0]} scale={modelScale}>
            <ShirtModel modelSource={modelSource} textureSource={textureSource} />
          </group>
        </Center>}
        <CanvasWarmup key={textureSource} active={active} onReady={onReady} />
      </Suspense>
      {!focused && <OrbitControls
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
      />}
    </>
  );
}

function subscribeMotionPreference(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function MerchShirtViewer({ model, variant, onReady, onFailure, motion = "system", interaction = "standard" }: MerchShirtViewerProps) {
  const { isMenuActive } = useNavigationState();
  const rootRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
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
  const [surface, setSurface] = useState<ShirtSurfaceSize>({ width: 0, height: 0 });
  const [frame, setFrame] = useState<ShirtCanvasFrame | null>(null);
  const focused = interaction === "shirt-only";
  const onFrame = useCallback((next: ShirtCanvasFrame) => {
    setFrame((previous) => previous?.width === next.width && previous.height === next.height && previous.referenceWidth === next.referenceWidth && previous.referenceHeight === next.referenceHeight ? previous : next);
  }, []);

  useEffect(() => {
    const parent = rootRef.current?.parentElement;
    if (!focused || !parent) return;
    const measure = () => {
      const { width, height } = parent.getBoundingClientRect();
      setSurface((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    measure();
    return () => observer.disconnect();
  }, [focused]);

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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, []);

  const pauseAutoRotation = useCallback(() => {
    if (!mountedRef.current) return;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    setIsInteracting(true);
  }, []);

  const resumeAutoRotation = useCallback(() => {
    if (!mountedRef.current) return;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false);
      resumeTimerRef.current = null;
    }, 2400);
  }, []);

  const isActive = isVisible && isPageVisible && !isMenuActive;
  const autoRotate = isActive && !reducedMotion && !isInteracting;

  return (
    <div className="home-merch-viewer" ref={rootRef} data-active={isActive} data-interaction={interaction}
      style={focused && frame ? { "--shirt-canvas-width": `${frame.width}px`, "--shirt-canvas-height": `${frame.height}px` } as CSSProperties : undefined}>
      {hasBeenNear && (!focused || (surface.width > 0 && surface.height > 0)) && (
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
              focused={focused}
              surface={surface}
              onFrame={onFrame}
              label={`${variant.baseColor.name} CSS shirt with ${variant.printColor.name} print. Drag on or near the shirt to rotate. On touch screens, drag horizontally; swipe vertically to scroll. Use left and right arrow keys to rotate.`}
            />
          </Canvas>
        </ViewerErrorBoundary>
      )}
    </div>
  );
}
