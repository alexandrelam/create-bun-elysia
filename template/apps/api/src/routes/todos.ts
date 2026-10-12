import { desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { todos } from "../db/schema";

export const todoRoutes = new Elysia({ prefix: "/todos" })
  .get("/", () => db.select().from(todos).orderBy(desc(todos.id)).all())
  .post("/", ({ body }) => db.insert(todos).values(body).returning().get(), {
    body: t.Object({ title: t.String({ minLength: 1 }) }),
  })
  .patch(
    "/:id",
    ({ params, body, status }) => {
      const todo = db.update(todos).set(body).where(eq(todos.id, params.id)).returning().get();
      return todo ?? status(404, "Todo not found");
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1 })),
        done: t.Optional(t.Boolean()),
      }),
    },
  )
  .delete(
    "/:id",
    ({ params, status }) => {
      const todo = db.delete(todos).where(eq(todos.id, params.id)).returning().get();
      return todo ?? status(404, "Todo not found");
    },
    { params: t.Object({ id: t.Numeric() }) },
  );
