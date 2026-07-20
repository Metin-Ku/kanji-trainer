import { useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wordCount?: number;
  wordCountLoading?: boolean;
  onWordCountClick?: () => void;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "",
  wordCount,
  wordCountLoading = false,
  onWordCountClick,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative flex items-center">
      <Search
        size={17}
        strokeWidth={2}
        className={`pointer-events-none absolute left-2.5 shrink-0 ${focused ? "text-main-400 dark:text-main-500 transition-colors duration-100" : "text-app-text-secondary transition-colors duration-100"}`}
        // style={{
        //   color: focused ? "rgb(251,146,60)" : "rgb(209,213,219)",
        //   transition: "color 0.12s ease",
        // }}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`dark:bg-app-border text-app-text placeholder-app-text-secondary w-full rounded-sm border bg-gray-50 py-1.5 pr-7 pl-8 text-sm transition-all duration-150 outline-none ${
          focused
            ? "border-main-400 ring-main-400 dark:ring-main-500 dark:border-main-500 ring-2 ring-offset-0 ring-inset"
            : "border-app-border-strong"
        } `}
        // style={{
        //   borderRadius: "0.5rem",
        //   boxShadow: focused ? "inset 0 0 0 2px rgb(251,146,60)" : "none",
        //   borderColor: focused ? "transparent" : undefined,
        //   transition: "box-shadow 0.12s ease, border-color 0.12s ease",
        // }}
      />
      {!value && wordCount !== undefined && onWordCountClick && (
        <button
          type="button"
          onClick={onWordCountClick}
          disabled={wordCountLoading}
          className="bg-main-500 dark:bg-main-600 dark:text-app-text absolute right-1.5 flex h-[1.55rem] shrink-0 items-center justify-center rounded-sm px-2 text-xs font-bold text-white active:opacity-80 disabled:opacity-90"
        >
          {wordCountLoading ? (
            <span className="relative inline-flex items-center justify-center">
              <LoadingSpinner size={14} className="text-white" />
              <span className="invisible">
              2
              </span>
              <span> {t("common.words")}</span>
            </span>
          ) : (
            t("common.wordCount", { count: wordCount })
          )}
        </button>
      )}
      {value && (
        <button
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-1.5 flex items-center justify-center text-white active:opacity-80"
          style={{
            width: "2.6rem",
            height: "1.55rem",
            background: "rgb(248,113,113)",
            borderRadius: "9999px",
            flexShrink: 0,
          }}
        >
          <X size={13} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
