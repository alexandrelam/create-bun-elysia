import { useEffect, useState, type FormEvent } from "react";
import { client } from "./api";

type Todo = NonNullable<Awaited<ReturnType<typeof client.api.todos.get>>["data"]>[number];

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await client.api.todos.get();
    if (error) return setError(String(error.value));
    setTodos(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { error } = await client.api.todos.post({ title: title.trim() });
    if (error) return setError(String(error.value));
    setTitle("");
    load();
  }

  async function toggle(todo: Todo) {
    await client.api.todos({ id: todo.id }).patch({ done: !todo.done });
    load();
  }

  async function remove(todo: Todo) {
    await client.api.todos({ id: todo.id }).delete();
    load();
  }

  return (
    <main>
      <h1>__APP_NAME__</h1>
      <p className="muted">Bun · Elysia · Drizzle · SQLite · React</p>

      <form onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo)} />
              <span className={todo.done ? "done" : ""}>{todo.title}</span>
            </label>
            <button className="link" onClick={() => remove(todo)} aria-label={`Delete ${todo.title}`}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
