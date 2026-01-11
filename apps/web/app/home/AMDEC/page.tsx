'use client';

import React, { useState } from 'react';
import { Upload, FileText, Download, Loader, AlertCircle, Sparkles, TrendingUp, Shield } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface MachineFailureAnalysis {
  equipment: string;
  failure_mode: string;
  total_occurrences: number;
  failure_frequency: number;
  average_cost: number;
  total_cost: number;
}

interface AnalysisResult {
  success: boolean;
  equipment_stats: MachineFailureAnalysis[];
  amdec_by_machine?: { [machine: string]: string };
  error?: string;
}

export default function AMDECPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [machineFilter, setMachineFilter] = useState<string>('all');
  const [selectedMachinesForAmdec, setSelectedMachinesForAmdec] = useState<string[]>([]);
  const [loadingAmdec, setLoadingAmdec] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setError(null);
      setAnalysisResult(null);
      setSelectedMachine('all');
      setMachineFilter('all');
    } else {
      setError('Please select a valid CSV file');
    }
  };

  // Get unique machines from analysis results
  const uniqueMachines = React.useMemo(() => {
    if (!analysisResult) return [];
    return Array.from(new Set(analysisResult.equipment_stats.map(stat => stat.equipment))).sort();
  }, [analysisResult]);

  // Filter stats by selected machine
  const filteredStats = React.useMemo(() => {
    if (!analysisResult || machineFilter === 'all') return analysisResult?.equipment_stats || [];
    return analysisResult.equipment_stats.filter(stat => stat.equipment === machineFilter);
  }, [analysisResult, machineFilter]);

  const handleGenerateAmdec = async () => {
    if (!file || selectedMachinesForAmdec.length === 0) {
      setError('Please select at least one machine to generate AMDEC');
      return;
    }

    console.log('[Frontend] Selected machines for AMDEC:', selectedMachinesForAmdec);
    console.log('[Frontend] Selected machines stringified:', JSON.stringify(selectedMachinesForAmdec));

    setLoadingAmdec(true);
    setError(null);
    setUploadProgress(`Generating AMDEC for ${selectedMachinesForAmdec.length} machine(s)...`);
    setEstimatedTime(selectedMachinesForAmdec.length * 12); // ~12s per machine

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('generate_amdec', 'true');
      formData.append('selected_machines', JSON.stringify(selectedMachinesForAmdec));
      
      console.log('[Frontend] FormData prepared, sending request...');

      const response = await fetch('/api/home/amdec/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AMDEC generation failed');
      }

      const result = await response.json();
      
      console.log('[Frontend] Received result:', result);
      console.log('[Frontend] AMDEC machines generated:', Object.keys(result.amdec_by_machine || {}));
      console.log('[Frontend] AMDEC content sample:', result.amdec_by_machine);
      
      // Merge AMDEC results with existing analysis
      setAnalysisResult(prev => {
        const merged = {
          ...prev!,
          amdec_by_machine: {
            ...(prev?.amdec_by_machine || {}),
            ...result.amdec_by_machine
          }
        };
        console.log('[Frontend] After merge - total AMDEC machines:', Object.keys(merged.amdec_by_machine || {}).length);
        console.log('[Frontend] After merge - machines:', Object.keys(merged.amdec_by_machine || {}));
        return merged;
      });
      
      setUploadProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AMDEC generation failed');
      setUploadProgress('');
    } finally {
      setLoadingAmdec(false);
      setEstimatedTime(0);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress('Analyzing CSV file...');
    setEstimatedTime(5);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('generate_amdec', 'false'); // Always false on initial upload

      const response = await fetch('/api/home/amdec/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setUploadProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setUploadProgress('');
    } finally {
      setLoading(false);
      setEstimatedTime(0);
    }
  };

  const downloadResults = () => {
    if (!analysisResult) return;

    const csvContent = [
      ['Equipment', 'Failure Mode', 'Total Occurrences', 'Frequency (per month)', 'Average Cost', 'Total Cost'].join(','),
      ...analysisResult.equipment_stats.map(stat => 
        [
          `"${stat.equipment}"`,
          `"${stat.failure_mode}"`,
          stat.total_occurrences,
          stat.failure_frequency.toFixed(2),
          stat.average_cost.toFixed(2),
          stat.total_cost.toFixed(2)
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amdec_analysis.csv';
    a.click();
  };

  const downloadAmdec = (machine: string) => {
    if (!analysisResult?.amdec_by_machine || !analysisResult.amdec_by_machine[machine]) return;

    const blob = new Blob([analysisResult.amdec_by_machine[machine]], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amdec_${machine}.html`;
    a.click();
  };

  const downloadAmdecAsPdf = async (machine: string) => {
    if (!analysisResult?.amdec_by_machine || !analysisResult.amdec_by_machine[machine]) return;

    try {
      setError(null);
      console.log('[PDF] Starting PDF generation for:', machine);

      // Create an isolated iframe to avoid CSS inheritance
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '794px';
      iframe.style.height = '1123px';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not access iframe document');

      // Write clean HTML with only basic styles
      const htmlContent = analysisResult.amdec_by_machine[machine];
      
      // Remove any CSS that html2canvas can't handle and apply inline styles
      const styledContent = htmlContent
        .replace(/<table/g, '<table style="width: 100%; border-collapse: collapse; margin: 10px 0; background-color: #ffffff;"')
        .replace(/<thead/g, '<thead style="background-color: #f3f4f6;"')
        .replace(/<th/g, '<th style="border: 1px solid #cccccc; padding: 8px; background-color: #e5e7eb; color: #000000; font-weight: bold; text-align: left;"')
        .replace(/<td/g, '<td style="border: 1px solid #cccccc; padding: 8px; background-color: #ffffff; color: #000000; text-align: left;"')
        .replace(/<tbody/g, '<tbody style="background-color: #ffffff;"')
        .replace(/<tr/g, '<tr style="background-color: #ffffff;"');

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              color: #000000 !important;
              background-color: transparent !important;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              padding: 20px;
              background-color: #ffffff !important;
              color: #000000 !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              background-color: #ffffff !important;
            }
            th {
              border: 1px solid #cccccc;
              padding: 8px;
              background-color: #e5e7eb !important;
              color: #000000 !important;
              font-weight: bold;
              text-align: left;
            }
            td {
              border: 1px solid #cccccc;
              padding: 8px;
              background-color: #ffffff !important;
              color: #000000 !important;
              text-align: left;
            }
            h1 {
              color: #1f2937 !important;
              font-size: 24px;
              margin-bottom: 5px;
              background-color: transparent !important;
            }
            h2 {
              color: #9333ea !important;
              font-size: 16px;
              margin-bottom: 20px;
              background-color: transparent !important;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #9333ea;
              padding-bottom: 10px;
              margin-bottom: 20px;
              background-color: transparent !important;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${machine}</h1>
            <h2>AMDEC Analysis Report</h2>
          </div>
          <div>
            ${styledContent}
          </div>
        </body>
        </html>
      `);
      iframeDoc.close();

      console.log('[PDF] Rendering HTML to canvas...');
      
      // Wait a bit for iframe to render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Convert iframe content to canvas
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        height: iframeDoc.body.scrollHeight
      });

      console.log('[PDF] Canvas created:', canvas.width, 'x', canvas.height);

      // Remove iframe
      document.body.removeChild(iframe);

      // Create PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      console.log('[PDF] Creating PDF document...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 1.0);

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      console.log('[PDF] Saving PDF...');
      pdf.save(`amdec_${machine}.pdf`);
      console.log('[PDF] PDF generated successfully!');
    } catch (error: any) {
      console.error('[PDF] Error generating PDF:', error);
      console.error('[PDF] Error details:', error.message, error.stack);
      setError(`Failed to generate PDF: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-full mb-4 shadow-lg shadow-gray-500/50">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-semibold">AI-Powered Analysis</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-3">
            AMDEC Analysis Platform
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Advanced failure mode analysis with intelligent predictions and comprehensive reporting
          </p>
        </div>

      {/* Upload Section */}
      <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl shadow-lg shadow-gray-500/50">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-700">Upload Data</h2>
            <p className="text-sm text-gray-600">Start by uploading your maintenance CSV file</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="relative group">
            <label className="block">
              <div className="relative flex items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all duration-300 group-hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-gray-700" />
                  </div>
                  {file ? (
                    <>
                      <p className="text-sm font-semibold text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-600 mt-1">Click to change file</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-gray-700">Click to upload CSV</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Equipment, Date, Failure Mode, Cost
                      </p>
                    </>
                  )}
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Machine Selection for AMDEC Generation */}
          {analysisResult && uniqueMachines.length > 0 && (
            <div className="relative overflow-hidden border border-indigo-800/50 dark:border-indigo-700/50 rounded-xl p-6 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-pink-900/40 dark:from-indigo-950/60 dark:via-purple-950/60 dark:to-pink-950/60">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-bold text-indigo-300 dark:text-indigo-200">AI-Powered AMDEC Generation</h3>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-600 mb-5">
                  Select machines for detailed failure analysis (~10-15s per machine)
                </p>
                
                <div className="space-y-4 mb-5">
                  <div className="flex items-center gap-3 p-3 bg-white backdrop-blur-sm rounded-lg border border-gray-300">
                    <input
                      type="checkbox"
                      id="select-all"
                      checked={selectedMachinesForAmdec.length === uniqueMachines.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMachinesForAmdec(uniqueMachines);
                        } else {
                          setSelectedMachinesForAmdec([]);
                        }
                      }}
                      className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="select-all" className="text-sm font-semibold text-gray-800 cursor-pointer">
                      Select All Machines
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto p-1">
                    {uniqueMachines.map(machine => (
                      <div key={machine} className="group">
                        <label className="flex items-center gap-3 p-3 bg-white backdrop-blur-sm rounded-lg border border-gray-300 hover:border-gray-400 hover:shadow-md transition-all cursor-pointer">
                          <input
                            type="checkbox"
                            id={`machine-${machine}`}
                            checked={selectedMachinesForAmdec.includes(machine)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMachinesForAmdec(prev => [...prev, machine]);
                              } else {
                                setSelectedMachinesForAmdec(prev => prev.filter(m => m !== machine));
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-700">
                            {machine}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMachinesForAmdec.length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-white backdrop-blur-sm rounded-lg border border-gray-300 mb-4">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedMachinesForAmdec.length} machine(s) selected
                    </span>
                    <span className="text-xs text-gray-600 ml-auto">
                      ~{selectedMachinesForAmdec.length * 12}s estimated
                    </span>
                  </div>
                )}

                <button
                  onClick={handleGenerateAmdec}
                  disabled={selectedMachinesForAmdec.length === 0 || loadingAmdec}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 font-semibold text-base"
                >
                  {loadingAmdec ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Generating AI Analysis... ({estimatedTime}s)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate AMDEC for {selectedMachinesForAmdec.length} Machine(s)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-xl hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 font-semibold text-base"
          >
            {loading ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Analyzing Data... {estimatedTime > 0 && `(~${estimatedTime}s)`}
              </>
            ) : (
              <>
                <FileText className="w-6 h-6" />
                Analyze CSV Data
              </>
            )}
          </button>

          {/* Progress Indicator */}
          {(loading || loadingAmdec) && uploadProgress && (
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-lg">
              <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse w-full"></div>
              <div className="flex items-center gap-4 mt-1">
                <div className="p-2 bg-gray-100 rounded-lg shadow-sm">
                  <Loader className="w-6 h-6 animate-spin text-gray-700" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-blue-900">{uploadProgress}</p>
                  {estimatedTime > 0 && (
                    <p className="text-sm text-blue-700 mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      Estimated time: ~{estimatedTime} seconds
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-6 mb-8 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-900 text-lg mb-1">Error Occurred</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {analysisResult && (
        <div className="space-y-8">
          {/* Statistics Table */}
          <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-700">Failure Mode Analysis</h2>
                  <p className="text-sm text-gray-600">Comprehensive breakdown by equipment</p>
                </div>
              </div>
              <button
                onClick={downloadResults}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
            </div>

            {/* Machine Filter */}
            {uniqueMachines.length > 0 && (
              <div className="mb-6 flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-300">
                <label className="text-sm font-semibold text-gray-700">Filter by Machine:</label>
                <select
                  value={machineFilter}
                  onChange={(e) => setMachineFilter(e.target.value)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all bg-white"
                >
                  <option value="all">All Machines ({analysisResult?.equipment_stats.length} rows)</option>
                  {uniqueMachines.map(machine => {
                    const count = analysisResult?.equipment_stats.filter(s => s.equipment === machine).length || 0;
                    return (
                      <option key={machine} value={machine}>
                        {machine} ({count} failure modes)
                      </option>
                    );
                  })}
                </select>
                {machineFilter !== 'all' && (
                  <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full">
                    {filteredStats.length} of {analysisResult?.equipment_stats.length} rows
                  </span>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-300">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                    <th className="px-6 py-4 text-left font-bold text-gray-800">Equipment</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-800">Failure Mode</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-800">Occurrences</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-800">Frequency</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-800">Avg Cost</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-800">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredStats.map((stat, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-700">{stat.equipment}</td>
                      <td className="px-6 py-4 text-gray-700">{stat.failure_mode}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200">
                          {stat.total_occurrences}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{stat.failure_frequency.toFixed(2)}/month</td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{stat.average_cost.toFixed(2)} DH</td>
                      <td className="px-6 py-4 font-bold text-gray-700">{stat.total_cost.toFixed(2)} DH</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generated AMDEC Documents by Machine */}
          {analysisResult.amdec_by_machine && Object.keys(analysisResult.amdec_by_machine).length > 0 && (
            <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-700">AI-Generated AMDEC Documents</h2>
                    <p className="text-sm text-gray-600">Detailed failure analysis per machine</p>
                  </div>
                </div>
                
                {/* Machine Selector */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-gray-700">View:</label>
                  <select
                    value={selectedMachine}
                    onChange={(e) => setSelectedMachine(e.target.value)}
                    className="px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-gray-400 focus:border-gray-400 bg-white transition-all"
                  >
                    <option value="all">All Machines ({Object.keys(analysisResult.amdec_by_machine).length})</option>
                    {Object.keys(analysisResult.amdec_by_machine).sort().map(machine => (
                      <option key={machine} value={machine}>{machine}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-6">
                {Object.entries(analysisResult.amdec_by_machine)
                  .filter(([machine]) => selectedMachine === 'all' || machine === selectedMachine)
                  .map(([machine, amdecHtml]) => (
                    <div key={machine} className="relative overflow-hidden border-2 border-purple-200 rounded-xl p-6 bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-white shadow-lg hover:shadow-xl transition-shadow">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                              <Shield className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-700">{machine}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => downloadAmdecAsPdf(machine)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold text-sm"
                              title="Download as PDF"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </button>
                            <button
                              onClick={() => downloadAmdec(machine)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold text-sm"
                              title="Download as HTML"
                            >
                              <Download className="w-4 h-4" />
                              HTML
                            </button>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-xl p-6 max-h-96 overflow-auto border border-gray-300 shadow-inner">
                          <div dangerouslySetInnerHTML={{ __html: amdecHtml }} />
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}


