import { useEffect, useState } from "react";
import { gameEventBus } from "../../game/utils/GameEventBus";

interface EnergyData {
  currentEnergy: number;
  energyPerMinute: number;
  maxEnergyPerMinute: number;
}

const EnergyUI = () => {
  const [energyData, setEnergyData] = useState<EnergyData>({
    currentEnergy: 0,
    energyPerMinute: 0,
    maxEnergyPerMinute: 100,
  });

  useEffect(() => {
    const handleEnergyUpdate = (payload?: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "currentEnergy" in payload &&
        "energyPerMinute" in payload &&
        "maxEnergyPerMinute" in payload
      ) {
        const data = payload as EnergyData;
        setEnergyData({
          currentEnergy: data.currentEnergy,
          energyPerMinute: data.energyPerMinute,
          maxEnergyPerMinute: data.maxEnergyPerMinute,
        });
      }
    };

    const unsubscribe = gameEventBus.on("energy:update", handleEnergyUpdate);

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <div className="bg-black bg-opacity-50 rounded border-2 border-white border-opacity-30 flex items-center gap-2 px-3 py-2">
        {/* Energy Image */}
        <img
          src="/assets/items/energy.png"
          alt="Energy"
          className="w-8 h-8 object-contain"
        />

        {/* Energy Value */}
        <div className="flex flex-col">
          <span className="text-white text-sm font-mono font-bold drop-shadow-lg">
            {Math.floor(energyData.currentEnergy)}
          </span>
          <span className="text-white text-xs font-mono opacity-70 drop-shadow-lg">
            {energyData.energyPerMinute.toFixed(1)}/min
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnergyUI;
