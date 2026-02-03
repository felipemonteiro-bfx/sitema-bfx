"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea"> & { autoResize?: boolean }
>(({ className, autoResize, onInput, ...props }, ref) => {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

  React.useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement)

  React.useEffect(() => {
    if (!autoResize || !innerRef.current) return
    const el = innerRef.current
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [autoResize, props.value, props.defaultValue])

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    if (autoResize) {
      const el = e.currentTarget
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
    onInput?.(e)
  }

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-input bg-background/70 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={innerRef}
      onInput={handleInput}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
