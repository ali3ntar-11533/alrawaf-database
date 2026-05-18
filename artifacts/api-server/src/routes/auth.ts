import { Router } from "express";
import { db, usersTable, userLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyPassword, hashPassword, seedAdminUser } from "../lib/auth-utils";

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
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? null;
  await db.insert(userLogsTable).values({ userId: user.id, loginName: user.loginName, ipAddress: ip });
  const { passwordHash: _h, ...safeUser } = user;
  res.json({ ...safeUser, lastActive: safeUser.lastActive?.toISOString() ?? null, createdAt: safeUser.createdAt.toISOString() });
});

router.post("/auth/heartbeat", async (req, res): Promise<void> => {
  const { loginName } = req.body as { loginName?: string };
  if (!loginName) { res.status(400).json({ error: "loginName required" }); return; }
  await db.update(usersTable).set({ lastActive: new Date() }).where(eq(usersTable.loginName, loginName));
  res.json({ ok: true });
});

router.put("/auth/profile", async (req, res): Promise<void> => {
  const { userId, name, jobTitle, loginName, password } = req.body as Record<string, string>;
  const id = parseInt(userId, 10);
  if (!id || !name?.trim() || !loginName?.trim()) {
    res.status(400).json({ error: "userId, name, loginName مطلوبة" });
    return;
  }
  const updates: Partial<typeof usersTable.$inferInsert> = {
    name:      name.trim(),
    jobTitle:  jobTitle?.trim() ?? "",
    loginName: loginName.trim(),
  };
  if (password) {
    updates.passwordHash = hashPassword(password);
    updates.rawPassword  = password;
  }
  const [row] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  const { passwordHash: _h, ...safeUser } = row;
  res.json({ ...safeUser, lastActive: safeUser.lastActive?.toISOString() ?? null, createdAt: safeUser.createdAt.toISOString() });
});

export default router;
