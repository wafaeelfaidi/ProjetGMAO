/**
 * Automatic Document Distribution & Extraction
 * 
 * Classifie les documents uploadés et distribue automatiquement
 * les données structurées dans les tables appropriées :
 * - Equipements (équipement, machines, matériel)
 * - Maintenance (pannes, interventions, maintenance)
 * - Pièces de Rechange (pièces, références stock)
 */

import { ClientStorage } from "../client-storage/indexed-db";
import type { Equipement, Maintenance, PieceRechange } from "../client-storage/indexed-db";

// UUID generator
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ===== Classification =====

type DocumentType = "equipement" | "maintenance" | "piece_rechange" | "unknown";

function classifyDocument(text: string, fileName: string): DocumentType {
  const combined = (text || "") + " " + (fileName || "");
  const lower = combined.toLowerCase();

  // First, try to detect classification from table headers (CSV/TSV)
  const tableData = detectAndParseTableData(text);
  if (tableData.isTable && tableData.headers.length > 0) {
    const headersNormalized = tableData.headers
      .map((h) => removeAccents(h).toLowerCase())
      .join(" ");

    // Check for maintenance-specific headers
    if (
      headersNormalized.includes("code_maintenance") ||
      headersNormalized.includes("type_maintenance") ||
      headersNormalized.includes("date_intervention") ||
      headersNormalized.includes("technicien")
    ) {
      return "maintenance";
    }

    // Check for piece-specific headers
    if (
      headersNormalized.includes("code_piece") ||
      headersNormalized.includes("reference") ||
      headersNormalized.includes("quantite_stock") ||
      headersNormalized.includes("fournisseur")
    ) {
      return "piece_rechange";
    }

    // Check for equipment-specific headers
    if (
      headersNormalized.includes("code_equip") ||
      headersNormalized.includes("nom_equipement") ||
      headersNormalized.includes("marque") ||
      headersNormalized.includes("modele")
    ) {
      // Make sure it's not a maintenance table (which might also have code_equip)
      if (!headersNormalized.includes("type_maintenance")) {
        return "equipement";
      }
    }
  }

  // Fall back to keyword-based classification in text
  const equipmentKeywords = [
    "équipement",
    "equipement",
    "machine",
    "matériel",
    "materiel",
    "code_equip",
    "nom_equipement",
    "type d'équipement",
    "marque",
    "modele",
  ];

  const maintenanceKeywords = [
    "maintenance",
    "panne",
    "intervention",
    "incident",
    "dépannage",
    "depannage",
    "code_maintenance",
    "type_maintenance",
    "date_intervention",
    "technicien",
    "preventive",
    "corrective",
    "curative",
  ];

  const partsKeywords = [
    "pièce",
    "piece",
    "pièce de rechange",
    "piece de rechange",
    "code_piece",
    "référence",
    "reference",
    "stock",
    "quantité_stock",
    "quantite_stock",
    "fournisseur",
  ];

  // Count keyword matches for each type
  const equipmentCount = equipmentKeywords.filter((kw) =>
    lower.includes(kw)
  ).length;
  const maintenanceCount = maintenanceKeywords.filter((kw) =>
    lower.includes(kw)
  ).length;
  const partsCount = partsKeywords.filter((kw) => lower.includes(kw)).length;

  // Return the type with most keyword matches
  if (maintenanceCount > equipmentCount && maintenanceCount > partsCount) {
    return "maintenance";
  }
  if (partsCount > equipmentCount && partsCount > maintenanceCount) {
    return "piece_rechange";
  }
  if (equipmentCount > maintenanceCount && equipmentCount > partsCount) {
    return "equipement";
  }

  // Default fallback
  return "unknown";
}

// ===== Text Normalization =====

function removeAccents(str: string): string {
  if (!str) return "";
  try {
    return str
      .normalize("NFD")
      .split("")
      .filter((char) => !/[\u0300-\u036f]/.test(char))
      .join("")
      .toLowerCase();
  } catch {
    return (str || "").toLowerCase();
  }
}

