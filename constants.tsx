
import React from 'react';

export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  'খাবার': '#f87171',
  'যাতায়াত': '#fb923c',
  'ভাড়া': '#fbbf24',
  'বিল': '#a855f7',
  'কেনাকাটা': '#ec4899',
  'বিনোদন': '#6366f1',
  'স্বাস্থ্য': '#14b8a6',
  'অন্যান্য': '#94a3b8',
  'বেতন': '#22c55e',
  'ফ্রিল্যান্সিং': '#3b82f6',
  'ব্যবসা': '#06b6d4',
  'উপহার': '#f59e0b'
};

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'খাবার': <i className="fas fa-utensils"></i>,
  'যাতায়াত': <i className="fas fa-car"></i>,
  'ভাড়া': <i className="fas fa-home"></i>,
  'বিল': <i className="fas fa-file-invoice-dollar"></i>,
  'কেনাকাটা': <i className="fas fa-shopping-bag"></i>,
  'বিনোদন': <i className="fas fa-gamepad"></i>,
  'স্বাস্থ্য': <i className="fas fa-heartbeat"></i>,
  'অন্যান্য': <i className="fas fa-ellipsis-h"></i>,
  'বেতন': <i className="fas fa-wallet"></i>,
  'ফ্রিল্যান্সিং': <i className="fas fa-laptop-code"></i>,
  'ব্যবসা': <i className="fas fa-briefcase"></i>,
  'উপহার': <i className="fas fa-gift"></i>
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0
  }).format(amount);
};

export const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];
