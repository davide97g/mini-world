/**
 * Crafting Recipes Configuration
 * Data-driven recipe system - add new recipes here without code changes
 */

export type CraftingStation =
  | "workbench"
  | "cooking_fire"
  | "bone_table"
  | "stone_anvil";

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  station: CraftingStation;
  ingredients: RecipeIngredient[];
  energyCost: number;
  result: {
    itemId: string;
    quantity: number;
  };
}

/**
 * All available crafting recipes
 * Add new recipes here - the system will automatically pick them up
 */
export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Cooking Fire Recipes
  {
    id: "cooked_meat",
    name: "Cooked Meat",
    station: "cooking_fire",
    ingredients: [{ itemId: "meat", quantity: 1 }],
    energyCost: 5,
    result: {
      itemId: "cooked_meat",
      quantity: 1,
    },
  },

  // Workbench Recipes
  {
    id: "wooden_plank",
    name: "Wooden Plank",
    station: "workbench",
    ingredients: [{ itemId: "wood", quantity: 1 }],
    energyCost: 4,
    result: {
      itemId: "plank",
      quantity: 1,
    },
  },

  // Bone Table Recipes
  {
    id: "bone_knife",
    name: "Bone Knife",
    station: "bone_table",
    ingredients: [
      { itemId: "bone", quantity: 1 },
      { itemId: "wood", quantity: 1 },
    ],
    energyCost: 10,
    result: {
      itemId: "bone_knife",
      quantity: 1,
    },
  },

  // Stone Anvil Recipes
  {
    id: "stone_brick",
    name: "Stone Brick",
    station: "stone_anvil",
    ingredients: [{ itemId: "stone", quantity: 2 }],
    energyCost: 6,
    result: {
      itemId: "stone_brick",
      quantity: 1,
    },
  },
];

/**
 * Get all recipes for a specific station
 */
export const getRecipesByStation = (
  station: CraftingStation,
): CraftingRecipe[] => {
  return CRAFTING_RECIPES.filter((recipe) => recipe.station === station);
};

/**
 * Get a recipe by ID
 */
export const getRecipeById = (id: string): CraftingRecipe | undefined => {
  return CRAFTING_RECIPES.find((recipe) => recipe.id === id);
};

/**
 * Get all available stations
 */
export const getCraftingStations = (): CraftingStation[] => {
  return Array.from(
    new Set(CRAFTING_RECIPES.map((recipe) => recipe.station)),
  ) as CraftingStation[];
};
