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
      <label className="block text-xs font-semibold text-app-text-muted uppercase tracking-wider mb-1.5">
        {t(`${namespace}.iconLabel`)}
        <span className="normal-case font-normal text-app-text-muted">
          {" "}
          {t(`${namespace}.iconOptional`)}
        </span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(`${namespace}.iconPlaceholder`)}
        rows={4}
        className="w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2.5 text-xs text-app-text font-mono focus:outline-none focus:ring-2 focus:ring-main-300"
      />
      {value.trim() && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-app-border bg-app-muted px-3 py-2">
          <span className="text-[10px] font-semibold text-app-text-muted uppercase tracking-wider">
            {t(`${namespace}.iconPreview`)}
          </span>
          <CategoryIcon svg={value} size={24} />
        </div>
      )}
    </div>
  );
}
