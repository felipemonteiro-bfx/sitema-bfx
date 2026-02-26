"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function ToasterResponsive() {
  const [position, setPosition] = useState<"bottom-right" | "top-center">("bottom-right");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setPosition(mq.matches ? "top-center" : "bottom-right");
    const handler = () => setPosition(mq.matches ? "top-center" : "bottom-right");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Toaster
      richColors
      position={position}
      expand
      visibleToasts={3}
      closeButton
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          title: "group-[.toast]:text-foreground group-[.toast]:font-semibold",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          closeButton: "group-[.toast]:bg-muted/50 group-[.toast]:text-muted-foreground group-[.toast]:border-border group-[.toast]:hover:bg-muted",
          success: "group-[.toaster]:border-success/30 group-[.toaster]:bg-success/5 dark:group-[.toaster]:bg-success/10",
          error: "group-[.toaster]:border-error/30 group-[.toaster]:bg-error/5 dark:group-[.toaster]:bg-error/10",
          warning: "group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/5 dark:group-[.toaster]:bg-warning/10",
          info: "group-[.toaster]:border-info/30 group-[.toaster]:bg-info/5 dark:group-[.toaster]:bg-info/10",
        },
      }}
    />
  );
}
