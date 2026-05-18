import { Router } from "express";
import { db, usersTable, userLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyPassword, seedAdminUser } from "../lib/auth-utils";

void seedAdminUser();

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { loginName, password } = req.body as { loginName?: string; password?: string };
  if (!loginName || !password) {
    res.status(400).json({ error: "loginName and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.loginName, loginName.trim()));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "الحساب غير مفعل" });
    return;
  }
  await db.update(usersTable).set({ lastActive: new Date() }).where(eq(usersTable.id, user.id));
  await db.insert(userLogsTable).values({ userId: user.id, loginName: user.loginName });
  const { passwordHash: _h, ...safeUser } = user;
  res.json({ ...safeUser, lastActive: safeUser.lastActive?.toISOString() ?? null, createdAt: safeUser.createdAt.toISOString() });
});

router.post("/auth/heartbeat", async (req, res): Promise<void> => {
  const { loginName } = req.body as { loginName?: string };
  if (!loginName) { res.status(400).json({ error: "loginName required" }); return; }
  await db.update(usersTable).set({ lastActive: new Date() }).where(eq(usersTable.loginName, loginName));
  res.json({ ok: true });
});

export default router;
