// Console page – view saved animations, adjust positioning/scaling
// Replaces drawing-app/app/console.jsx
//
// TODO: Implement with:
// - FileList for browsing device/S3 files
// - ShiftControls for body part position adjustment
// - ScaleControls for body part size scaling
// - SvgCanvas + PoseCanvas for preview
// - Save modified animation pairs
//
// Key features:
// - Cloud/Device toggle
// - Animations/Files toggle
// - Debug anchors toggle

export default function ConsolePage() {
  return (
    <main className="flex flex-1 flex-col items-center p-4">
      <h1 className="text-2xl font-semibold">Animation Console</h1>
      {/* TODO: ConsoleHeaderButtons, ConsoleToolButtons, FileList, SvgCanvas, PoseCanvas */}
    </main>
  );
}
