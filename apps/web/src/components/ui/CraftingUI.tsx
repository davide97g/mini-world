/**
 * Crafting UI Component
 */

import { useCallback, useEffect, useState } from "react";
import { ASSET_PATHS } from "../../game/config/AssetPaths";
import type { CraftingStation } from "../../game/config/CraftingRecipes";
import {
  getCraftingStations,
  getRecipesByStation,
} from "../../game/config/CraftingRecipes";
import type { InventoryItem } from "../../game/config/GameConstants";
import { gameEventBus } from "../../game/utils/GameEventBus";

interface CraftingUIProps {
  isOpen: boolean;
  inventory: Map<string, InventoryItem>;
  currentEnergy: number;
  onClose: () => void;
}

const STATION_NAMES: Record<CraftingStation, string> = {
  workbench: "Workbench",
  cooking_fire: "Cooking Fire",
  bone_table: "Bone Table",
  stone_anvil: "Stone Anvil",
};

const getStationImagePath = (station: CraftingStation): string => {
  const path = ASSET_PATHS.items[station as keyof typeof ASSET_PATHS.items];
  return path || "";
};

const CraftingUI = ({
  isOpen,
  inventory,
  currentEnergy,
  onClose,
}: CraftingUIProps) => {
  const [selectedStation, setSelectedStation] =
    useState<CraftingStation | null>(null);
  const [flashingItemId, setFlashingItemId] = useState<string | null>(null);
  const [canCraftCache, setCanCraftCache] = useState<Map<string, boolean>>(
    new Map(),
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedStation(null);
      return;
    }

    // Select first station by default
    const stations = getCraftingStations();
    if (stations.length > 0 && !selectedStation) {
      setSelectedStation(stations[0]);
    }
  }, [isOpen, selectedStation]);

  const getItemQuantity = useCallback(
    (itemId: string): number => {
      return inventory.get(itemId)?.quantity || 0;
    },
    [inventory],
  );

  useEffect(() => {
    const handleCraftingSuccess = (payload?: unknown) => {
      if (payload && typeof payload === "object" && "itemId" in payload) {
        const { itemId } = payload as { itemId: string };
        // Flash the crafted item
        setFlashingItemId(itemId);
        setTimeout(() => {
          setFlashingItemId(null);
        }, 500);

        // TODO: Play craft sound effect here
        // Example: audioSystem?.playCraftSound();
      }
    };

    const unsubscribe = gameEventBus.on(
      "crafting:success",
      handleCraftingSuccess,
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Update can-craft cache when inventory or energy changes
  useEffect(() => {
    if (!selectedStation) return;

    const recipes = getRecipesByStation(selectedStation);
    const newCache = new Map<string, boolean>();
    recipes.forEach((recipe) => {
      // Check energy
      let canCraft = currentEnergy >= recipe.energyCost;

      // Check ingredients
      if (canCraft) {
        for (const ingredient of recipe.ingredients) {
          const quantity = getItemQuantity(ingredient.itemId);
          if (quantity < ingredient.quantity) {
            canCraft = false;
            break;
          }
        }
      }

      newCache.set(recipe.id, canCraft);
    });
    setCanCraftCache(newCache);
  }, [currentEnergy, selectedStation, getItemQuantity]);

  if (!isOpen) {
    return null;
  }

  const stations = getCraftingStations();
  const recipes = selectedStation ? getRecipesByStation(selectedStation) : [];

  const handleCraft = (recipeId: string) => {
    const canCraftRecipe = canCraftCache.get(recipeId) ?? false;
    if (canCraftRecipe) {
      // Emit craft event - GameScene will handle it
      gameEventBus.emit("crafting:craft", { recipeId });
    }
  };

  const getItemName = (itemId: string): string => {
    return inventory.get(itemId)?.name || itemId;
  };

  const getItemColor = (itemId: string): string => {
    const item = inventory.get(itemId);
    if (item) {
      // Convert hex number to hex string
      return `#${item.color.toString(16).padStart(6, "0")}`;
    }
    return "#808080";
  };

  const getItemImagePath = (itemId: string): string => {
    const path = ASSET_PATHS.items[itemId as keyof typeof ASSET_PATHS.items];
    return path || "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 border-2 border-white border-opacity-30 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Crafting</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl font-bold px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
            aria-label="Close crafting menu"
          >
            ×
          </button>
        </div>

        {/* Station Selector */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Crafting Stations
          </h3>
          <div className="flex flex-wrap gap-3">
            {stations.map((station) => (
              <button
                key={station}
                type="button"
                onClick={() => setSelectedStation(station)}
                className={`px-4 py-2 rounded transition-colors ${
                  selectedStation === station
                    ? "bg-white text-gray-900"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
                aria-label={`Select ${STATION_NAMES[station]} station`}
              >
                <div
                  className="w-12 h-12 mx-auto mb-2 rounded border-2 border-white border-opacity-50 bg-black bg-opacity-50 flex items-center justify-center"
                  role="img"
                  aria-label={`${STATION_NAMES[station]} station`}
                >
                  <img
                    src={getStationImagePath(station)}
                    alt={STATION_NAMES[station]}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <span className="text-sm font-medium">
                  {STATION_NAMES[station]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recipes List */}
        {selectedStation && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              {STATION_NAMES[selectedStation]} Recipes
            </h3>
            {recipes.length === 0 ? (
              <p className="text-gray-400">
                No recipes available for this station.
              </p>
            ) : (
              <div className="space-y-4">
                {recipes.map((recipe) => {
                  const canCraftRecipe = canCraftCache.get(recipe.id) ?? false;
                  const resultItem = inventory.get(recipe.result.itemId);
                  const isFlashing = flashingItemId === recipe.result.itemId;

                  return (
                    <div
                      key={recipe.id}
                      className={`bg-gray-800 border-2 rounded-lg p-4 ${
                        isFlashing
                          ? "border-yellow-400 animate-pulse"
                          : "border-gray-700"
                      } transition-all`}
                    >
                      {/* Recipe Header */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xl font-semibold text-white">
                          {recipe.name}
                        </h4>
                        <div
                          className={`w-16 h-16 rounded border-2 border-white border-opacity-50 bg-black bg-opacity-50 flex items-center justify-center ${
                            isFlashing ? "animate-pulse" : ""
                          }`}
                          role="img"
                          aria-label={`${recipe.name} result item`}
                        >
                          {getItemImagePath(recipe.result.itemId) ? (
                            <img
                              src={getItemImagePath(recipe.result.itemId)}
                              alt={recipe.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <div
                              className="w-full h-full rounded"
                              style={{
                                backgroundColor: resultItem
                                  ? `#${resultItem.color.toString(16).padStart(6, "0")}`
                                  : "#808080",
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Ingredients */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-2">
                          Required Items:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {recipe.ingredients.map((ingredient) => {
                            const hasEnough =
                              getItemQuantity(ingredient.itemId) >=
                              ingredient.quantity;
                            return (
                              <div
                                key={`${recipe.id}-${ingredient.itemId}`}
                                className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1"
                              >
                                <div
                                  className="w-8 h-8 rounded border border-white border-opacity-30 bg-black bg-opacity-50 flex items-center justify-center"
                                  role="img"
                                  aria-label={getItemName(ingredient.itemId)}
                                >
                                  {getItemImagePath(ingredient.itemId) ? (
                                    <img
                                      src={getItemImagePath(ingredient.itemId)}
                                      alt={getItemName(ingredient.itemId)}
                                      className="w-full h-full object-contain p-0.5"
                                    />
                                  ) : (
                                    <div
                                      className="w-full h-full rounded"
                                      style={{
                                        backgroundColor: getItemColor(
                                          ingredient.itemId,
                                        ),
                                      }}
                                    />
                                  )}
                                </div>
                                <span
                                  className={`text-sm ${
                                    hasEnough ? "text-white" : "text-red-400"
                                  }`}
                                >
                                  {ingredient.quantity}x{" "}
                                  {getItemName(ingredient.itemId)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  (You: {getItemQuantity(ingredient.itemId)})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Energy Cost */}
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-1">
                          Energy Cost:
                        </p>
                        <div className="flex items-center gap-2">
                          <img
                            src="/assets/items/energy.png"
                            alt="Energy"
                            className="w-6 h-6 object-contain"
                          />
                          <span
                            className={`text-sm ${
                              currentEnergy >= recipe.energyCost
                                ? "text-white"
                                : "text-red-400"
                            }`}
                          >
                            {recipe.energyCost} (You:{" "}
                            {Math.floor(currentEnergy)})
                          </span>
                        </div>
                      </div>

                      {/* Craft Button */}
                      <button
                        type="button"
                        onClick={() => handleCraft(recipe.id)}
                        disabled={!canCraftRecipe}
                        className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
                          canCraftRecipe
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                        aria-label={`Craft ${recipe.name}`}
                      >
                        {canCraftRecipe ? "Craft" : "Requirements Not Met"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CraftingUI;
