"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";

type ChatPromptInputProps = {
  name?: string;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
};

export function ChatPromptInput({
  name = "prompt",
  placeholder = "Digite sua pergunta...",
  className,
  value,
  onChange,
  onKeyDown,
}: ChatPromptInputProps) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  React.useEffect(() => {
    resize();
  }, [resize, value]);

  return (
    <Textarea
      ref={ref}
      name={name}
      rows={1}
      placeholder={placeholder}
      onInput={resize}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
    />
  );
}
