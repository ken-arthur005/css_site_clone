"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRouteTransition } from "@/components/transitions/route-transition-provider";

type NavigationState = {
  isMenuActive: boolean;
  setMenuActive: Dispatch<SetStateAction<boolean>>;
};

const NavigationContext = createContext<NavigationState | null>(null);

export function useNavigationState() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigationState must be used within NavigationStateProvider");
  return context;
}

export function NavigationStateProvider({ children }: { children: ReactNode }) {
  // Active includes the opening and closing animations, not just the settled dialog.
  const [isMenuActive, setMenuActive] = useState(false);

  return (
    <NavigationContext.Provider value={{ isMenuActive, setMenuActive }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function NavigationBackground({ children }: { children: ReactNode }) {
  const { isMenuActive } = useNavigationState();
  const { isTransitioning } = useRouteTransition();
  const active = isMenuActive || isTransitioning;

  return <div className="site-background" inert={active} data-navigation-active={active}>{children}</div>;
}
