'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download, TrendingUp } from 'lucide-react';

interface KPIData {
  totalMappedStudents: number;
  scorecardCollected: number;
  scorecardsTotal: number;
  percentile99Count: number;
  advancedQualifiersCount: number;
}

interface BUTotal {
  bu_name: string;
  uploaded_count: number;
  total_mapped: number;
  completion_percentage: number;
}

interface RecentUpload {
  id: string;
  uploaded_at: string;
  file_name: string;
  rows_added: number;
}

export default function AdminDashboard() {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [buTotals, setBuTotals] = useState<BUTotal[]>([]);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [buTotalsRes, percentileRes, advancedQualifiersRes] = await Promise.all([
        fetch('/api/admin/reports/bu-totals'),
        fetch('/api/admin/reports/top-percentile?min=99'),
        fetch('/api/admin/reports/advanced-qualifiers'),
      ]);

      if (!buTotalsRes.ok || !percentileRes.ok || !advancedQualifiersRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const buData = await buTotalsRes.json();
      const percentileData = await percentileRes.json();
      const advancedData = await advancedQualifiersRes.json();

      const totalMapped = buData.reduce(
        (sum: number, bu: BUTotal) => sum + bu.total_mapped,
        0
      );
      const totalUploaded = buData.reduce(
        (sum: number, bu: BUTotal) => sum + bu.uploaded_count,
        0
      );

      setBuTotals(buData);
      setKpiData({
        totalMappedStudents: totalMapped,
        scorecardCollected: totalUploaded,
        scorecardsTotal: totalMapped,
        percentile99Count: percentileData?.length || 0,
        advancedQualifiersCount: advancedData?.length || 0,
      });

      setRecentUploads([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const res = await fetch(
        '/api/admin/export?report=dashboard&format=csv'
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dashboard_data.csv';
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-6 animate-pulse h-32"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const completionPercentage = kpiData
    ? Math.round(
        (kpiData.scorecardCollected / kpiData.scorecardsTotal) * 100
      ) || 0
    : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error loading data</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Mapped Students */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-t-blue-500">
          <h3 className="text-gray-600 text-sm font-semibold mb-2">
            Total Mapped Students
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {kpiData?.totalMappedStudents || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">Across all BUs</p>
        </div>

        {/* Scorecards Collected */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-t-green-500">
          <h3 className="text-gray-600 text-sm font-semibold mb-2">
            Scorecards Collected
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {kpiData?.scorecardCollected || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {completionPercentage}% of mapped
          </p>
        </div>

        {/* 99+ Percentile */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-t-orange-500">
          <h3 className="text-gray-600 text-sm font-semibold mb-2">
            99+ Percentile
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {kpiData?.percentile99Count || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">Top scorers</p>
        </div>

        {/* Advanced Qualifiers */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-t-purple-500">
          <h3 className="text-gray-600 text-sm font-semibold mb-2">
            Advanced Qualifiers
          </h3>
          <p className="text-3xl font-bold text-gray-900">
            {kpiData?.advancedQualifiersCount || 0}
          </p>
          <p className="text-xs text-gray-500 mt-2">JEE Advanced</p>
        </div>
      </div>

      {/* BU-wise Completion */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          BU-wise Completion Status
        </h2>

        <div className="space-y-4">
          {buTotals.length > 0 ? (
            buTotals.map((bu) => (
              <div key={bu.bu_name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700">
                    {bu.bu_name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {bu.uploaded_count} / {bu.total_mapped}
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
                <p className="text-xs text-gray-500 mt-1">
                  {bu.completion_percentage}%
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No BU data available</p>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Recent Uploads</h2>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Download size={16} />
            <span className="text-sm font-semibold">Export</span>
          </button>
        </div>

        {recentUploads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    File Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Uploaded At
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Rows Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((upload) => (
                  <tr
                    key={upload.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {upload.file_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(upload.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {upload.rows_added}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No uploads yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
