import { useEffect, useMemo, useRef, useState } from "react";
import { format as formatDate } from "date-fns";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type UnlockDateTimePickerProps = {
  value: Date | null;
  onChange: (next: Date | null) => void;
  /** Minimum selectable instant. If `null`, any future moment is allowed. */
  minDate?: Date;
  /** Step (minutes) used by the minute incrementers and presets. Default 5. */
  minuteStep?: number;
  className?: string;
  id?: string;
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

const QUICK_PRESETS: Array<{ label: string; addMinutes: number }> = [
  { label: "+1 h", addMinutes: 60 },
  { label: "+6 h", addMinutes: 6 * 60 },
  { label: "+24 h", addMinutes: 24 * 60 },
  { label: "+7 d", addMinutes: 7 * 24 * 60 },
  { label: "+30 d", addMinutes: 30 * 24 * 60 },
];

function clampToMin(d: Date, minDate?: Date): Date {
  if (minDate && d.getTime() < minDate.getTime()) return new Date(minDate.getTime());
  return d;
}

function cloneWithTime(base: Date, hour: number, minute: number): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * A single-popover, touch-friendly combined date + time picker optimised for "unlock at X" UX.
 *
 *  - Calendar on top, hour/minute steppers side-by-side below.
 *  - "Quick" row adds N minutes relative to *now* (handy for "+1 h", "+24 h" etc.).
 *  - Live summary inside the popover tells the user exactly when the lock will open.
 *  - Honours `minDate` — the Done button is disabled while the current selection is too early.
 */
export function UnlockDateTimePicker({
  value,
  onChange,
  minDate,
  minuteStep = 5,
  className,
  id,
}: UnlockDateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Internal draft state — committed to the parent on "Done" so clicks inside the picker
  // don't prematurely overwrite the parent's value (which would close other downstream UI).
  const [draft, setDraft] = useState<Date>(() => value ?? new Date(Date.now() + 60 * 60 * 1000));
  const seededFrom = useRef<number | null>(null);

  // Re-seed the draft every time the popover opens with the parent's current value.
  useEffect(() => {
    if (open) {
      const next = value ?? new Date(Date.now() + 60 * 60 * 1000);
      setDraft(next);
      seededFrom.current = next.getTime();
    }
  }, [open, value]);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [open]);

  const hour = draft.getHours();
  const minute = draft.getMinutes();

  const minuteStepSafe = Math.max(1, Math.min(30, minuteStep));

  const bumpMinute = (delta: number) => {
    const nextMinTotal = (hour * 60 + minute + delta + 24 * 60) % (24 * 60);
    const nextH = Math.floor(nextMinTotal / 60);
    const nextM = nextMinTotal % 60;
    setDraft(cloneWithTime(draft, nextH, nextM));
  };

  const bumpHour = (delta: number) => {
    const h = (hour + delta + 24) % 24;
    setDraft(cloneWithTime(draft, h, minute));
  };

  const applyPreset = (addMinutes: number) => {
    const base = new Date(Date.now() + addMinutes * 60_000);
    // Round to the nearest minute-step so the pickers look tidy.
    const rounded = new Date(base);
    const m = Math.round(rounded.getMinutes() / minuteStepSafe) * minuteStepSafe;
    rounded.setMinutes(Math.min(59, m), 0, 0);
    setDraft(clampToMin(rounded, minDate));
  };

  const diffMs = draft.getTime() - nowTick;
  const isTooEarly = minDate ? draft.getTime() < minDate.getTime() : diffMs <= 0;
  const summary = useMemo(() => {
    if (isTooEarly) return "Pick a time further in the future.";
    const sec = Math.floor(Math.abs(diffMs) / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h === 0) return `Unlocks in ${m} min`;
    if (h < 48) return `Unlocks in ${h} h ${m} min`;
    const d = Math.floor(h / 24);
    return `Unlocks in ~${d} d`;
  }, [diffMs, isTooEarly]);

  const commit = () => {
    if (isTooEarly) return;
    onChange(draft);
    setOpen(false);
  };

  const triggerLabel = value ? formatDate(value, "PPP p") : "Pick a date & time";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full h-11 justify-start text-left font-normal bg-slate-900 border-slate-600 text-white hover:bg-slate-800 hover:text-white",
            !value && "text-slate-400",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-purple-300" />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-slate-900 border-slate-700 shadow-xl"
        align="start"
        sideOffset={6}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Calendar */}
          <div className="p-2 sm:border-r sm:border-slate-700">
            <CalendarPicker
              mode="single"
              selected={draft}
              onSelect={(d) => {
                if (!d) return;
                setDraft(cloneWithTime(d, hour, minute));
              }}
              disabled={(d) => {
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                return d < start;
              }}
              initialFocus
            />
          </div>

          {/* Time panel */}
          <div className="p-3 w-full sm:w-56 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase tracking-wide font-semibold">
              <Clock className="h-3.5 w-3.5" />
              Time
            </div>

            <div className="flex items-center justify-center gap-2">
              {/* Hour */}
              <TimeStepper
                label="HH"
                value={hour}
                onUp={() => bumpHour(+1)}
                onDown={() => bumpHour(-1)}
                onChange={(v) => {
                  const h = Math.max(0, Math.min(23, v));
                  setDraft(cloneWithTime(draft, h, minute));
                }}
                formatValue={(v) => String(v).padStart(2, "0")}
                options={HOUR_OPTIONS}
              />
              <div className="text-slate-400 text-xl font-semibold pb-1">:</div>
              {/* Minute */}
              <TimeStepper
                label="MM"
                value={minute}
                onUp={() => bumpMinute(+minuteStepSafe)}
                onDown={() => bumpMinute(-minuteStepSafe)}
                onChange={(v) => {
                  const m = Math.max(0, Math.min(59, v));
                  setDraft(cloneWithTime(draft, hour, m));
                }}
                formatValue={(v) => String(v).padStart(2, "0")}
                options={Array.from({ length: 60 / minuteStepSafe }, (_, i) => i * minuteStepSafe)}
              />
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-1.5">
                Quick
              </div>
              <div className="flex flex-wrap gap-1">
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.addMinutes)}
                    className="px-2 py-1 rounded border border-slate-700 bg-slate-800/70 text-slate-200 text-[11px] hover:bg-slate-700"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "rounded-md border p-2 text-[11px]",
                isTooEarly
                  ? "border-red-900/40 bg-red-950/20 text-red-300"
                  : "border-emerald-900/40 bg-emerald-950/20 text-emerald-200"
              )}
            >
              {summary}
              <div className="text-slate-400 mt-0.5 text-[10px]">
                {formatDate(draft, "PPP p")}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-slate-300"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white"
                onClick={commit}
                disabled={isTooEarly}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Vertical stepper: up-arrow, 2-digit input, down-arrow. Also exposes a <select> on hover. */
function TimeStepper({
  label,
  value,
  onUp,
  onDown,
  onChange,
  formatValue,
  options,
}: {
  label: string;
  value: number;
  onUp: () => void;
  onDown: () => void;
  onChange: (n: number) => void;
  formatValue: (n: number) => string;
  options: number[];
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={onUp}
        className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
        aria-label={`Increase ${label}`}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <div className="relative">
        <input
          aria-label={label}
          type="text"
          inputMode="numeric"
          value={formatValue(value)}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-12 h-10 rounded bg-slate-800 border border-slate-700 text-center text-lg font-semibold tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <select
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label={`${label} select`}
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {formatValue(o)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onDown}
        className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
        aria-label={`Decrease ${label}`}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <span className="text-[9px] text-slate-500 uppercase font-semibold">{label}</span>
    </div>
  );
}

export default UnlockDateTimePicker;
