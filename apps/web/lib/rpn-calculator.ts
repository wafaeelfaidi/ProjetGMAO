/**
 * RPN (Risk Priority Number) Calculator
 * Calcule automatiquement les métriques AMDEC
 */

import type { Equipement, Maintenance, PieceRechange } from "./client-storage/indexed-db";

export interface AMDECRecord {
  Code_Equip: string;
  Nom_Equipement: string;
  Gravite: number;
  Occurrence: number;
  Detectabilite: number;
  RPN: number;
  details: {
    maintenances_count: number;
    avg_cout: number;
    avg_delai_livraison: number;
    min_stock: number;
  };
}

export function calculateGravity(
  equipementId: string,
  maintenances: Maintenance[]
): number {
  const relatedMaintenances = maintenances.filter((m) => m.Code_Equip === equipementId);
  if (relatedMaintenances.length === 0) return 1;

  const couts = relatedMaintenances
    .map((m) => {
      const cout = m.Cout;
      if (!cout) return null;
      const numCout = typeof cout === "string" ? parseFloat(cout) : cout;
      return isNaN(numCout) || numCout <= 0 ? null : numCout;
    })
    .filter((c): c is number => c !== null);

  if (couts.length === 0) return 1;

  const avgCout = couts.reduce((a, b) => a + b, 0) / couts.length;
  const gravity = Math.min(10, Math.max(1, avgCout / 500));
  return Math.round(gravity * 10) / 10;
}

export function calculateOccurrence(
  equipementId: string,
  maintenances: Maintenance[]
): number {
  const relatedMaintenances = maintenances.filter((m) => m.Code_Equip === equipementId);
  const occurrence = Math.min(10, Math.max(1, relatedMaintenances.length / 5));
  return Math.round(occurrence * 10) / 10;
}

export function calculateDetectability(
  equipementId: string,
  maintenances: Maintenance[],
  pieces: PieceRechange[]
): number {
  const relatedMaintenances = maintenances.filter((m) => m.Code_Equip === equipementId);
  if (relatedMaintenances.length === 0) return 1;

  let totalDetectability = 0;
  let validPieces = 0;

  for (const maintenance of relatedMaintenances) {
    const pieceName = maintenance.Piece_Remplacee;
    if (!pieceName || pieceName.trim() === "") continue;

    const matchedPiece = pieces.find((p) =>
      p.Nom_Piece && p.Nom_Piece.toLowerCase().includes(pieceName.toLowerCase())
    );

    if (matchedPiece) {
      let detectability = 0;

      if (matchedPiece.Delai_Livraison_Jours) {
        const delai =
          typeof matchedPiece.Delai_Livraison_Jours === "string"
            ? parseFloat(matchedPiece.Delai_Livraison_Jours)
            : matchedPiece.Delai_Livraison_Jours;
        if (!isNaN(delai)) detectability += delai / 3;
      }

      if (matchedPiece.Quantite_Stock) {
        const stock =
          typeof matchedPiece.Quantite_Stock === "string"
            ? parseFloat(matchedPiece.Quantite_Stock)
            : matchedPiece.Quantite_Stock;
        if (!isNaN(stock) && stock < 5) detectability += 3;
      }

      detectability = Math.min(10, Math.max(1, detectability));
      totalDetectability += detectability;
      validPieces++;
    }
  }

  const avgDetectability = validPieces > 0 ? totalDetectability / validPieces : 1;
  return Math.round(avgDetectability * 10) / 10;
}

export function calculateRPN(
  gravite: number,
  occurrence: number,
  detectabilite: number
): number {
  const rpn = gravite * occurrence * detectabilite;
  return Math.round(rpn * 100) / 100;
}

export function generateAMDECTable(
  equipements: Equipement[],
  maintenances: Maintenance[],
  pieces: PieceRechange[]
): AMDECRecord[] {
  const records: AMDECRecord[] = [];

  for (const equip of equipements) {
    if (!equip.Code_Equip) continue;

    const gravite = calculateGravity(equip.Code_Equip, maintenances);
    const occurrence = calculateOccurrence(equip.Code_Equip, maintenances);
    const detectabilite = calculateDetectability(equip.Code_Equip, maintenances, pieces);
    const rpn = calculateRPN(gravite, occurrence, detectabilite);

    const relatedMaintenances = maintenances.filter((m) => m.Code_Equip === equip.Code_Equip);
    
    const couts = relatedMaintenances
      .map((m) => (typeof m.Cout === "string" ? parseFloat(m.Cout) : m.Cout))
      .filter((c): c is number => typeof c === "number" && !isNaN(c) && c > 0);
    
    const avgCout = couts.length > 0 ? couts.reduce((a, b) => a + b, 0) / couts.length : 0;

    const relatedPieces = relatedMaintenances
      .map((m) => m.Piece_Remplacee)
      .filter((p): p is string => Boolean(p))
      .map((pieceName) =>
        pieces.find((piece) => piece.Nom_Piece?.toLowerCase().includes(pieceName.toLowerCase()))
      )
      .filter((p): p is PieceRechange => Boolean(p));

    const delais = relatedPieces
      .map((p) =>
        typeof p.Delai_Livraison_Jours === "string"
          ? parseFloat(p.Delai_Livraison_Jours)
          : p.Delai_Livraison_Jours
      )
      .filter((d): d is number => typeof d === "number" && !isNaN(d));
    
    const avgDelai = delais.length > 0 ? delais.reduce((a, b) => a + b, 0) / delais.length : 0;

    const stocks = relatedPieces
      .map((p) =>
        typeof p.Quantite_Stock === "string"
          ? parseFloat(p.Quantite_Stock)
          : p.Quantite_Stock
      )
      .filter((s): s is number => typeof s === "number" && !isNaN(s));
    
    const minStock = stocks.length > 0 ? Math.min(...stocks) : 0;

    records.push({
      Code_Equip: equip.Code_Equip,
      Nom_Equipement: equip.Nom_Equipement || "N/A",
      Gravite: gravite,
      Occurrence: occurrence,
      Detectabilite: detectabilite,
      RPN: rpn,
      details: {
        maintenances_count: relatedMaintenances.length,
        avg_cout: Math.round(avgCout * 100) / 100,
        avg_delai_livraison: Math.round(avgDelai * 100) / 100,
        min_stock: minStock,
      },
    });
  }

  records.sort((a, b) => b.RPN - a.RPN);
  return records;
}
