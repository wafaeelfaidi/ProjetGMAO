"use client";

import { useEffect, useState } from "react";
import { useSupabaseSession } from "~/lib/supabase/use-session";
import { ClientStorage } from "~/lib/client-storage/indexed-db";
import type { Equipement, Maintenance, PieceRechange } from "~/lib/client-storage/indexed-db";
import { generateAMDECTable, type AMDECRecord } from "~/lib/rpn-calculator";
import {
  AlertCircle,
  Loader,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export default function RPNPage() {
  const { session, loading: sessionLoading } = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amdecData, setAmdecData] = useState<AMDECRecord[]>([]);
  const [stats, setStats] = useState({
    totalEquipements: 0,
    avgRPN: 0,
    maxRPN: 0,
    minRPN: 0,
    highRiskCount: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.user?.id) {
        setError("User not authenticated");
        return;
      }

      const storage = new ClientStorage();

      // Load all three tables
      const equipements = await storage.getEquipements(session.user.id);
      const maintenances = await storage.getMaintenances(session.user.id);
      const pieces = await storage.getPiecesRechange(session.user.id);

      if (equipements.length === 0) {
        setError("No equipment data found. Please upload equipment data first.");
        return;
      }

      // Generate AMDEC table
      const records = generateAMDECTable(equipements, maintenances, pieces);
      setAmdecData(records);

      // Calculate statistics
      if (records.length > 0) {
        const rpnValues = records.map((r: AMDECRecord) => r.RPN);
        const avgRPN = rpnValues.reduce((a: number, b: number) => a + b, 0) / rpnValues.length;
        const maxRPN = Math.max(...rpnValues);
        const minRPN = Math.min(...rpnValues);
        const highRiskCount = records.filter((r: AMDECRecord) => r.RPN > 400).length;

        setStats({
          totalEquipements: records.length,
          avgRPN: Math.round(avgRPN * 100) / 100,
          maxRPN: Math.round(maxRPN * 100) / 100,
          minRPN: Math.round(minRPN * 100) / 100,
          highRiskCount,
        });
      }
    } catch (err) {
      console.error("Error loading RPN data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && session?.user?.id) {
      loadData();
    }
  }, [session?.user?.id, sessionLoading]);

  const getRPNColor = (rpn: number) => {
    if (rpn > 400) return "bg-red-50 border-red-200";
    if (rpn > 200) return "bg-orange-50 border-orange-200";
    if (rpn > 100) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  const getRPNBadgeColor = (rpn: number) => {
    if (rpn > 400) return "bg-red-100 text-red-800";
    if (rpn > 200) return "bg-orange-100 text-orange-800";
    if (rpn > 100) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getRiskLevel = (rpn: number) => {
    if (rpn > 400) return "🔴 Critique";
    if (rpn > 200) return "🟠 Élevé";
    if (rpn > 100) return "🟡 Moyen";
    return "🟢 Faible";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                Tableau AMDEC - Calcul RPN
              </h1>
              <p className="text-slate-600 mt-2">
                Risk Priority Number - Évaluation des risques par équipement
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading || sessionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading || sessionLoading ? "animate-spin" : ""}`} />
              {loading || sessionLoading ? "Chargement..." : "Actualiser"}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Erreur</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(loading || sessionLoading) && !error && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-slate-600">Calcul du RPN...</span>
          </div>
        )}

        {/* Statistics Cards */}
        {!loading && amdecData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-slate-600 text-sm font-medium">Total Équipements</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalEquipements}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <p className="text-slate-600 text-sm font-medium">RPN Moyen</p>
              <p className="text-2xl font-bold text-slate-900">{stats.avgRPN}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-slate-600 text-sm font-medium">RPN Minimum</p>
              <p className="text-2xl font-bold text-slate-900">{stats.minRPN}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-slate-600 text-sm font-medium">RPN Maximum</p>
              <p className="text-2xl font-bold text-slate-900">{stats.maxRPN}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <p className="text-slate-600 text-sm font-medium">Risque Critique</p>
              <p className="text-2xl font-bold text-red-600">{stats.highRiskCount}</p>
              <p className="text-xs text-slate-500 mt-1">RPN &gt; 400</p>
            </div>
          </div>
        )}

        {/* AMDEC Table */}
        {!loading && amdecData.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">
                      Code Équip.
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700">
                      Nom Équipement
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-700">
                      Gravité (S)
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-700">
                      Occurrence (O)
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-700">
                      Détectabilité (D)
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-700">
                      RPN (S×O×D)
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-700">
                      Niveau de Risque
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {amdecData.map((record, index) => (
                    <tr
                      key={index}
                      className={`${getRPNColor(record.RPN)} border-l-2 hover:bg-slate-50 transition`}
                    >
                      <td className="px-6 py-4 font-mono text-slate-900">
                        {record.Code_Equip}
                      </td>
                      <td className="px-6 py-4 text-slate-900">
                        {record.Nom_Equipement}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold">
                        <span className="w-10 h-10 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center">
                          {record.Gravite}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold">
                        <span className="w-10 h-10 bg-green-100 text-green-900 rounded-full flex items-center justify-center">
                          {record.Occurrence}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold">
                        <span className="w-10 h-10 bg-purple-100 text-purple-900 rounded-full flex items-center justify-center">
                          {record.Detectabilite}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full font-bold ${getRPNBadgeColor(record.RPN)}`}>
                          {record.RPN}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold">
                        {getRiskLevel(record.RPN)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer - Summary */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                📊 Total: <span className="font-semibold">{amdecData.length}</span> équipement(s)
                {stats.highRiskCount > 0 && (
                  <>
                    {" "}
                    | 🔴 <span className="font-semibold text-red-600">{stats.highRiskCount} critique(s)</span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && amdecData.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Aucune donnée disponible
            </h3>
            <p className="text-slate-600">
              Veuillez d'abord uploader vos données d'équipement, de maintenance et de pièces de rechange.
            </p>
          </div>
        )}

        {/* Formulas Reference */}
        <div className="mt-8 bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-4">📐 Formules de Calcul</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-blue-900">Gravité (S)</p>
              <p className="text-blue-800 mt-2 font-mono">
                S = min(10, max(1, avg(Cout) / 500))
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Basé sur le coût moyen des maintenances
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">Occurrence (O)</p>
              <p className="text-blue-800 mt-2 font-mono">
                O = min(10, max(1, nb_maintenance / 5))
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Basé sur la fréquence des maintenances
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">Détectabilité (D)</p>
              <p className="text-blue-800 mt-2 font-mono">
                D = min(10, max(1, (Delai/3) + (stock&lt;5?3:0)))
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Basé sur le stock et délai de livraison
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded text-blue-900 font-semibold">
            RPN = S × O × D
          </div>
        </div>

        {/* Risk Levels Legend */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-slate-900 mb-4">📊 Niveaux de Risque</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded bg-green-100 border border-green-500"></span>
              <span className="text-sm text-slate-700"><strong>Faible</strong>: RPN ≤ 100</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded bg-yellow-100 border border-yellow-500"></span>
              <span className="text-sm text-slate-700"><strong>Moyen</strong>: 100 &lt; RPN ≤ 200</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded bg-orange-100 border border-orange-500"></span>
              <span className="text-sm text-slate-700"><strong>Élevé</strong>: 200 &lt; RPN ≤ 400</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded bg-red-100 border border-red-500"></span>
              <span className="text-sm text-slate-700"><strong>Critique</strong>: RPN &gt; 400</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
