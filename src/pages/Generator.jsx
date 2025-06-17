import React, { useState, useEffect } from "react";
import backendClient from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import RTBConfigCard from "../components/generator/RTBConfigCard";
import RTBDataPreview from "../components/generator/RTBDataPreview";
import TrafficLoggingCard from "../components/generator/TrafficLoggingCard";
import TrafficSimulationPreview from "../components/generator/TrafficSimulationPreview";
import { InvokeLLM } from "@/api/integrations";
import {
  ArrowLeft,
  Settings,
  Play,
  Clock,
  Target,
  MapPin,
  Users as UsersIcon,
  Infinity as InfinityIcon,
  BrainCircuit,
  Loader2,
  Wand2,
  Trash2,
  Zap,
  Activity
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

const DEFAULT_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
];

const DEFAULT_REFERRERS = {
  organic: ["https://www.google.com/", "https://www.bing.com/", "https://duckduckgo.com/"],
  social: ["https://www.facebook.com/", "https://twitter.com/", "https://www.linkedin.com/", "https://www.instagram.com/"],
  referral: ["https://news.ycombinator.com/", "https://www.reddit.com/", "https://medium.com/"],
  direct: [],
  email: ["https://mail.google.com/", "https://outlook.live.com/"],
  paid: ["https://ads.google.com/", "https://www.facebook.com/ads/"]
};

const GEO_LOCATIONS = [
  "United States", "United Kingdom", "Canada", "Germany", "France",
  "Australia", "Japan", "Brazil", "India", "Netherlands"
];

