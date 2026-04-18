'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, Download, ArrowLeft, Badge } from 'lucide-react';

interface PredictionItem {
  institute_name: string;
  institute_type: string;
  branch_name: string;
  quota: string;
  category: string;
  gender: string;
  openingRank: number;
  closingRank: number;
  medianClosingRank: number;
  ratio: number;
  admitProb: number;
  bucket: string;
}

interface PredictionResponse {
  safe: PredictionItem[];
  moderate: PredictionItem[];
  ambitious: PredictionItem[];
}

interface StudentInfo {
  name: string;
  advancedQualified: boolean;
}

const getInstituteTypeBadge = (type: string) => {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    'IIT': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'IIT' },
    'NIT': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'NIT' },
    'IIIT': { bg: 'bg-green-100', text: 'text-green-800', label: 'IIIT' },
    'GFTI': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'GFTI' },
  };
  return badges[type] || { bg: 'bg-gray-100', text: 'text-gray-800', label: type };
};

const getBucketColor = (bucket: string) => {
  switch (bucket) {
    case 'safe':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'moderate':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'ambitious':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

function ResultPageContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const branchesParam = searchParams.get('branches');

  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'safe' | 'moderate' | 'ambitious'>('safe');
  const [selectedInstituteTypes, setSelectedInstituteTypes] = useState<string[]>(['NIT', 'IIIT', 'GFTI']);
  const [branchSearch, setBranchSearch] = useState('');

  useEffect(() => {
    if (!userId) {
      setError('Invalid request. Please start from the beginning.');
      setLoading(false);
      return;
    }

    const fetchPredictions = async () => {
      try {
        let url = `/api/student/prediction?userId=${userId}`;
        if (branchesParam) {
          url += `&branches=${encodeURIComponent(branchesParam)}`;
        }
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch predictions');
        }

        setPredictions(data);

        // For now, we'll use a placeholder for student name
        // In a real scenario, you'd fetch this from the API
        setStudentInfo({
          name: 'Student',
          advancedQualified: false,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load predictions');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-[#FF6B35] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your predictions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card-shadow p-8 text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#FF6B35] hover:text-orange-700 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!predictions) {
    return null;
  }

  const filteredPredictions = (predictions[activeTab] || []).filter((item) => {
    const typeMatch = selectedInstituteTypes.includes(item.institute_type);
    const branchMatch = item.branch_name
      .toLowerCase()
      .includes(branchSearch.toLowerCase());
    return typeMatch && branchMatch;
  });

  const safeCount = predictions.safe?.length || 0;
  const moderateCount = predictions.moderate?.length || 0;
  const ambitiousCount = predictions.ambitious?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Your College Predictions</h1>
            <p className="text-sm text-gray-600 mt-1">
              {studentInfo?.name}
              {studentInfo?.advancedQualified && (
                <span className="ml-3 inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  JEE Advanced Qualified
                </span>
              )}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#FF6B35] hover:text-orange-700 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Start Over
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="card-shadow p-4 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-semibold">Safe Colleges</p>
            <p className="text-3xl font-bold text-green-600">{safeCount}</p>
          </div>
          <div className="card-shadow p-4 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-semibold">Moderate Colleges</p>
            <p className="text-3xl font-bold text-yellow-600">{moderateCount}</p>
          </div>
          <div className="card-shadow p-4 border-l-4 border-orange-500 col-span-2 md:col-span-1">
            <p className="text-gray-600 text-sm font-semibold">Ambitious Colleges</p>
            <p className="text-3xl font-bold text-orange-600">{ambitiousCount}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'safe' as const, label: 'Safe', count: safeCount, color: 'green' },
            { key: 'moderate' as const, label: 'Moderate', count: moderateCount, color: 'yellow' },
            { key: 'ambitious' as const, label: 'Ambitious', count: ambitiousCount, color: 'orange' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? `bg-${tab.color}-500 text-white`
                  : `bg-white text-gray-700 border border-gray-200 hover:border-${tab.color}-300`
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="card-shadow p-4 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Institute Type
              </label>
              <div className="flex flex-wrap gap-2">
                {['NIT', 'IIIT', 'GFTI'].map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setSelectedInstituteTypes((prev) =>
                        prev.includes(type)
                          ? prev.filter((t) => t !== type)
                          : [...prev, type]
                      )
                    }
                    className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                      selectedInstituteTypes.includes(type)
                        ? 'bg-[#FF6B35] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Branch
              </label>
              <input
                type="text"
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                placeholder="e.g., Computer Science, Electronics"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Colleges List */}
        <div className="space-y-4 mb-8">
          {filteredPredictions.length === 0 ? (
            <div className="card-shadow p-8 text-center text-gray-600">
              <p>No colleges found matching your filters.</p>
            </div>
          ) : (
            filteredPredictions.map((college, index) => {
              const badge = getInstituteTypeBadge(college.institute_type);
              const rankDelta = college.medianClosingRank - college.openingRank;
              const rankDeltaPercent = ((rankDelta / college.medianClosingRank) * 100).toFixed(1);

              return (
                <div
                  key={index}
                  className={`card-shadow p-6 border-l-4 ${
                    activeTab === 'safe'
                      ? 'border-green-500'
                      : activeTab === 'moderate'
                      ? 'border-yellow-500'
                      : 'border-orange-500'
                  }`}
                >
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-[#1a1a2e]">
                          {college.institute_name}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{college.branch_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{college.quota}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-1">Your Rank vs Closing</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold text-[#FF6B35]">{college.openingRank}</span>
                        <span className="text-xs text-gray-600">/</span>
                        <span className="text-sm text-gray-700">{college.medianClosingRank}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Δ +{rankDelta} ({rankDeltaPercent}%)
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-2">Admission Probability</p>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              college.admitProb >= 0.75
                                ? 'bg-green-500'
                                : college.admitProb >= 0.5
                                ? 'bg-yellow-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${college.admitProb * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-12">
                          {(college.admitProb * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CTA Card */}
        <div className="card-shadow p-8 bg-gradient-to-r from-[#FF6B35] to-orange-600 text-white rounded-lg mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Still confused about your choices?</h3>
              <p className="text-orange-100">
                Book a free JoSAA strategy call with our experts
              </p>
            </div>
            <button className="px-6 py-3 bg-white text-[#FF6B35] font-bold rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
              Book Free Call
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 btn-primary"
          >
            <Download className="w-5 h-5" />
            Download as PDF
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Upload Another Scorecard
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>Powered by Vedantu</p>
        </div>
      </footer>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-12 h-12 text-[#FF6B35] animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your predictions...</p>
          </div>
        </div>
      }
    >
      <ResultPageContent />
    </Suspense>
  );
}
