import { Button } from "@alpic-ai/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@alpic-ai/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@alpic-ai/ui/components/dropdown-menu";
import { Input } from "@alpic-ai/ui/components/input";
import { Label } from "@alpic-ai/ui/components/label";
import { Check, ChevronDown } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils.js";

type Team = { id: string; name: string };

export function DeployProjectDialog({
  open,
  onOpenChange,
  defaultName,
  teams,
  defaultTeamId,
  staleConfig,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  teams: Team[];
  defaultTeamId: string;
  staleConfig?: boolean;
  onCreate: (name: string, teamId: string) => Promise<void>;
}) {
  const inputId = useId();
  const [name, setName] = useState(defaultName);
  const [teamId, setTeamId] = useState(defaultTeamId);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setTeamId(defaultTeamId);
      setError(null);
    }
  }, [open, defaultName, defaultTeamId]);

  const trimmed = name.trim();
  const selectedTeam = teams.find((t) => t.id === teamId) ?? teams[0];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(trimmed, teamId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy to Alpic</DialogTitle>
          <DialogDescription>
            {staleConfig
              ? "The linked project is no longer available. Create a new one to deploy."
              : "Name your project to create it and run the first deployment."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={inputId}>Project name</Label>
            <Input
              id={inputId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="my-mcp-app"
              autoFocus
            />
            {teams.length > 1 ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Team:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 font-medium text-foreground transition-colors hover:bg-background-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <span>{selectedTeam?.name}</span>
                      <ChevronDown className="size-3 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-48">
                    {teams.map((team) => (
                      <DropdownMenuItem
                        key={team.id}
                        onSelect={() => setTeamId(team.id)}
                        className="cursor-pointer text-xs"
                      >
                        <Check
                          className={cn(
                            "size-3.5 shrink-0",
                            team.id === teamId ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{team.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Team: <span className="font-medium">{selectedTeam?.name}</span>
              </p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!trimmed || submitting}
            >
              {submitting ? "Creating…" : "Create & deploy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
