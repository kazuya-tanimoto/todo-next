"use client";

import { useState, useEffect } from "react";
import { Todo } from "@/types";

export default function TodoSection() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedTodos = localStorage.getItem("todos");
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("todos", JSON.stringify(todos));
    }
  }, [todos, isLoaded]);

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
    <>
      <p className="text-[var(--fg-secondary)] mb-4">
        {totalCount === 0
          ? "No tasks yet. Add something!"
          : `${completedCount}/${totalCount} completed`}
      </p>

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
    </>
  );
}
