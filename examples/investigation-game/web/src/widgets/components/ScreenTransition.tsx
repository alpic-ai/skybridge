import { useEffect, useState } from "react";

type ScreenTransitionProps = {
  children: React.ReactNode;
  screenKey: string;
};

export function ScreenTransition({ children, screenKey }: ScreenTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [screenKey]);

  return <div className={`transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}>{children}</div>;
}
