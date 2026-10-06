"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export function WebGLContextGuard({ onFailure }: { onFailure: () => void }) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    // Context loss is an event, not a render error; an error boundary cannot catch it.
    canvas.addEventListener("webglcontextlost", onFailure);
    if (gl.getContext().isContextLost()) onFailure();

    return () => canvas.removeEventListener("webglcontextlost", onFailure);
  }, [gl, onFailure]);

  return null;
}
