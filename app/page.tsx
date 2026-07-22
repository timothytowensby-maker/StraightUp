export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-vibe-400 to-vibe-300 bg-clip-text text-transparent mb-4">
            StraightUp
          </h1>
          <p className="text-xl text-vibe-300 mb-8">
            Match with people who share your energy
          </p>
        </div>

        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-4">What is StraightUp?</h2>
          <p className="text-vibe-300 mb-4">
            Drop your current vibe. Find people who resonate with it. No games, no swiping—just real connections based on how you&apos;re actually feeling.
          </p>
          <ul className="space-y-2 text-vibe-300 mb-6">
            <li>✨ Express your mood in 24 hours</li>
            <li>🎯 Resonate with moods that match your energy</li>
            <li>💬 Message matches directly</li>
            <li>🔄 Extend connections beyond 48 hours</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/auth/signup"
            className="btn btn-primary text-center flex-1"
          >
            Get Started
          </a>
          <a
            href="/auth/login"
            className="btn btn-secondary text-center flex-1"
          >
            Sign In
          </a>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="font-bold mb-2">Instant Vibes</h3>
            <p className="text-sm text-vibe-400">Post how you feel right now</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🔗</div>
            <h3 className="font-bold mb-2">Real Connections</h3>
            <p className="text-sm text-vibe-400">Match with people who get it</p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">💭</div>
            <h3 className="font-bold mb-2">No Pressure</h3>
            <p className="text-sm text-vibe-400">24h moods, 48h matches</p>
          </div>
        </div>
      </div>
    </div>
  );
}
