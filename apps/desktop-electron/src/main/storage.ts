import fs from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import PDFDocument from "pdfkit";

export type StoragePaths = {
  baseDir: string;
  dbPath: string;
  documentsDir: string;
  attachmentsDir: string;
  exportsDir: string;
};

export function ensureStorage(userDataPath: string): StoragePaths {
  const baseDir = path.join(userDataPath, "covenantpulse");
  const documentsDir = path.join(baseDir, "documents");
  const attachmentsDir = path.join(baseDir, "attachments");
  const exportsDir = path.join(baseDir, "exports");
  const dbPath = path.join(baseDir, "covenantpulse.sqlite");

  [baseDir, documentsDir, attachmentsDir, exportsDir].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });

  return { baseDir, dbPath, documentsDir, attachmentsDir, exportsDir };
}

export function importFile(params: {
  sourcePath: string;
  destinationDir: string;
  filenameHint?: string;
}): {
  filename: string;
  filePath: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
} {
  const extension = path.extname(params.sourcePath).toLowerCase();
  const safeName = params.filenameHint
    ? `${params.filenameHint}${extension}`
    : path.basename(params.sourcePath);
  const filename = `${Date.now()}_${randomUUID()}_${safeName}`;
  const destPath = path.join(params.destinationDir, filename);
  fs.copyFileSync(params.sourcePath, destPath);

  const buffer = fs.readFileSync(destPath);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;
  const mimeType = extension === ".pdf" ? "application/pdf" : "application/octet-stream";

  return { filename: safeName, filePath: destPath, sha256, sizeBytes, mimeType };
}

export function readFileAsDataUrl(params: {
  filePath: string;
  allowedDirs: string[];
  mimeType: string;
}): string {
  if (!params.allowedDirs.some((dir) => params.filePath.startsWith(dir))) {
    throw new Error("Access denied");
  }
  const data = fs.readFileSync(params.filePath);
  const base64 = data.toString("base64");
  return `data:${params.mimeType};base64,${base64}`;
}

export async function ensureSamplePdf(params: {
  filePath: string;
  title: string;
  subtitle: string;
}): Promise<void> {
  if (fs.existsSync(params.filePath)) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const stream = fs.createWriteStream(params.filePath);
    stream.on("finish", resolve);
    stream.on("error", reject);
    doc.pipe(stream);
    doc.fontSize(20).text(params.title, { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#475569").text(params.subtitle);
    doc.moveDown();
    doc
      .fillColor("#101820")
      .fontSize(11)
      .text(
        "Sample loan agreement placeholder for CovenantPulse. Replace this with the executed agreement PDF for production use."
      );
    doc.end();
  });
}
