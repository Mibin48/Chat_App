import { MessageCircleIcon } from "lucide-react";

const NoChatHistoryPlaceholder = ({ name }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 animate-fade-in-up">
      <div className="size-16 bg-gradient-to-br from-cyan-500/20 to-cyan-400/10 rounded-full flex items-center justify-center mb-6 animate-bounce-slow shadow-lg shadow-cyan-500/10 border border-cyan-500/20">
        <MessageCircleIcon className="size-8 text-cyan-400" />
      </div>
      <h3 className="text-xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent mb-3">
        Start your conversation with {name}
      </h3>
      <div className="flex flex-col space-y-4 max-w-md mb-8">
        <p className="text-slate-400 text-sm leading-relaxed">
          This is the beginning of your conversation. Send a message to start chatting!
        </p>
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mx-auto"></div>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {["👋 Say Hello", "🤝 How are you?", "📅 Meet up soon?"].map((text, i) => (
          <button
            key={i}
            className="px-4 py-2 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full hover:bg-cyan-500/20 hover:scale-105 transition-all duration-300"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NoChatHistoryPlaceholder;