export default function Generator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [allUserProfiles, setAllUserProfiles] = useState([]);
  const [runIndefinitely, setRunIndefinitely] = useState(false);
  const [profileUserCounts, setProfileUserCounts] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [campaignStatus, setCampaignStatus] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    target_url: "",
    traffic_type: "rtb",
    user_profile_ids: [],
    requests_per_minute: 10,
    duration_minutes: 60,
    geo_locations: ["United States"],
    edge_cases: [],
    rtb_config: {
      device_brand: "samsung",
      device_models: [],
      ad_formats: [],
      app_categories: [],
      generate_adid: true,
      simulate_bid_requests: true
    },
    config: {
      randomize_timing: true,
      follow_redirects: true,
      simulate_browsing: false,
      custom_headers: {},
      enable_logging: true,
      log_level: "info",
      log_format: "csv"
    },
    user_agents: DEFAULT_USER_AGENTS,
    referrers: DEFAULT_REFERRERS.organic.concat(DEFAULT_REFERRERS.social, DEFAULT_REFERRERS.referral),
    status: "draft",
    profile_user_counts: {},
    total_profile_users: 0
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [runOnSubmit, setRunOnSubmit] = useState(false);

  useEffect(() => {
    fetchUserProfiles();

    // Check if we're editing an existing campaign
    const urlParams = new URLSearchParams(location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      loadCampaignForEditing(editId);
    }
  }, [location.search]);

  useEffect(() => {
    if (editingCampaignId) {
      // Start status checking
      const interval = setInterval(async () => {
        try {
          const response = await backendClient.traffic.getStatus(editingCampaignId);
          setCampaignStatus(response.data);
          
          // If campaign is completed or error, stop checking
          if (response.data.status === 'completed' || response.data.status === 'error') {
            clearInterval(interval);
          }
        } catch (error) {
          console.error("Failed to check campaign status:", error);
        }
      }, 5000); // Check every 5 seconds
      
      setStatusCheckInterval(interval);
      
      // Cleanup on unmount
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [editingCampaignId]);

  const fetchUserProfiles = async () => {
    try {
      const profiles = await backendClient.profiles.list();
      setAllUserProfiles(profiles);
    } catch (error) {
      console.error("Failed to load user profiles:", error);
    }
  };

  const loadCampaignForEditing = async (campaignId) => {
    try {
      const campaigns = await backendClient.sessions.list();
      const campaign = campaigns.find(c => c.id === campaignId);

      if (campaign) {
        setIsEditing(true);
        setEditingCampaignId(campaignId);

        // Ensure all required fields are present or defaulted
        setFormData({
          ...campaign,
          name: campaign.name || "",
          target_url: campaign.target_url || "",
          traffic_type: campaign.traffic_type || "rtb",
          user_profile_ids: campaign.user_profile_ids || [],
          requests_per_minute: campaign.requests_per_minute || 10,
          duration_minutes: campaign.duration_minutes,
          geo_locations: campaign.geo_locations || ["United States"],
          edge_cases: campaign.edge_cases || [],
          rtb_config: campaign.rtb_config || {
            device_brand: "samsung",
            device_models: [],
            ad_formats: [],
            app_categories: [],
            generate_adid: true,
            simulate_bid_requests: true
          },
          config: campaign.config || {
            randomize_timing: true,
            follow_redirects: true,
            simulate_browsing: false,
            custom_headers: {},
            enable_logging: true,
            log_level: "info",
            log_format: "csv"
          },
          profile_user_counts: campaign.profile_user_counts || {}
        });
        setProfileUserCounts(campaign.profile_user_counts || {});
        setRunIndefinitely(campaign.duration_minutes === null);
      } else {
        console.warn(`Campaign with ID ${campaignId} not found.`);
        navigate(createPageUrl("Campaigns"));
      }
    } catch (error) {
      console.error("Failed to load campaign for editing:", error);
      navigate(createPageUrl("Campaigns"));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // Validate user profiles
      if (!formData.user_profile_ids || formData.user_profile_ids.length === 0) {
        alert("Please select at least one user profile before creating a campaign.");
        setIsCreating(false);
        return;
      }

      // Validate user counts
      const totalUsersFromProfiles = Object.entries(profileUserCounts).reduce((sum, [profileId, count]) => {
        // Only count if the profile is selected and count is positive
        if (formData.user_profile_ids.includes(profileId) && count > 0) {
          return sum + count;
        }
        return sum;
      }, 0);

      if (totalUsersFromProfiles === 0) {
        alert("Please set a positive number of users for at least one selected profile.");
        setIsCreating(false);
        return;
      }

      // Validate RTB configuration
      const rtb_config = {
        ...formData.rtb_config,
        device_brand: formData.rtb_config?.device_brand || "samsung",
        device_models: formData.rtb_config?.device_models || SAMSUNG_MODELS.slice(0, 3),
        ad_formats: formData.rtb_config?.ad_formats || ['banner', 'interstitial', 'native'],
        app_categories: formData.rtb_config?.app_categories || ['Games', 'Social Media', 'Shopping'],
        generate_adid: formData.rtb_config?.generate_adid !== false,
        simulate_bid_requests: formData.rtb_config?.simulate_bid_requests !== false
      };

      // Prepare campaign data with all necessary configuration
      const sessionData = {
        ...formData,
        duration_minutes: runIndefinitely ? null : formData.duration_minutes,
        user_agents: DEFAULT_USER_AGENTS,
        referrers: DEFAULT_REFERRERS.organic.concat(DEFAULT_REFERRERS.social, DEFAULT_REFERRERS.referral),
        status: runOnSubmit ? "running" : "draft",
        profile_user_counts: Object.fromEntries(
          Object.entries(profileUserCounts)
            .filter(([profileId, count]) => 
              formData.user_profile_ids.includes(profileId) && count > 0
            )
        ),
        total_profile_users: totalUsersFromProfiles,
        rtb_config,
        config: {
          ...formData.config,
          randomize_timing: formData.config?.randomize_timing !== false,
          follow_redirects: formData.config?.follow_redirects !== false,
          simulate_browsing: formData.config?.simulate_browsing || false,
          custom_headers: formData.config?.custom_headers || {},
          enable_logging: formData.config?.enable_logging !== false,
          log_level: formData.config?.log_level || "info",
          log_format: formData.config?.log_format || "csv"
        },
        // Set log file path if logging is enabled
        log_file_path: formData.config?.enable_logging !== false
          ? `campaign_${Date.now()}_${formData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.csv`
          : null,
        log_level: formData.config?.enable_logging !== false ? formData.config?.log_level : null,
        log_format: formData.config?.enable_logging !== false
          ? formData.config?.log_format || 'csv'
          : null
      };

      if (isEditing && editingCampaignId) {
        await backendClient.sessions.update(editingCampaignId, sessionData);
      } else {
        await backendClient.sessions.create(sessionData);
      }

      navigate(createPageUrl("Campaigns"));
    } catch (error) {
      console.error("Error saving session:", error);
      alert("Failed to save campaign. Please check the console for details.");
    }

    setIsCreating(false);
  };

  // Add validation for user profiles
  const validateUserProfiles = () => {
    if (!formData.user_profile_ids || formData.user_profile_ids.length === 0) {
      return {
        isValid: false,
        message: "Please select at least one user profile"
      };
    }

    const totalUsers = Object.values(profileUserCounts).reduce((sum, count) => sum + count, 0);
    if (totalUsers === 0) {
      return {
        isValid: false,
        message: "Please set the number of users for at least one profile"
      };
    }

    return {
      isValid: true,
      message: ""
    };
  };

  // Add profile selection section
  const renderProfileSelection = () => (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-purple-400" />
          User Profiles
        </CardTitle>
        <p className="text-sm text-slate-400">
          Select user profiles and set the number of users for each profile
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allUserProfiles.map(profile => (
            <div key={profile.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.user_profile_ids.includes(profile.id)}
                  onCheckedChange={(checked) => {
                    const newIds = checked
                      ? [...formData.user_profile_ids, profile.id]
                      : formData.user_profile_ids.filter(id => id !== profile.id);
                    setFormData(prev => ({
                      ...prev,
                      user_profile_ids: newIds
                    }));
                  }}
                />
                <div>
                  <p className="font-medium text-white">{profile.name}</p>
                  <p className="text-sm text-slate-400">{profile.description}</p>
                </div>
              </div>
              {formData.user_profile_ids.includes(profile.id) && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={profileUserCounts[profile.id] || 0}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      setProfileUserCounts(prev => ({
                        ...prev,
                        [profile.id]: count
                      }));
                    }}
                    className="w-24 bg-slate-800 border-slate-700 text-white"
                  />
                  <span className="text-slate-400">users</span>
                </div>
              )}
            </div>
          ))}
          {allUserProfiles.length === 0 && (
            <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <p className="text-slate-400">No user profiles available</p>
              <Button
                onClick={() => navigate(createPageUrl("UserProfiles"))}
                variant="outline"
                className="mt-2"
              >
                Create User Profile
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Add status display component
  const renderStatusBadge = () => {
    if (!campaignStatus) return null;
    
    const statusColors = {
      running: 'bg-green-500/20 text-green-300 border-green-500/30',
      completed: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      error: 'bg-red-500/20 text-red-300 border-red-500/30',
      stopped: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    };
    
    return (
      <div className="flex items-center gap-2 mb-4">
        <Badge className={statusColors[campaignStatus.status] || statusColors.draft}>
          {campaignStatus.status.toUpperCase()}
        </Badge>
        {campaignStatus.progress_percentage > 0 && (
          <span className="text-sm text-slate-400">
            Progress: {campaignStatus.progress_percentage.toFixed(1)}%
          </span>
        )}
      </div>
    );
  };

  // Add campaign info display
  const renderCampaignInfo = () => {
    if (!formData.name) return null;
    
    return (
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{formData.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Target URL</span>
            </div>
            <p className="text-sm text-white font-semibold truncate">{formData.target_url}</p>
          </div>
          
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Traffic Rate</span>
            </div>
            <p className="text-sm text-white font-semibold">{formData.requests_per_minute} requests/min</p>
          </div>
          
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <UsersIcon className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Total Users</span>
            </div>
            <p className="text-sm text-white font-semibold">{formData.total_profile_users}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {isEditing ? "Edit Campaign" : "Create Campaign"}
            </h1>
            <p className="text-slate-400 text-lg">
              {isEditing
                ? "Modify your existing traffic generation campaign"
                : "Set up a new traffic generation campaign"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate(createPageUrl("Campaigns"))}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-blue-400" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Campaign Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Target URL</Label>
                  <Input
                    value={formData.target_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_url: e.target.value }))}
                    placeholder="Enter target URL"
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Profiles Section */}
          {renderProfileSelection()}

          {/* Traffic Settings */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Traffic Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Requests per Minute</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.requests_per_minute}
                    onChange={(e) => setFormData(prev => ({ ...prev, requests_per_minute: parseInt(e.target.value) || 10 }))}
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Duration (minutes)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                      className="bg-slate-800/50 border-slate-700 text-white"
                      disabled={runIndefinitely}
                      required={!runIndefinitely}
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={runIndefinitely}
                        onCheckedChange={setRunIndefinitely}
                      />
                      <span className="text-slate-400">Run indefinitely</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <Button
                type="submit"
                disabled={isCreating || !formData.name || !formData.target_url || !validateUserProfiles().isValid}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {isEditing ? 'Updating Campaign...' : 'Creating Campaign...'}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    {isEditing ? 'Update Campaign' : 'Create Campaign'}
                  </>
                )}
              </Button>
              {!validateUserProfiles().isValid && (
                <p className="text-red-400 text-sm mt-2 text-center">
                  {validateUserProfiles().message}
                </p>
              )}
            </CardContent>
          </Card>
        </form>

        {renderCampaignInfo()}
        {renderStatusBadge()}
      </div>
    </div>
  );
}