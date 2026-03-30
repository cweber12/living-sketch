// Sketch page layout
// Wraps sketch route with any sketch-specific layout needs

export default function SketchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
