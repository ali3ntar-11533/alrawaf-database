import { Router } from "express";
import { writeFileSync } from "fs";
import { sql } from "drizzle-orm";
import { db, usersTable, userLogsTable, contractorsTable, itemCodeMapTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { hashPassword, verifyPassword, requireAdmin, getSeedFilePath } from "../lib/auth-utils";

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

/** Writes the full user list to users-seed.json so it survives fresh deployments */
async function writeSeedFile(): Promise<void> {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(usersTable.createdAt);
    const seedData = {
      users: users.map((u) => ({
        name: u.name,
        loginName: u.loginName,
        jobTitle: u.jobTitle,
        role: u.role,
        rawPassword: u.rawPassword ?? "",
        isActive: u.isActive,
      })),
    };
    writeFileSync(getSeedFilePath(), JSON.stringify(seedData, null, 2), "utf8");
  } catch {
    // Non-fatal — seed file update is best-effort
  }
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
  await writeSeedFile();
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
  await writeSeedFile();
  res.json(safeUser(row));
});

router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  if (target.role === "superadmin") {
    res.status(403).json({ error: "لا يمكن حذف مسؤول النظام" });
    return;
  }
  await db.delete(userLogsTable).where(eq(userLogsTable.userId, id));
  const [row] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await writeSeedFile();
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

/**
 * DANGER: bulk-wipe BOQ items (contractors) + item code allocator.
 * Strictly does NOT touch users or user_logs — preserves all accounts.
 * Requires superadmin (via requireAdmin) AND a re-entered password.
 */
router.post("/admin/wipe-items", async (req, res): Promise<void> => {
  const loginName = req.headers["x-admin-login"] as string;
  const { password } = req.body as { password?: string };
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "كلمة المرور مطلوبة" });
    return;
  }
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.loginName, loginName));
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    req.log.warn({ loginName }, "wipe-items: password verification failed");
    res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    return;
  }

  let deletedContractors = 0;
  let deletedCodes = 0;
  try {
    await db.transaction(async (tx) => {
      const before = await tx.execute(sql`SELECT COUNT(*)::int AS n FROM contractors`);
      deletedContractors = Number((before.rows[0] as { n: number }).n);
      const beforeCodes = await tx.execute(sql`SELECT COUNT(*)::int AS n FROM item_code_map`);
      deletedCodes = Number((beforeCodes.rows[0] as { n: number }).n);

      await tx.delete(contractorsTable);
      await tx.delete(itemCodeMapTable);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير معروف";
    req.log.error({ err: msg }, "wipe-items: transaction failed");
    res.status(500).json({ error: msg });
    return;
  }

  req.log.warn(
    { actor: loginName, deletedContractors, deletedCodes },
    "wipe-items: BOQ tables cleared (users preserved)",
  );
  res.json({
    ok: true,
    deletedContractors,
    deletedCodes,
    message: `تم تصفير ${deletedContractors} بند و ${deletedCodes} كود — حسابات المستخدمين سليمة`,
  });
});

export default router;
