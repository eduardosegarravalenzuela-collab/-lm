import { useState } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";

interface MapProps {
  userLocation: [number, number] | null;
  homeLocation: [number, number];
  trackers: Array<{
    id: string;
    name: string;
    lastReportedLat: number;
    lastReportedLng: number;
    isEssential: boolean;
    isAtHome: boolean;
  }>;
}

const Map = ({ userLocation, homeLocation, trackers }: MapProps) => {
  const [googleMapsToken, setGoogleMapsToken] = useState(() => 
    localStorage.getItem("google_maps_token") || ""
  );
  const [showTokenInput, setShowTokenInput] = useState(!googleMapsToken);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const { toast } = useToast();

  const center = userLocation 
    ? { lat: userLocation[0], lng: userLocation[1] }
    : { lat: homeLocation[0], lng: homeLocation[1] };

  const handleSaveToken = () => {
    if (googleMapsToken.trim()) {
      localStorage.setItem("google_maps_token", googleMapsToken);
      setShowTokenInput(false);
      toast({
        title: "API Key guardada",
        description: "Mapa cargado correctamente",
      });
    }
  };

  if (showTokenInput) {
    return (
      <div className="glass p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Configura Google Maps
        </h3>
        <p className="text-sm text-muted-foreground">
          Necesitas una API Key de Google Maps.{" "}
          <a
            href="https://console.cloud.google.com/google/maps-apis"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Obtén una aquí →
          </a>
        </p>
        <Input
          placeholder="AIza..."
          value={googleMapsToken}
          onChange={(e) => setGoogleMapsToken(e.target.value)}
          className="bg-muted border-border"
        />
        <Button
          onClick={handleSaveToken}
          className="w-full bg-gradient-to-r from-primary to-accent"
        >
          Guardar API Key
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl glow-primary">
      <APIProvider apiKey={googleMapsToken}>
        <GoogleMap
          mapId="kanto-tracker-map"
          center={center}
          zoom={14}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {/* Home marker */}
          <AdvancedMarker
            position={{ lat: homeLocation[0], lng: homeLocation[1] }}
            onClick={() => setSelectedMarker("home")}
          >
            <Pin background="#00D9FF" borderColor="#00A8CC" glyphColor="#FFF">
              <span className="text-xl">🏠</span>
            </Pin>
          </AdvancedMarker>
          {selectedMarker === "home" && (
            <InfoWindow
              position={{ lat: homeLocation[0], lng: homeLocation[1] }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="p-2">
                <h3 className="font-semibold">🏠 Casa</h3>
              </div>
            </InfoWindow>
          )}

          {/* User location marker */}
          {userLocation && (
            <>
              <AdvancedMarker
                position={{ lat: userLocation[0], lng: userLocation[1] }}
                onClick={() => setSelectedMarker("user")}
              >
                <Pin background="#10B981" borderColor="#059669" glyphColor="#FFF">
                  <span className="text-xl">📍</span>
                </Pin>
              </AdvancedMarker>
              {selectedMarker === "user" && (
                <InfoWindow
                  position={{ lat: userLocation[0], lng: userLocation[1] }}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2">
                    <h3 className="font-semibold">📍 Tu ubicación</h3>
                  </div>
                </InfoWindow>
              )}
            </>
          )}

          {/* Tracker markers */}
          {trackers.map((tracker) => {
            const color = tracker.isAtHome ? "#FBBF24" : "#22C55E";
            const borderColor = tracker.isAtHome ? "#F59E0B" : "#16A34A";
            return (
              <div key={tracker.id}>
                <AdvancedMarker
                  position={{ lat: tracker.lastReportedLat, lng: tracker.lastReportedLng }}
                  onClick={() => setSelectedMarker(tracker.id)}
                >
                  <Pin background={color} borderColor={borderColor} glyphColor="#FFF">
                    <span className="text-xl">{tracker.isEssential ? "🔑" : "🎒"}</span>
                  </Pin>
                </AdvancedMarker>
                {selectedMarker === tracker.id && (
                  <InfoWindow
                    position={{ lat: tracker.lastReportedLat, lng: tracker.lastReportedLng }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-2">
                      <h3 className="font-semibold">
                        {tracker.isEssential ? "🔑" : "🎒"} {tracker.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tracker.isAtHome ? "En casa" : "Contigo"}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </div>
            );
          })}
        </GoogleMap>
      </APIProvider>
    </div>
  );
};

export default Map;