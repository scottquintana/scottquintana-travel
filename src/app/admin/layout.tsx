"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, MapPin, Building2 } from "lucide-react";

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] rounded-[var(--radius-md)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] transition-colors"
    >
      {icon}{children}
    </Link>
  );
}

function LogoutButton({ iconOnly }: { iconOnly?: boolean }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-muted)] rounded-[var(--radius-md)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-danger)] transition-colors"
    >
      <LogOut size={14} />
      {!iconOnly && "Sign out"}
    </button>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // When the iOS keyboard appears, the OS scrolls the document to bring the focused
    // input into view. That scroll offset lingers after the keyboard dismisses, leaving
    // a blank gap. Reset it whenever the visual viewport grows (keyboard dismissed).
    const vv = window.visualViewport;
    if (!vv) return;

    let prevHeight = vv.height;
    const handleResize = () => {
      if (vv.height > prevHeight) {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      prevHeight = vv.height;
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-svh overflow-hidden bg-[var(--color-background)]">

      {/* Mobile top bar */}
      <nav className="md:hidden shrink-0 flex items-center gap-1 px-3 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <span className="text-sm font-semibold text-[var(--color-text-primary)] mr-auto px-1">Admin</span>
        <NavLink href="/admin/cities" icon={<Building2 size={14} />}>Cities</NavLink>
        <NavLink href="/admin/places" icon={<MapPin size={14} />}>Places</NavLink>
        <LogoutButton iconOnly />
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex shrink-0 w-48 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-col">
        <div className="px-4 py-5 border-b border-[var(--color-border)]">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Admin</span>
        </div>
        <div className="flex-1 p-3 flex flex-col gap-1">
          <NavLink href="/admin/cities" icon={<Building2 size={14} />}>Cities</NavLink>
          <NavLink href="/admin/places" icon={<MapPin size={14} />}>Places</NavLink>
        </div>
        <div className="p-3 border-t border-[var(--color-border)]">
          <LogoutButton />
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-none">{children}</main>
    </div>
  );
}
