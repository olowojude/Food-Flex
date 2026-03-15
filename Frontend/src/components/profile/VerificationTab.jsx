'use client';

import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import {
  Phone, ShieldCheck, CheckCircle, AlertCircle, Clock,
  Loader2, RefreshCw, CreditCard, Lock, ChevronRight
} from 'lucide-react';

export default function VerificationTab({ user, onUserUpdate }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phone OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');

  // BVN state
  const [bvnValue, setBvnValue] = useState('');
  const [submittingBvn, setSubmittingBvn] = useState(false);
  const [bvnError, setBvnError] = useState('');
  const [bvnSuccess, setBvnSuccess] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getVerificationStatus();
      setStatus(res.data);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // ── Phone OTP ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setPhoneError('');
    setPhoneSuccess('');
    setSendingOtp(true);
    try {
      await authAPI.sendPhoneVerificationOTP();
      setOtpSent(true);
      setOtpCountdown(120); // 2-min cooldown before resend
      setPhoneSuccess(`OTP sent to ${status?.phone_number || user?.phone_number}. Valid for 10 minutes.`);
    } catch (err) {
      setPhoneError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setPhoneError('Please enter the 6-digit OTP.');
      return;
    }
    setPhoneError('');
    setVerifyingOtp(true);
    try {
      await authAPI.verifyPhoneOTP({ otp: otpValue });
      setPhoneSuccess('Phone verified successfully! ✓');
      setOtpSent(false);
      setOtpValue('');
      await fetchStatus();
      if (onUserUpdate) await onUserUpdate();
    } catch (err) {
      setPhoneError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── BVN ───────────────────────────────────────────────────────────────────
  const handleSubmitBvn = async () => {
    setBvnError('');
    setBvnSuccess('');
    if (!bvnValue || bvnValue.length !== 11 || !/^\d{11}$/.test(bvnValue)) {
      setBvnError('BVN must be exactly 11 digits.');
      return;
    }
    setSubmittingBvn(true);
    try {
      await authAPI.submitBvn({ bvn: bvnValue });
      setBvnSuccess('BVN submitted successfully. Verification is pending admin review.');
      setBvnValue('');
      await fetchStatus();
      if (onUserUpdate) await onUserUpdate();
    } catch (err) {
      setBvnError(err.response?.data?.error || 'Failed to submit BVN.');
    } finally {
      setSubmittingBvn(false);
    }
  };

  // ── helpers ────────────────────────────────────────────────────────────────
  const isFullyVerified = status?.is_fully_verified;
  const phoneVerified = status?.phone_verified;
  const bvnVerified = status?.bvn_verified;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Identity Verification</h2>
        <p className="text-gray-600 mt-1">
          Verify your phone number and BVN to unlock checkout and access your full credit limit.
        </p>
      </div>

      {/* Overall status banner */}
      {isFullyVerified ? (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Fully Verified</p>
            <p className="text-sm text-green-700">You can checkout and access all features.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Verification Required</p>
            <p className="text-sm text-amber-700">
              Complete both steps below to unlock checkout.
              {!phoneVerified && !bvnVerified && ' Start with phone verification.'}
            </p>
          </div>
        </div>
      )}

      {/* Progress steps */}
      <div className="flex items-center gap-2">
        <StepBadge number={1} done={phoneVerified} label="Phone" />
        <div className={`flex-1 h-1 rounded ${phoneVerified ? 'bg-green-400' : 'bg-gray-200'}`} />
        <StepBadge number={2} done={bvnVerified} label="BVN" />
        <div className={`flex-1 h-1 rounded ${bvnVerified ? 'bg-green-400' : 'bg-gray-200'}`} />
        <StepBadge number={3} done={isFullyVerified} label="Done" />
      </div>

      {/* ── STEP 1: Phone Verification ──────────────────────────────────── */}
      <section className={`rounded-xl border p-6 ${phoneVerified ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${phoneVerified ? 'bg-green-100' : 'bg-blue-50'}`}>
              <Phone className={`w-5 h-5 ${phoneVerified ? 'text-green-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Step 1 — Phone Verification</h3>
              <p className="text-sm text-gray-500">
                {phoneVerified
                  ? `Verified on ${new Date(status.phone_verified_at).toLocaleDateString()}`
                  : `We'll send an OTP to ${status?.phone_number || user?.phone_number || 'your phone'}`}
              </p>
            </div>
          </div>
          {phoneVerified && <CheckCircle className="w-6 h-6 text-green-600" />}
        </div>

        {phoneVerified ? (
          <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
            <CheckCircle className="w-4 h-4" />
            Phone number verified
          </div>
        ) : (
          <div className="space-y-4">
            {/* Phone number display */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-800">
                {status?.phone_number || user?.phone_number || 'No phone number on file'}
              </span>
              {!(status?.phone_number || user?.phone_number) && (
                <span className="text-xs text-amber-600 ml-auto">Add in Personal Info first</span>
              )}
            </div>

            {/* OTP input */}
            {otpSent && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpValue}
                  onChange={e => {
                    setOtpValue(e.target.value.replace(/\D/g, ''));
                    setPhoneError('');
                  }}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  OTP expires in 10 minutes
                </div>
              </div>
            )}

            {/* Feedback */}
            {phoneError && (
              <p className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" /> {phoneError}
              </p>
            )}
            {phoneSuccess && (
              <p className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> {phoneSuccess}
              </p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {otpSent ? (
                <>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otpValue.length !== 6}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                  >
                    {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button
                    onClick={handleSendOtp}
                    disabled={sendingOtp || otpCountdown > 0}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 font-medium px-3 py-2.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${sendingOtp ? 'animate-spin' : ''}`} />
                    {otpCountdown > 0 ? `Resend (${otpCountdown}s)` : 'Resend'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !(status?.phone_number || user?.phone_number)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
                >
                  {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  {sendingOtp ? 'Sending...' : 'Send OTP via SMS'}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── STEP 2: BVN Verification ────────────────────────────────────── */}
      <section className={`rounded-xl border p-6 ${
        bvnVerified
          ? 'border-green-200 bg-green-50'
          : !phoneVerified
          ? 'border-gray-100 bg-gray-50 opacity-60'
          : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bvnVerified ? 'bg-green-100' : 'bg-purple-50'}`}>
              <CreditCard className={`w-5 h-5 ${bvnVerified ? 'text-green-600' : 'text-purple-600'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Step 2 — BVN Verification</h3>
              <p className="text-sm text-gray-500">
                {bvnVerified
                  ? `Verified on ${new Date(status.bvn_verified_at).toLocaleDateString()}`
                  : 'Your Bank Verification Number (11 digits)'}
              </p>
            </div>
          </div>
          {bvnVerified && <CheckCircle className="w-6 h-6 text-green-600" />}
        </div>

        {!phoneVerified && !bvnVerified && (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Complete phone verification first to unlock this step.
          </p>
        )}

        {bvnVerified && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
              <CheckCircle className="w-4 h-4" /> BVN verified
            </div>
            {status?.bvn_number && (
              <p className="text-xs text-gray-500">BVN ending in ****{status.bvn_number}</p>
            )}
          </div>
        )}

        {!bvnVerified && phoneVerified && (
          <div className="space-y-4">
            {/* Already submitted — pending */}
            {status?.bvn_number && !bvnVerified && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Verification Pending</p>
                  <p className="text-xs text-yellow-700">
                    Your BVN (ending in ****{status.bvn_number}) has been submitted and is awaiting admin review.
                  </p>
                </div>
              </div>
            )}

            {!status?.bvn_number && (
              <>
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                  <p className="text-xs text-purple-800">
                    <strong>What is BVN?</strong> Your Bank Verification Number is an 11-digit number issued by the CBN to uniquely identify bank customers in Nigeria. Find it by dialling <strong>*565*0#</strong> on your registered bank phone number.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Enter your BVN
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    value={bvnValue}
                    onChange={e => {
                      setBvnValue(e.target.value.replace(/\D/g, ''));
                      setBvnError('');
                    }}
                    placeholder="12345678901"
                    className="w-full font-mono text-lg tracking-wider border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500">{bvnValue.length}/11 digits</p>
                </div>

                {/* Feedback */}
                {bvnError && (
                  <p className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" /> {bvnError}
                  </p>
                )}
                {bvnSuccess && (
                  <p className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" /> {bvnSuccess}
                  </p>
                )}

                <button
                  onClick={handleSubmitBvn}
                  disabled={submittingBvn || bvnValue.length !== 11}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
                >
                  {submittingBvn ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {submittingBvn ? 'Submitting...' : 'Submit BVN'}
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── What you unlock ─────────────────────────────────────────────── */}
      {!isFullyVerified && (
        <section className="rounded-xl border border-dashed border-gray-300 p-5 bg-gray-50">
          <h4 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">
            What you unlock after verification
          </h4>
          <ul className="space-y-2">
            {[
              'Checkout with BNPL credit',
              'SMS order confirmations with seller address and pickup details',
              'Access to your full ₦50,000 credit limit',
              'Early repayment bonus eligibility',
            ].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                <ChevronRight className="w-4 h-4 text-blue-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Small step badge helper
function StepBadge({ number, done, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
      }`}>
        {done ? <CheckCircle className="w-4 h-4" /> : number}
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}