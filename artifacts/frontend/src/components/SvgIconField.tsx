import { CategoryIcon } from "./CategoryIcon";
import { useTranslation } from "../i18n/I18nProvider";

type IconFieldNamespace = "categories" | "themes";

interface Props {
  value: string;
  onChange: (value: string) => void;
  namespace?: IconFieldNamespace;
}

export function SvgIconField({
  value,
  onChange,
  namespace = "categories",
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      <label className="text-app-text-muted mb-1.5 block text-xs font-semibold tracking-wider uppercase">
        {t(`${namespace}.iconLabel`)}
        <span className="text-app-text-muted font-normal normal-case">
          {" "}
          {t(`${namespace}.iconOptional`)}
        </span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(`${namespace}.iconPlaceholder`)}
        rows={4}
        className="border-app-border-strong bg-app-surface text-app-text focus:ring-main-300 w-full rounded-xl border px-3 py-2.5 font-mono text-xs focus:ring-2 focus:outline-none"
      />
      {value.trim() && (
        <div className="border-app-border bg-app-muted mt-2 flex items-center gap-2 rounded-xl border px-3 py-2">
          <span className="text-app-text-muted text-[10px] font-semibold tracking-wider uppercase">
            {t(`${namespace}.iconPreview`)}
          </span>
          <CategoryIcon svg={value} size={24} />
        </div>
      )}
    </div>
  );
}
