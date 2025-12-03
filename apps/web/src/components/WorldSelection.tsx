import { useCallback, useEffect, useState } from "react";
import {
  createWorld,
  deleteWorld,
  formatPlayTime,
  getAllWorlds,
  setCurrentWorld,
  startSession,
  type WorldMetadata,
} from "../game/services/SaveService";

interface WorldSelectionProps {
  onWorldSelected: (worldId: string) => void;
  onWorldCreated: (worldId: string) => void;
}

const WorldSelection = ({
  onWorldSelected,
  onWorldCreated,
}: WorldSelectionProps) => {
  const [worlds, setWorlds] = useState<WorldMetadata[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadWorlds = useCallback(() => {
    const allWorlds = getAllWorlds();
    setWorlds(allWorlds);
    setShowCreateForm(allWorlds.length === 0);
  }, []);

  useEffect(() => {
    loadWorlds();
  }, [loadWorlds]);

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) {
      alert("Please enter a world name");
      return;
    }

    setIsCreating(true);
    try {
      const worldId = createWorld(newWorldName.trim());
      onWorldCreated(worldId);
    } catch (error) {
      console.error("Error creating world:", error);
      alert("Failed to create world. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectWorld = (worldId: string) => {
    setCurrentWorld(worldId);
    startSession(worldId);
    onWorldSelected(worldId);
  };

  const handleDeleteWorld = (
    worldId: string,
    worldName: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to delete "${worldName}"? This cannot be undone.`,
      )
    ) {
      deleteWorld(worldId);
      loadWorlds();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreateWorld();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-2 border-white border-opacity-30 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h1 className="text-4xl font-bold text-white mb-2 text-center font-mono">
          Mini World
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm">
          Select a world or create a new one
        </p>

        {showCreateForm ? (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="world-name"
                className="block text-white mb-2 font-mono text-sm"
              >
                World Name
              </label>
              <input
                id="world-name"
                type="text"
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter world name..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded text-white font-mono focus:outline-none focus:border-white focus:border-opacity-50"
                disabled={isCreating}
              />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCreateWorld}
                disabled={isCreating || !newWorldName.trim()}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-mono rounded transition-colors"
              >
                {isCreating ? "Creating..." : "Create World"}
              </button>
              {worlds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-mono rounded transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {worlds.length === 0 ? (
                <p className="text-gray-400 text-center py-8 font-mono">
                  No worlds found. Create your first world!
                </p>
              ) : (
                worlds.map((world) => (
                  <button
                    key={world.worldId}
                    type="button"
                    onClick={() => handleSelectWorld(world.worldId)}
                    className="w-full text-left bg-gray-800 border border-gray-700 rounded p-4 cursor-pointer hover:bg-gray-750 hover:border-white hover:border-opacity-30 transition-all"
                    aria-label={`Select world ${world.worldName}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-mono text-lg mb-1">
                          {world.worldName}
                        </h3>
                        <div className="text-gray-400 text-xs font-mono space-y-1">
                          <p>Playtime: {formatPlayTime(world.totalPlayTime)}</p>
                          <p>
                            Last played:{" "}
                            {new Date(world.lastPlayedAt).toLocaleDateString()}{" "}
                            {new Date(world.lastPlayedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) =>
                            handleDeleteWorld(world.worldId, world.worldName, e)
                          }
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-mono rounded transition-colors"
                          aria-label={`Delete world ${world.worldName}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-mono rounded transition-colors"
            >
              Create New World
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WorldSelection;
