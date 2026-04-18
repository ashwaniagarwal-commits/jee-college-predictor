'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';

interface AdvancedQualifier {
  name: string;
  user_id: string;
  bu: string;
  region: string;
  category: string;
  best_nta_percentage: number;
  cutoff: number;
  margin: number;
}

interface BUSummary {
  bu: string;
  count: number;
}

export default function AdvancedQualifiersPage() {
  const [students, setStudents] = useState<AdvancedQualifier[]>([]);
  const [buSummary, setBuSummary] = useState<BUSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBU, setSelectedBU] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/reports/advanced-qualifiers');
      if (!res.ok) throw new Error('Failed to fetch data');

      const data = await res.json();
      const studentsArray = Array.isArray(data) ? data : [];
      setStudents(studentsArray);

      const buMap = new Map<string, number>();
      studentsArray.forEach((student: AdvancedQualifier) => {
        buMap.set(student.bu, (buMap.get(student.bu) || 0) + 1);
      });

      const summary = Array.from(buMap.entries())
        .map(([bu, count]) => ({ bu, count }))
        .sort((a, b) => b.count - a.count);

      setBuSummary(summary);
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
        `/api/admin/export?report=advanced-qualifiers&format=csv`
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'advanced-qualifiers.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const filteredStudents =
    selectedBU === 'all'
      ? students
      : students.filter((s) => s.bu === selectedBU);

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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {buSummary.map((bu) => (
          <div
            key={bu.bu}
            className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-t-purple-500 hover:shadow-md cursor-pointer transition-shadow"
            onClick={() => setSelectedBU(bu.bu)}
          >
            <p className="text-2xl font-bold text-gray-900">{bu.count}</p>
            <p className="text-xs text-gray-600 truncate">{bu.bu}</p>
          </div>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            JEE Advanced Qualifiers
          </h1>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            <span className="text-sm font-semibold">Export CSV</span>
          </button>
        </div>

        {/* BU Filter */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-700">
            Filter by BU:
          </label>
          <select
            value={selectedBU}
            onChange={(e) => setSelectedBU(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All BUs</option>
            {buSummary.map((bu) => (
              <option key={bu.bu} value={bu.bu}>
                {bu.bu}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredStudents.length} student
          {filteredStudents.length !== 1 ? 's' : ''}
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
                  Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Best NTA %
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Cutoff
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Margin
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => (
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
                    {student.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                    {student.best_nta_percentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {student.cutoff.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`font-semibold ${
                        student.margin >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {student.margin > 0 ? '+' : ''}
                      {student.margin.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No qualifiers in selected BU</p>
          </div>
        )}
      </div>
    </div>
  );
}
