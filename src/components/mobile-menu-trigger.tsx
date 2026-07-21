"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Actually, let's just make the trigger part a client component
export function MobileMenuTrigger({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Abrir menu" className="cursor-pointer touch-manipulation min-h-[44px] min-w-[44px]">
          <span className="text-lg leading-none">≡</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col overflow-hidden border-[var(--sidebar-border)] bg-[var(--sidebar)] p-4 text-[var(--sidebar-foreground)]">
        <SheetHeader className="shrink-0">
          <SheetTitle className="text-[var(--sidebar-foreground)]">Menu</SheetTitle>
        </SheetHeader>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
