import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Plus, Share2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FamilyGroup {
  id: string;
  name: string;
  created_by: string;
  member_count: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  email?: string;
}

export default function FamilyGroups({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGroups();
  }, [userId]);

  const loadGroups = async () => {
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) {
      setGroups([]);
      return;
    }

    const groupIds = memberships.map(m => m.group_id);

    const { data: groupsData } = await supabase
      .from("family_groups")
      .select("*")
      .in("id", groupIds);

    if (groupsData) {
      const groupsWithCounts = await Promise.all(
        groupsData.map(async (group) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: 'exact', head: true })
            .eq("group_id", group.id);

          return {
            ...group,
            member_count: count || 0
          };
        })
      );

      setGroups(groupsWithCounts);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un nombre para el grupo",
        variant: "destructive"
      });
      return;
    }

    const { data: group, error: groupError } = await supabase
      .from("family_groups")
      .insert({
        name: newGroupName,
        created_by: userId
      })
      .select()
      .single();

    if (groupError || !group) {
      toast({
        title: "Error",
        description: "No se pudo crear el grupo",
        variant: "destructive"
      });
      return;
    }

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin'
      });

    if (memberError) {
      toast({
        title: "Error",
        description: "Error al añadir administrador",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Grupo creado",
      description: `Grupo "${newGroupName}" creado exitosamente`
    });

    setNewGroupName("");
    setShowCreateForm(false);
    loadGroups();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Grupos Familiares
        </h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          size="sm"
          className="bg-gradient-to-r from-primary to-accent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Grupo
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-4 space-y-3">
          <Input
            placeholder="Nombre del grupo (ej: Mi Familia)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createGroup()}
          />
          <div className="flex gap-2">
            <Button onClick={createGroup} className="flex-1">
              Crear
            </Button>
            <Button
              onClick={() => {
                setShowCreateForm(false);
                setNewGroupName("");
              }}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {groups.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No perteneces a ningún grupo</p>
          <p className="text-sm mt-2">Crea un grupo para compartir ubicaciones</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card key={group.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {group.member_count} {group.member_count === 1 ? 'miembro' : 'miembros'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invitar
                  </Button>
                  <Button size="sm" variant="outline">
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
