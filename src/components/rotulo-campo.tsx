"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Rótulo de campo do Vantage: frase normal, `text-sm font-medium` em tom secundário.
 * O `Label` da ui nasce em caixa-alta com tracking aberto; aqui as duas coisas são anuladas
 * (o tailwind-merge do `cn` troca `normal-case`/`tracking-normal` pelas classes da base).
 */
export const RotuloCampo = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn("text-sm font-medium normal-case leading-normal tracking-normal text-muted-foreground", className)}
    {...props}
  />
));
RotuloCampo.displayName = "RotuloCampo";
