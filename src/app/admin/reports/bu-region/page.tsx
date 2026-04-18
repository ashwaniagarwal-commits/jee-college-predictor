'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download } from 'lucide-react';

interface BURegionData {
  [bu: string]: {
    [region: string]: {
      uploaded: number;
      total: number;
    };
  };
}

interface MatrixData {
  bus: string[];
  regions: string[];
  matrix: Array<Array<{ uploaded: number; total: number }>>;
}

export default function BURegionPage() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/reports/bu-region');
      if (!res.ok) throw new Error('Failed to fetch BU-Region data');

      const rawData: BURegionData = await res.json();

      const buses = Object.keys(rawData).sort();
      const regionsSet = new Set<string>();

      buses.forEach((bu) => {
        Object.keys(rawData[bu]).forEach((region) => {
          regionsSet.add(region);
        });
      });

      const regions = Array.from(regionsSet).sort();

      const matrix = buses.map((bu) =>
        regions.map((region) => {
          return (
            rawData[bu]?.[region] || { uploaded: 0, total: 0 }
          );
        })
      );

      setData({ bus: buses, regions, matrix });
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
        '/api/admin/export?report=bu-region&format=csv'
      );
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bu-region.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const getIntensity = (uploaded: number, total: number): string => {
    if (total === 0) return 'bg-gray-100';
    const percentage = (uploaded / total) * 100;
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-green-300';
    if (percentage >= 50) return 'bg-yellow-300';
    if (percentage >= 25) return 'bg-orange-300';
    return 'bg-red-300';
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">BU-Region Matrix</h1>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            <Download size={16} />
            <span className="text-sm font-semibold">Export CSV</span>
          </button>
        </div>

        {data && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200">
                      BU / Region
                    </th>
                    {data.regions.map((region) => (
                      <th
                        key={region}
                        className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 min-w-[120px]"
                      >
                        {region}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.bus.map((bu, buIdx) => (
                    <tr key={bu}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200">
                        {bu}
                      </td>
                      {data.regions.map((region, regionIdx) => {
                        const cell = data.matrix[buIdx][regionIdx];
                        return (
                          <td
                            key={`${bu}-${region}`}
                            className={`px-4 py-3 text-center text-sm border border-gray-200 ${getIntensity(
                              cell.uploaded,
                              cell.total
                            )}`}
                          >
                            <div className="font-semibold text-gray-900">
                              {cell.uploaded}
                            </div>
                            <div className="text-xs text-gray-700">
                              / {cell.total}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Color Legend */}
            <div className="mt-6 flex items-center gap-4 flex-wrap">
              <p className="text-sm font-semibold text-gray-700">Completion:</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded"></div>
                <span className="text-xs text-gray-600">100%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-300 rounded"></div>
                <span className="text-xs text-gray-600">75-99%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-300 rounded"></div>
                <span className="text-xs text-gray-600">50-74%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-300 rounded"></div>
                <span className="text-xs text-gray-600">25-49%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-300 rounded"></div>
                <span className="text-xs text-gray-600">0-24%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
