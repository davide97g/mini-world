import { useCallback, useEffect, useRef, useState } from "react";
import { MENU_ENTRIES } from "../../game/config/GameConstants";
import { gameEventBus } from "../../game/utils/GameEventBus";

type MenuState = "main" | "options" | "volume";

interface MenuUIProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuUI = ({ isOpen, onClose }: MenuUIProps) => {
  // Use ref to track current menu state to avoid closure issues
  const isOpenRef = useRef(isOpen);
  const [menuState, setMenuState] = useState<MenuState>("main");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Initialize volume from localStorage or default to 0.5
  const getInitialVolume = (): number => {
    const savedVolume = localStorage.getItem("musicVolume");
    if (savedVolume !== null) {
      const parsed = parseFloat(savedVolume);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
    return 0.5;
  };

  const [volume, setVolume] = useState(getInitialVolume);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Listen to menu updates for volume (syncs with game's current volume when menu opens)
  useEffect(() => {
    const handleMenuUpdate = (payload?: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "volume" in payload &&
        typeof payload.volume === "number"
      ) {
        setVolume(payload.volume);
      }
    };

    const unsubscribe = gameEventBus.on("menu:update", handleMenuUpdate);
    return () => {
      unsubscribe();
    };
  }, []);

  // Listen to menu select events
  useEffect(() => {
    const handleMenuSelect = (payload?: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "entryId" in payload &&
        typeof payload.entryId === "string"
      ) {
        const entryId = payload.entryId;

        if (entryId === "codex") {
          // TODO: Implement codex in the future
          gameEventBus.emit("dialog:show", {
            text: "Codex feature coming soon!",
          });
          onClose();
        } else if (entryId === "save") {
          // Trigger save
          gameEventBus.emit("game:save");
          gameEventBus.emit("dialog:show", {
            text: "Game saved successfully!",
          });
          onClose();
        } else if (entryId === "exit") {
          // Show exit confirmation
          setShowExitConfirm(true);
        } else if (entryId === "options") {
          setMenuState("options");
          setSelectedIndex(0);
        }
      }
    };

    const unsubscribe = gameEventBus.on("menu:select", handleMenuSelect);
    return () => {
      unsubscribe();
    };
  }, [onClose]);

  const handleMenuSelect = useCallback((entryId: string) => {
    if (entryId === "options") {
      setMenuState("options");
      setSelectedIndex(0);
      return;
    }

    if (entryId === "Volume") {
      setMenuState("volume");
      return;
    }

    // Emit menu select event
    gameEventBus.emit("menu:select", { entryId });
  }, []);

  const handleExitConfirm = useCallback(
    (shouldSave: boolean) => {
      setShowExitConfirm(false);
      onClose();

      if (shouldSave) {
        // Trigger save before exit
        gameEventBus.emit("game:save");
      }

      // Navigate to world selection
      gameEventBus.emit("game:exit-to-world-selection");
    },
    [onClose],
  );

  // Keep ref in sync with isOpen state
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const getMenuEntries = useCallback(() => {
    if (menuState === "options") {
      return [
        { id: "Volume", label: "Volume" },
        { id: "exit", label: "Exit" },
        { id: "Back", label: "Back" },
      ];
    }
    return MENU_ENTRIES;
  }, [menuState]);

  useEffect(() => {
    // Reset menu state when closed
    if (!isOpen) {
      setMenuState("main");
      setSelectedIndex(0);
      setShowExitConfirm(false);
      // Don't add event listener when menu is closed - let all events propagate normally
      return;
    }

    // Only add event listener when menu is open
    const handleKeyDown = (e: KeyboardEvent) => {
      // Use ref to check current state (avoids closure issues)
      // This ensures events propagate normally when menu is closed
      if (!isOpenRef.current) {
        return; // Don't block events if menu closed
      }

      // Prevent all keyboard events from reaching Phaser when menu is open
      // This stops player movement and other game actions
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Handle exit confirmation dialog
      if (showExitConfirm) {
        if (e.key === "Enter") {
          handleExitConfirm(true);
        } else if (e.key === "Escape") {
          setShowExitConfirm(false);
        }
        return;
      }

      if (e.key === "Escape") {
        if (menuState === "volume") {
          setMenuState("options");
        } else if (menuState === "options") {
          setMenuState("main");
          setSelectedIndex(0);
        } else {
          onClose();
        }
        return;
      }

      if (menuState === "volume") {
        if (e.key === "ArrowLeft") {
          setVolume((prev) => Math.max(0, prev - 0.1));
          gameEventBus.emit("menu:volume-change", {
            volume: Math.max(0, volume - 0.1),
          });
        } else if (e.key === "ArrowRight") {
          setVolume((prev) => Math.min(1, prev + 0.1));
          gameEventBus.emit("menu:volume-change", {
            volume: Math.min(1, volume + 0.1),
          });
        }
        return;
      }

      if (e.key === "ArrowUp") {
        const maxIndex = menuState === "options" ? 2 : MENU_ENTRIES.length - 1;
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
      } else if (e.key === "ArrowDown") {
        const maxIndex = menuState === "options" ? 2 : MENU_ENTRIES.length - 1;
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
      } else if (e.key === "Enter") {
        if (menuState === "main") {
          const selectedEntry = MENU_ENTRIES[selectedIndex];
          handleMenuSelect(selectedEntry.id);
        } else if (menuState === "options") {
          const entries = getMenuEntries();
          const selectedEntry = entries[selectedIndex];
          const entryId =
            typeof selectedEntry === "string"
              ? selectedEntry
              : selectedEntry.id;
          if (entryId === "Back") {
            setMenuState("main");
            setSelectedIndex(0);
          } else {
            handleMenuSelect(entryId);
          }
        } else if (menuState === "volume") {
          // Go back to options from volume
          setMenuState("options");
          setSelectedIndex(0);
        }
      }
    };

    // Use capture phase to intercept events before they reach Phaser
    // Only add listener when menu is open - this ensures events work normally when closed
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      // Remove listener when menu closes or component unmounts
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    isOpen,
    menuState,
    selectedIndex,
    onClose,
    handleMenuSelect,
    showExitConfirm,
    handleExitConfirm,
    volume,
    getMenuEntries,
  ]);

