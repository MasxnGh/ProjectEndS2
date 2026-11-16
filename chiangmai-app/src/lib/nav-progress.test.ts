import { describe, expect, it } from "vitest";
import { leavesPage } from "./nav-progress";

const HERE = "https://chiangmai.example/th/explore?category=cafe#map";

describe("leavesPage", () => {
  it("runs for another page of the site, relative or absolute", () => {
    expect(leavesPage({ href: "/th/places/wat-phra-singh" }, HERE)).toBe(true);
    expect(leavesPage({ href: "https://chiangmai.example/en" }, HERE)).toBe(true);
    expect(leavesPage({ href: "../guides" }, HERE)).toBe(true);
  });

  it("does not run for the page already open, whatever its query or fragment", () => {
    expect(leavesPage({ href: "/th/explore" }, HERE)).toBe(false);
    expect(leavesPage({ href: "/th/explore?category=temple" }, HERE)).toBe(false);
    expect(leavesPage({ href: "#list" }, HERE)).toBe(false);
  });

  it("does not run for other sites or non-web links", () => {
    expect(leavesPage({ href: "https://maps.google.com/?q=1" }, HERE)).toBe(false);
    expect(leavesPage({ href: "http://chiangmai.example/th" }, HERE)).toBe(false);
    expect(leavesPage({ href: "mailto:hello@example.com" }, HERE)).toBe(false);
    expect(leavesPage({ href: "tel:+6653000000" }, HERE)).toBe(false);
  });

  it("does not run for new tabs or downloads", () => {
    expect(leavesPage({ href: "/th/guides", target: "_blank" }, HERE)).toBe(false);
    expect(leavesPage({ href: "/th/guides", target: "_self" }, HERE)).toBe(true);
    expect(leavesPage({ href: "/api/account/export", download: true }, HERE)).toBe(false);
  });
});
