import React, { useState, useEffect } from "react";
import backendClient from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Play, Square, Loader2, Zap, Pause, RefreshCw, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export default function TrafficControlPanel({ campaign, onStatusChange }) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const generateRTBTrafficData = (campaign, userProfiles) => {
    // Generate RTB bid request structure
    const rtbConfig = campaign.rtb_config || {};
    const config = campaign.config || {};
    
    // Only include fields that are needed for traffic generation
    return {
      campaign_id: campaign.id,
      target_url: campaign.target_url,
      requests_per_minute: campaign.requests_per_minute || 10,
      duration_minutes: campaign.duration_minutes || 60,
      user_profile_ids: campaign.user_profile_ids || [],
      profile_user_counts: campaign.profile_user_counts || {},
      total_profile_users: Object.values(campaign.profile_user_counts || {}).reduce((a, b) => a + b, 0),
      geo_locations: campaign.geo_locations || ["United States"],
      rtb_config: rtbConfig,
      config: config,
      log_file_path: campaign.log_file_path
    };
  };

  const handleStartCampaign = async () => {
    setIsStarting(true);
    try {
      // First, update campaign status to 'running' using the new endpoint
      console.log('Updating campaign status to running:', campaign.id);
      await backendClient.traffic.updateCampaignStatus(campaign.id, 'running');
      
      // Get user profiles for this campaign
      const userProfiles = [];
      if (campaign.user_profile_ids && campaign.user_profile_ids.length > 0) {
        const allProfiles = await backendClient.profiles.list();
        campaign.user_profile_ids.forEach(profileId => {
          const profile = allProfiles.find(p => p.id === profileId);
          if (profile) userProfiles.push(profile);
        });
      }

      // Generate traffic data configuration
      const trafficConfig = generateRTBTrafficData(campaign, userProfiles);
      
      // Start the traffic generation using the backend API
      const result = await startTrafficGeneration(trafficConfig);
      
      if (result.success) {
        onStatusChange(campaign.id, 'running');
        
        // Start monitoring the campaign progress
        monitorCampaignProgress(campaign.id, trafficConfig);
      } else {
        console.error('Failed to start campaign:', result.error);
        // Revert status if traffic generation fails
        await backendClient.traffic.updateCampaignStatus(campaign.id, 'draft');
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
      // Revert status on error
      try {
        await backendClient.traffic.updateCampaignStatus(campaign.id, 'draft');
      } catch (revertError) {
        console.error('Error reverting campaign status:', revertError);
      }
    }
    setIsStarting(false);
  };

  const handleStopCampaign = async () => {
    setIsStopping(true);
    try {
      // Stop traffic generation first
      await backendClient.traffic.stop(campaign.id);
      
      // Then update campaign status to 'stopped'
      await backendClient.traffic.updateCampaignStatus(campaign.id, 'stopped');
      
      onStatusChange(campaign.id, 'stopped');
    } catch (error) {
      console.error('Error stopping campaign:', error);
    }
    setIsStopping(false);
  };

  const startTrafficGeneration = async (config) => {
    try {
      console.log('Starting traffic generation with config:', config);
      const response = await backendClient.traffic.generate(config);
      return response;
    } catch (error) {
      console.error('Error starting traffic generation:', error);
      return { success: false, error: error.message };
    }
  };

  const monitorCampaignProgress = async (campaignId, config) => {
    // Monitor campaign and update statistics using the new info endpoint
    const updateProgress = async () => {
      try {
        const campaignInfo = await backendClient.traffic.getCampaignInfo(campaignId);
        if (campaignInfo.success) {
          const stats = campaignInfo.data.traffic_stats;
          const generation = campaignInfo.data.traffic_generation;
          
          console.log(`Campaign ${campaignId} progress:`, {
            total_requests: stats.total_requests,
            successful_requests: stats.successful_requests,
            success_rate: stats.success_rate,
            is_running: generation.is_running
          });
          
          // If campaign is no longer running, stop monitoring
          if (!generation.is_running) {
            console.log(`Campaign ${campaignId} traffic generation completed`);
            return;
          }
        }
      } catch (error) {
        console.error('Error monitoring campaign progress:', error);
      }
    };
    
    // Update immediately and then every 5 seconds
    await updateProgress();
    const interval = setInterval(updateProgress, 5000);
    
    // Stop monitoring after duration
    setTimeout(() => {
      clearInterval(interval);
    }, (config.duration_minutes || 60) * 60 * 1000);
  };

  const handleDownloadTraffic = async () => {
    try {
      const response = await backendClient.traffic.downloadTraffic(campaign.id);
      if (response.success) {
        // Create and download file
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename || `traffic_${campaign.id}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading traffic:', error);
    }
  };

  const handleCleanupCampaign = async () => {
    try {
      await backendClient.traffic.cleanupCampaign(campaign.id);
      console.log('Campaign cleanup completed');
    } catch (error) {
      console.error('Error cleaning up campaign:', error);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-300">
          <Zap className="w-5 h-5" />
          Custom Traffic Engine
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Backend API
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">
              RTB traffic simulation with backend API integration
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Real traffic generation • Status management • Progress tracking
            </p>
          </div>
          
          <div className="flex gap-2">
            {campaign.status === 'draft' || campaign.status === 'stopped' ? (
              <Button
                onClick={handleStartCampaign}
                disabled={isStarting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isStarting ? 'Starting...' : 'Start Campaign'}
              </Button>
            ) : campaign.status === 'running' ? (
              <Button
                onClick={handleStopCampaign}
                disabled={isStopping}
                variant="destructive"
              >
                {isStopping ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                {isStopping ? 'Stopping...' : 'Stop Campaign'}
              </Button>
            ) : null}
            
            <Button
              onClick={handleDownloadTraffic}
              variant="outline"
              size="sm"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            
            <Button
              onClick={handleCleanupCampaign}
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Cleanup
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}