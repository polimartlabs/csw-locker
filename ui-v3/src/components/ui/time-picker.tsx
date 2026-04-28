import * as React from "react";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type TimePickerValue = string;

type TimePickerProps = {
  /** "HH:mm" in 24-hour form (empty string when unset). */
  value: TimePickerValue;
  onChange: (next: TimePickerValue) => void;
  minuteStep?: 1 | 5 | 10 | 15 | 30;
  disabled?: boolean;
  className?: string;
  id?: string;
};

function parse24(value: string): { h24: number | null; m: number | null } {
  if (!value) return { h24: null, m: null };
  const [hStr, mStr] = value.split(":");
  const h24 = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h24) || !Number.isFinite(m)) return { h24: null, m: null };
  return { h24, m };
}

function compose24(h12: number, minute: number, meridiem: "AM" | "PM"): string {
  let h24 = h12 % 12;
  if (meridiem === "PM") h24 += 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h24)}:${pad(minute)}`;
}

function h24ToH12(h24: number): { h12: number; meridiem: "AM" | "PM" } {
  const meridiem: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h12, meridiem };
}

export function TimePicker({ value, onChange, minuteStep = 5, disabled, className, id }: TimePickerProps) {
  const { h24, m } = parse24(value);
  const current =
    h24 !== null && m !== null
      ? { ...h24ToH12(h24), minute: m }
      : { h12: 12, meridiem: "AM" as const, minute: 0 };

  const hours = React.useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const minutes = React.useMemo(
    () => Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep]
  );

  const pad = (n: number) => String(n).padStart(2, "0");

  const emit = (h12: number, minute: number, meridiem: "AM" | "PM") => {
    onChange(compose24(h12, minute, meridiem));
  };

  const triggerClass =
    "h-10 bg-slate-900 border-slate-600 text-white hover:bg-slate-800 focus:ring-1 focus:ring-purple-500 data-[state=open]:ring-1 data-[state=open]:ring-purple-500";
  const contentClass = "bg-slate-900 border-slate-700 text-white max-h-64";

  return (
    <div id={id} className={cn("flex items-center gap-1.5", className)}>
      <Clock className="h-4 w-4 text-purple-300 shrink-0" />
      <Select
        disabled={disabled}
        value={String(current.h12)}
        onValueChange={(v) => emit(Number(v), current.minute, current.meridiem)}
      >
        <SelectTrigger className={cn(triggerClass, "w-[70px] tabular-nums")} aria-label="Hour">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClass}>
          {hours.map((h) => (
            <SelectItem key={h} value={String(h)} className="focus:bg-slate-800">
              {pad(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-slate-400 font-bold">:</span>

      <Select
        disabled={disabled}
        value={String(current.minute)}
        onValueChange={(v) => emit(current.h12, Number(v), current.meridiem)}
      >
        <SelectTrigger className={cn(triggerClass, "w-[70px] tabular-nums")} aria-label="Minute">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClass}>
          {minutes.map((mi) => (
            <SelectItem key={mi} value={String(mi)} className="focus:bg-slate-800">
              {pad(mi)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        disabled={disabled}
        value={current.meridiem}
        onValueChange={(v) => emit(current.h12, current.minute, v as "AM" | "PM")}
      >
        <SelectTrigger className={cn(triggerClass, "w-[72px]")} aria-label="AM or PM">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={contentClass}>
          <SelectItem value="AM" className="focus:bg-slate-800">AM</SelectItem>
          <SelectItem value="PM" className="focus:bg-slate-800">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
