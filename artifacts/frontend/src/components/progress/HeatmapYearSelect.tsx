import { useTranslation } from "../../i18n/I18nProvider";

type Props = {
  years: number[];
  value: number;
  currentYear: number;
  onChange: (year: number) => void;
};

export function HeatmapYearSelect({ years, value, currentYear, onChange }: Props) {
  const { t } = useTranslation();
  const isCurrentYear = value === currentYear;

  return (
    <div className="flex items-center justify-end mb-3">
      <label className="flex items-center gap-2 text-xs text-app-text-muted">
        <span className="font-semibold uppercase tracking-wider">
          {t("progress.heatmap.year")}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-main-400/40 ${
            isCurrentYear
              ? "border-main-400 bg-main-50 text-main-600 dark:bg-main-950 dark:text-main-400"
              : "border-app-border bg-app-surface text-app-text"
          }`}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y === currentYear ? `${y} ★` : String(y)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
