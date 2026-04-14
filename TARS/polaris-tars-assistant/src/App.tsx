import TARSAgentUI from './components/TARSAgentUI';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-900 relative overflow-hidden">
      {/* Background elements to show off glassmorphism */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      
      <div className="p-12 max-w-4xl">
        <h1 className="text-4xl font-sans font-bold text-white mb-4 tracking-tight">
          Polaris Dashboard
        </h1>
        <p className="text-zinc-400 font-sans max-w-md leading-relaxed">
          Welcome to your mission control. TARS is active and monitoring your productivity streaks.
        </p>
        
        <div className="mt-12 grid grid-cols-2 gap-6">
          <div className="p-6 bg-zinc-800/50 border border-white/5 rounded-xl">
            <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-widest mb-2">Focus Session</h3>
            <p className="text-2xl font-sans font-medium text-white">02:45:00</p>
          </div>
          <div className="p-6 bg-zinc-800/50 border border-white/5 rounded-xl">
            <h3 className="text-xs font-mono text-cyan-500 uppercase tracking-widest mb-2">Daily Goal</h3>
            <p className="text-2xl font-sans font-medium text-white">68%</p>
          </div>
        </div>
      </div>

      <TARSAgentUI />
    </div>
  );
}
