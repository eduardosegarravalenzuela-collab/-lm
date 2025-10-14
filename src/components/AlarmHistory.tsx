import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Bell, AlertTriangle, Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface AlarmRecord {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  created_at: string;
  was_dismissed: boolean;
}

export default function AlarmHistory({ userId }: { userId: string }) {
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'danger' | 'warning' | 'info'>('all');

  useEffect(() => {
    loadAlarms();
  }, [userId, filter]);

  const loadAlarms = async () => {
    let query = supabase
      .from("alarm_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== 'all') {
      query = query.eq("severity", filter);
    }

    const { data } = await query;

    if (data) {
      setAlarms(data);
    }
  };

  const dismissAlarm = async (alarmId: string) => {
    const { error } = await supabase
      .from("alarm_history")
      .update({ was_dismissed: true })
      .eq("id", alarmId);

    if (!error) {
      loadAlarms();
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'warning':
        return <Bell className="w-5 h-5 text-warning" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'danger':
        return 'border-destructive bg-destructive/10';
      case 'warning':
        return 'border-warning bg-warning/10';
      default:
        return 'border-primary bg-primary/10';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Historial de Alarmas
        </h2>
      </div>

      <div className="flex gap-2">
        {(['all', 'danger', 'warning', 'info'] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Todas' : f === 'danger' ? 'Peligro' : f === 'warning' ? 'Advertencia' : 'Info'}
          </Button>
        ))}
      </div>

      {alarms.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay alarmas en el historial</p>
          <p className="text-sm mt-2">Las alarmas aparecerán aquí cuando se activen</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alarms.map((alarm) => (
            <Card
              key={alarm.id}
              className={`p-4 border-2 ${getSeverityColor(alarm.severity)} ${
                alarm.was_dismissed ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 flex-1">
                  {getSeverityIcon(alarm.severity)}
                  <div className="flex-1">
                    <p className="font-medium">{alarm.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(alarm.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                {!alarm.was_dismissed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismissAlarm(alarm.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
