import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import {
  format,
  subDays,
  subMonths,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface DateRangeValue {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  className?: string;
}

const PRESETS = [
  {
    label: "Hari Ini",
    getValue: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    label: "Kemarin",
    getValue: () => ({
      from: subDays(new Date(), 1),
      to: subDays(new Date(), 1),
    }),
  },
  {
    label: "7 Hari Terakhir",
    getValue: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: "30 Hari Terakhir",
    getValue: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: "90 Hari Terakhir",
    getValue: () => ({
      from: subDays(new Date(), 89),
      to: new Date(),
    }),
  },
  {
    label: "Minggu Ini",
    getValue: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: "Minggu Lalu",
    getValue: () => {
      const lastWeek = subDays(new Date(), 7);
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    },
  },
  {
    label: "Bulan Ini",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Bulan Lalu",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    label: "Quarter Ini",
    getValue: () => ({
      from: startOfQuarter(new Date()),
      to: endOfQuarter(new Date()),
    }),
  },
  {
    label: "Quarter Lalu",
    getValue: () => {
      const lastQuarter = subMonths(new Date(), 3);
      return {
        from: startOfQuarter(lastQuarter),
        to: endOfQuarter(lastQuarter),
      };
    },
  },
  {
    label: "Tahun Ini",
    getValue: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
  {
    label: "Tahun Lalu",
    getValue: () => {
      const lastYear = subYears(new Date(), 1);
      return {
        from: startOfYear(lastYear),
        to: endOfYear(lastYear),
      };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>({
    from: value.from,
    to: value.to,
  });

  const handlePresetClick = (preset: (typeof PRESETS)[0]) => {
    const range = preset.getValue();
    onChange(range);
    setCustomRange({ from: range.from, to: range.to });
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customRange?.from && customRange?.to) {
      onChange({
        from: customRange.from,
        to: customRange.to,
      });
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setCustomRange({ from: value.from, to: value.to });
    setIsOpen(false);
  };

  const formatDateRange = () => {
    const fromStr = format(value.from, "d MMM yyyy", { locale: id });
    const toStr = format(value.to, "d MMM yyyy", { locale: id });

    if (fromStr === toStr) {
      return fromStr;
    }

    return `${fromStr} - ${toStr}`;
  };

  const getDaysDiff = () => {
    const diff = Math.ceil(
      (value.to.getTime() - value.from.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff + 1;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal min-w-[280px]",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1">{formatDateRange()}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            ({getDaysDiff()} hari)
          </span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets Sidebar */}
          <div className="border-r p-2 space-y-1 w-48">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
              Preset Period
            </div>
            <div className="space-y-1">
              {PRESETS.map((preset, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm font-normal"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Calendar */}
          <div className="p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold mb-1">Custom Range</div>
              <div className="text-xs text-muted-foreground">
                Pilih tanggal mulai dan selesai
              </div>
            </div>

            <div className="space-y-4">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                numberOfMonths={2}
                disabled={(date) => date > new Date()}
                locale={id}
                className="rounded-md border"
              />

              {customRange?.from && customRange?.to && (
                <div className="p-3 bg-muted rounded-md text-sm">
                  <div className="font-medium mb-1">Range terpilih:</div>
                  <div className="text-muted-foreground">
                    {format(customRange.from, "d MMMM yyyy", { locale: id })} -{" "}
                    {format(customRange.to, "d MMMM yyyy", { locale: id })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    (
                    {Math.ceil(
                      (customRange.to.getTime() - customRange.from.getTime()) /
                        (1000 * 60 * 60 * 24),
                    ) + 1}{" "}
                    hari)
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleCustomApply}
                  disabled={!customRange?.from || !customRange?.to}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
