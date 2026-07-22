export default function NearbySkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="card animate-pulse">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-32 rounded-full bg-vibe-800" />
              <div className="h-4 w-24 rounded-full bg-vibe-900" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-20 rounded-full bg-vibe-800" />
              <div className="h-4 w-16 rounded-full bg-vibe-900" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full bg-vibe-900" />
            <div className="h-4 w-5/6 rounded-full bg-vibe-900" />
            <div className="h-4 w-2/3 rounded-full bg-vibe-900" />
          </div>
          <div className="mt-4 h-10 w-full rounded-xl bg-vibe-800" />
        </div>
      ))}
    </div>
  );
}
