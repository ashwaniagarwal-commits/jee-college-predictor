'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';

interface SessionImprovementStudent {
  name: string;
  user_id: string;
  bu: string;
  region: string;
  session1_percentage: number;
  session2_percentage: number;
  delta: number;
  best_used: string;
}

interface BUAverage {
  bu: string;
  avgDelta: number;
}

export default function SessionImprovementPage() {
  const [students, setStudents] = useState<SessionImprovementStudent[]>([]);
  const [buAverages, setBuAverages] = useState<BUAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minDelta, setMinDelta] = useState(1);
  const [overallAverage, setOverallAverage] = useState(0);

  useEffect(() => {
    fetchData();
  }, [minDelta]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/admin/reports/session-improvement?minDelta=${minDelta}`
      );
      if (!res.ok) throw new Error('Failed to fetch data');

      const data = await res.json();
      const studentsArray = Array.isArray(data) ? data : [];
      setStudents(studentsArray);

      if (studentsArray.length > 0) {
        const avgDelta =
          studentsArray.reduce(
            (sum: number, s: SessionImprovementStudent) => sum + s.delta,
            0
          ) / studentsArray.length;
        setOverallAverage(avgDelta);

        const buMap = new Map<string, number[]>();
        studentsArray.forEach((student: SessionImprovementStudent) => {
          if (!buMap.has(student.bu)) {
            buMap.set(student.bu, []);
          }
          buMap.get(student.bu)!.push(student.delta);
        });

        const averages = Array.from(buMap.entries())
          .map(([bu, deltas]) => ({
            bu,
            avgDelta:
              deltas.reduce((a, b) => a + b, 0) / deltas.length,
          }))
          .sort((a, b) => b.avgDelta - a.avgDelta);

        setBuAverages(averages);
      }
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
        `/api/admin/export?report=session-improvement&format=csv&minDelta=${minDelta}`
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'session-improvement.csv';
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

      {/* BU-wise Average Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          BU-wise Average Improvement
        </h2>

        <div className="space-y-4">
          {buAverages.map((bu) => (
            <div key={bu.bu}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700">{bu.bu}</span>
                <span className="text-sm font-semibold text-green-600">
                  +{bu.avgDelta.toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(bu.avgDelta * 5, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Session Improvement
          </h1>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            <span className="text-sm font-semibold">Export CSV</span>
          </button>
        </div>

        {/* Summary */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Average improvement:</span>{' '}
            <span className="text-lg font-bold text-green-600">
              +{overallAverage.toFixed(2)}
            </span>{' '}
            percentile points
          </p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700">
            Minimum Delta:
          </label>
          <input
            type="number"
            value={minDelta}
            onChange={(e) => setMinDelta(parseFloat(e.target.value) || 1)}
            min="0"
            step="0.5"
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
                  S1 %
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  S2 %
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Delta
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Best Used
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr
                  key={student.user_id}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
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
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.session1_percentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.session2_percentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-semibold text-green-600">
                      +{student.delta.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.best_used}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No students with improvement above threshold</p>
          </div>
        )}
      </div>
    </div>
  );
}
