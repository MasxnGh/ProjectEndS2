import type { LucideIcon } from "lucide-react";

/** One element of a lucide icon: a tag name ("path", "circle", ...) and its attributes. */
export type IconNode = [tag: string, attrs: Record<string, string | number>][];

/**
 * A lucide icon's own drawing, for places that can't render its React
 * component. The share images are drawn by satori, and lucide's component
 * reads React context and is a client module, so neither works there. Every
 * lucide icon (and createLucideIcon, which icons.tsx uses for the temple) is a
 * forwardRef whose render hands `iconNode` straight to the inner component;
 * calling that render with no props gives the drawing without running a hook.
 *
 * Returns null if a lucide update changes that shape; icon-node.test.ts checks
 * every icon the share images use.
 */
export function iconNode(icon: LucideIcon): IconNode | null {
  const render = (icon as unknown as { render?: (props: object, ref: null) => unknown }).render;
  if (typeof render !== "function") return null;
  try {
    const element = render({}, null) as { props?: { iconNode?: unknown } } | null;
    const node = element?.props?.iconNode;
    return Array.isArray(node) ? (node as IconNode) : null;
  } catch {
    return null;
  }
}
