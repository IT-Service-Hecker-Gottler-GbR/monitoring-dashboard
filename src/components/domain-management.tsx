"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDomain,
  updateDomain,
  deleteDomain,
  toggleDomain,
  createGroup,
  updateGroup,
  deleteGroup,
} from "@/lib/actions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Pause, Play, Server } from "lucide-react";

interface CheckLog {
  id: string;
  statusCode: number | null;
  latency: number | null;
  isUp: boolean;
  sslValid: boolean | null;
  sslExpiry: Date | null;
  error: string | null;
  checkedAt: Date;
}

interface ServerGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface Domain {
  id: string;
  url: string;
  customerName: string;
  checkInterval: number;
  isActive: boolean;
  serverGroupId: string | null;
  serverGroup: ServerGroup | null;
  checkLogs: CheckLog[];
}

interface DomainManagementProps {
  domains: Domain[];
  groups: ServerGroup[];
}

export function DomainManagement({ domains, groups }: DomainManagementProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ServerGroup | null>(null);

  return (
    <div className="space-y-8">
      {/* ─── Server Groups Section ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server-Gruppen
          </h2>
          <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Neue Gruppe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Server-Gruppe</DialogTitle>
                <DialogDescription>
                  Gruppiere Domains die auf dem gleichen Server gehostet werden.
                </DialogDescription>
              </DialogHeader>
              <GroupForm
                onSubmit={async (formData) => {
                  const result = await createGroup(formData);
                  if (result.error) {
                    toast.error("Fehler beim Erstellen der Gruppe");
                  } else {
                    toast.success("Gruppe erstellt");
                    setAddGroupOpen(false);
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Noch keine Gruppen. Erstelle eine Gruppe um Domains zu bündeln.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const count = domains.filter(
                (d) => d.serverGroupId === group.id
              ).length;
              return (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                  style={{ borderLeftWidth: 4, borderLeftColor: group.color }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{group.name}</p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {group.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {count} {count === 1 ? "Domain" : "Domains"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingGroup(group);
                        setEditGroupOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (
                          confirm(
                            `Gruppe "${group.name}" löschen? Die Domains bleiben erhalten, verlieren aber ihre Gruppenzuordnung.`
                          )
                        ) {
                          const result = await deleteGroup(group.id);
                          if (result.error) {
                            toast.error("Fehler beim Löschen");
                          } else {
                            toast.success("Gruppe gelöscht");
                          }
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit Group Dialog */}
        <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gruppe bearbeiten</DialogTitle>
              <DialogDescription>
                Ändere Name, Beschreibung oder Farbe der Gruppe.
              </DialogDescription>
            </DialogHeader>
            {editingGroup && (
              <GroupForm
                defaultValues={editingGroup}
                onSubmit={async (formData) => {
                  const result = await updateGroup(editingGroup.id, formData);
                  if (result.error) {
                    toast.error("Fehler beim Aktualisieren");
                  } else {
                    toast.success("Gruppe aktualisiert");
                    setEditGroupOpen(false);
                    setEditingGroup(null);
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── Domains Section ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Domain Management</h2>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Domain hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Domain</DialogTitle>
                <DialogDescription>
                  Füge eine neue Domain zum Monitoring hinzu. Die URL muss das
                  Protokoll enthalten (https://).
                </DialogDescription>
              </DialogHeader>
              <DomainForm
                groups={groups}
                onSubmit={async (formData) => {
                  const result = await createDomain(formData);
                  if (result.error) {
                    toast.error("Validierung fehlgeschlagen.");
                  } else {
                    toast.success("Domain hinzugefügt");
                    setAddOpen(false);
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {domains.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Noch keine Domains konfiguriert.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kunde</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Gruppe</TableHead>
                  <TableHead>Intervall</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">
                      {domain.customerName}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {domain.url}
                    </TableCell>
                    <TableCell>
                      {domain.serverGroup ? (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: domain.serverGroup.color,
                            color: domain.serverGroup.color,
                          }}
                        >
                          {domain.serverGroup.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{domain.checkInterval}min</TableCell>
                    <TableCell>
                      {domain.isActive ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Aktiv
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pausiert</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const result = await toggleDomain(
                              domain.id,
                              !domain.isActive
                            );
                            if (result.error) {
                              toast.error("Fehler beim Umschalten");
                            } else {
                              toast.success(
                                domain.isActive
                                  ? "Domain pausiert"
                                  : "Domain aktiviert"
                              );
                            }
                          }}
                        >
                          {domain.isActive ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDomain(domain);
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (
                              confirm(
                                `"${domain.customerName}" löschen? Alle Check-Logs werden ebenfalls gelöscht.`
                              )
                            ) {
                              const result = await deleteDomain(domain.id);
                              if (result.error) {
                                toast.error("Fehler beim Löschen");
                              } else {
                                toast.success("Domain gelöscht");
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Domain Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Domain bearbeiten</DialogTitle>
              <DialogDescription>
                Monitoring-Konfiguration der Domain aktualisieren.
              </DialogDescription>
            </DialogHeader>
            {editingDomain && (
              <DomainForm
                groups={groups}
                defaultValues={editingDomain}
                onSubmit={async (formData) => {
                  const result = await updateDomain(editingDomain.id, formData);
                  if (result.error) {
                    toast.error("Validierung fehlgeschlagen.");
                  } else {
                    toast.success("Domain aktualisiert");
                    setEditOpen(false);
                    setEditingDomain(null);
                  }
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function DomainForm({
  defaultValues,
  groups,
  onSubmit,
}: {
  defaultValues?: { url: string; customerName: string; checkInterval: number; serverGroupId?: string | null };
  groups: ServerGroup[];
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const NONE_VALUE = "__none__";
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    defaultValues?.serverGroupId ?? NONE_VALUE
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("serverGroupId", selectedGroupId === NONE_VALUE ? "" : selectedGroupId);
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://example.com"
          defaultValue={defaultValues?.url}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerName">Kundenname</Label>
        <Input
          id="customerName"
          name="customerName"
          placeholder="Acme Corp"
          defaultValue={defaultValues?.customerName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="checkInterval">Check-Intervall (Minuten)</Label>
        <Input
          id="checkInterval"
          name="checkInterval"
          type="number"
          min={1}
          max={1440}
          defaultValue={defaultValues?.checkInterval ?? 5}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Server-Gruppe</Label>
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger>
            <SelectValue placeholder="Keine Gruppe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Keine Gruppe</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  {g.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Speichern..." : defaultValues ? "Domain aktualisieren" : "Domain hinzufügen"}
      </Button>
    </form>
  );
}

// ─── Group Form ──────────────────────────────────────────────────────

const GROUP_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

function GroupForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: { name: string; description: string | null; color: string };
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(defaultValues?.color ?? "#6366f1");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("color", color);
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="groupName">Name</Label>
        <Input
          id="groupName"
          name="name"
          placeholder="z.B. Server Hetzner #1"
          defaultValue={defaultValues?.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="groupDescription">Beschreibung (optional)</Label>
        <Input
          id="groupDescription"
          name="description"
          placeholder="z.B. 4 vCPU, 8 GB RAM, Falkenstein"
          defaultValue={defaultValues?.description ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label>Farbe</Label>
        <div className="flex flex-wrap gap-2">
          {GROUP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: color === c ? "white" : "transparent",
                boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
              }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Speichern..." : defaultValues ? "Gruppe aktualisieren" : "Gruppe erstellen"}
      </Button>
    </form>
  );
}

