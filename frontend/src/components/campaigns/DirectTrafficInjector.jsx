import React, { useState, useRef, useEffect } from "react";
import backendClient from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Play, Square, Loader2, Zap, Activity, TrendingUp, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function DirectTrafficInjector({ campaign, onUpdate }) {
  const [isInjecting, setIsInjecting] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    successRate: 0,
    isRunning: false
  });
  const intervalRef = useRef(null);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startMonitoring = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      try {
        const campaignInfo = await backendClient.traffic.getCampaignInfo(campaign.id);
        if (campaignInfo.success) {
          const trafficStats = campaignInfo.data.traffic_stats;
          const trafficGeneration = campaignInfo.data.traffic_generation;
          
          setStats({
            totalRequests: trafficStats.total_requests,
            successfulRequests: trafficStats.successful_requests,
            successRate: trafficStats.success_rate,
            isRunning: trafficGeneration.is_running
          });

          // If traffic generation stopped, clear interval
          if (!trafficGeneration.is_running) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error monitoring campaign:', error);
      }
    }, 2000); // Check every 2 seconds
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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

    // Update campaign status to 'running' using the new endpoint
    try {
      console.log(`[Injector] Updating campaign status to 'running' for campaign: ${campaign.id}`);
      await backendClient.traffic.updateCampaignStatus(campaign.id, 'running');
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
      // Only send campaign ID and any overrides
      const config = {
        campaign_id: campaign.id,
        // Add any runtime overrides here if needed
      };

      console.log(`[Injector] Starting traffic generation for campaign ${campaign.id}`);
      const response = await backendClient.traffic.generate(config);

      if (!response.success) {
        throw new Error(response.error || "Failed to start traffic generation");
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
      // Stop traffic generation first
      await backendClient.traffic.stop(campaign.id);
      
      // Then update campaign status to 'stopped'
      await backendClient.traffic.updateCampaignStatus(campaign.id, 'stopped');
      
      console.log(`[Injector] Successfully stopped traffic generation for campaign ${campaign.id}`);
    } catch (error) {
      console.error(`[Injector] Error stopping traffic generation: ${error.message}`);
      setError(`Failed to stop traffic generation: ${error.message}`);
    }
    onUpdate();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'stopped':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'draft':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-300">
          <Zap className="w-5 h-5" />
          Direct Traffic Injector
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            Backend API
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Total Requests</span>
            </div>
            <div className="text-lg font-semibold text-white">{stats.totalRequests}</div>
          </div>
          
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Successful</span>
            </div>
            <div className="text-lg font-semibold text-white">{stats.successfulRequests}</div>
          </div>
          
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-yellow-400 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Success Rate</span>
            </div>
            <div className="text-lg font-semibold text-white">{stats.successRate.toFixed(1)}%</div>
          </div>
          
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-purple-400 mb-1">
              <Globe className="w-4 h-4" />
              <span className="text-xs">Status</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {stats.isRunning ? 'Running' : 'Stopped'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">
              Direct backend traffic injection with real-time monitoring
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Live statistics • Status tracking • Backend integration
            </p>
          </div>
          
          <div className="flex gap-2">
            {campaign.status === 'draft' || campaign.status === 'stopped' ? (
              <Button
                onClick={startTrafficGeneration}
                disabled={isInjecting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isInjecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isInjecting ? 'Starting...' : 'Start Injection'}
              </Button>
            ) : campaign.status === 'running' ? (
              <Button
                onClick={stopTrafficGeneration}
                disabled={isInjecting}
                variant="destructive"
              >
                {isInjecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                {isInjecting ? 'Stopping...' : 'Stop Injection'}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}