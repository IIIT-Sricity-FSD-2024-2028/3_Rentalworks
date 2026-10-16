// Prefixing class names keeps styles separate from the tenant and admin portals.
export function ownerClasses(value) {
  if (typeof value === "function") return (state) => ownerClasses(value(state));
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => `owner-${name}`)
    .join(" ");
}
