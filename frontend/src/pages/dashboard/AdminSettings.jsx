import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiCog, HiCurrencyDollar, HiSave } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [upiId, setUpiId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings/payment');
      if (res.success && res.data?.upiId) {
        setUpiId(res.data.upiId);
      }
    } catch (error) {
      console.error('Failed to fetch settings', error);
      toast.error('Could not load current settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!upiId) return toast.error('UPI ID cannot be blank');
    
    setSaving(true);
    try {
      const res = await api.put('/admin/settings/payment', { upiId });
      if (res.success) {
        toast.success('Payment settings updated!');
        if (res.data?.upiId) setUpiId(res.data.upiId);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <HiCog className="text-primary-500" /> Platform Settings
          </h1>
          <p className="text-dark-400">Configure global platform parameters and integrations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Configuration Panel */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6 border-b border-surface-border pb-4">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
              <HiCurrencyDollar className="text-xl text-neon-cyan" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Payment Configuration</h2>
              <p className="text-sm text-dark-400">Set the master UPI ID for receiving payments.</p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-dark-900 rounded"></div>
              <div className="h-10 bg-dark-900 rounded w-1/4"></div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-dark-300 mb-2 block">Admin UPI ID <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={upiId} 
                  onChange={(e) => setUpiId(e.target.value)} 
                  className="input-field font-mono" 
                  placeholder="e.g. yourname@upi or 9876543210@paytm" 
                  required
                />
                <p className="text-xs text-dark-400 mt-2">
                  This UPI ID will be used to automatically generate QR codes for Organizers when they purchase points.
                </p>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? 'Saving...' : <><HiSave /> Save Payment Settings</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
