"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type MenuItem = {
  href: string;
  label: string;
  external?: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ menu }: { menu: MenuItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {menu.map((item) => {
        const active = !item.external && isActive(pathname, item.href);
        const className = active
          ? "justify-start bg-muted text-foreground hover:bg-muted"
          : "justify-start";

        return item.external ? (
          <Button key={item.href} variant="ghost" className="justify-start" asChild>
            <a href={item.href} target="_blank" rel="noreferrer">
              {item.label}
            </a>
          </Button>
        ) : (
          <Button
            key={item.href}
            variant="ghost"
            className={className}
            asChild
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}
