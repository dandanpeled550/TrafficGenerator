import { useState, useEffect, useRef, useCallback } from 'react';
import backendClient from '@/api/backendClient';

/**
 * Poll the monitor endpoint while a campaign is running.
 *
 * @param {string} campaignId
 * @param {boolean} isRunning  — when false the hook idles and returns the last known data
 * @param {number}  interval   — poll interval in ms (default 3000)
 * @returns {{ monitorData: object|null, isMonitoring: boolean, error: string|null }}
 */
export function useMonitor(campaignId, isRunning, interval = 3000) {
  const [monitorData, setMonitorData] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetchOnce = useCallback(async () => {
    if (!campaignId) return;
    try {
      const result = await backendClient.traffic.monitor(campaignId);
      if (result?.success && result?.data) {
        setMonitorData(result.data);
        setError(null);
      }
    } catch (err) {
      setError(err?.message ?? 'Monitor fetch failed');
    }
  }, [campaignId]);

  useEffect(() => {
    if (!isRunning || !campaignId) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Fetch immediately, then on each interval tick
    fetchOnce();
    timerRef.current = setInterval(fetchOnce, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, campaignId, interval, fetchOnce]);

  return {
    monitorData,
    isMonitoring: isRunning && !!timerRef.current,
    error,
  };
}
