import { Button } from "@alpic-ai/ui/components/button";
import { Check } from "lucide-react";

export default function Nav({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex justify-end gap-2 mt-auto">
      <Button
        variant="secondary"
        disabled={current === 0}
        onClick={() => onChange(Math.max(current - 1, 0))}
      >
        Previous
      </Button>
      <Button
        disabled={current === total - 1}
        onClick={() => onChange(Math.min(current + 1, total - 1))}
      >
        <Check />
        Next
      </Button>
    </div>
  );
}
