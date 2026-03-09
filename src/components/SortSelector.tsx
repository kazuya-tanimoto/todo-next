import { SortMode } from "@/types";

interface Props {
  sortMode: SortMode;
  onChange: (mode: SortMode) => void;
}

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "manual", label: "手動" },
  { value: "created", label: "作成日" },
  { value: "name", label: "名前" },
  { value: "completed", label: "完了状態" },
];

export default function SortSelector({ sortMode, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--fg-secondary)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="16" y2="6" />
          <line x1="4" y1="12" x2="12" y2="12" />
          <line x1="4" y1="18" x2="8" y2="18" />
          <polyline points="15 15 18 18 21 15" />
          <line x1="18" y1="10" x2="18" y2="18" />
        </svg>
        並び替え
      </div>
      <select
        value={sortMode}
        onChange={(e) => onChange(e.target.value as SortMode)}
        className="theme-input px-2 py-1 text-sm"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
