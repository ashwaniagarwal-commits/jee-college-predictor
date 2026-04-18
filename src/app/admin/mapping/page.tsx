'use client';

import React, { useRef, useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Download, Upload, X } from 'lucide-react';

interface UploadResult {
  rows_added: number;
  rows_updated: number;
  errors?: Array<{
    row: number;
    error: string;
  }>;
}

interface BUTotal {
  bu_name: string;
  uploaded_count: number;
  total_mapped: number;
  completion_percentage: number;
}

export default function MappingPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [buTotals, setBuTotals] = useState<BUTotal[]>([]);
  const [loadingBUData, setLoadingBUData] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBUTotals();
  }, []);

  const fetchBUTotals = async () => {
    try {
      setLoadingBUData(true);
      const res = await fetch('/api/admin/reports/bu-totals');
      if (!res.ok) throw new Error('Failed to fetch BU data');

      const data = await res.json();
      setBuTotals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching BU totals:', err);
    } finally {
      setLoadingBUData(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadError(null);
      } else {
        setUploadError('Please upload a CSV file');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadError(null);
      } else {
        setUploadError('Please upload a CSV file');
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/admin/mapping', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Upload failed');
      }

      const result = await res.json();
      setUploadResult(result);
      setSelectedFile(null);

      await fetchBUTotals();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Upload failed'
      );
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'Userid,BU,Contact number\nv_4102546218158221,Offline,8248664304\nv_4102616349325145,Online,8248636585\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapping_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          CSV Mapping Upload
        </h1>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-orange-500 bg-orange-50'
              : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-white hover:border-orange-500 hover:bg-orange-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileInput}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="w-16 h-16 text-green-500" />
              <p className="font-semibold text-gray-900 text-lg">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-600">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors text-sm font-semibold"
              >
                Change File
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-16 h-16 text-orange-500" />
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  Drag and drop your CSV file
                </p>
                <p className="text-sm text-gray-600">or click to browse</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Supported format: CSV only
              </p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {uploadError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{uploadError}</p>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && (
          <div className="mt-6 flex gap-3 flex-wrap">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>
            <button
              onClick={downloadTemplate}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Download Template
            </button>
          </div>
        )}
      </div>

      {/* Upload Results */}
      {uploadResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold text-green-900 text-lg">
                Upload Successful
              </h3>
              <p className="text-green-700 text-sm mt-1">
                Your mapping data has been processed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Rows Added</p>
              <p className="text-2xl font-bold text-gray-900">
                {uploadResult.rows_added}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rows Updated</p>
              <p className="text-2xl font-bold text-gray-900">
                {uploadResult.rows_updated}
              </p>
            </div>
          </div>

          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="bg-yellow-50 rounded p-4 border border-yellow-200">
              <p className="font-semibold text-yellow-900 mb-2">Errors:</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-200">
                    <th className="text-left font-semibold text-yellow-900">
                      Row
                    </th>
                    <th className="text-left font-semibold text-yellow-900">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResult.errors.map((err, idx) => (
                    <tr key={idx} className="border-b border-yellow-100">
                      <td className="py-2 text-yellow-800">{err.row}</td>
                      <td className="py-2 text-yellow-800">{err.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Current Mapping Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Current Mapping Status
        </h2>

        {loadingBUData ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : buTotals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buTotals.map((bu) => (
              <div
                key={bu.bu_name}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
              >
                <p className="font-bold text-gray-900 text-lg mb-2">
                  {bu.bu_name}
                </p>
                <div className="mb-3">
                  <p className="text-sm text-gray-600">Uploaded / Mapped</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bu.uploaded_count}
                    <span className="text-sm text-gray-600 ml-1">
                      / {bu.total_mapped}
                    </span>
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Progress</span>
                    <span className="text-xs font-bold text-blue-600">
                      {bu.completion_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${bu.completion_percentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No BU data available yet</p>
        )}
      </div>

      {/* Template Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-3">CSV Template Format</h3>
        <p className="text-sm text-blue-800 mb-3">
          Your CSV file should have 3 columns (headers are flexible):
        </p>
        <div className="bg-white rounded p-3 font-mono text-xs text-gray-700 overflow-x-auto">
          <div>Userid,BU,Contact number</div>
          <div className="mt-2 text-gray-500">
            Example:
          </div>
          <div>v_4102546218158221,Offline,8248664304</div>
          <div>v_4102616349325145,Online,8248636585</div>
          <div>v_4102583233244835,Offline,9790962867</div>
        </div>
      </div>
    </div>
  );
}
