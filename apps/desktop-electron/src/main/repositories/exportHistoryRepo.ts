import { randomUUID } from "crypto";
import type { SqliteDatabase } from "@covenantpulse/db";
import type { ExportHistory } from "@covenantpulse/shared";
import { nowIso } from "./utils";

type DbExport = {
  id: string;
  loan_id: string;
  export_type: string;
  file_path: string;
  created_by: string;
  created_at: string;
};

function mapExport(row: DbExport): ExportHistory {
  return {
    id: row.id,
    loanId: row.loan_id,
    exportType: row.export_type as ExportHistory["exportType"],
    filePath: row.file_path,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export class ExportHistoryRepo {
  constructor(private readonly db: SqliteDatabase) {}

  add(params: { loanId: string; exportType: ExportHistory["exportType"]; filePath: string; createdBy: string }): ExportHistory {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO export_history (id, loan_id, export_type, file_path, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(id, params.loanId, params.exportType, params.filePath, params.createdBy, nowIso());
    const row = this.db
      .prepare("SELECT * FROM export_history WHERE id = ?")
      .get(id) as DbExport;
    return mapExport(row);
  }

  list(params: { loanId?: string } = {}): ExportHistory[] {
    const rows = params.loanId
      ? (this.db
          .prepare("SELECT * FROM export_history WHERE loan_id = ? ORDER BY created_at DESC")
          .all(params.loanId) as DbExport[])
      : (this.db
          .prepare("SELECT * FROM export_history ORDER BY created_at DESC")
          .all() as DbExport[]);
    return rows.map(mapExport);
  }
}
