"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useRouteTransition } from "./route-transition-provider";

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  transitionLabel?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function TransitionLink({
  href,
  transitionLabel,
  onClick,
  ...props
}: TransitionLinkProps) {
  const { navigate, isTransitioning } = useRouteTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      href.startsWith("#") ||
      isTransitioning
    ) {
      return;
    }

    event.preventDefault();
    navigate(href, transitionLabel);
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
