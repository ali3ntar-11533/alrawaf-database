import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/* Dynamic Text→Number mapping for the Smart Item Code system.
   Each (columnName, textValue) pair gets assigned a stable 2-digit code.
   textValue is stored in normalized form (diacritic/alef/teh-marbuta unified,
   lowercased, trimmed) so visually-identical Arabic text always maps the same.
   rawValue keeps the first-seen original text for display/auditing only.

   Note: column_name values are validated in application code (SLOT_COLUMNS
   in itemCode.ts) — no DB-level CHECK constraint needed. */
export const itemCodeMapTable = pgTable(
  "item_code_map",
  {
    id:          serial("id").primaryKey(),
    columnName:  text("column_name").notNull(),
    textValue:   text("text_value").notNull(),
    rawValue:    text("raw_value").notNull(),
    numericCode: text("numeric_code").notNull(),
    createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqColText: uniqueIndex("item_code_map_col_text_uniq").on(t.columnName, t.textValue),
    uniqColNum:  uniqueIndex("item_code_map_col_num_uniq").on(t.columnName, t.numericCode),
  }),
);

export type ItemCodeMap = typeof itemCodeMapTable.$inferSelect;
