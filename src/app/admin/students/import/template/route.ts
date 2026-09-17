import ExcelJS from "exceljs";
import { ru } from "@/i18n/dictionaries/ru";
import { uz } from "@/i18n/dictionaries/uz";
import { getCurrentUser } from "@/lib/auth";
import { TEMPLATE_COLUMNS } from "@/lib/import";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const workbook = new ExcelJS.Workbook();
  const columns = TEMPLATE_COLUMNS.map((key) => ({
    header: `${uz.import.columns[key]} / ${ru.import.columns[key]}`,
    key,
    width: 30,
    style: { numFmt: "@" }, // text, so phone numbers keep their leading +
  }));

  const sheet = workbook.addWorksheet("O‘quvchilar");
  sheet.columns = columns;
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5046E5" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // The example lives on its own sheet so it never gets imported by accident
  const example = workbook.addWorksheet("Namuna - Пример");
  example.columns = columns;
  example.getRow(1).font = { bold: true };
  example.addRow({
    lastName: "Valiyev",
    firstName: "Ali",
    phone: "+998 90 123 45 67",
    group: "Frontend-1",
    parentName: "Valiyev Akmal",
    parentPhone: "+998 90 765 43 21",
  });
  example.addRow({
    lastName: "Valiyeva",
    firstName: "Madina",
    phone: "",
    group: "Frontend-1",
    parentName: "Valiyev Akmal",
    parentPhone: "+998 90 765 43 21",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="codov-students.xlsx"',
    },
  });
}
