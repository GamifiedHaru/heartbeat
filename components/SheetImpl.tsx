"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";

/** Bottom sheet (Vaul) styled like an iOS sheet. */
export function SheetImpl({
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
