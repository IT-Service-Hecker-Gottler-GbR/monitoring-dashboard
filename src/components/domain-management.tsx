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
  createDomain,
  updateDomain,
  deleteDomain,
  toggleDomain,
} from "@/lib/actions";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Pause, Play } from "lucide-react";

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

interface Domain {
  id: string;
  url: string;
  customerName: string;
  checkInterval: number;
  isActive: boolean;
  checkLogs: CheckLog[];
}

interface DomainManagementProps {
  domains: Domain[];
}

export function DomainManagement({ domains }: DomainManagementProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Domain Management</h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Domain</DialogTitle>
              <DialogDescription>
                Add a new domain to monitor. The URL should include the protocol
                (https://).
              </DialogDescription>
            </DialogHeader>
            <DomainForm
              onSubmit={async (formData) => {
                const result = await createDomain(formData);
                if (result.error) {
                  toast.error("Validation failed. Please check your input.");
                } else {
                  toast.success("Domain added successfully");
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
            No domains configured. Add your first domain to start monitoring.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell>{domain.checkInterval}min</TableCell>
                  <TableCell>
                    {domain.isActive ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Paused</Badge>
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
                            toast.error("Failed to toggle domain");
                          } else {
                            toast.success(
                              domain.isActive
                                ? "Domain paused"
                                : "Domain activated"
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
                              `Delete ${domain.customerName}? This will also delete all check logs.`
                            )
                          ) {
                            const result = await deleteDomain(domain.id);
                            if (result.error) {
                              toast.error("Failed to delete domain");
                            } else {
                              toast.success("Domain deleted");
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Domain</DialogTitle>
            <DialogDescription>
              Update the domain monitoring configuration.
            </DialogDescription>
          </DialogHeader>
          {editingDomain && (
            <DomainForm
              defaultValues={editingDomain}
              onSubmit={async (formData) => {
                const result = await updateDomain(editingDomain.id, formData);
                if (result.error) {
                  toast.error("Validation failed. Please check your input.");
                } else {
                  toast.success("Domain updated successfully");
                  setEditOpen(false);
                  setEditingDomain(null);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DomainForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: { url: string; customerName: string; checkInterval: number };
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
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
        <Label htmlFor="customerName">Customer Name</Label>
        <Input
          id="customerName"
          name="customerName"
          placeholder="Acme Corp"
          defaultValue={defaultValues?.customerName}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="checkInterval">Check Interval (minutes)</Label>
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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Saving..." : defaultValues ? "Update Domain" : "Add Domain"}
      </Button>
    </form>
  );
}

