"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export function NavigationOverlay() {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pathname change = navigation complete
  useEffect(() => {
    setLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Skip middle-click, cmd/ctrl/shift+click — those open new tabs/windows
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      // Skip links that explicitly open in a new tab
      if (anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      // Only trigger for internal page navigations
      if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("#") || href.startsWith("tel")) return;
      setLoading(true);
      // Safety timeout — clear after 10s so the overlay never gets stuck
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setLoading(false), 10000);
    };
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!loading) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "var(--color-background)", opacity: 0.82 }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: "var(--color-border)",
            borderTopColor: "var(--color-accent)",
          }}
        />
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Loading…
        </p>
      </div>
    </div>
  );
}
