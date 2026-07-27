import { cn } from "@/lib/utils";
import type { ProductUnit } from "@/types";
import { unitLabel } from "@/stores/cart";

export function UnitSelector({
  units,
  value,
  onChange,
  className,
}: {
  units: ProductUnit[];
  value: ProductUnit;
  onChange: (u: ProductUnit) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 p-1 rounded-full bg-muted", className)}>
      {units.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onChange(u)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-full transition",
            value === u
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {unitLabel(u)}
        </button>
      ))}
    </div>
  );
}
