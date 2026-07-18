import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { useTranslation } from "../i18n/I18nProvider";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}

type PendingState = ConfirmOptions & { resolve: (value: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingState | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const opts = typeof options === "string" ? { message: options } : options;
      setPending({ ...opts, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === backdropRef.current) close(false);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-999 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={handleBackdropClick}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="bg-app-surface border-app-border w-full rounded-t-2xl border p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2
                id="confirm-dialog-title"
                className="text-app-text text-lg font-bold"
              >
                {pending.title ?? t("common.confirmTitle")}
              </h2>
              <button
                type="button"
                onClick={() => close(false)}
                className="hover:bg-app-muted text-app-text-muted shrink-0 rounded-full p-1.5"
                aria-label={t("common.cancel")}
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-app-text-secondary mb-5 text-sm leading-relaxed">
              {pending.message}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="border-app-border-strong text-app-text flex-1 rounded-xl border py-2.5 text-sm font-semibold"
              >
                {pending.cancelLabel ?? t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                {pending.confirmLabel ?? t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
