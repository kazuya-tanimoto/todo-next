"use client";

import { useState, useEffect } from "react";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

type Theme = "mono" | "natural" | "brutal";

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

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [theme, setTheme] = useState<Theme>("brutal");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedTodos = localStorage.getItem("todos");
    const storedTheme = localStorage.getItem("theme") as Theme | null;

    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
    if (storedTheme && ["mono", "natural", "brutal"].includes(storedTheme)) {
      setTheme(storedTheme);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("todos", JSON.stringify(todos));
    }
  }, [todos, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, isLoaded]);

  // Set initial theme on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setTodos([newTodo, ...todos]);
    setInputValue("");
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8 transition-colors duration-300">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
            Todo
          </h1>
          <p className="text-[var(--fg-secondary)]">
            {totalCount === 0
              ? "No tasks yet. Add something!"
              : `${completedCount}/${totalCount} completed`}
          </p>
        </header>

        {/* Theme Switcher */}
        <div className="mb-8">
          <p className="text-sm font-medium text-[var(--fg-secondary)] mb-3">Theme</p>
          <div className="flex gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
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

        {/* Input Form */}
        <form onSubmit={addTodo} className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="What needs to be done?"
              className="theme-input flex-1 px-4 py-3 text-lg"
            />
            <button
              type="submit"
              className="theme-btn px-6 py-3"
              disabled={!inputValue.trim()}
            >
              Add
            </button>
          </div>
        </form>

        {/* Todo List */}
        <div className="space-y-3">
          {!isLoaded ? (
            <div className="py-8 text-center text-[var(--fg-secondary)]">Loading...</div>
          ) : todos.length === 0 ? (
            <div className="theme-card p-8 text-center">
              <div className="mb-2 text-4xl">📝</div>
              <p className="text-[var(--fg-secondary)]">Empty list. Time to add tasks!</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`theme-card group flex items-center gap-4 p-4 ${
                  todo.completed ? "todo-completed" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="theme-checkbox"
                />
                <span
                  className={`flex-1 text-lg ${
                    todo.completed ? "line-through text-[var(--fg-secondary)]" : ""
                  }`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="theme-delete px-3 py-1 font-bold"
                  aria-label="Delete task"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {completedCount > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setTodos(todos.filter((t) => !t.completed))}
              className="theme-btn px-4 py-2 text-sm"
            >
              Clear completed ({completedCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
