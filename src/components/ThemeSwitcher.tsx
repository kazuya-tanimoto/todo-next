"use client";

import { Theme } from "@/types";

const themes: { id: Theme; name: string; description: string; preview: string[] }[] = [
  {
    id: "mono",
    name: "Mono",
    description: "Clean & minimal",
    preview: ["#ffffff", "#0a0a0a", "#dc2626"],
  },
  {
    id: "natural",
    name: "Natural",
    description: "Warm & organic",
    preview: ["#faf6f1", "#3d3229", "#8b7355"],
  },
  {
    id: "brutal",
    name: "Brutal",
    description: "Bold & playful",
    preview: ["#fffef0", "#1a1a1a", "#ff6b35"],
  },
];

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function ThemeSwitcher({ theme, onThemeChange }: Props) {
  return (
    <div className="mb-8">
      <p className="text-sm font-medium text-[var(--fg-secondary)] mb-3">Theme</p>
      <div className="flex gap-3">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => onThemeChange(t.id)}
            className={`theme-option flex-1 p-3 text-left ${
              theme === t.id ? "active" : ""
            }`}
          >
            <div className="flex gap-1 mb-2">
              {t.preview.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border border-[var(--border)]"
                  style={{ background: color }}
                />
              ))}
            </div>
            <div className="font-semibold text-sm">{t.name}</div>
            <div className="text-xs text-[var(--fg-secondary)]">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
