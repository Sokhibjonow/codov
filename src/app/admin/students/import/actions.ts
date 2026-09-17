"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { format } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { formText, type Credential } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readTable, toImportRows, type ImportState, type PreviewRow } from "@/lib/import";
import { generatePassword, hashPassword } from "@/lib/password";
import { fullName, loginBase, normalizePhone, pickUniqueLogin } from "@/lib/users";

const MAX_ROWS = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function previewImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES) {
    return { ok: false, message: t.import.errors.file };
  }

  let rows;
  try {
    rows = toImportRows(await readTable(file));
  } catch {
    return { ok: false, message: t.import.errors.file };
  }
  rows = rows.filter((r) => r.firstName || r.lastName || r.phone || r.group);

  if (rows.length === 0) return { ok: false, message: t.import.errors.empty };
  if (rows.length > MAX_ROWS) return { ok: false, message: t.import.errors.tooMany };

  const groups = await prisma.group.findMany({ select: { name: true } });
  const groupNames = new Set(groups.map((g) => g.name.trim().toLowerCase()));

  const parentPhones = rows.map((r) => normalizePhone(r.parentPhone)).filter((p): p is string => !!p);
  const parents = await prisma.user.findMany({
    where: { role: "PARENT", phone: { in: parentPhones } },
    select: { phone: true },
  });
  const knownParentPhones = new Set(parents.map((p) => p.phone));

  const preview: PreviewRow[] = rows.map((row) => {
    const parentPhone = normalizePhone(row.parentPhone);
    return {
      ...row,
      error: row.firstName ? undefined : t.import.errors.noName,
      groupIsNew: !!row.group && !groupNames.has(row.group.toLowerCase()),
      parentExists: !!parentPhone && knownParentPhones.has(parentPhone),
    };
  });

  return { ok: true, rows: preview };
}

const rowSchema = z.object({
  line: z.number(),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60),
  phone: z.string().trim().max(30),
  group: z.string().trim().max(80),
  parentFirstName: z.string().trim().max(60),
  parentLastName: z.string().trim().max(60),
  parentPhone: z.string().trim().max(30),
});

export async function commitImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  let rows;
  try {
    rows = z.array(rowSchema).min(1).max(MAX_ROWS).parse(JSON.parse(formText(formData, "rows")));
  } catch {
    return { ok: false, message: t.common.errors.generic };
  }

  // bcrypt is slow: hash everything before opening the transaction
  const prepared = await Promise.all(
    rows.map(async (row) => {
      const password = generatePassword();
      const parentPassword = row.parentFirstName ? generatePassword() : null;
      return {
        row,
        password,
        passwordHash: await hashPassword(password),
        parentPassword,
        parentHash: parentPassword ? await hashPassword(parentPassword) : null,
      };
    }),
  );

  const credentials: Credential[] = [];

  await prisma.$transaction(
    async (tx) => {
      const groupIds = new Map<string, string>();
      for (const g of await tx.group.findMany({ select: { id: true, name: true } })) {
        groupIds.set(g.name.trim().toLowerCase(), g.id);
      }

      const parentIds = new Map<string, string>();
      const phones = rows.map((r) => normalizePhone(r.parentPhone)).filter((p): p is string => !!p);
      for (const p of await tx.user.findMany({
        where: { role: "PARENT", phone: { in: phones } },
        select: { id: true, phone: true },
      })) {
        if (p.phone) parentIds.set(p.phone, p.id);
      }

      const reserved = new Set<string>();

      for (const { row, password, passwordHash, parentPassword, parentHash } of prepared) {
        let groupId: string | undefined;
        if (row.group) {
          const key = row.group.toLowerCase();
          groupId = groupIds.get(key);
          if (!groupId) {
            groupId = (await tx.group.create({ data: { name: row.group } })).id;
            groupIds.set(key, groupId);
          }
        }

        const login = await pickUniqueLogin(loginBase(row.firstName, row.lastName), reserved, tx);
        const student = await tx.user.create({
          data: {
            role: "STUDENT",
            login,
            passwordHash,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: normalizePhone(row.phone),
            groupMemberships: groupId ? { create: { groupId } } : undefined,
          },
        });
        credentials.push({ name: fullName(student), role: "STUDENT", login, password });

        if (!row.parentFirstName || !parentPassword || !parentHash) continue;

        // Siblings share one parent account when the parent's phone matches
        const parentPhone = normalizePhone(row.parentPhone);
        let parentId = parentPhone ? parentIds.get(parentPhone) : undefined;
        if (!parentId) {
          const parentLogin = await pickUniqueLogin(loginBase(row.parentFirstName, row.parentLastName), reserved, tx);
          const parent = await tx.user.create({
            data: {
              role: "PARENT",
              login: parentLogin,
              passwordHash: parentHash,
              firstName: row.parentFirstName,
              lastName: row.parentLastName,
              phone: parentPhone,
            },
          });
          parentId = parent.id;
          if (parentPhone) parentIds.set(parentPhone, parentId);
          credentials.push({ name: fullName(parent), role: "PARENT", login: parentLogin, password: parentPassword });
        }

        await tx.parentChild.create({ data: { parentId, childId: student.id } });
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  revalidatePath("/admin", "layout");
  return { ok: true, message: format(t.import.done, { count: credentials.length }), credentials };
}
