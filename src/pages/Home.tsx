import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home as HomeIcon, Bell, Settings, Plus, MapPin, LogOut } from "lucide-react";
import Map from "@/components/Map";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import AuthDialog from "@/components/AuthDialog";

interface Tracker {
  id: string;
  name: string;
  isEssential: boolean;
  isAtHome: boolean;
  lastReportedLat: number;
  lastReportedLng: number;
}

const Home = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [homeLocation] = useState<[number, number]>([40.7128, -74.006]);
  const [activeTab, setActiveTab] = useState<"home" | "alarms" | "settings">("home");

  // Auth state management
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            loadTrackers(session.user.id);
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadTrackers(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Get user's real location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Error de ubicación",
            description: "No se pudo obtener tu ubicación actual",
            variant: "destructive",
          });
        }
      );
    }
  }, [toast]);

  const loadTrackers = async (userId: string) => {
    const { data, error } = await supabase
      .from("trackers")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading trackers:", error);
      return;
    }

    if (data && data.length > 0) {
      setTrackers(
        data.map((t) => ({
          id: t.id,
          name: t.name,
          lastReportedLat: t.last_reported_lat,
          lastReportedLng: t.last_reported_lng,
          isEssential: t.is_essential,
          isAtHome: t.is_at_home,
        }))
      );
    } else {
      setTrackers([]);
    }
  };

  const handleAddTracker = () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    toast({
      title: "Añadir rastreador",
      description: "Conecta tu dispositivo Bluetooth",
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setTrackers([]);
    toast({
      title: "Sesión cerrada",
      description: "Hasta pronto",
    });
  };


  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const checkAlarms = () => {
    if (!userLocation) return null;

    const distanceToHome = calculateDistance(
      userLocation[0],
      userLocation[1],
      homeLocation[0],
      homeLocation[1]
    );

    const isAwayFromHome = distanceToHome > 80;
    const essentialItemsAtHome = trackers.filter((t) => t.isEssential && t.isAtHome);

    if (isAwayFromHome && essentialItemsAtHome.length > 0) {
      return {
        type: "danger",
        message: `🚨 ¡ALARMA! Olvidaste: ${essentialItemsAtHome.map((t) => t.name).join(", ")}`,
      };
    }

    if (isAwayFromHome) {
      return {
        type: "success",
        message: `✅ Todo bien. Distancia de casa: ${Math.round(distanceToHome)}m`,
      };
    }

    return {
      type: "info",
      message: "🏠 En casa. Todo tranquilo.",
    };
  };

  const alarm = checkAlarms();

  const renderContent = () => {
    if (activeTab === "home") {
      return (
        <div className="space-y-6">
          {alarm && (
            <div
              className={`p-4 rounded-xl border-2 ${
                alarm.type === "danger"
                  ? "bg-destructive/10 border-destructive glow-danger"
                  : alarm.type === "success"
                  ? "bg-success/10 border-success glow-success"
                  : "bg-primary/10 border-primary glow-primary"
              }`}
            >
              <p className="font-semibold text-center">{alarm.message}</p>
            </div>
          )}

          <Map userLocation={userLocation} homeLocation={homeLocation} trackers={trackers} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Mis Rastreadores</h2>
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-accent"
                onClick={handleAddTracker}
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir
              </Button>
            </div>
            {trackers.length === 0 ? (
              <div className="glass p-8 rounded-xl text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tienes rastreadores aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trackers.map((tracker) => (
                  <div key={tracker.id} className="glass p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {tracker.isEssential ? "🔑" : "🎒"} {tracker.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          tracker.isAtHome
                            ? "bg-warning/20 text-warning"
                            : "bg-success/20 text-success"
                        }`}
                      >
                        {tracker.isAtHome ? "🏠 En casa" : "🏃 Contigo"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "alarms") {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Historial de Alarmas</h2>
          <div className="glass p-8 rounded-xl text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aquí aparecerá el historial de alarmas</p>
            <p className="text-sm mt-2">Próximamente...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Configuración</h2>
        <div className="glass p-6 rounded-xl space-y-4">
          {user ? (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Sesión activa</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Inicia sesión para guardar tus rastreadores en la nube</p>
              <Button
                onClick={() => setShowAuthDialog(true)}
                className="mt-4 bg-gradient-to-r from-primary to-accent"
              >
                Iniciar Sesión
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background pb-20">
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={() => {
          if (user) {
            loadTrackers(user.id);
          }
        }}
      />
      
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center">
          <img 
            src={logo} 
            alt="KantoStrategy" 
            className="h-16 object-contain drop-shadow-lg"
          />
        </div>

        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-around">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setActiveTab("home")}
              className={activeTab === "home" ? "text-primary" : "text-muted-foreground"}
            >
              <HomeIcon className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setActiveTab("alarms")}
              className={activeTab === "alarms" ? "text-primary" : "text-muted-foreground"}
            >
              <Bell className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setActiveTab("settings")}
              className={activeTab === "settings" ? "text-primary" : "text-muted-foreground"}
            >
              <Settings className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;