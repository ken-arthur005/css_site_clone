"use client";

import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { Component, Suspense, useEffect, type ReactNode } from "react";
import { TextureLoader } from "three";
import type { LoadingResource } from "@/types/loading";

type Settled = (src: string, status: "ready" | "failed") => void;

class ResourceBoundary extends Component<{ src: string; onSettled: Settled; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onSettled(this.props.src, "failed"); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Model({ resource, onSettled }: { resource: LoadingResource; onSettled: Settled }) {
  useGLTF(resource.src, resource.draco, true);
  useEffect(() => { onSettled(resource.src, "ready"); }, [resource.src, onSettled]);
  return null;
}

function Texture({ src, onSettled }: { src: string; onSettled: Settled }) {
  // useTexture consumes this same TextureLoader cache inside the actual Canvas.
  useLoader(TextureLoader, src);
  useEffect(() => { onSettled(src, "ready"); }, [src, onSettled]);
  return null;
}

export function HomeResourceWarmup({ resources, onSettled }: { resources: readonly LoadingResource[]; onSettled: Settled }) {
  return resources.map((resource) => (
    <ResourceBoundary key={resource.src} src={resource.src} onSettled={onSettled}>
      <Suspense fallback={null}>
        {resource.kind === "model" ? <Model resource={resource} onSettled={onSettled} /> : <Texture src={resource.src} onSettled={onSettled} />}
      </Suspense>
    </ResourceBoundary>
  ));
}
