"use client";

// Shared iOS-style primitives. Screens compose these; only tokens, no hex.
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Drawer } from "vaul";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function ScreenHeader({
  title,
  eyebrow,
  right,
}: {
  title: string;
  eyebrow?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between px-4 pt-3 pb-2">
      <div>
        {eyebrow && (
          <p className="text-footnote font-semibold uppercase tracking-wide text-label-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-large-title font-bold tracking-tight">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between px-4 pt-6 pb-2">
      <h2 className="text-title-3 font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
  onClick,
  label,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** Accessible name when the card is a button. */
  label?: string;
}) {
  const base = cx("rounded-card bg-card p-4", className);
  if (!onClick) return <section className={base}>{children}</section>;
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      className={cx(base, "block w-full text-left")}
    >
      {children}
    </motion.button>
  );
}

/** Health-style card header: coloured icon + category, timestamp on the right. */
export function CardHeader({
  icon,
  title,
  meta,
  chevron,
}: {
  icon?: ReactNode;
  title: string;
  meta?: string;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-subhead font-semibold text-accent">
      {icon}
      <span>{title}</span>
      <span className="ml-auto flex items-center gap-1 text-subhead font-normal text-label-2">
        {meta}
        {chevron && <ChevronRight size={16} className="text-label-3" />}
      </span>
    </div>
  );
}

/** Big number + unit, Health style. */
export function Stat({
  value,
  unit,
  size = "lg",
}: {
  value: string | number;
  unit?: string;
  size?: "lg" | "md";
}) {
  return (
    <p className="tnum font-rounded">
      <span
        className={cx(
          "font-semibold tracking-tight",
          size === "lg" ? "text-[34px] leading-[41px]" : "text-title-2",
        )}
      >
        {value}
      </span>
      {unit && (
        <span className="ml-1 text-subhead font-semibold text-label-2">
          {unit}
        </span>
      )}
    </p>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative mx-4 grid rounded-[9px] bg-card-2 p-0.5"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o)}
            className={cx(
              "relative h-8 text-footnote font-semibold",
              active ? "text-label" : "text-label-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-[7px] bg-card-3 shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Inset grouped list, iOS Settings style. */
export function List({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header?: string;
  footer?: ReactNode;
}) {
  return (
    <div className="px-4 pt-6">
      {header && (
        <p className="px-4 pb-1.5 text-footnote uppercase text-label-2">
          {header}
        </p>
      )}
      <div className="overflow-hidden rounded-card bg-card [&>*+*]:border-t [&>*+*]:border-separator">
        {children}
      </div>
      {footer && (
        <p className="px-4 pt-1.5 text-footnote text-label-2">{footer}</p>
      )}
    </div>
  );
}

export function Row({
  children,
  onClick,
  right,
  destructive,
}: {
  children: ReactNode;
  onClick?: () => void;
  right?: ReactNode;
  destructive?: boolean;
}) {
  const content = (
    <>
      <span className={cx("flex-1", destructive && "text-accent")}>
        {children}
      </span>
      {right}
      {onClick && !right && <ChevronRight size={18} className="text-label-3" />}
    </>
  );
  const cls =
    "flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-body";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cx(cls, "active:bg-card-2")}
    >
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-success" : "bg-card-3",
      )}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 size-[27px] rounded-full bg-label shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 700, damping: 40 }}
      />
    </button>
  );
}

/** Bottom sheet (Vaul) styled like an iOS sheet. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[14px] bg-card outline-none"
        >
          <div className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-card-3" />
          <Drawer.Title className="px-4 pt-3 pb-2 text-center text-headline font-semibold">
            {title}
          </Drawer.Title>
          <div className="pb-safe overflow-y-auto overscroll-contain px-4 pb-6">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "plain";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      className={cx(
        "flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] text-headline font-semibold disabled:opacity-40",
        variant === "primary" && "bg-accent text-label",
        variant === "secondary" && "bg-card-2 text-accent",
        variant === "plain" && "text-accent",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
      <div className="text-accent">{icon}</div>
      <p className="text-headline font-semibold">{title}</p>
      <p className="text-subhead text-label-2">{body}</p>
    </div>
  );
}
