import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Flame, Target, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  id: string;
  achievement_type: string;
  unlocked_at: string;
  metadata: Record<string, unknown>;
}

interface Stats {
  streak_days: number;
  items_forgotten: number;
  alarms_triggered: number;
  routines_completed: number;
}

const achievementDefinitions = {
  first_tracker: {
    title: "Primer Rastreador",
    description: "Añadiste tu primer rastreador",
    icon: Star,
    color: "text-yellow-500"
  },
  streak_7: {
    title: "Racha de 7 Días",
    description: "7 días sin olvidar nada",
    icon: Flame,
    color: "text-orange-500"
  },
  streak_30: {
    title: "Racha de 30 Días",
    description: "30 días sin olvidar nada",
    icon: Flame,
    color: "text-red-500"
  },
  perfect_week: {
    title: "Semana Perfecta",
    description: "Una semana completa sin alarmas",
    icon: Trophy,
    color: "text-blue-500"
  },
  routine_master: {
    title: "Maestro de Rutinas",
    description: "Completaste 50 rutinas",
    icon: Target,
    color: "text-green-500"
  }
};

export default function Achievements({ userId }: { userId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<Stats>({
    streak_days: 0,
    items_forgotten: 0,
    alarms_triggered: 0,
    routines_completed: 0
  });

  useEffect(() => {
    loadAchievements();
    loadStats();
  }, [userId]);

  const loadAchievements = async () => {
    const { data } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false });

    if (data) {
      setAchievements(data);
    }
  };

  const loadStats = async () => {
    const { data } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setStats({
        streak_days: data.streak_days,
        items_forgotten: data.items_forgotten,
        alarms_triggered: data.alarms_triggered,
        routines_completed: data.routines_completed
      });
    }
  };

  const unlockedTypes = new Set(achievements.map(a => a.achievement_type));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Logros
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(achievementDefinitions).map(([key, achievement]) => {
            const Icon = achievement.icon;
            const unlocked = unlockedTypes.has(key);

            return (
              <Card
                key={key}
                className={`p-4 ${
                  unlocked ? 'bg-gradient-to-br from-primary/10 to-accent/10' : 'opacity-50'
                }`}
              >
                <Icon className={`w-8 h-8 mb-2 ${unlocked ? achievement.color : 'text-muted-foreground'}`} />
                <h3 className="font-semibold text-sm">{achievement.title}</h3>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-3">Estadísticas</h3>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <Flame className="w-6 h-6 text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{stats.streak_days}</p>
            <p className="text-sm text-muted-foreground">Días de racha</p>
          </Card>
          <Card className="p-4">
            <Target className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{stats.routines_completed}</p>
            <p className="text-sm text-muted-foreground">Rutinas completadas</p>
          </Card>
          <Card className="p-4">
            <Trophy className="w-6 h-6 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{achievements.length}</p>
            <p className="text-sm text-muted-foreground">Logros desbloqueados</p>
          </Card>
          <Card className="p-4">
            <Star className="w-6 h-6 text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{stats.alarms_triggered}</p>
            <p className="text-sm text-muted-foreground">Alarmas activadas</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
