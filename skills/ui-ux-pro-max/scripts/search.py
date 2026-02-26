#!/usr/bin/env python3
import argparse
import os
from datetime import datetime


def classify(query: str):
    q = query.lower()
    product = "dashboard" if "dashboard" in q else "saas"
    if "ecommerce" in q or "e-commerce" in q or "loja" in q:
        product = "e-commerce"
    if "finance" in q or "fintech" in q or "dre" in q:
        industry = "finance"
    elif "health" in q or "saude" in q:
        industry = "health"
    else:
        industry = "business"
    style = "bento grid" if "dashboard" in q else "minimal"
    return product, industry, style


def design_system(query: str):
    product, industry, style = classify(query)
    palette = {
        "primary": "#1F2937",
        "accent": "#2563EB",
        "success": "#059669",
        "warning": "#D97706",
        "danger": "#DC2626",
        "bg": "#F7F8FB",
        "card": "#FFFFFF",
        "muted": "#64748B",
        "border": "#E2E8F0",
    }
    if industry == "finance":
        palette["accent"] = "#1D4ED8"
        palette["success"] = "#047857"
    typography = {
        "heading": "Space Grotesk",
        "body": "Manrope",
    }
    effects = [
        "soft shadow (0 10px 30px rgba(15, 23, 42, 0.08))",
        "subtle gradient backgrounds",
        "glass cards with 80-90% opacity",
    ]
    ux = [
        "Minimum 44x44px touch targets",
        "Visible focus rings on all interactive elements",
        "Use loading states for async actions",
        "Avoid layout shift on hover",
    ]
    anti = [
        "Low-contrast text",
        "Emoji icons in UI",
        "Inconsistent card padding",
        "Hover animations that shift layout",
    ]
    return {
        "product": product,
        "industry": industry,
        "style": style,
        "palette": palette,
        "typography": typography,
        "effects": effects,
        "ux": ux,
        "anti": anti,
    }


def format_ascii(ds):
    lines = []
    lines.append("DESIGN SYSTEM")
    lines.append(f"Product: {ds['product']} | Industry: {ds['industry']} | Style: {ds['style']}")
    lines.append("")
    lines.append("Colors:")
    for k, v in ds["palette"].items():
        lines.append(f"  - {k}: {v}")
    lines.append("Typography:")
    lines.append(f"  - Heading: {ds['typography']['heading']}")
    lines.append(f"  - Body: {ds['typography']['body']}")
    lines.append("Effects:")
    for e in ds["effects"]:
        lines.append(f"  - {e}")
    lines.append("UX Rules:")
    for u in ds["ux"]:
        lines.append(f"  - {u}")
    lines.append("Anti-patterns:")
    for a in ds["anti"]:
        lines.append(f"  - {a}")
    return "\n".join(lines)


def format_markdown(ds):
    lines = []
    lines.append("# Design System")
    lines.append("")
    lines.append(f"- **Product**: {ds['product']}")
    lines.append(f"- **Industry**: {ds['industry']}")
    lines.append(f"- **Style**: {ds['style']}")
    lines.append("")
    lines.append("## Colors")
    for k, v in ds["palette"].items():
        lines.append(f"- `{k}`: `{v}`")
    lines.append("")
    lines.append("## Typography")
    lines.append(f"- Heading: {ds['typography']['heading']}")
    lines.append(f"- Body: {ds['typography']['body']}")
    lines.append("")
    lines.append("## Effects")
    for e in ds["effects"]:
        lines.append(f"- {e}")
    lines.append("")
    lines.append("## UX Rules")
    for u in ds["ux"]:
        lines.append(f"- {u}")
    lines.append("")
    lines.append("## Anti-patterns")
    for a in ds["anti"]:
        lines.append(f"- {a}")
    return "\n".join(lines)


def domain_search(domain: str, query: str, n: int):
    base = {
        "style": ["minimal enterprise", "bento grid", "soft glass", "bold typography", "compact density"],
        "color": ["slate + cobalt", "neutral + emerald", "ink + teal", "warm gray + blue", "navy + sand"],
        "typography": ["Space Grotesk + Manrope", "Sora + Inter", "DM Sans + Source Sans"],
        "ux": ["focus states", "touch target 44px", "loading skeletons", "no layout shift", "clear empty states"],
        "landing": ["hero + KPIs", "social proof", "feature grid", "CTA band", "FAQ"],
        "chart": ["area trend", "bar comparison", "stacked bars", "line + target", "small multiples"],
        "product": ["admin dashboard", "finance ops", "sales performance", "inventory", "analytics"],
        "web": ["aria labels", "semantic headings", "keyboard nav", "reduced motion", "contrast"],
    }
    items = base.get(domain, ["No data for domain"]).copy()
    return items[:n]


def stack_guidance(stack: str):
    if stack == "html-tailwind":
        return [
            "Use container max-w-7xl and responsive padding",
            "Prefer utility classes for spacing and alignment",
            "Use focus-visible rings",
        ]
    if stack == "react" or stack == "nextjs":
        return [
            "Keep layout components server-side when possible",
            "Use suspense for charts",
            "Avoid re-renders with memoized data",
        ]
    return ["No specific guidance for this stack."]


def persist_files(md: str, page: str | None):
    base = os.path.join(os.getcwd(), "design-system")
    os.makedirs(os.path.join(base, "pages"), exist_ok=True)
    master_path = os.path.join(base, "MASTER.md")
    with open(master_path, "w", encoding="utf-8") as f:
        f.write(md)
        f.write("\n\nGenerated: " + datetime.now().isoformat(timespec="seconds"))
    if page:
        page_path = os.path.join(base, "pages", f"{page}.md")
        with open(page_path, "w", encoding="utf-8") as f:
            f.write(md)
            f.write("\n\nNote: Page-specific overrides can be added here.\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--design-system", action="store_true")
    parser.add_argument("--persist", action="store_true")
    parser.add_argument("-p", "--project", default="")
    parser.add_argument("--page", default="")
    parser.add_argument("--domain", default="")
    parser.add_argument("--stack", default="")
    parser.add_argument("-n", type=int, default=5)
    parser.add_argument("-f", "--format", default="ascii")
    args = parser.parse_args()

    if args.design_system:
        ds = design_system(args.query)
        out = format_markdown(ds) if args.format == "markdown" else format_ascii(ds)
        print(out)
        if args.persist:
            md = format_markdown(ds)
            persist_files(md, args.page or None)
        return

    if args.domain:
        for item in domain_search(args.domain, args.query, args.n):
            print(f"- {item}")
        return

    if args.stack:
        for item in stack_guidance(args.stack):
            print(f"- {item}")
        return

    print("Nothing to do. Use --design-system or --domain or --stack.")


if __name__ == "__main__":
    main()
