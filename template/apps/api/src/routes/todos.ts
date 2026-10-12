import { and, desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../db";
import { todos } from "../db/schema";
import { authPlugin } from "../lib/auth";

export const todoRoutes = new Elysia({ prefix: "/api/todos" })
  .use(authPlugin)
  .guard({ auth: true })
  .get("/", ({ user }) =>
    db.select().from(todos).where(eq(todos.userId, user.id)).orderBy(desc(todos.id)).all(),
  )
  .post("/", ({ body, user }) => db.insert(todos).values({ ...body, userId: user.id }).returning().get(), {
    body: t.Object({ title: t.String({ minLength: 1 }) }),
  })
  .patch(
    "/:id",
    ({ params, body, user, status }) => {
      const todo = db
        .update(todos)
        .set(body)
        .where(and(eq(todos.id, params.id), eq(todos.userId, user.id)))
        .returning()
        .get();
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
    ({ params, user, status }) => {
      const todo = db
        .delete(todos)
        .where(and(eq(todos.id, params.id), eq(todos.userId, user.id)))
        .returning()
        .get();
      return todo ?? status(404, "Todo not found");
    },
    { params: t.Object({ id: t.Numeric() }) },
  );
