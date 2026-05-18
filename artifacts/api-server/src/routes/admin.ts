import { Router } from "express";
import { db, usersTable, userLogsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { hashPassword, requireAdmin } from "../lib/auth-utils";

const router = Router();
router.use(requireAdmin);

function safeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _h, ...safe } = user;
  return {
    ...safe,
    lastActive: safe.lastActive?.toISOString() ?? null,
    createdAt: safe.createdAt.toISOString(),
  };
}


router.get("/admin/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(safeUser));
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const { name, loginName, jobTitle, role, password } = req.body as Record<string, string>;
  if (!name || !loginName || !password) {
    res.status(400).json({ error: "name, loginName, password required" });
    return;
  }
  const [row] = await db.insert(usersTable).values({
    name, loginName, jobTitle: jobTitle || "", role: role || "user",
    passwordHash: hashPassword(password), rawPassword: password, isActive: 1,
  }).returning();
  res.status(201).json(safeUser(row));
});

router.put("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { name, loginName, jobTitle, role, password, isActive } = req.body as Record<string, string | number>;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined)     updates.name     = name as string;
  if (loginName !== undefined) updates.loginName = loginName as string;
  if (jobTitle !== undefined) updates.jobTitle  = jobTitle as string;
  if (role !== undefined)     updates.role      = role as string;
  if (isActive !== undefined) updates.isActive  = Number(isActive);
  if (password) {
    updates.passwordHash = hashPassword(password as string);
    updates.rawPassword  = password as string;
  }
  const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(safeUser(row));
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.role === "admin" && target.loginName === (process.env.ADMIN_LOGIN_NAME ?? "ali3ntar")) {
    res.status(403).json({ error: "لا يمكن حذف المسؤول الرئيسي" });
    return;
  }
  await db.delete(userLogsTable).where(eq(userLogsTable.userId, id));
  const [row] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

router.get("/admin/users/:id/logs", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  const sevenDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const logs = await db.select().from(userLogsTable)
    .where(and(eq(userLogsTable.userId, userId), gte(userLogsTable.loginAt, sevenDaysAgo)))
    .orderBy(desc(userLogsTable.loginAt));
  res.json(logs.map(l => ({ ...l, loginAt: l.loginAt.toISOString() })));
});

export default router;
