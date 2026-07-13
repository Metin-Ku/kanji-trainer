import { useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative flex items-center">
      <Search
        size={17}
        strokeWidth={2}
        className={`absolute left-2.5 pointer-events-none shrink-0 ${focused ? "text-main-400 dark:text-main-500 transition-colors duration-100" : "text-app-text-secondary transition-colors duration-100"}`}
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
        className={`rounded-sm w-full pl-8 pr-7 py-1.5 border bg-gray-50 dark:bg-app-border text-sm text-app-text placeholder-app-text-secondary outline-none transition-all duration-150
          ${
            focused
              ? "border-main-400 ring-2 ring-main-400 dark:ring-main-500 dark:border-main-500 dark:ring-main-500 ring-inset ring-offset-0"
              : "border-app-border-strong"
          }
        `}
        // style={{
        //   borderRadius: "0.5rem",
        //   boxShadow: focused ? "inset 0 0 0 2px rgb(251,146,60)" : "none",
        //   borderColor: focused ? "transparent" : undefined,
        //   transition: "box-shadow 0.12s ease, border-color 0.12s ease",
        // }}
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-1.5 flex items-center justify-center text-white active:opacity-80"
          style={{
            width: "2.6rem",
            height: "1.45rem",
            background: "rgb(248,113,113)",
            borderRadius: "9999px",
            flexShrink: 0,
          }}
        >
          <X size={11} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
