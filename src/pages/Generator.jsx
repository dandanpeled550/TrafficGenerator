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
  Zap
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
      const totalUsersFromProfiles = Object.values(profileUserCounts).reduce((sum, count) => sum + count, 0);

      const sessionData = {
        ...formData,
        duration_minutes: runIndefinitely ? null : formData.duration_minutes,
        user_agents: DEFAULT_USER_AGENTS,
        referrers: DEFAULT_REFERRERS.organic.concat(DEFAULT_REFERRERS.social, DEFAULT_REFERRERS.referral),
        status: runOnSubmit ? "running" : "draft",
        profile_user_counts: profileUserCounts,
        total_profile_users: totalUsersFromProfiles,
        log_file_path: formData.config?.enable_logging !== false
          ? `campaign_${Date.now()}_${formData.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.csv`
          : null,
        log_level: formData.config?.enable_logging !== false ? formData.config.log_level : null,
        log_format: formData.config?.enable_logging !== false
          ? formData.config.log_format || 'csv'
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

  const getTotalUsers = () => {
    return Object.values(profileUserCounts).reduce((sum, count) => sum + count, 0);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Link
              to={createPageUrl("Dashboard")}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white">
                {isEditing ? 'Edit Campaign' : 'Traffic Generator'}
              </h1>
              <p className="text-slate-400 text-lg">
                {isEditing ? 'Modify your RTB traffic campaign' : 'Create and configure RTB traffic campaigns'}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Campaign Name & Target */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Campaign Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-300 font-semibold">Campaign Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name..."
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="target_url" className="text-slate-300 font-semibold">Target URL</Label>
                  <Input
                    id="target_url"
                    type="url"
                    value={formData.target_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_url: e.target.value }))}
                    placeholder="https://example.com"
                    className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* RTB Configuration */}
            <RTBConfigCard
              formData={formData}
              onInputChange={(field, value) => setFormData(prev => {
                const keys = field.split('.');
                if (keys.length === 2) {
                  return {
                    ...prev,
                    [keys[0]]: {
                      ...prev[keys[0]],
                      [keys[1]]: value
                    }
                  };
                }
                return { ...prev, [field]: value };
              })}
              profilesSelected={formData.user_profile_ids.length > 0}
            />

            {/* Traffic Settings */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Traffic Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="requests_per_minute" className="text-slate-300 font-semibold">Requests per Minute</Label>
                    <Input
                      id="requests_per_minute"
                      type="number"
                      value={formData.requests_per_minute}
                      onChange={(e) => setFormData(prev => ({ ...prev, requests_per_minute: parseInt(e.target.value) || 10 }))}
                      className="bg-slate-800/50 border-slate-700 text-white"
                      min="1"
                      max="1000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_minutes" className="text-slate-300 font-semibold">Duration (minutes)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="duration_minutes"
                        type="number"
                        value={runIndefinitely ? "" : (formData.duration_minutes || '')}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                        className="bg-slate-800/50 border-slate-700 text-white"
                        disabled={runIndefinitely}
                        min="1"
                        placeholder="60"
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="run_indefinitely_toggle"
                          checked={runIndefinitely}
                          onCheckedChange={(value) => {
                            setRunIndefinitely(value);
                            if (value) {
                              setFormData(prev => ({ ...prev, duration_minutes: null }));
                            } else {
                              setFormData(prev => ({ ...prev, duration_minutes: prev.duration_minutes || 60 }));
                            }
                          }}
                        />
                        <InfinityIcon className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 font-semibold mb-2 block">Geographic Locations</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                    {GEO_LOCATIONS.map((location) => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox
                          id={`geo-${location}`}
                          checked={formData.geo_locations.includes(location)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              geo_locations: checked
                                ? [...prev.geo_locations, location]
                                : prev.geo_locations.filter(l => l !== location)
                            }));
                          }}
                        />
                        <Label htmlFor={`geo-${location}`} className="text-slate-300 text-sm">{location}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Profiles */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-emerald-400" />
                  User Profiles ({formData.user_profile_ids.length} selected)
                </CardTitle>
                {getTotalUsers() > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    {getTotalUsers()} Total Users
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {allUserProfiles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">No user profiles available</p>
                    <Link to={createPageUrl("UserProfiles")}>
                      <Button variant="outline" className="border-slate-700 hover:bg-slate-800">
                        Create User Profiles
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-3 pr-2">
                      {allUserProfiles.map((profile) => (
                        <div key={profile.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={`profile-${profile.id}`}
                              checked={formData.user_profile_ids.includes(profile.id)}
                              onCheckedChange={(checked) => {
                                setFormData(prev => {
                                  const newProfileIds = checked
                                    ? [...prev.user_profile_ids, profile.id]
                                    : prev.user_profile_ids.filter(id => id !== profile.id);

                                  // Update profileUserCounts
                                  setProfileUserCounts(prevCounts => {
                                    const updatedCounts = { ...prevCounts };
                                    if (checked) {
                                      updatedCounts[profile.id] = updatedCounts[profile.id] || 100;
                                    } else {
                                      delete updatedCounts[profile.id];
                                    }
                                    return updatedCounts;
                                  });

                                  return { ...prev, user_profile_ids: newProfileIds };
                                });
                              }}
                              className="border-slate-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                            />
                            <div>
                              <Label htmlFor={`profile-${profile.id}`} className="text-slate-200 font-medium cursor-pointer block">{profile.profile_name}</Label>
                              <p className="text-xs text-slate-400">
                                {profile.demographics?.age_group || 'Any age'} • {profile.demographics?.gender || 'Any gender'}
                              </p>
                            </div>
                          </div>
                          {formData.user_profile_ids.includes(profile.id) && (
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                              {profileUserCounts[profile.id] || 100} users
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Logging Configuration */}
            <TrafficLoggingCard
              formData={formData}
              onInputChange={(field, value) => setFormData(prev => {
                const keys = field.split('.');
                if (keys.length === 2) {
                  return {
                    ...prev,
                    [keys[0]]: {
                      ...prev[keys[0]],
                      [keys[1]]: value
                    }
                  };
                }
                return { ...prev, [field]: value };
              })}
            />
          </div>

          {/* Right Column - Preview & Controls */}
          <div className="space-y-6">
            {/* Traffic Simulation Preview */}
            <TrafficSimulationPreview formData={formData} />

            {/* RTB Data Preview */}
            <RTBDataPreview
              formData={formData}
              isVisible={true}
              selectedProfiles={allUserProfiles.filter(p => formData.user_profile_ids.includes(p.id))}
            />

            {/* Submit Button */}
            <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-800/50">
              <CardContent className="p-6">
                <Button
                  onClick={handleSubmit}
                  disabled={isCreating || !formData.name || !formData.target_url}
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

                {isEditing && (
                  <Button
                    onClick={() => navigate(createPageUrl("Campaigns"))}
                    variant="outline"
                    className="w-full mt-3 border-slate-700 hover:bg-slate-800 text-slate-300"
                  >
                    Cancel Editing
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Run Immediately Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="runImmediately"
                checked={runOnSubmit}
                onCheckedChange={setRunOnSubmit}
                className="border-slate-700 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white"
              />
              <label
                htmlFor="runImmediately"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-300"
              >
                Run campaign immediately after creation
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}