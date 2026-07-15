import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "accent" | "vetted" | "unvetted" | "category";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
  accent: "bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent-light)]",
  vetted: "bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success-light)]",
  unvetted: "bg-[var(--color-warning-light)] text-[var(--color-warning)] border border-[var(--color-warning-light)]",
  category: "bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] border border-[var(--color-border)] capitalize",
};

export function Badge({ children, variant = "default", className, onClick }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-[var(--radius-full)]",
        variantStyles[variant],
        className
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );
}
