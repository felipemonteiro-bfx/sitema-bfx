"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

type Props = {
  children: React.ReactNode;
};

export function HistoricoFiltroSheet({ children }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full md:hidden touch-manipulation min-h-11"
          aria-label="Abrir filtros"
          leftIcon={<Filter className="h-4 w-4" />}
        >
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="mt-6 pb-8">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
