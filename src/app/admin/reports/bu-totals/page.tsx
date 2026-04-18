'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';

interface BUTotal {
  bu_name: string;
  uploaded_count: number;
  total_mapped: number;
  completion_percentage: number;
}

export default function BUTotalsPage() {
  const [buTotals, setBuTotals] = useState<BUTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalMapped, setTotalMapped] = useState(0);
  const [totalUploaded, setTotalUploaded] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/reports/bu-totals');
      if (!res.ok) throw new Error('Failed to fetch data');

      const data = await res.json();
      const buArray = Array.isArray(data) ? data : [];
      setBuTotals(buArray);

      const totalMappedSum = buArray.reduce(
        (sum: number, bu: BUTotal) => sum + bu.total_mapped,
        0
      );
      const totalUploadedSum = buArray.reduce(
        (sum: number, bu: BUTotal) => sum + bu.uploaded_count,
        0
      );

      setTotalMapped(totalMappedSum);
      setTotalUploaded(totalUploadedSum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const res = await fetch(
        '/api/admin/export?report=bu-totals&format=csv'
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bu-totals.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  const overallCompletion =
    totalMapped > 0 ? Math.round((totalUploaded / totalMapped) * 100) : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Overall Summary */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-orange-500">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Overall Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-2">Total Mapped Students</p>
            <p className="text-3xl font-bold text-gray-900">{totalMapped}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Total Uploaded</p>
            <p className="text-3xl font-bold text-gray-900">{totalUploaded}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Overall Completion</p>
            <p className="text-3xl font-bold text-orange-500">
              {overallCompletion}%
            </p>
          </div>
        </div>
      </div>

      {/* BU Cards */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">BU-wise Breakdown</h2>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          <Download size={16} />
          <span className="text-sm font-semibold">Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buTotals.map((bu) => (
          <div
            key={bu.bu_name}
            className="bg-white rounded-lg shadow p-6 border-t-4 border-t-orange-500 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {bu.bu_name}
            </h3>

            <div className="mb-4">
              <div className="text-2xl font-bold text-gray-900">
                {bu.uploaded_count}
                <span className="text-sm text-gray-600 ml-2 font-normal">
                  / {bu.total_mapped}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Uploaded / Mapped</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Progress
                </span>
                <span className="text-sm font-bold text-orange-500">
                  {bu.completion_percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${bu.completion_percentage}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {buTotals.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No BU data available</p>
        </div>
      )}
    </div>
  );
}