// ===== Field Extraction =====

interface ParsedFields {
  [key: string]: string | null;
}

interface TableRow {
  [columnName: string]: string;
}

/**
 * Detect if text contains structured table data (CSV, TSV, etc.)
 * Returns { isTable: boolean, rows: TableRow[], headers: string[] }
 */
function detectAndParseTableData(text: string): {
  isTable: boolean;
  rows: TableRow[];
  headers: string[];
} {
  const lines = text.split("\n").filter((l) => l && l.trim());
  if (lines.length < 2) {
    return { isTable: false, rows: [], headers: [] };
  }

  // Try different delimiters: tab, semicolon, comma, pipe
  const delimiters = ["\t", ";", ",", "|"];
  let bestDelimiter: string | null = null;
  let bestColumnCount = 0;
  let bestHeaders: string[] = [];

  for (const delimiter of delimiters) {
    const firstLine = lines[0];
    if (!firstLine) continue;

    const headerParts = firstLine.split(delimiter).map((p) => p.trim());
    
    // Need at least 3 columns for a valid table
    if (headerParts.length >= 3) {
      let isConsistent = true;
      let consistentCount = 0;

      // Check if at least 70% of rows have consistent column count
      for (let i = 1; i < Math.min(lines.length, 10); i++) {
        const lineToCheck = lines[i];
        if (!lineToCheck) continue;

        const parts = lineToCheck.split(delimiter);
        if (parts.length === headerParts.length) {
          consistentCount++;
        }
      }

      const consistencyRatio = consistentCount / Math.min(lines.length - 1, 9);
      
      if (consistencyRatio >= 0.7 && headerParts.length > bestColumnCount) {
        bestDelimiter = delimiter;
        bestColumnCount = headerParts.length;
        bestHeaders = headerParts;
      }
    }
  }

  // No valid table format detected
  if (!bestDelimiter || bestColumnCount < 3) {
    return { isTable: false, rows: [], headers: [] };
  }

  // Parse the table
  const rows: TableRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const lineTrimmed = line.trim();
    if (!lineTrimmed) continue;

    const values = lineTrimmed.split(bestDelimiter).map((v) => v.trim());
    const row: TableRow = {};

    for (let j = 0; j < bestHeaders.length; j++) {
      const header = bestHeaders[j];
      if (header !== undefined) {
        row[header] = values[j] || "";
      }
    }

    // Only add row if it has at least one non-empty value
    if (Object.values(row).some((v) => v && v.trim())) {
      rows.push(row);
    }
  }

  console.log(`📊 Table detected: delimiter="${bestDelimiter}", columns=${bestColumnCount}, rows=${rows.length}`, bestHeaders);

  return { isTable: true, rows, headers: bestHeaders };
}

/**
 * Match extracted field names to table column headers
 * Handles accent removal and underscore/space normalization
 */
function matchFieldToColumn(field: string, columns: string[]): string | null {
  const fieldNorm = removeAccents(field).toLowerCase().replace(/_/g, " ");

  for (const col of columns) {
    const colNorm = removeAccents(col).toLowerCase().replace(/_/g, " ");
    
    // Exact match (with normalization)
    if (fieldNorm === colNorm) {
      return col;
    }
    
    // Partial match - check if field name matches part of column (handles abbreviations)
    if (fieldNorm.length > 3) {
      if (colNorm.startsWith(fieldNorm) || fieldNorm.startsWith(colNorm)) {
        return col;
      }
    }
    
    // Check if they have significant overlap (e.g., "code_equip" vs "code_equip")
    const fieldWords = fieldNorm.split(/[\s_]+/).filter((w) => w.length > 2);
    const colWords = colNorm.split(/[\s_]+/).filter((w) => w.length > 2);
    
    if (fieldWords.length > 0 && colWords.length > 0) {
      const matchedWords = fieldWords.filter((fw) =>
        colWords.some((cw) => cw.startsWith(fw) || fw.startsWith(cw))
      );
      if (matchedWords.length === fieldWords.length && matchedWords.length > 0) {
        return col;
      }
    }
  }

  return null;
}

