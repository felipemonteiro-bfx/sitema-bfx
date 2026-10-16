"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";

/**
 * Rótulo de campo do Vantage: frase normal, `text-sm font-medium` em tom secundário.
 * É o próprio `Label` da ui (que já nasce assim); o nome fica porque as telas de CRM o importam.
 */
export const RotuloCampo = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>((props, ref) => (
  <Label
    ref={ref}
    {...props}
  />
));
RotuloCampo.displayName = "RotuloCampo";
