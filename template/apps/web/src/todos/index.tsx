import { useEffect, useState, type FormEvent } from "react";
import { client } from "../shared/api";

type Todo = NonNullable<Awaited<ReturnType<typeof client.api.todos.get>>["data"]>[number];

/** The signed-in user's todo list. */
export function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load once; after that, each change updates the list from the API's response.
  useEffect(() => {
    let ignore = false;
    async function load() {
      const { data, error } = await client.api.todos.get();
      if (ignore) return;
      if (error) setErrorMessage(String(error.value));
      else setTodos(data);
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const { data, error } = await client.api.todos.post({ title: title.trim() });
    if (error) {
      setErrorMessage(String(error.value));
      return;
    }
    setTodos((current) => [data, ...current]);
    setTitle("");
  }

  async function toggle(todo: Todo) {
    const { data, error } = await client.api.todos({ id: todo.id }).patch({ done: !todo.done });
    if (error) {
      setErrorMessage(String(error.value));
      return;
    }
    setTodos((current) => current.map((t) => (t.id === data.id ? data : t)));
  }

  async function remove(todo: Todo) {
    const { error } = await client.api.todos({ id: todo.id }).delete();
    if (error) {
      setErrorMessage(String(error.value));
      return;
    }
    setTodos((current) => current.filter((t) => t.id !== todo.id));
  }

  return (
    <>
      <form onSubmit={add}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
        />
        <button type="submit">Add</button>
      </form>

      {errorMessage && <p className="error">{errorMessage}</p>}

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo)} />
              <span className={todo.done ? "done" : ""}>{todo.title}</span>
            </label>
            <button
              type="button"
              className="link"
              onClick={() => remove(todo)}
              aria-label={`Delete ${todo.title}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
