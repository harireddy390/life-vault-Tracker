import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Check, AlertCircle, Send, ShieldAlert, Sparkles } from 'lucide-react';
import notificationService from '../../services/notificationService';

export default function RoutineNotificationCard({ showToast }) {
  const [isSupported, setIsSupported] = useState(true);
  const [permission, setPermission] = useState('default'); // 'default' | 'granted' | 'denied' | 'unsupported'
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const supported = notificationService.isPushSupported();
      setIsSupported(supported);
      if (!supported) {
        setPermission('unsupported');
        setLoading(false);
        return;
      }

      const perm = notificationService.getPermissionState();
      setPermission(perm);

      if (perm === 'granted') {
        const sub = await notificationService.getExistingSubscription();
        setIsSubscribed(Boolean(sub));
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.warn('Notification status check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    setActionLoading(true);
    try {
      const result = await notificationService.subscribeToPush();
      if (result.success) {
        setIsSubscribed(true);
        setPermission('granted');
        if (showToast) showToast('🔔 Routine reminders enabled! You will be notified 5m before routines.');
      } else if (result.permission === 'denied') {
        setPermission('denied');
        setIsSubscribed(false);
        if (showToast) showToast('Notifications were denied in your browser settings.', 'error');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      if (showToast) showToast(err.message || 'Could not enable push notifications.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    setActionLoading(true);
    try {
      await notificationService.unsubscribeFromPush();
      setIsSubscribed(false);
      if (showToast) showToast('Routine reminders disabled on this device.');
    } catch (err) {
      if (showToast) showToast('Could not disable notifications.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTest = async () => {
    setTestLoading(true);
    try {
      const res = await notificationService.sendTestNotification();
      if (showToast) showToast(res.message || 'Test reminder dispatched! Check your screen.');
    } catch (err) {
      if (showToast) showToast(err.response?.data?.message || 'Could not send test reminder.', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) return null;

  // Case 1: Browser does not support Web Push (e.g. old browser or iOS Safari without Add to Home Screen)
  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 mb-5">
        <div className="flex items-center gap-2.5 text-slate-500 text-xs">
          <BellOff className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-700 block">Routine Reminders</span>
            <span>Web Push notifications are not supported on this browser. On iOS devices, please use "Add to Home Screen" to enable Web Push.</span>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Browser notification permission blocked / denied
  if (permission === 'denied') {
    return (
      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-900">Notifications are blocked in your browser</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Life Vault cannot alert you before your routines because browser permission was denied.
              To enable reminders, tap the lock/settings icon in your browser's address bar and set Notifications to "Allow".
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Permission granted and active subscription
  if (isSubscribed) {
    return (
      <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 mb-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
              <BellRing className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Routine Reminders Active</h4>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <Check className="w-3 h-3 stroke-[3]" /> Enabled
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Notifications arrive on this device 5 minutes before scheduled routines. No phone number needed.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50/50 text-indigo-700 text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
              title="Test Web Push notification delivery immediately"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testLoading ? 'Sending...' : 'Test Alert'}</span>
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Updating...' : 'Disable'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 4: Default state (Not enabled yet)
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white mb-5 shadow-2xs hover:border-indigo-200 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">Routine Reminders</h4>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500">
                Web Push
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Get notified on this device 5 minutes before your routines start. Works without phone numbers or SMS.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEnable}
          disabled={actionLoading}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 active:scale-95 disabled:opacity-50 shrink-0"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{actionLoading ? 'Enabling...' : 'Enable Reminders'}</span>
        </button>
      </div>
    </div>
  );
}
