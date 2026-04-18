'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileDropzone from '@/components/FileDropzone';
import { Loader, GraduationCap, Upload, Phone } from 'lucide-react';

const CATEGORY_OPTIONS = ['OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS'];

export default function Home() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Manual fallback form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [manualUploadId, setManualUploadId] = useState('');
  const [manualData, setManualData] = useState({
    nameOnCard: '',
    applicationNo: '',
    category: 'OPEN',
    pwbd: false,
    s1Nta: '',
    s2Nta: '',
    crl: '',
    catRank: '',
  });

  const handleSubmit = async () => {
    setError('');

    if (!/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!uploadFile) {
      setError('Please upload your JEE Main scorecard');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Lookup or register student
      setStatusMsg('Looking up your profile...');
      const lookupRes = await fetch('/api/student/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const lookupData = await lookupRes.json();

      let userId: string;
      if (lookupData.found) {
        userId = lookupData.userId;
      } else {
        const regRes = await fetch('/api/student/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile, name: 'Student', bu: 'JEE-2Y', region: 'North' }),
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(regData.error || 'Registration failed');
        userId = regData.userId;
      }

      // Step 2: Upload file + OCR in one call
      setStatusMsg('Uploading & reading your scorecard...');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('userId', userId);

      const uploadRes = await fetch('/api/student/scorecard', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      if (uploadData.ocrSuccess && uploadData.data && uploadData.data.crl) {
        const d = uploadData.data;

        // Auto-confirm with extracted data
        setStatusMsg('Finding your colleges...');
        const confirmRes = await fetch('/api/student/scorecard/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId: uploadData.uploadId,
            userId,
            nameOnCard: d.nameOnCard || 'Student',
            applicationNo: d.applicationNo || '',
            category: d.category || 'OPEN',
            pwbd: d.pwbd || false,
            s1Nta: d.s1Nta || null,
            s2Nta: d.s2Nta || null,
            crl: d.crl || 0,
            catRank: d.catRank || null,
          }),
        });
        if (!confirmRes.ok) throw new Error('Failed to process');

        router.push(`/preferences?userId=${userId}`);
        return;
      } else {
        // OCR failed or no API key — show manual form
        setManualUserId(userId);
        setManualUploadId(uploadData.uploadId);
        setShowManualForm(true);
        setLoading(false);
        setStatusMsg('');
        setError('');
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setLoading(false);
      setStatusMsg('');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!manualData.crl) {
      setError('Please enter your All India Rank (CRL)');
      return;
    }

    setLoading(true);
    setStatusMsg('Finding your colleges...');

    try {
      const confirmRes = await fetch('/api/student/scorecard/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: manualUploadId,
          userId: manualUserId,
          nameOnCard: manualData.nameOnCard || 'Student',
          applicationNo: manualData.applicationNo || '',
          category: manualData.category,
          pwbd: manualData.pwbd,
          s1Nta: manualData.s1Nta ? parseFloat(manualData.s1Nta) : null,
          s2Nta: manualData.s2Nta ? parseFloat(manualData.s2Nta) : null,
          crl: parseInt(manualData.crl) || 0,
          catRank: manualData.catRank ? parseInt(manualData.catRank) : null,
        }),
      });

      const data = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(data.error || 'Failed to process');

      router.push(`/preferences?userId=${manualUserId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setLoading(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center text-white font-bold text-lg">
              V
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Vedantu</h1>
          </div>
          <span className="text-sm text-gray-500 hidden sm:block">JEE College Predictor</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 md:py-14">
        {/* Hero */}
        {!showManualForm && (
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF6B35]/10 rounded-full mb-4">
              <GraduationCap className="w-8 h-8 text-[#FF6B35]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-3">
              Find Your College in 30 Seconds
            </h2>
            <p className="text-gray-500 text-lg">
              Enter your mobile &amp; upload your JEE Main scorecard — we do the rest
            </p>
          </div>
        )}

        {/* ===== MANUAL FALLBACK FORM ===== */}
        {showManualForm ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">
                Enter Your Scorecard Details
              </h3>
              <p className="text-gray-500 text-sm">
                We could not auto-read the PDF. Please enter the key details from your scorecard.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name on Scorecard</label>
                <input
                  type="text"
                  value={manualData.nameOnCard}
                  onChange={(e) => setManualData({ ...manualData, nameOnCard: e.target.value })}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Application Number</label>
                <input
                  type="text"
                  value={manualData.applicationNo}
                  onChange={(e) => setManualData({ ...manualData, applicationNo: e.target.value })}
                  placeholder="e.g. 250310012345"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={manualData.category}
                    onChange={(e) => setManualData({ ...manualData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manualData.pwbd}
                      onChange={(e) => setManualData({ ...manualData, pwbd: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                    />
                    <span className="text-sm text-gray-700">PwBD</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Session 1 NTA Score</label>
                  <input
                    type="number"
                    step="any"
                    value={manualData.s1Nta}
                    onChange={(e) => setManualData({ ...manualData, s1Nta: e.target.value })}
                    placeholder="e.g. 89.234"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Session 2 NTA Score</label>
                  <input
                    type="number"
                    step="any"
                    value={manualData.s2Nta}
                    onChange={(e) => setManualData({ ...manualData, s2Nta: e.target.value })}
                    placeholder="e.g. 95.567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">All India Rank (CRL) *</label>
                  <input
                    type="number"
                    value={manualData.crl}
                    onChange={(e) => setManualData({ ...manualData, crl: e.target.value })}
                    placeholder="e.g. 5432"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category Rank</label>
                  <input
                    type="number"
                    value={manualData.catRank}
                    onChange={(e) => setManualData({ ...manualData, catRank: e.target.value })}
                    placeholder="e.g. 1200"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {loading && statusMsg && (
                <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-center">
                  <Loader className="inline w-5 h-5 animate-spin mr-2" />
                  {statusMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !manualData.crl}
                className="w-full bg-[#FF6B35] hover:bg-[#e55a28] text-white font-bold py-4 px-6 rounded-xl transition-all text-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Get My College List'
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ===== MAIN UPLOAD FORM ===== */
          <>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 space-y-6">
              {/* Mobile Number */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="w-4 h-4" />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter your 10-digit mobile number"
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-lg disabled:bg-gray-50"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 uppercase tracking-wider">and</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Upload Section */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Upload className="w-4 h-4" />
                  JEE Main Scorecard
                </label>
                <FileDropzone
                  onFileSelect={(file) => setUploadFile(file)}
                  accept=".pdf,.png,.jpg,.jpeg"
                  maxSize={10 * 1024 * 1024}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Loading Status */}
              {loading && statusMsg && (
                <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-center">
                  <Loader className="inline w-5 h-5 animate-spin mr-2" />
                  {statusMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || mobile.length !== 10 || !uploadFile}
                className="w-full bg-[#FF6B35] hover:bg-[#e55a28] text-white font-bold py-4 px-6 rounded-xl transition-all text-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Get My College List'
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Your data is used only for college prediction and counselling support.
              </p>
            </div>

            {/* How it works */}
            <div className="mt-10 grid grid-cols-3 gap-4 text-center">
              {[
                { num: '1', label: 'Enter mobile & upload scorecard' },
                { num: '2', label: 'AI reads your scores instantly' },
                { num: '3', label: 'Get your college list' },
              ].map((step) => (
                <div key={step.num} className="space-y-2">
                  <div className="w-8 h-8 bg-[#FF6B35]/10 text-[#FF6B35] font-bold rounded-full flex items-center justify-center mx-auto text-sm">
                    {step.num}
                  </div>
                  <p className="text-xs text-gray-500">{step.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-400">
          Powered by Vedantu
        </div>
      </footer>
    </div>
  );
}
