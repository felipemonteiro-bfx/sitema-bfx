"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {
  editId: number;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function EditVendaSheetWrapper({ editId, title, description, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (editId && isMobile) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [editId, isMobile]);

  const handleClose = () => {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    const q = params.toString();
    router.push(q ? `/historico?${q}` : "/historico");
  };

  if (!editId) return null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent
          side="bottom"
          className="h-[95vh] overflow-y-auto rounded-t-2xl p-0"
        >
          <SheetHeader className="p-6 pb-0 flex flex-row items-center justify-between space-y-0">
            <div>
              <SheetTitle>{title}</SheetTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full touch-manipulation min-h-[44px] min-w-[44px]"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>
          <div className="p-6 pt-4">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card id="editar-venda" className="scroll-mt-24">
      <CardHeader className="space-y-1">
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
