"use client";

import Image from "next/image";
import { useState } from "react";

export function MerchImage({ src, alt, sizes = "(max-width: 767px) 90vw, 45vw", priority = false, className = "" }: {
  src: string; alt: string; sizes?: string; priority?: boolean; className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (failedSource === src) return <span className="merch-image-error" role="img" aria-label={alt}>{alt}<small>Image unavailable</small></span>;
  return <Image alt={alt} src={src} fill sizes={sizes} priority={priority} className={className} onError={() => setFailedSource(src)} />;
}
