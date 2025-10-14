import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Plus, Trash2, Home, Briefcase, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { locationService } from "@/services/locationService";

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_private: boolean;
}

const placeIcons = {
  home: Home,
  work: Briefcase,
  gym: Dumbbell,
  default: MapPin
};

export default function PlacesManager({ userId }: { userId: string }) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [newPlace, setNewPlace] = useState({
    name: "",
    latitude: 0,
    longitude: 0,
    radius_meters: 100
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPlaces();
  }, [userId]);

  const loadPlaces = async () => {
    const { data } = await supabase
      .from("places")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setPlaces(data);
    }
  };

  const useCurrentLocation = async () => {
    try {
      const location = await locationService.getCurrentPosition();
      setNewPlace({
        ...newPlace,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      toast({
        title: "Ubicación obtenida",
        description: "Se usará tu ubicación actual"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo obtener tu ubicación",
        variant: "destructive"
      });
    }
  };

  const createPlace = async () => {
    if (!newPlace.name.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un nombre para el lugar",
        variant: "destructive"
      });
      return;
    }

    if (newPlace.latitude === 0 || newPlace.longitude === 0) {
      toast({
        title: "Error",
        description: "Establece una ubicación válida",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("places")
      .insert({
        user_id: userId,
        name: newPlace.name,
        latitude: newPlace.latitude,
        longitude: newPlace.longitude,
        radius_meters: newPlace.radius_meters,
        is_private: false
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el lugar",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Lugar creado",
      description: `"${newPlace.name}" añadido exitosamente`
    });

    setNewPlace({ name: "", latitude: 0, longitude: 0, radius_meters: 100 });
    setShowCreateForm(false);
    loadPlaces();
  };

  const deletePlace = async (placeId: string) => {
    const { error } = await supabase
      .from("places")
      .delete()
      .eq("id", placeId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el lugar",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Lugar eliminado",
      description: "El lugar ha sido eliminado"
    });

    loadPlaces();
  };

  const getPlaceIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('casa') || nameLower.includes('home')) return placeIcons.home;
    if (nameLower.includes('trabajo') || nameLower.includes('work') || nameLower.includes('oficina')) return placeIcons.work;
    if (nameLower.includes('gym') || nameLower.includes('gimnasio')) return placeIcons.gym;
    return placeIcons.default;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          Mis Lugares
        </h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          size="sm"
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Añadir
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-4 space-y-3">
          <Input
            placeholder="Nombre del lugar (ej: Casa, Oficina)"
            value={newPlace.name}
            onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
          />
          <Button
            onClick={useCurrentLocation}
            variant="outline"
            className="w-full"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Usar mi ubicación actual
          </Button>
          <div className="flex gap-2">
            <Button onClick={createPlace} className="flex-1">
              Crear
            </Button>
            <Button
              onClick={() => {
                setShowCreateForm(false);
                setNewPlace({ name: "", latitude: 0, longitude: 0, radius_meters: 100 });
              }}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {places.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No has añadido lugares aún</p>
          <p className="text-sm mt-2">Añade lugares para recibir alertas basadas en ubicación</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {places.map((place) => {
            const Icon = getPlaceIcon(place.name);
            return (
              <Card key={place.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-primary" />
                    <div>
                      <h3 className="font-semibold">{place.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Radio: {place.radius_meters}m
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deletePlace(place.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
