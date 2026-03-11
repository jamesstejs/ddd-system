"use client";

import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

export interface EmailLogEntry {
  id: string;
  prijemce: string;
  predmet: string;
  stav: "odeslano" | "doruceno" | "chyba" | "cekajici";
  chyba_detail: string | null;
  odeslano_at: string | null;
  created_at: string;
}

interface EmailStatusSectionProps {
  emailLog: EmailLogEntry[];
  onRetry?: () => void;
  isRetrying?: boolean;
}

const stavConfig = {
  odeslano: {
    label: "Odesláno",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  doruceno: {
    label: "Doručeno",
    icon: CheckCircle,
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  chyba: {
    label: "Chyba",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  cekajici: {
    label: "Čekající",
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
};

export function EmailStatusSection({
  emailLog,
  onRetry,
  isRetrying,
}: EmailStatusSectionProps) {
  if (emailLog.length === 0) return null;

  const latest = emailLog[0];
  const config = stavConfig[latest.stav];
  const Icon = config.icon;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("cs-CZ", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${config.color}`} />
        <span className={`font-semibold text-sm ${config.color}`}>
          Email: {config.label}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <p>
          <span className="font-medium">Příjemce:</span> {latest.prijemce}
        </p>
        <p>
          <span className="font-medium">Odesláno:</span>{" "}
          {formatDate(latest.odeslano_at || latest.created_at)}
        </p>
      </div>

      {latest.stav === "chyba" && latest.chyba_detail && (
        <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-700">
          {latest.chyba_detail}
        </div>
      )}

      {latest.stav === "chyba" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 min-h-[44px]"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
          />
          {isRetrying ? "Odesílám..." : "Zkusit znovu"}
        </button>
      )}

      {emailLog.length > 1 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-500 cursor-pointer">
            Historie ({emailLog.length} záznamů)
          </summary>
          <div className="mt-2 space-y-2">
            {emailLog.slice(1).map((log) => {
              const logConfig = stavConfig[log.stav];
              const LogIcon = logConfig.icon;
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-2 text-xs text-gray-500"
                >
                  <LogIcon className={`h-3 w-3 ${logConfig.color}`} />
                  <span>{logConfig.label}</span>
                  <span>•</span>
                  <span>{formatDate(log.odeslano_at || log.created_at)}</span>
                  {log.stav === "chyba" && log.chyba_detail && (
                    <span className="text-red-500">
                      — {log.chyba_detail}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
