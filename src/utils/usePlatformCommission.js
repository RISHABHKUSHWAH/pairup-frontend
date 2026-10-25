import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'pairup_platform_commission_rates';

function getCachedRates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    mentor_commission_percent: 6.0,
    mentor_tax_percent: 18.0,
    learner_commission_percent: 6.0,
    learner_tax_percent: 18.0,
    commission_percent: 6.0,
    gst_percentage: 18.0,
  };
}

export function usePlatformCommission() {
  const { user } = useAuth();
  const [rates, setRates] = useState(getCachedRates);

  useEffect(() => {
    let mounted = true;
    api.getCommissionRates()
      .then((data) => {
        if (mounted && data) {
          const sanitized = {
            mentor_commission_percent: Number(
              data.mentor_commission_percent !== undefined
                ? data.mentor_commission_percent
                : (data.commission_percent !== undefined ? data.commission_percent : 6.0)
            ),
            mentor_tax_percent: Number(
              data.mentor_tax_percent !== undefined
                ? data.mentor_tax_percent
                : (data.gst_percentage !== undefined ? data.gst_percentage : 18.0)
            ),
            learner_commission_percent: Number(
              data.learner_commission_percent !== undefined
                ? data.learner_commission_percent
                : 6.0
            ),
            learner_tax_percent: Number(
              data.learner_tax_percent !== undefined
                ? data.learner_tax_percent
                : (data.gst_percentage !== undefined ? data.gst_percentage : 18.0)
            ),
            commission_percent: Number(data.commission_percent ?? 6.0),
            gst_percentage: Number(data.gst_percentage ?? 18.0),
          };
          setRates(sanitized);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
          } catch {}
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const mentorCommissionPercent = rates.mentor_commission_percent;
  const mentorTaxPercent = rates.mentor_tax_percent;
  const learnerCommissionPercent = rates.learner_commission_percent;
  const learnerTaxPercent = rates.learner_tax_percent;

  // Custom overrides per-user if configured by admin
  const effectiveMentorFeePercent =
    user?.custom_commission_percent !== undefined && user?.custom_commission_percent !== null
      ? Number(user.custom_commission_percent)
      : (user?.mentor_profile?.custom_commission_percent !== undefined && user?.mentor_profile?.custom_commission_percent !== null
          ? Number(user.mentor_profile.custom_commission_percent)
          : mentorCommissionPercent);

  const effectiveLearnerFeePercent =
    user?.custom_commission_percent !== undefined && user?.custom_commission_percent !== null
      ? Number(user.custom_commission_percent)
      : learnerCommissionPercent;

  const calculateMentorPayout = (grossPrice) => {
    const gross = Number(grossPrice || 0);
    const fee = Math.round(gross * (effectiveMentorFeePercent / 100) * 100) / 100;
    const tax = Math.round(fee * (mentorTaxPercent / 100) * 100) / 100;
    const net = Math.max(0, Math.round((gross - fee - tax) * 100) / 100);
    return { gross, fee, tax, net, feePercent: effectiveMentorFeePercent, taxPercent: mentorTaxPercent };
  };

  const calculateLearnerTotal = (basePrice) => {
    const base = Number(basePrice || 0);
    const fee = Math.round(base * (effectiveLearnerFeePercent / 100) * 100) / 100;
    const tax = Math.round(fee * (learnerTaxPercent / 100) * 100) / 100;
    const total = Math.round((base + fee + tax) * 100) / 100;
    return { base, fee, tax, total, feePercent: effectiveLearnerFeePercent, taxPercent: learnerTaxPercent };
  };

  return {
    rates,
    mentorCommissionPercent,
    mentorTaxPercent,
    learnerCommissionPercent,
    learnerTaxPercent,
    effectiveMentorFeePercent,
    effectiveLearnerFeePercent,
    calculateMentorPayout,
    calculateLearnerTotal,
  };
}
