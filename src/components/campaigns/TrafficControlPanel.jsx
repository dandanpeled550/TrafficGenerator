import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Play, Square, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { UserProfile } from "@/api/entities";
import { TrafficSession } from "@/api/entities";

export default function TrafficControlPanel({ campaign, onStatusChange }) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const generateRTBTrafficData = (campaign, userProfiles) => {
    // Generate RTB bid request structure
    const rtbConfig = campaign.rtb_config || {};
    const config = campaign.config || {};
    
    return {
      campaign_id: campaign.id,
      target_url: campaign.target_url,
      requests_per_minute: campaign.requests_per_minute || 10,
      duration_minutes: campaign.duration_minutes || 60,
      geo_locations: campaign.geo_locations || ['United States'],
      log_file_path: `logs/campaign_${Date.now()}_${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`,
      rtb_config: {
        device_brand: rtbConfig.device_brand || 'samsung',
        device_models: rtbConfig.device_models || ['Galaxy S24'],
        ad_formats: rtbConfig.ad_formats || ['banner'],
        app_categories: rtbConfig.app_categories || ['IAB9'],
        generate_adid: rtbConfig.generate_adid !== false,
        simulate_bid_requests: rtbConfig.simulate_bid_requests !== false
      },
      config: {
        randomize_timing: config.randomize_timing !== false,
        follow_redirects: config.follow_redirects !== false,
        simulate_browsing: config.simulate_browsing || false,
        enable_logging: config.enable_logging !== false,
        log_level: config.log_level || 'info',
        log_format: config.log_format || 'csv'
      },
      user_profiles: userProfiles || []
    };
  };

  const handleStartCampaign = async () => {
    setIsStarting(true);
    try {
      // Get user profiles for this campaign
      const userProfiles = [];
      if (campaign.user_profile_ids && campaign.user_profile_ids.length > 0) {
        const allProfiles = await UserProfile.list();
        campaign.user_profile_ids.forEach(profileId => {
          const profile = allProfiles.find(p => p.id === profileId);
          if (profile) userProfiles.push(profile);
        });
      }

      // Generate traffic data configuration
      const trafficConfig = generateRTBTrafficData(campaign, userProfiles);
      
      // Start the traffic generation using a simulated backend process
      const result = await startTrafficGeneration(trafficConfig);
      
      if (result.success) {
        // Update campaign with log file path and start time
        await TrafficSession.update(campaign.id, {
          status: 'running',
          start_time: new Date().toISOString(),
          log_file_path: trafficConfig.log_file_path,
          total_requests: 0,
          successful_requests: 0,
          last_activity_time: new Date().toISOString()
        });
        
        onStatusChange(campaign.id, 'running');
        
        // Start monitoring the campaign progress
        monitorCampaignProgress(campaign.id, trafficConfig);
      } else {
        console.error('Failed to start campaign:', result.error);
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
    }
    setIsStarting(false);
  };

  const handleStopCampaign = async () => {
    setIsStopping(true);
    try {
      await TrafficSession.update(campaign.id, {
        status: 'stopped',
        end_time: new Date().toISOString()
      });
      
      onStatusChange(campaign.id, 'stopped');
    } catch (error) {
      console.error('Error stopping campaign:', error);
    }
    setIsStopping(false);
  };

  const startTrafficGeneration = async (config) => {
    // Simulate backend traffic generation
    try {
      // This would normally call a backend function, but we'll simulate it
      console.log('Starting traffic generation with config:', config);
      
      // For now, we'll simulate the start
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const monitorCampaignProgress = async (campaignId, config) => {
    // Monitor campaign and update statistics
    let requestCount = 0;
    let successfulRequests = 0;
    const startTime = Date.now();
    const durationMs = (config.duration_minutes || 60) * 60 * 1000;
    const requestInterval = 60000 / config.requests_per_minute; // ms between requests
    
    const updateProgress = async () => {
      try {
        // Simulate making requests
        requestCount++;
        
        // Simulate 85% success rate
        if (Math.random() > 0.15) {
          successfulRequests++;
        }
        
        const elapsed = Date.now() - startTime;
        const progressPercentage = config.duration_minutes ? 
          Math.min(100, (elapsed / durationMs) * 100) : 
          Math.min(100, (requestCount / (config.requests_per_minute * 10)) * 100); // Show progress for indefinite campaigns
        
        // Update campaign statistics
        await TrafficSession.update(campaignId, {
          total_requests: requestCount,
          successful_requests: successfulRequests,
          progress_percentage: Math.round(progressPercentage),
          last_activity_time: new Date().toISOString()
        });
        
        // Check if campaign should continue
        const campaigns = await TrafficSession.list();
        const currentCampaign = campaigns.find(c => c.id === campaignId);
        
        if (!currentCampaign || currentCampaign.status !== 'running') {
          return; // Campaign stopped
        }
        
        // Check if campaign is complete
        if (config.duration_minutes && elapsed >= durationMs) {
          await TrafficSession.update(campaignId, {
            status: 'completed',
            end_time: new Date().toISOString(),
            progress_percentage: 100
          });
          return;
        }
        
        // Schedule next update
        setTimeout(updateProgress, requestInterval + Math.random() * 1000); // Add some randomness
        
      } catch (error) {
        console.error('Error updating campaign progress:', error);
      }
    };
    
    // Start the monitoring
    setTimeout(updateProgress, requestInterval);
  };

  return (
    <Card className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-blue-800/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-300">
          <Zap className="w-5 h-5" />
          Custom Traffic Engine
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Simulation Mode
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">
              RTB traffic simulation with realistic request patterns
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Statistical modeling • Request counting • Progress tracking
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}