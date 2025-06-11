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
  const intervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startTrafficGeneration = async () => {
    setIsInjecting(true);
    setError(null);
    console.log(`[Injector] Starting backend traffic generation for campaign: ${campaign.name}`);

    // Update campaign status immediately
    await backendClient.sessions.update(campaign.id, {
      status: 'running',
      start_time: new Date().toISOString(),
    });

    const runGenerationCycle = async () => {
      try {
        console.log(`[Injector] Calling Python backend for campaign ${campaign.id}`);
        const { data: newLogs, error: funcError } = await backendClient.traffic.generate(campaign);
        
        if (funcError || !Array.isArray(newLogs)) {
            const errorMessage = funcError?.message || "Backend function returned invalid data.";
            console.error("[Injector] Backend function error:", errorMessage);
            setError(`Backend Error: ${errorMessage}`);
            clearInterval(intervalRef.current);
            setIsInjecting(false);
            return;
        }
        
        console.log(`[Injector] Received ${newLogs.length} new log entries from backend.`);

        // 1. Save new logs to the database
        await backendClient.logs.bulkCreate(newLogs);

        // 2. Fetch the latest campaign data to avoid overwriting stats
        const currentSessions = await backendClient.sessions.list();
        const currentCampaign = currentSessions.find(s => s.id === campaign.id);
        if (!currentCampaign) return;
        
        // 3. Update campaign stats
        const successfulNewLogs = newLogs.filter(log => log.success).length;
        const total_requests = (currentCampaign.total_requests || 0) + newLogs.length;
        const successful_requests = (currentCampaign.successful_requests || 0) + successfulNewLogs;
        
        await backendClient.sessions.update(campaign.id, {
            total_requests,
            successful_requests,
            last_activity_time: new Date().toISOString(),
        });
        
        onUpdate(true); // Trigger a silent refresh on the campaigns page

      } catch (err) {
        console.error("[Injector] Error during generation cycle:", err);
        setError("An error occurred during traffic injection.");
        clearInterval(intervalRef.current);
        setIsInjecting(false);
      }
    };

    // Run the first cycle immediately
    await runGenerationCycle();

    // Set up the interval to run every 10 seconds
    intervalRef.current = setInterval(runGenerationCycle, 10000);
  };
  
  const stopTrafficGeneration = async () => {
      if (intervalRef.current) {
          clearInterval(intervalRef.current);
      }
      setIsInjecting(false);
      await backendClient.sessions.update(campaign.id, {
        status: 'stopped',
        end_time: new Date().toISOString()
      });
      onUpdate();
  };

  return (
    <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-800/50">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          Backend Traffic Engine
        </CardTitle>
        <p className="text-sm text-slate-300">
          Use the server-side Python engine to generate and inject traffic data for this campaign.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4">
            <Button
              onClick={startTrafficGeneration}
              disabled={isInjecting}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 font-semibold"
            >
              {isInjecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Engine Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Engine
                </>
              )}
            </Button>
            <Button
                onClick={stopTrafficGeneration}
                disabled={!isInjecting}
                variant="destructive"
                className="w-full"
            >
                <Square className="w-4 h-4 mr-2" />
                Stop Engine
            </Button>
        </div>
        {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
            </div>
        )}
         <p className="text-xs text-slate-500 mt-3 text-center">
            The engine will generate traffic in batches every 10 seconds.
         </p>
      </CardContent>
    </Card>
  );
}