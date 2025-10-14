import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Clock, Plus, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface Routine {
  id: string;
  name: string;
  days_of_week: number[];
  time: string;
  is_active: boolean;
  required_tracker_ids: string[];
}

interface Tracker {
  id: string;
  name: string;
}

const daysOfWeek = [
  { value: 0, label: "D" },
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" }
];

export default function RoutinesManager({ userId }: { userId: string }) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [newRoutine, setNewRoutine] = useState({
    name: "",
    days: [] as number[],
    time: "08:00",
    trackerIds: [] as string[]
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRoutines();
    loadTrackers();
  }, [userId]);

  const loadRoutines = async () => {
    const { data } = await supabase
      .from("routines")
      .select("*")
      .eq("user_id", userId)
      .order("time");

    if (data) {
      setRoutines(data);
    }
  };

  const loadTrackers = async () => {
    const { data } = await supabase
      .from("trackers")
      .select("id, name")
      .eq("user_id", userId);

    if (data) {
      setTrackers(data);
    }
  };

  const toggleDay = (day: number) => {
    setNewRoutine({
      ...newRoutine,
      days: newRoutine.days.includes(day)
        ? newRoutine.days.filter(d => d !== day)
        : [...newRoutine.days, day]
    });
  };

  const toggleTracker = (trackerId: string) => {
    setNewRoutine({
      ...newRoutine,
      trackerIds: newRoutine.trackerIds.includes(trackerId)
        ? newRoutine.trackerIds.filter(id => id !== trackerId)
        : [...newRoutine.trackerIds, trackerId]
    });
  };

  const createRoutine = async () => {
    if (!newRoutine.name.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un nombre para la rutina",
        variant: "destructive"
      });
      return;
    }

    if (newRoutine.days.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un día",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from("routines")
      .insert({
        user_id: userId,
        name: newRoutine.name,
        days_of_week: newRoutine.days,
        time: newRoutine.time,
        required_tracker_ids: newRoutine.trackerIds,
        is_active: true
      });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la rutina",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Rutina creada",
      description: `"${newRoutine.name}" añadida exitosamente`
    });

    setNewRoutine({ name: "", days: [], time: "08:00", trackerIds: [] });
    setShowCreateForm(false);
    loadRoutines();
  };

  const deleteRoutine = async (routineId: string) => {
    const { error } = await supabase
      .from("routines")
      .delete()
      .eq("id", routineId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la rutina",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Rutina eliminada"
    });

    loadRoutines();
  };

  const toggleRoutineActive = async (routineId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("routines")
      .update({ is_active: !isActive })
      .eq("id", routineId);

    if (!error) {
      loadRoutines();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Rutinas Inteligentes
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
            placeholder="Nombre (ej: Rutina de trabajo)"
            value={newRoutine.name}
            onChange={(e) => setNewRoutine({ ...newRoutine, name: e.target.value })}
          />

          <div>
            <p className="text-sm font-medium mb-2">Días de la semana:</p>
            <div className="flex gap-2">
              {daysOfWeek.map(day => (
                <Button
                  key={day.value}
                  size="sm"
                  variant={newRoutine.days.includes(day.value) ? "default" : "outline"}
                  onClick={() => toggleDay(day.value)}
                  className="w-10 h-10 p-0"
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Hora:</p>
            <Input
              type="time"
              value={newRoutine.time}
              onChange={(e) => setNewRoutine({ ...newRoutine, time: e.target.value })}
            />
          </div>

          {trackers.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Objetos a verificar:</p>
              <div className="space-y-2">
                {trackers.map(tracker => (
                  <div key={tracker.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={newRoutine.trackerIds.includes(tracker.id)}
                      onCheckedChange={() => toggleTracker(tracker.id)}
                    />
                    <span className="text-sm">{tracker.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={createRoutine} className="flex-1">
              Crear
            </Button>
            <Button
              onClick={() => {
                setShowCreateForm(false);
                setNewRoutine({ name: "", days: [], time: "08:00", trackerIds: [] });
              }}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {routines.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No has creado rutinas aún</p>
          <p className="text-sm mt-2">Las rutinas te recuerdan objetos en horarios específicos</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {routines.map((routine) => (
            <Card key={routine.id} className={`p-4 ${!routine.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={routine.is_active}
                    onCheckedChange={() => toggleRoutineActive(routine.id, routine.is_active)}
                  />
                  <div>
                    <h3 className="font-semibold">{routine.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{routine.time}</span>
                      <Calendar className="w-3 h-3 ml-2" />
                      <span>
                        {routine.days_of_week.map(d => daysOfWeek[d].label).join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteRoutine(routine.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
