'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download, Users } from 'lucide-react';

interface Student {
  user_id: string;
  name_on_card: string;
  category: string;
  state_of_eligibility: string;
  best_nta: number;
  s1_nta: number;
  s2_nta: number;
  crl: number;
  cat_rank: number;
  advanced_qualified: boolean;
  bu: string;
  mobile: string;
}

interface ApiResponse {
  students: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  buOptions: string[];
}

export default function StudentsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [bu, setBu] = useState('');
  const [sortBy, setSortBy] = useState('crl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sortBy,
        sortOrder,
      });
      if (search) params.set('search', search);
      if (bu) params.set('bu', bu);

      const res = await fetch(`/api/admin/students?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, bu, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronUp className="text-gray-300" size={14} />;
    return sortOrder === 'asc' ? <ChevronUp className="text-orange-500" size={14} /> : <ChevronDown className="text-orange-500" size={14} />;
  };

  const downloadCSV = () => {
    if (!data?.students) return;
    const headers = ['Name', 'Category', 'State of Eligibility', 'Final NTA Score', 'CRL', 'BU', 'Mobile'];
    const csvRows = data.students.map(s => [
      s.name_on_card || '',
      s.category || '',
      s.state_of_eligibility || '',
      s.best_nta?.toFixed(2) || '',
      s.crl?.toString() || '',
      s.bu || '',
      s.mobile || '',
    ]);
    const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_data.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Users className="text-orange-600" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Student Data</h1>
            <p className="text-sm text-gray-500">
              {data?.total || 0} students with scorecard data
            </p>
          </div>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold text-sm"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, mobile, or user ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </form>
          <select
            value={bu}
            onChange={(e) => { setBu(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All BUs</option>
            {data?.buOptions?.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-orange-600"
                >
                  <div className="flex items-center gap-1">Student Name <SortIcon column="name" /></div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-orange-600"
                >
                  <div className="flex items-center gap-1">Category <SortIcon column="category" /></div>
                </th>
                <th
                  onClick={() => handleSort('state')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-orange-600"
                >
                  <div className="flex items-center gap-1">State <SortIcon column="state" /></div>
                </th>
                <th
                  onClick={() => handleSort('nta')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-orange-600"
                >
                  <div className="flex items-center gap-1">Final NTA Score <SortIcon column="nta" /></div>
                </th>
                <th
                  onClick={() => handleSort('crl')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-orange-600"
                >
                  <div className="flex items-center gap-1">CRL <SortIcon column="crl" /></div>
                </th>
                <th
                  onClick={() => handleSort('bu')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-orange-600"
                >
                  <div className="flex items-center gap-1">BU <SortIcon column="bu" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                    Loading...
                  </td>
                </tr>
              ) : data?.students && data.students.length > 0 ? (
                data.students.map((student, index) => (
                  <tr key={student.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {(page - 1) * 50 + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{student.name_on_card || '-'}</p>
                      <p className="text-xs text-gray-500">{student.mobile}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        student.category === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                        student.category === 'OBC-NCL' ? 'bg-yellow-100 text-yellow-800' :
                        student.category === 'SC' ? 'bg-purple-100 text-purple-800' :
                        student.category === 'ST' ? 'bg-green-100 text-green-800' :
                        student.category === 'EWS' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {student.category || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {student.state_of_eligibility || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.best_nta ? student.best_nta.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-orange-600">
                        {student.crl ? student.crl.toLocaleString() : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {student.bu || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No student data found. Students need to upload their scorecards first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-gray-700">
                Page {page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
