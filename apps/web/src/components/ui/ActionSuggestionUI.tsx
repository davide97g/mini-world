interface ActionSuggestion {
  action: string;
  key: string;
}

interface ActionSuggestionUIProps {
  suggestion: ActionSuggestion | null;
}

const ActionSuggestionUI = ({ suggestion }: ActionSuggestionUIProps) => {
  if (!suggestion) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <div
        className="bg-black bg-opacity-50 border-2 border-white border-opacity-30 rounded-lg p-3 flex items-center gap-3 min-w-[200px] shadow-lg"
        style={{
          animation: "slideIn 0.3s ease-out",
        }}
      >
        <div className="flex-1">
          <p className="text-white text-base font-mono font-bold">
            {suggestion.action} {suggestion.key}
          </p>
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ActionSuggestionUI;
