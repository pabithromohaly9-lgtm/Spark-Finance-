
import React from 'react';

export const INCOME_CATEGORIES = ['বেতন', 'ব্যবসা', 'ফ্রিল্যান্সিং', 'উপহার', 'অন্যান্য'];
export const EXPENSE_CATEGORIES = ['খাবার', 'যাতায়াত', 'ভাড়া', 'বিল', 'কেনাকাটা', 'স্বাস্থ্য', 'অন্যান্য'];

// Default color mapping for categories
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  'খাবার': '#f43f5e',
  'যাতায়াত': '#0ea5e9',
  'ভাড়া': '#8b5cf6',
  'বিল': '#f59e0b',
  'কেনাকাটা': '#ec4899',
  'স্বাস্থ্য': '#10b981',
  'অন্যান্য': '#64748b',
  'বেতন': '#22c55e',
  'ব্যবসা': '#3b82f6',
  'ফ্রিল্যান্সিং': '#6366f1',
  'উপহার': '#d946ef'
};

export const CATEGORY_ICONS: Record<string, string> = {
  'খাবার': 'fa-utensils',
  'যাতায়াত': 'fa-car',
  'ভাড়া': 'fa-home',
  'বিল': 'fa-file-invoice-dollar',
  'কেনাকাটা': 'fa-shopping-bag',
  'স্বাস্থ্য': 'fa-heartbeat',
  'অন্যান্য': 'fa-ellipsis-h',
  'বেতন': 'fa-wallet',
  'ব্যবসা': 'fa-briefcase',
  'ফ্রিল্যান্সিং': 'fa-laptop-code',
  'উপহার': 'fa-gift'
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0
  }).format(amount);
};
