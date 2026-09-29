"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { homeModelSources, homeTextureSources } from "@/lib/home-assets";

let hasStarted = false;

export function preloadHomeThreeAssets() {
  if (hasStarted) return;
  hasStarted = true;

  homeModelSources.forEach((source) => useGLTF.preload(source, false, true));
  homeTextureSources.forEach((source) => useTexture.preload(source));

  void Promise.all([
    import("./about-model-scene"),
    import("./leadership-mouse-pass"),
    import("./home-merch-viewer"),
  ]);
}
