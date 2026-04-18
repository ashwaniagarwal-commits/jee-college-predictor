'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader, GraduationCap, CheckCircle, ArrowRight } from 'lucide-react';

interface Branch {
  branch_name: string;
  count: number;
}

function PreferencesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get('userId');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch('/api/branches');
        if (res.ok) {
          const data = await res.json();
          setBranches(data);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  const toggleBranch = (branchName: string) => {
    setSelectedBranches(prev =>
      prev.includes(branchName)
        ? prev.filter(b => b !== branchName)
        : [...prev, branchName]
    );
  };

  const selectAll = () => {
    setSelectedBranches(branches.map(b => b.branch_name));
  };

  const clearAll = () => {
    setSelectedBranches([]);
  };

  const handleSubmit = () => {
    if (selectedBranches.length === 0) return;
    setSubmitting(true);
    const branchParam = encodeURIComponent(selectedBranches.join(','));
    router.push(`/result?userId=${userId}&branches=${branchParam}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-orange-500" size={40} />
          <p className="text-gray-600">Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <GraduationCap className="text-orange-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Select Your Preferred Branches
          </h1>
          <p className="text-gray-600">
            Choose the branches you&apos;re interested in. We&apos;ll show colleges offering these branches.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-orange-600">{selectedBranches.length}</span> of {branches.length} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={selectAll}
              className="text-sm text-orange-600 hover:text-orange-700 font-semibold"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearAll}
              className="text-sm text-gray-500 hover:text-gray-700 font-semibold"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Branch Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {branches.map((branch) => {
            const isSelected = selectedBranches.includes(branch.branch_name);
            return (
              <button
                key={branch.branch_name}
                onClick={() => toggleBranch(branch.branch_name)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'
                }`}
              >
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                }`}>
                  {isSelected && <CheckCircle className="text-white" size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isSelected ? 'text-orange-900' : 'text-gray-800'}`}>
                    {branch.branch_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {branch.count} colleges
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-4">
          <button
            onClick={handleSubmit}
            disabled={selectedBranches.length === 0 || submitting}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
              selectedBranches.length > 0
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <Loader className="animate-spin" size={20} />
                Finding Your Colleges...
              </>
            ) : (
              <>
                Show My Colleges ({selectedBranches.length} branches)
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-orange-500" size={40} />
      </div>
    }>
      <PreferencesContent />
    </Suspense>
  );
}
