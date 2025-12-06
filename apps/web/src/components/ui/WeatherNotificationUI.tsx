import { useEffect, useState } from "react";
import { gameEventBus } from "../../game/utils/GameEventBus";

interface WeatherNotification {
  id: string;
  weatherType: string;
  icon: string;
  description: string;
}

const WeatherNotificationUI = () => {
  const [notification, setNotification] = useState<WeatherNotification | null>(
    null,
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleWeatherChange = (payload?: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "weatherType" in payload &&
        "icon" in payload &&
        "description" in payload
      ) {
        const { weatherType, icon, description } = payload as {
          weatherType: string;
          icon: string;
          description: string;
        };

        const notificationId = `weather-${Date.now()}`;
        setNotification({
          id: notificationId,
          weatherType,
          icon,
          description,
        });
        setIsVisible(true);

        // Auto-hide after 3 seconds
        setTimeout(() => {
          setIsVisible(false);
          // Clear notification after fade out
          setTimeout(() => {
            setNotification(null);
          }, 300);
        }, 3000);
      }
    };

    const unsubscribe = gameEventBus.on("weather:change", handleWeatherChange);

    return () => {
      unsubscribe();
    };
  }, []);

  if (!notification) {
    return null;
  }

  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-30"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
      }}
    >
      <div
        className="bg-white/25 bg-opacity-25 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg border-2 border-white border-opacity-30"
        style={{
          minWidth: "200px",
          maxWidth: "400px",
        }}
      >
        {/* Weather icon */}
        <div className="text-4xl shrink-0">{notification.icon}</div>

        {/* Weather description */}
        <div className="flex-1 text-center">
          <p className="text-white text-lg font-mono font-bold">
            {notification.description}
          </p>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default WeatherNotificationUI;
