"use client";

import Image from "next/image";
import { useState } from "react";
import type { AboutPhoto as Photo } from "@/types/about";

export function AboutPhoto({ photo, className = "", priority = false, sizes = "(max-width: 767px) 92vw, 50vw" }: { photo: Photo; className?: string; priority?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`about-photo ${className}`} data-media-failed={failed || undefined}>
      {failed ? <div className="about-photo__fallback"><span aria-hidden="true">CSS /</span><p>{photo.alt}</p></div> : (
        <Image alt={photo.alt} fill onError={() => setFailed(true)} priority={priority} sizes={sizes} src={photo.src} style={{ objectPosition: photo.position }} />
      )}
    </div>
  );
}
