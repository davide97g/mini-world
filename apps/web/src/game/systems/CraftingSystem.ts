/**
 * Crafting System - Handles item crafting with energy and ingredient requirements
 * Integrates with InventorySystem and EnergySystem
 */

import type {
  CraftingRecipe,
  CraftingStation,
} from "../config/CraftingRecipes";
import { getRecipeById, getRecipesByStation } from "../config/CraftingRecipes";
import { gameEventBus } from "../utils/GameEventBus";
import type { EnergySystem } from "./EnergySystem";
import type { InventorySystem } from "./InventorySystem";

export interface CraftingResult {
  success: boolean;
  message?: string;
}

export class CraftingSystem {
  private inventorySystem?: InventorySystem;
  private energySystem?: EnergySystem;

  /**
   * Initialize the crafting system with required dependencies
   */
  public init(
    inventorySystem: InventorySystem,
    energySystem: EnergySystem,
  ): void {
    this.inventorySystem = inventorySystem;
    this.energySystem = energySystem;
  }

  /**
   * Check if a recipe can be crafted (has required items and energy)
   */
  public canCraft(recipeId: string): boolean {
    const recipe = getRecipeById(recipeId);
    if (!recipe) {
      return false;
    }

    return this.checkRecipeRequirements(recipe);
  }

  /**
   * Check if recipe requirements are met
   */
  private checkRecipeRequirements(recipe: CraftingRecipe): boolean {
    if (!this.inventorySystem || !this.energySystem) {
      return false;
    }

    // Check energy
    if (this.energySystem.getCurrentEnergy() < recipe.energyCost) {
      return false;
    }

    // Check ingredients
    for (const ingredient of recipe.ingredients) {
      const quantity = this.inventorySystem.getItemQuantity(ingredient.itemId);
      if (quantity < ingredient.quantity) {
        return false;
      }
    }

    return true;
  }

  /**
   * Attempt to craft an item from a recipe
   */
  public craft(recipeId: string): CraftingResult {
    const recipe = getRecipeById(recipeId);
    if (!recipe) {
      return {
        success: false,
        message: "Recipe not found",
      };
    }

    if (!this.inventorySystem || !this.energySystem) {
      return {
        success: false,
        message: "Crafting system not initialized",
      };
    }

    // Check if requirements are met
    if (!this.checkRecipeRequirements(recipe)) {
      return {
        success: false,
        message: "Requirements not met",
      };
    }

    // Remove ingredients
    for (const ingredient of recipe.ingredients) {
      const removed = this.inventorySystem.removeItem(
        ingredient.itemId,
        ingredient.quantity,
      );
      if (!removed) {
        // Rollback would be needed here if we removed some items already
        // For now, this shouldn't happen since we checked requirements
        return {
          success: false,
          message: "Failed to remove ingredients",
        };
      }
    }

    // Consume energy
    const energyConsumed = this.energySystem.consumeEnergy(recipe.energyCost);
    if (!energyConsumed) {
      // Rollback: add items back
      for (const ingredient of recipe.ingredients) {
        this.inventorySystem.addItem(ingredient.itemId, ingredient.quantity);
      }
      return {
        success: false,
        message: "Failed to consume energy",
      };
    }

    // Add result item
    this.inventorySystem.addItem(recipe.result.itemId, recipe.result.quantity);

    // Emit crafting success event
    gameEventBus.emit("crafting:success", {
      recipeId: recipe.id,
      itemId: recipe.result.itemId,
      quantity: recipe.result.quantity,
    });

    return {
      success: true,
    };
  }

  /**
   * Get all recipes for a station
   */
  public getRecipesByStation(station: CraftingStation): CraftingRecipe[] {
    return getRecipesByStation(station);
  }

  /**
   * Get a recipe by ID
   */
  public getRecipe(recipeId: string): CraftingRecipe | undefined {
    return getRecipeById(recipeId);
  }

  /**
   * Get all available stations
   */
  public getStations(): CraftingStation[] {
    return Array.from(
      new Set(
        getRecipesByStation("workbench")
          .concat(getRecipesByStation("cooking_fire"))
          .concat(getRecipesByStation("bone_table"))
          .concat(getRecipesByStation("stone_anvil"))
          .map((r) => r.station),
      ),
    ) as CraftingStation[];
  }
}
