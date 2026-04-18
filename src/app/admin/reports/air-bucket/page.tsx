'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';

interface AIRBucketStudent {
  air: number;
  name: string;
  user_id: string;
  bu: string;
  region: string;
  best_nta_percentage: number;
  category: string;
  advanced_qualified: boolean;
}

type BucketType = 'top100' | 'top1000' | 'top10000';

export default function AIRBucketPage() {
  const [selectedBucket, setSelectedBucket] = useState<BucketType>('top100');
  const [students, setStudents] = useState<AIRBucketStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedBucket]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const bucketMap: Record<BucketType, string> = {
        top100: '100',
        top1000: '1000',
        top10000: '10000',
      };

      const res = await fetch(
        `/api/admin/reports/air-bucket?bucket=${bucketMap[selectedBucket]}`
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
      const bucketMap: Record<BucketType, string> = {
        top100: '100',
        top1000: '1000',
        top10000: '10000',
      };

      const res = await fetch(
        `/api/admin/export?report=air-bucket&format=csv&bucket=${bucketMap[selectedBucket]}`
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `air-bucket-${selectedBucket}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">AIR Buckets</h1>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            <span className="text-sm font-semibold">Export CSV</span>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { id: 'top100' as BucketType, label: 'Top 100' },
            { id: 'top1000' as BucketType, label: 'Top 1000' },
            { id: 'top10000' as BucketType, label: 'Top 10000' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedBucket(tab.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                selectedBucket === tab.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Badge */}
        <div className="mb-4 inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
          Showing {students.length} student{students.length !== 1 ? 's' : ''}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  AIR
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
                  Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Adv Qualified
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr
                  key={student.user_id}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {student.air}
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
                    {student.category}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {student.advanced_qualified ? (
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
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
            <p className="text-gray-500">No students in this bucket</p>
          </div>
        )}
      </div>
    </div>
  );
}