function extractFields(text: string, fieldNames: string[]): ParsedFields {
  const result: ParsedFields = {};
  
  // First, try to detect and parse as table data
  const tableData = detectAndParseTableData(text);
  
  if (tableData.isTable && tableData.rows.length > 0) {
    // Table format detected - extract from first row
    const firstRow = tableData.rows[0];
    if (firstRow) {
      for (const field of fieldNames) {
        const matchedColumn = matchFieldToColumn(field, tableData.headers);
        if (matchedColumn && firstRow[matchedColumn]) {
          result[field] = firstRow[matchedColumn] || null;
        } else {
          result[field] = null;
        }
      }
    }
    
    return result;
  }

  // Fall back to key:value extraction if not a table
  const normalized = removeAccents(text);

  for (const field of fieldNames) {
    let value: string | null = null;

    // Normalize field name variants (underscore -> space, etc)
    const variants = [
      field,
      field.replace(/_/g, " "),
      removeAccents(field.replace(/_/g, " ")),
    ];

    // Try to find "fieldname: value" or "fieldname = value"
    for (const variant of variants) {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Pattern 1: "Field: value" or "Field = value"
      const pattern1 = new RegExp(`${escaped}\\s*[:=]\\s*([^\n]+)`, "i");
      const match1 = text.match(pattern1);
      if (match1?.[1]) {
        value = match1[1].trim();
        break;
      }

      // Pattern 2: Normalized search (without accents)
      const normalized_variant = removeAccents(variant);
      const pattern2 = new RegExp(
        `${normalized_variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:=]\\s*([^\n]+)`,
        "i"
      );
      const match2 = normalized.match(pattern2);
      if (match2?.[1]) {
        value = match2[1].trim();
        break;
      }
    }

    // Pattern 3: Try tab/space separated format
    if (!value) {
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || "";
        if (
          variants.some(
            (v) =>
              line.toLowerCase().includes(v.toLowerCase()) ||
              removeAccents(line).includes(removeAccents(v))
          )
        ) {
          // Found field label, try to extract value
          const parts = line.split(/[\t|;:]/).map((p) => p.trim()).filter(Boolean);
          if (parts.length > 1) {
            value = parts.slice(1).join(" ");
          } else if (i + 1 < lines.length) {
            // Try next line as value
            const nextValue = lines[i + 1]?.trim();
            if (nextValue) {
              value = nextValue;
            }
          }
          if (value) break;
        }
      }
    }

    result[field] = value || null;
  }

  return result;
}

// ===== Automatic Distribution =====

