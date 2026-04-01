export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        style={{
          borderColor: 'var(--accent)',
          borderTopColor: 'transparent',
        }}
      />
    </div>
  );
}
