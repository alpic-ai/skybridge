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
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import type { SavedInput } from "@/lib/saved-inputs-store.js";
import { cn } from "@/lib/utils.js";

export function SavedInputsDropdown({
  inputs,
  activeKey,
  onSelect,
  onClear,
  onDelete,
}: {
  inputs: SavedInput[];
  activeKey: string | null;
  onSelect: (saved: SavedInput) => void;
  onClear: () => void;
  onDelete: (key: string) => void;
}) {
  const label = activeKey ?? "Input";
  const display = label.length > 12 ? `${label.slice(0, 12)}…` : label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring aria-expanded:text-foreground"
        >
          <span>{display}</span>
          <ChevronDown className="size-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {inputs.length === 0 ? (
          <DropdownMenuItem
            disabled
            className="font-mono text-xs font-normal text-muted-foreground"
          >
            No saved input yet
          </DropdownMenuItem>
        ) : (
          <>
            {/* "none" unselects the active input and clears the form. */}
            <DropdownMenuItem
              onSelect={onClear}
              className="cursor-pointer font-mono text-xs font-normal"
              disabled={inputs.length <= 0}
            >
              {inputs.length > 0 && (
                <Check
                  className={cn(
                    "size-3.5 shrink-0",
                    activeKey === null ? "opacity-100" : "opacity-0",
                  )}
                />
              )}

              <span className="text-muted-foreground italic">
                {inputs.length > 0 ? "none" : "no saved input yet"}
              </span>
            </DropdownMenuItem>
            {inputs.map((saved) => (
              <div key={saved.key} className="group/item relative">
                <DropdownMenuItem
                  onSelect={() =>
                    saved.key === activeKey ? onClear() : onSelect(saved)
                  }
                  className="cursor-pointer pr-8 font-mono text-xs font-normal"
                >
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      saved.key === activeKey ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{saved.key}</span>
                </DropdownMenuItem>
                <button
                  type="button"
                  aria-label={`Delete saved input ${saved.key}`}
                  onClick={() => onDelete(saved.key)}
                  className="absolute top-1/2 right-2.5 inline-flex -translate-y-1/2 cursor-pointer rounded p-1 text-light-gray-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/item:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SaveInputDialog({
  open,
  onOpenChange,
  defaultKey,
  existingKeys,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKey: string;
  existingKeys: string[];
  onSave: (key: string) => void;
}) {
  const inputId = useId();
  const [key, setKey] = useState(defaultKey);
  const trimmed = key.trim();
  const isOverwrite = trimmed.length > 0 && existingKeys.includes(trimmed);

  // Prefill the field each time the dialog (re)opens: with the active input's
  // key, so saving over it is one click.
  useEffect(() => {
    if (open) {
      setKey(defaultKey);
    }
  }, [open, defaultKey]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed) {
      return;
    }
    onSave(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save input</DialogTitle>
          <DialogDescription>
            Save the current values to reuse it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={inputId}>Name</Label>
            <Input
              id={inputId}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="e.g. happy path"
              autoFocus
            />
            {isOverwrite && (
              <p className="text-xs text-muted-foreground">
                An input named "{trimmed}" already exists: it will be
                overwritten.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!trimmed}>
              {isOverwrite ? "Overwrite" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
