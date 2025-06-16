import React, { useState, useEffect, useRef } from 'react';
import backendClient from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Square, Zap, Loader2, Server, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function DirectTrafficInjector({ campaign, onUpdate }) {
  const [isInjecting, setIsInjecting] = useState(false);
  const [error, setError] = useState(null);
  const [monitoringData, setMonitoringData] = useState({
    total_requests: 0,
    successful_requests: 0,
    requests_per_minute: 0,
    success_rate: 0,
    average_response_time: 0,
    last_updated: null
  });
  const intervalRef = useRef(null);
  const monitoringIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  const startMonitoring = async () => {
    const fetchMonitoringData = async () => {
      try {
        const response = await backendClient.traffic.monitor(campaign.id);
        if (response.success && response.data) {
          setMonitoringData({
            total_requests: response.data.total_requests || 0,
            successful_requests: response.data.successful_requests || 0,
            requests_per_minute: response.data.requests_per_minute || 0,
            success_rate: response.data.success_rate || 0,
            average_response_time: response.data.average_response_time || 0,
            last_updated: response.data.last_updated
          });
        }
      } catch (error) {
        console.error(`[Monitor] Error fetching monitoring data:`, error);
      }
    };

    // Fetch immediately and then every 2 seconds
    await fetchMonitoringData();
    monitoringIntervalRef.current = setInterval(fetchMonitoringData, 2000);
  };

  const stopMonitoring = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  };

  const startTrafficGeneration = async () => {
    setIsInjecting(true);
    setError(null);
    console.log(`[Injector] Starting backend traffic generation for campaign: ${campaign.name} (ID: ${campaign.id})`);

    // Start monitoring
    await startMonitoring();

    // First check backend health
    try {
      console.log(`[Injector] Checking backend health`);
      const healthCheck = await backendClient.traffic.checkHealth();
      console.log(`[Injector] Health check response:`, JSON.stringify(healthCheck, null, 2));
      
      if (!healthCheck.success || healthCheck.status !== 'healthy') {
        const errorMessage = healthCheck.error || "Backend health check failed";
        console.error(`[Injector] Backend health check failed:`, errorMessage);
        setError(`Backend Error: ${errorMessage}`);
        setIsInjecting(false);
        stopMonitoring();
        return;
      }
      console.log(`[Injector] Backend health check passed`);
    } catch (error) {
      console.error(`[Injector] Error checking backend health:`, error);
      setError(`Failed to check backend health: ${error.message}`);
      setIsInjecting(false);
      stopMonitoring();
      return;
    }

    // Update campaign status immediately
    try {
      console.log(`[Injector] Updating campaign status to 'running' for campaign: ${campaign.id}`);
      await backendClient.sessions.update(campaign.id, {
        status: 'running',
        start_time: new Date().toISOString(),
      });
      console.log(`[Injector] Successfully updated campaign status for: ${campaign.id}`);
    } catch (error) {
      console.error(`[Injector] Failed to update campaign status: ${error.message}`);
      setError(`Failed to update campaign status: ${error.message}`);
      setIsInjecting(false);
      stopMonitoring();
      return;
    }

    // Start traffic generation
    try {
      const response = await backendClient.traffic.generate({
        campaign_id: campaign.id,
        target_url: campaign.target_url,
        requests_per_minute: campaign.requests_per_minute || 60,
        duration_minutes: campaign.duration_minutes || 60
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to start traffic generation");
      }

      console.log(`[Injector] Successfully started traffic generation for campaign ${campaign.id}`);
    } catch (error) {
      console.error(`[Injector] Error starting traffic generation:`, error);
      setError(`Failed to start traffic generation: ${error.message}`);
      setIsInjecting(false);
      stopMonitoring();
    }
  };

  const stopTrafficGeneration = async () => {
    console.log(`[Injector] Stopping traffic generation for campaign ${campaign.id}`);
    if (intervalRef.current) {
      console.log(`[Injector] Clearing interval for campaign ${campaign.id}`);
      clearInterval(intervalRef.current);
    }
    stopMonitoring();
    setIsInjecting(false);
    try {
      console.log(`[Injector] Updating campaign status to 'stopped' for ${campaign.id}`);
      await backendClient.sessions.update(campaign.id, {
        status: 'stopped',
        end_time: new Date().toISOString()
      });
      console.log(`[Injector] Successfully stopped traffic generation for campaign ${campaign.id}`);
    } catch (error) {
      console.error(`[Injector] Error stopping traffic generation: ${error.message}`);
      setError(`Failed to stop traffic generation: ${error.message}`);
    }
    onUpdate();
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          Traffic Generation
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Monitoring Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-slate-400 text-sm">Total Requests</p>
              <p className="text-white text-xl font-semibold">{monitoringData.total_requests}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-slate-400 text-sm">Success Rate</p>
              <p className="text-white text-xl font-semibold">{monitoringData.success_rate.toFixed(1)}%</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-slate-400 text-sm">Requests/Min</p>
              <p className="text-white text-xl font-semibold">{monitoringData.requests_per_minute.toFixed(1)}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="text-slate-400 text-sm">Avg Response</p>
              <p className="text-white text-xl font-semibold">{monitoringData.average_response_time.toFixed(0)}ms</p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-end gap-2">
            {!isInjecting ? (
              <Button
                onClick={startTrafficGeneration}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Generation
              </Button>
            ) : (
              <Button
                onClick={stopTrafficGeneration}
                variant="destructive"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Generation
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}