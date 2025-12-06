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
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark bg-gray-900 border-2 border-white border-opacity-30 p-8">
        <DialogHeader className="mb-8">
          <DialogTitle className="text-4xl font-bold text-white text-center font-mono mb-2">
            Mini World
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center text-sm">
            Select a world or create a new one
          </DialogDescription>
        </DialogHeader>

        {showCreateForm ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="world-name"
                className="text-white font-mono text-base"
              >
                World Name
              </Label>
              <Input
                id="world-name"
                type="text"
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter world name..."
                className="bg-gray-800 border-gray-600 text-white font-mono focus:border-white focus:border-opacity-50 h-12 text-base"
                disabled={isCreating}
              />
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                onClick={handleCreateWorld}
                disabled={isCreating || !newWorldName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-mono h-12 text-base"
              >
                {isCreating ? "Creating..." : "Create World"}
              </Button>
              {worlds.length > 0 && (
                <Button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isCreating}
                  variant="secondary"
                  className="bg-gray-700 hover:bg-gray-600 text-white font-mono h-12 text-base"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8 max-h-96 overflow-y-auto">
              {worlds.length === 0 ? (
                <p className="text-gray-400 text-center py-12 font-mono text-base">
                  No worlds found. Create your first world!
                </p>
              ) : (
                worlds.map((world) => (
                  <Card
                    key={world.worldId}
                    className="bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-white hover:border-opacity-30 transition-all cursor-pointer"
                    onClick={() => handleSelectWorld(world.worldId)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 min-w-0">
                          <CardHeader className="p-0 mb-4">
                            <CardTitle className="text-white font-mono text-2xl font-bold mb-1">
                              {world.worldName}
                            </CardTitle>
                          </CardHeader>
                          <CardDescription className="text-gray-400 text-sm font-mono space-y-2">
                            <p className="text-gray-300">
                              Playtime: {formatPlayTime(world.totalPlayTime)}
                            </p>
                            <p className="text-gray-400">
                              Last played:{" "}
                              {new Date(
                                world.lastPlayedAt,
                              ).toLocaleDateString()}{" "}
                              {new Date(
                                world.lastPlayedAt,
                              ).toLocaleTimeString()}
                            </p>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            type="button"
                            onClick={(e) =>
                              handleDeleteWorld(
                                world.worldId,
                                world.worldName,
                                e,
                              )
                            }
                            variant="destructive"
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white text-sm font-mono px-4 py-2"
                            aria-label={`Delete world ${world.worldName}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono h-12 text-base font-semibold"
            >
              Create New World
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorldSelection;
