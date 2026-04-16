import type { AuthStatus } from "@/lib/auth-store.js";

const configs: Record<
  AuthStatus,
  { bg: string; dot: string; text: string; label: string }
> = {
  idle: {
    bg: "bg-gray-100",
    dot: "bg-gray-400",
    text: "text-gray-600",
    label: "Disconnected",
  },
  connecting: {
    bg: "bg-yellow-100",
    dot: "bg-yellow-500",
    text: "text-yellow-800",
    label: "Connecting...",
  },
  authenticated: {
    bg: "bg-green-100",
    dot: "bg-green-500",
    text: "text-green-800",
    label: "Connected",
  },
  unauthenticated: {
    bg: "bg-orange-100",
    dot: "bg-orange-500",
    text: "text-orange-800",
    label: "Login required",
  },
  error: {
    bg: "bg-red-100",
    dot: "bg-red-500",
    text: "text-red-800",
    label: "Error",
  },
};

export function StatusBadge({ status }: { status: AuthStatus }) {
  const c = configs[status];

  return (
    <span
      className={`flex items-center gap-1 rounded-full ${c.bg} px-2 py-0.5 text-xs font-semibold ${c.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${c.dot} mr-1 inline-block`} />
      {c.label}
    </span>
  );
}
