import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home as HomeIcon, Bell, Settings, Plus, MapPin, LogOut, Users, Trophy, Clock, Map as MapIcon, Bluetooth } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Map from "@/components/Map";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import AuthDialog from "@/components/AuthDialog";
import FamilyGroups from "@/components/FamilyGroups";
import Achievements from "@/components/Achievements";
import PlacesManager from "@/components/PlacesManager";
import RoutinesManager from "@/components/RoutinesManager";
import AlarmHistory from "@/components/AlarmHistory";
import { bluetoothService } from "@/services/bluetoothService";
import { notificationService } from "@/services/notificationService";
import { locationService } from "@/services/locationService";

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
  const [isDriving, setIsDriving] = useState(false);
  const [bluetoothSupported, setBluetoothSupported] = useState(false);

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
    initializeServices();
  }, [toast]);

  const initializeServices = async () => {
    const btAvailable = await bluetoothService.isBluetoothAvailable();
    setBluetoothSupported(btAvailable);

    await notificationService.initialize();

    locationService.startWatching((location) => {
      setUserLocation([location.coords.latitude, location.coords.longitude]);

      const driving = locationService.isDriving(location.coords.speed);
      setIsDriving(driving);
    });

    return () => {
      locationService.stopWatching();
    };
  };

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

  const handleAddTracker = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    if (bluetoothSupported) {
      const device = await bluetoothService.requestDevice();
      if (device) {
        toast({
          title: "Dispositivo conectado",
          description: `${device.name} conectado exitosamente`,
        });
      }
    } else {
      toast({
        title: "Añadir rastreador",
        description: "Bluetooth no disponible. Añade un rastreador virtual",
      });
    }
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

    if (isAwayFromHome && essentialItemsAtHome.length > 0 && !isDriving) {
      const message = `¡ALARMA! Olvidaste: ${essentialItemsAtHome.map((t) => t.name).join(", ")}`;

      if (user) {
        notificationService.sendAlarmNotification(message, 'danger');

        supabase.from('alarm_history').insert({
          user_id: user.id,
          type: 'forgotten_item',
          message,
          severity: 'danger',
          tracker_ids: essentialItemsAtHome.map(t => t.id),
          user_lat: userLocation[0],
          user_lng: userLocation[1]
        });
      }

      return {
        type: "danger",
        message: `🚨 ${message}`,
      };
    }

    if (isDriving) {
      return {
        type: "info",
        message: "🚗 Modo conducción activado. Alarmas deshabilitadas.",
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
    if (!user) {
      return (
        <div className="glass p-8 rounded-xl text-center">
          <p className="text-muted-foreground mb-4">Inicia sesión para acceder a todas las funciones</p>
          <Button
            onClick={() => setShowAuthDialog(true)}
            className="bg-gradient-to-r from-primary to-accent"
          >
            Iniciar Sesión
          </Button>
        </div>
      );
    }

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
      return <AlarmHistory userId={user.id} />;
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Configuración</h2>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="account">Cuenta</TabsTrigger>
            <TabsTrigger value="places"><MapIcon className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="routines"><Clock className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="groups"><Users className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="achievements"><Trophy className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <div className="glass p-6 rounded-xl space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Sesión activa</p>
                <p className="font-medium">{user.email}</p>
              </div>

              {bluetoothSupported && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Bluetooth</p>
                  <Button
                    onClick={handleAddTracker}
                    variant="outline"
                    className="w-full"
                  >
                    <Bluetooth className="h-4 w-4 mr-2" />
                    Conectar Dispositivo
                  </Button>
                </div>
              )}

              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="places">
            <PlacesManager userId={user.id} />
          </TabsContent>

          <TabsContent value="routines">
            <RoutinesManager userId={user.id} />
          </TabsContent>

          <TabsContent value="groups">
            <FamilyGroups userId={user.id} />
          </TabsContent>

          <TabsContent value="achievements">
            <Achievements userId={user.id} />
          </TabsContent>
        </Tabs>
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