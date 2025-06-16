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
    console.log(`[Injector] Starting backend traffic generation for campaign: ${campaign.name} (ID: ${campaign.id})`);

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
      return;
    }

    const runGenerationCycle = async () => {
      try {
        console.log(`[Injector] Starting generation cycle for campaign ${campaign.id}`);
        
        // Format the campaign data for traffic generation
        const trafficConfig = {
          campaign_id: campaign.id,
          target_url: campaign.target_url,
          requests_per_minute: campaign.requests_per_minute || 10,
          duration_minutes: campaign.duration_minutes || 60,
          geo_locations: campaign.geo_locations || ['United States'],
          rtb_config: {
            device_brand: 'samsung',
            device_models: ['Galaxy S24', 'iPhone 15', 'Pixel 8'],
            ad_formats: ['banner', 'interstitial', 'native'],
            app_categories: ['IAB9', 'IAB1', 'IAB2'],
            generate_adid: true,
            simulate_bid_requests: true
          },
          config: {
            randomize_timing: true,
            follow_redirects: true,
            simulate_browsing: false,
            enable_logging: true,
            log_level: 'info',
            log_format: 'csv'
          }
        };
        console.log(`[Injector] Prepared traffic configuration:`, JSON.stringify(trafficConfig, null, 2));

        console.log(`[Injector] Calling backend to generate traffic for campaign ${campaign.id}`);
        const response = await backendClient.traffic.generate(trafficConfig);
        console.log(`[Injector] Raw response from backend:`, JSON.stringify(response, null, 2));
        
        if (!response) {
            console.error(`[Injector] Backend returned null response for campaign ${campaign.id}`);
            setError("Backend returned null response");
            clearInterval(intervalRef.current);
            setIsInjecting(false);
            return;
        }

        if (!response.success) {
            const errorMessage = response.message || "Backend function returned invalid data.";
            console.error(`[Injector] Backend function error for campaign ${campaign.id}:`, errorMessage);
            console.error(`[Injector] Full error response:`, JSON.stringify(response, null, 2));
            setError(`Backend Error: ${errorMessage}`);
            clearInterval(intervalRef.current);
            setIsInjecting(false);
            return;
        }

        // Get the generated traffic data
        console.log(`[Injector] Fetching generated traffic data for campaign ${campaign.id}`);
        const trafficData = await backendClient.traffic.getGenerated(campaign.id);
        console.log(`[Injector] Raw traffic data response:`, JSON.stringify(trafficData, null, 2));

        if (!trafficData) {
            console.error(`[Injector] Backend returned null traffic data for campaign ${campaign.id}`);
            setError("Backend returned null traffic data");
            clearInterval(intervalRef.current);
            setIsInjecting(false);
            return;
        }

        if (!trafficData.success) {
            console.error(`[Injector] Backend returned error in traffic data:`, trafficData.message);
            setError(`Backend Error: ${trafficData.message}`);
            clearInterval(intervalRef.current);
            setIsInjecting(false);
            return;
        }

        if (!Array.isArray(trafficData.data)) {
            console.error(`[Injector] Invalid traffic data format received for campaign ${campaign.id}:`, 
                `Expected array, got ${typeof trafficData.data}`);
            console.error(`[Injector] Full traffic data:`, JSON.stringify(trafficData, null, 2));
            setError("Invalid traffic data format received from backend");
            clearInterval(intervalRef.current);
            setIsInjecting(false);
            return;
        }

        console.log(`[Injector] Processing ${trafficData.data.length} traffic entries for campaign ${campaign.id}`);

        // 2. Fetch the latest campaign data
        console.log(`[Injector] Fetching current campaign data for ${campaign.id}`);
        const currentSessions = await backendClient.sessions.list();
        console.log(`[Injector] Retrieved ${currentSessions.length} sessions`);
        const currentCampaign = currentSessions.find(s => s.id === campaign.id);
        if (!currentCampaign) {
            console.error(`[Injector] Campaign ${campaign.id} not found in current sessions`);
            return;
        }
        console.log(`[Injector] Found current campaign data:`, JSON.stringify(currentCampaign, null, 2));
        
        // 3. Update campaign stats
        const successfulNewLogs = trafficData.data.filter(log => log.success).length;
        const total_requests = (currentCampaign.total_requests || 0) + trafficData.data.length;
        const successful_requests = (currentCampaign.successful_requests || 0) + successfulNewLogs;
        
        console.log(`[Injector] Updating campaign stats:`, {
            total_requests,
            successful_requests,
            new_logs: trafficData.data.length,
            successful_new_logs: successfulNewLogs
        });

        try {
            await backendClient.sessions.update(campaign.id, {
                total_requests,
                successful_requests,
                last_activity_time: new Date().toISOString(),
            });
            console.log(`[Injector] Successfully updated campaign stats for ${campaign.id}`);
        } catch (error) {
            console.error(`[Injector] Failed to update campaign stats: ${error.message}`);
            console.error(`[Injector] Full error:`, error);
            setError(`Failed to update campaign stats: ${error.message}`);
            clearInterval(intervalRef.current);
            setIsInjecting(false);
            return;
        }
        
        onUpdate(true); // Trigger a silent refresh on the campaigns page
        console.log(`[Injector] Completed generation cycle for campaign ${campaign.id}`);

      } catch (err) {
        console.error(`[Injector] Error during generation cycle for campaign ${campaign.id}:`, err);
        console.error(`[Injector] Full error details:`, JSON.stringify(err, null, 2));
        setError(`An error occurred during traffic injection: ${err.message}`);
        clearInterval(intervalRef.current);
        setIsInjecting(false);
      }
    };

    // Run the first cycle immediately
    console.log(`[Injector] Starting initial generation cycle for campaign ${campaign.id}`);
    await runGenerationCycle();

    // Set up the interval to run every 10 seconds
    console.log(`[Injector] Setting up interval for campaign ${campaign.id} (10 seconds)`);
    intervalRef.current = setInterval(runGenerationCycle, 10000);
  };
  
  const stopTrafficGeneration = async () => {
      console.log(`[Injector] Stopping traffic generation for campaign ${campaign.id}`);
      if (intervalRef.current) {
          console.log(`[Injector] Clearing interval for campaign ${campaign.id}`);
          clearInterval(intervalRef.current);
      }
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