export async function distributeDocumentData(
  documentId: string,
  text: string,
  fileName: string,
  userId: string
): Promise<{ type: DocumentType; recordsCreated: number }> {
  const storage = new ClientStorage();
  
  console.log(`\n🔍 Starting auto-distribution for document: ${fileName}`);
  
  const docType = classifyDocument(text, fileName);
  
  console.log(`📋 Classified as: "${docType}"`);

  if (docType === "unknown") {
    console.warn("⚠️ Document not classified - no distribution performed");
    return { type: "unknown", recordsCreated: 0 };
  }

  let recordsCreated = 0;

  try {
    // IMPORTANT: Delete any existing records from this document to prevent duplicates
    // This handles the case where processing is retried or called multiple times
    console.log(`🗑️ Removing any existing records for document ID: ${documentId}`);
    
    if (docType === "equipement") {
      await storage.deleteEquipementsByDocument(documentId);
    } else if (docType === "maintenance") {
      await storage.deleteMaintenancesByDocument(documentId);
    } else if (docType === "piece_rechange") {
      await storage.deletePiecesRechangeByDocument(documentId);
    }

    // Check if this is table data
    const tableData = detectAndParseTableData(text);
    const isTableFormat = tableData.isTable && tableData.rows.length > 0;

    if (isTableFormat) {
      console.log(
        `✅ Table format detected: ${tableData.rows.length} data row(s), ${tableData.headers.length} column(s)`
      );
      console.log(`📊 Column headers:`, tableData.headers);
    }

    if (docType === "equipement") {
      const fields = [
        "Code_Equip",
        "Nom_Equipement",
        "Type",
        "Site",
        "Marque",
        "Modele",
        "Num_Serie",
        "Annee_Service",
        "Statut",
      ];

      if (isTableFormat) {
        // Process each row in the table
        for (const rowData of tableData.rows) {
          const record: Equipement = {
            id: generateUUID(),
            userId,
            source_document_id: documentId,
            extracted_at: Date.now(),
            Code_Equip: null,
            Nom_Equipement: null,
            Type: null,
            Site: null,
            Marque: null,
            Modele: null,
            Num_Serie: null,
            Annee_Service: null,
            Statut: null,
          };

          for (const field of fields) {
            const colName = matchFieldToColumn(field, tableData.headers);
            if (colName && rowData[colName]) {
              (record[field as keyof Equipement] as string) = rowData[colName];
            }
          }

          // Only add if at least one field has data
          if (Object.values(record).some((v) => v && typeof v === "string" && v.trim())) {
            await storage.addEquipement(record);
            recordsCreated++;
          }
        }
        console.log(
          `✅ ${recordsCreated} Equipement record(s) distributed from table`
        );
      } else {
        // Single record from free text
        const parsed = extractFields(text, fields);
        const record: Equipement = {
          id: generateUUID(),
          userId,
          source_document_id: documentId,
          extracted_at: Date.now(),
          Code_Equip: parsed["Code_Equip"],
          Nom_Equipement: parsed["Nom_Equipement"],
          Type: parsed["Type"],
          Site: parsed["Site"],
          Marque: parsed["Marque"],
          Modele: parsed["Modele"],
          Num_Serie: parsed["Num_Serie"],
          Annee_Service: parsed["Annee_Service"],
          Statut: parsed["Statut"],
        };

        await storage.addEquipement(record);
        recordsCreated = 1;
        console.log("✅ 1 Equipement record distributed");
      }
    }

    if (docType === "maintenance") {
      const fields = [
        "Code_Maintenance",
        "Code_Equip",
        "Date_Intervention",
        "Type_Maintenance",
        "Duree_Heures",
        "Technicien",
        "Piece_Remplacee",
        "Cout",
        "Commentaire",
      ];

      if (isTableFormat) {
        console.log(`🔧 Processing maintenance table with ${tableData.rows.length} rows`);
        for (const rowData of tableData.rows) {
          const record: Maintenance = {
            id: generateUUID(),
            userId,
            source_document_id: documentId,
            extracted_at: Date.now(),
            Code_Maintenance: null,
            Code_Equip: null,
            Date_Intervention: null,
            Type_Maintenance: null,
            Duree_Heures: null,
            Technicien: null,
            Piece_Remplacee: null,
            Cout: null,
            Commentaire: null,
          };

          for (const field of fields) {
            const colName = matchFieldToColumn(field, tableData.headers);
            if (colName && rowData[colName]) {
              (record[field as keyof Maintenance] as string) = rowData[colName];
            }
          }

          if (Object.values(record).some((v) => v && typeof v === "string" && v.trim())) {
            await storage.addMaintenance(record);
            recordsCreated++;
          }
        }
        console.log(
          `✅ ${recordsCreated} Maintenance record(s) distributed from table`
        );
      } else {
        const parsed = extractFields(text, fields);
        const record: Maintenance = {
          id: generateUUID(),
          userId,
          source_document_id: documentId,
          extracted_at: Date.now(),
          Code_Maintenance: parsed["Code_Maintenance"],
          Code_Equip: parsed["Code_Equip"],
          Date_Intervention: parsed["Date_Intervention"],
          Type_Maintenance: parsed["Type_Maintenance"],
          Duree_Heures: parsed["Duree_Heures"],
          Technicien: parsed["Technicien"],
          Piece_Remplacee: parsed["Piece_Remplacee"],
          Cout: parsed["Cout"],
          Commentaire: parsed["Commentaire"],
        };

        await storage.addMaintenance(record);
        recordsCreated = 1;
        console.log("✅ 1 Maintenance record distributed");
      }
    }

    if (docType === "piece_rechange") {
      const fields = [
        "Code_Piece",
        "Nom_Piece",
        "Reference",
        "Quantite_Stock",
        "Fournisseur",
        "Prix_Unitaire",
        "Delai_Livraison_Jours",
        "Date_Mise_A_Jour",
      ];

      if (isTableFormat) {
        for (const rowData of tableData.rows) {
          const record: PieceRechange = {
            id: generateUUID(),
            userId,
            source_document_id: documentId,
            extracted_at: Date.now(),
            Code_Piece: null,
            Nom_Piece: null,
            Reference: null,
            Quantite_Stock: null,
            Fournisseur: null,
            Prix_Unitaire: null,
            Delai_Livraison_Jours: null,
            Date_Mise_A_Jour: null,
          };

          for (const field of fields) {
            const colName = matchFieldToColumn(field, tableData.headers);
            if (colName && rowData[colName]) {
              (record[field as keyof PieceRechange] as string) = rowData[colName];
            }
          }

          if (Object.values(record).some((v) => v && typeof v === "string" && v.trim())) {
            await storage.addPieceRechange(record);
            recordsCreated++;
          }
        }
        console.log(
          `✅ ${recordsCreated} Piece de rechange record(s) distributed from table`
        );
      } else {
        const parsed = extractFields(text, fields);
        const record: PieceRechange = {
          id: generateUUID(),
          userId,
          source_document_id: documentId,
          extracted_at: Date.now(),
          Code_Piece: parsed["Code_Piece"],
          Nom_Piece: parsed["Nom_Piece"],
          Reference: parsed["Reference"],
          Quantite_Stock: parsed["Quantite_Stock"],
          Fournisseur: parsed["Fournisseur"],
          Prix_Unitaire: parsed["Prix_Unitaire"],
          Delai_Livraison_Jours: parsed["Delai_Livraison_Jours"],
          Date_Mise_A_Jour: parsed["Date_Mise_A_Jour"],
        };

        await storage.addPieceRechange(record);
        recordsCreated = 1;
        console.log("✅ 1 Piece de rechange record distributed");
      }
    }
  } catch (error) {
    console.error("❌ Error during document distribution:", error);
  }

  console.log(`✅ Distribution complete: ${recordsCreated} record(s) created\n`);
  return { type: docType, recordsCreated };
}

// ===== Exposed for Testing =====

export async function testDistribution(userId: string) {
  const storage = new ClientStorage();
  console.group("📊 Distribution Test Results");

  try {
    const equipements = await storage.getEquipements(userId);
    const maintenances = await storage.getMaintenances(userId);
    const pieces = await storage.getPiecesRechange(userId);

    console.log(`Equipements: ${equipements.length}`, equipements);
    console.log(`Maintenances: ${maintenances.length}`, maintenances);
    console.log(`Pieces de Rechange: ${pieces.length}`, pieces);

    console.table({
      Type: ["Equipements", "Maintenances", "Pieces"],
      Count: [equipements.length, maintenances.length, pieces.length],
    });
  } catch (error) {
    console.error("Error:", error);
  }

  console.groupEnd();
}
