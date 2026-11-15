import { describe, expect, it } from "vitest";
import { BookOpen, Coffee, MapPin } from "lucide-react";
import { categoryIcon } from "@/components/brand/icons";
import { iconNode } from "./icon-node";

describe("iconNode", () => {
  // The share images draw these with satori; a null here means a blank ring.
  const used = { ...categoryIcon, BookOpen, Coffee, MapPin };

  it.each(Object.entries(used))("reads the drawing of %s", (_, icon) => {
    const node = iconNode(icon);
    expect(node).not.toBeNull();
    expect(node!.length).toBeGreaterThan(0);
    for (const [tag, attrs] of node!) {
      expect(typeof tag).toBe("string");
      expect(typeof attrs).toBe("object");
    }
  });

  it("returns the temple's own paths, drawn in icons.tsx", () => {
    const node = iconNode(categoryIcon.temple)!;
    expect(node.map(([, attrs]) => attrs.key)).toEqual(["spire", "tier-1", "tier-2", "tier-3", "base"]);
  });
});
