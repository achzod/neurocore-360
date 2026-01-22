import archiver from "archiver";
import type { Response } from "express";
import { generateExportHTML, generateExportPDF } from "./exportService";

type NarrativeReportLike = { txt?: string; clientName?: string; metadata?: unknown };

/**
 * Stream un ZIP vers la réponse HTTP, sans écrire sur disque.
 * Contient: report.txt, report.html, report.pdf, photos/*, metadata.json
 */
export async function streamAuditZip(params: {
  res: Response;
  auditId: string;
  narrativeReport: NarrativeReportLike;
  photos?: string[];
}): Promise<void> {
  const { res, auditId, narrativeReport, photos } = params;

  const zip = archiver("zip", { zlib: { level: 9 } });

  zip.on("warning", (err: any) => {
    // ENOENT: fichier manquant -> on log et on continue
    if (err?.code === "ENOENT") {
      console.warn("[Export ZIP] warning:", err?.message || err);
      return;
    }
    throw err;
  });

  zip.on("error", (err: any) => {
    throw err;
  });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=neurocore-360-${auditId.slice(0, 8)}.zip`
  );

  zip.pipe(res);

  const clientName = narrativeReport?.clientName || "";
  const metadata = narrativeReport?.metadata || {};

  // TXT brut (source de vérité)
  if (narrativeReport?.txt) {
    zip.append(String(narrativeReport.txt), { name: "report.txt" });
  }

  // HTML (design + SVG)
  try {
    const html = await generateExportHTML(narrativeReport as any, auditId, photos);
    zip.append(html, { name: "report.html" });
  } catch (e: any) {
    zip.append(
      `Erreur génération HTML: ${e?.message || String(e)}`,
      { name: "errors/html.txt" }
    );
  }

  // PDF
  try {
    const pdf = await generateExportPDF(narrativeReport as any, auditId, photos);
    zip.append(pdf, { name: "report.pdf" });
  } catch (e: any) {
    zip.append(
      `Erreur génération PDF: ${e?.message || String(e)}`,
      { name: "errors/pdf.txt" }
    );
  }

  // Photos (si présentes). On prend l'URL/chemin tel quel: l'HTML les utilisera, mais le ZIP les inclut aussi.
  // NOTE: on ne fetch pas via réseau ici (sandbox/local). On inclut juste un manifest + les références.
  // Sur Replit, si photos = dataURL ou URL publique, c'est suffisant; si c'est un chemin local, on peut l'ajouter plus tard.
  if (photos && photos.length > 0) {
    zip.append(JSON.stringify({ photos }, null, 2), { name: "photos/manifest.json" });
  }

  // Metadata
  zip.append(
    JSON.stringify(
      {
        auditId,
        clientName,
        generatedAt: new Date().toISOString(),
        metadata,
      },
      null,
      2
    ),
    { name: "metadata.json" }
  );

  await zip.finalize();
}



