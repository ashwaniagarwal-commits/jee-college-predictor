'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';

interface TopPercentileStudent {
  rank: number;
  name: string;
  user_id: string;
  bu: string;
  region: string;
  best_nta_percentage: number;
  crl: number | null;
  advanced_qualified: boolean;
}

export default function TopPercentilePage() {
  const [students, setStudents] = useState<TopPercentileStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minPercentile, setMinPercentile] = useState(99);

  useEffect(() => {
    fetchData();
  }, [minPercentile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/admin/reports/top-percentile?min=${minPercentile}`
      );
      if (!res.ok) throw new Error('Failed to fetch data');

      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
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
        `/api/admin/export?report=top-percentile&format=csv&min=${minPercentile}`
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'top-percentile.csv';
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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Top Percentile Students
          </h1>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            <span className="text-sm font-semibold">Export CSV</span>
          </button>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700">
            Minimum Percentile:
          </label>
          <input
            type="number"
            value={minPercentile}
            onChange={(e) => setMinPercentile(parseInt(e.target.value) || 99)}
            min="0"
            max="100"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-24"
          />
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {students.length} student{students.length !== 1 ? 's' : ''}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Rank#
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  BU
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Region
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Best NTA %
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  CRL
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Advanced Qualified
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr
                  key={student.user_id}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.rank}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                    {student.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {student.user_id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.bu}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.region}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                    {student.best_nta_percentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.crl || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {student.advanced_qualified ? (
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No students found with that percentile</p>
          </div>
        )}
      </div>
    </div>
  );
}