  useEffect(() => {
    // When volume changes in the menu, save it immediately
    if (menuState === "volume") {
      gameEventBus.emit("menu:volume-change", { volume });
      // Also save to localStorage directly to ensure persistence
      localStorage.setItem("musicVolume", volume.toString());
    }
  }, [volume, menuState]);

  if (!isOpen) {
    return null;
  }

  // Exit confirmation dialog
  if (showExitConfirm) {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 bg-black bg-opacity-50 z-40 border-0 p-0 cursor-pointer"
          onClick={() => setShowExitConfirm(false)}
          aria-label="Cancel exit"
        />
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-800 border-2 border-gray-500 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-white text-lg font-mono mb-4">Exit Game</h3>
            <p className="text-white text-sm font-mono mb-6">
              Do you want to save your progress before exiting?
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleExitConfirm(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-mono py-2 px-4 rounded"
              >
                Save & Exit
              </button>
              <button
                type="button"
                onClick={() => handleExitConfirm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-mono py-2 px-4 rounded"
              >
                Exit Without Saving
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-mono py-2 px-4 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const entries = getMenuEntries();

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/10 z-40 border-0 p-0 cursor-pointer"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* Menu Panel - Centered */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="w-64 bg-gray-300 bg-opacity-85 border-2 border-gray-500 rounded-xl shadow-lg">
          {menuState === "volume" ? (
            <div className="p-4">
              <h3 className="text-white text-base font-mono mb-4">Volume</h3>
              <div className="mb-4">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    gameEventBus.emit("menu:volume-change", {
                      volume: newVolume,
                    });
                  }}
                  className="w-full"
                />
                <p className="text-white text-sm font-mono mt-2">
                  {Math.round(volume * 100)}%
                </p>
              </div>
              <p className="text-white text-xs font-mono">
                Press ESC to go back
              </p>
            </div>
          ) : (
            <div className="p-3">
              {menuState === "main" ? (
                // Display in single column
                <div className="space-y-1">
                  {entries.map((entry, index) => (
                    <button
                      type="button"
                      key={`menu-${menuState}-${entry.id}`}
                      className={`p-2 w-full cursor-pointer text-left rounded ${
                        index === selectedIndex
                          ? "bg-gray-600 text-white"
                          : "text-white hover:bg-gray-500"
                      }`}
                      onClick={() => {
                        setSelectedIndex(index);
                        handleMenuSelect(entry.id);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {index === selectedIndex
                        ? `► ${entry.label}`
                        : entry.label}
                    </button>
                  ))}
                </div>
              ) : (
                // Options menu - single column
                <div className="space-y-1">
                  {entries.map((entry, index) => {
                    const entryId =
                      typeof entry === "string" ? entry : entry.id;
                    const entryLabel =
                      typeof entry === "string" ? entry : entry.label;
                    return (
                      <button
                        type="button"
                        key={`menu-${menuState}-${entryId}`}
                        className={`p-2 w-full cursor-pointer text-left rounded ${
                          index === selectedIndex
                            ? "bg-gray-600 text-white"
                            : "text-white hover:bg-gray-500"
                        }`}
                        onClick={() => {
                          setSelectedIndex(index);
                          if (entryId === "Back") {
                            setMenuState("main");
                            setSelectedIndex(0);
                          } else {
                            handleMenuSelect(entryId);
                          }
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {index === selectedIndex
                          ? `► ${entryLabel}`
                          : entryLabel}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MenuUI;
