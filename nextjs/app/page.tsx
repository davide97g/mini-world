import Link from "next/link";
import { WeatherWidget } from "@/components/WeatherWidget";

export default function Home() {
  return (
    <main className="w-full min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Pokemon Style Game</h1>
        <Link
          href="/pixel-map"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          View Pixel Map
        </Link>
      </div>
      <WeatherWidget />
    </main>
  );
}

