import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Target, Zap, Users } from "lucide-react";

const SAMSUNG_MODELS = [
  "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24",
  "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23",
  "Galaxy A54 5G", "Galaxy A34 5G", "Galaxy A14",
  "Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9",
  "Galaxy Note 20 Ultra", "Galaxy Fold 5", "Galaxy Flip 5"
];

const AD_FORMATS = [
  { value: "banner", label: "Banner Ads", description: "Standard display banners" },
  { value: "interstitial", label: "Interstitial", description: "Full-screen ads" },
  { value: "video", label: "Video Ads", description: "In-stream video content" },
  { value: "native", label: "Native Ads", description: "In-feed native content" },
  { value: "rewarded", label: "Rewarded Video", description: "Incentivized video ads" }
];

const APP_CATEGORIES = [
  "Games", "Social Media", "Shopping", "News", "Entertainment",
  "Finance", "Health & Fitness", "Travel", "Education", "Productivity"
];

const AGE_GROUPS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const GENDERS = ["Male", "Female", "Other"];
const INTERESTS = [
  "Technology", "Gaming", "Sports", "Fashion", "Travel",
  "Food", "Music", "Movies", "Books", "Fitness"
];

export default function RTBConfigCard({ formData, onInputChange, profilesSelected }) {
  // Initialize default values if not present
  React.useEffect(() => {
    if (!formData.rtb_config) {
      onInputChange('rtb_config', {
        device_brand: 'samsung',
        device_models: SAMSUNG_MODELS.slice(0, 3), // Default to first 3 models
        ad_formats: ['banner', 'interstitial', 'native'], // Default formats
        app_categories: ['Games', 'Social Media', 'Shopping'], // Default categories
        generate_adid: true,
        simulate_bid_requests: true
      });
    }
  }, []);

  const handleDeviceModelToggle = (model) => {
    const currentModels = formData.rtb_config?.device_models || [];
    const updatedModels = currentModels.includes(model)
      ? currentModels.filter(m => m !== model)
      : [...currentModels, model];
    
    onInputChange('rtb_config.device_models', updatedModels);
  };

  const handleAdFormatToggle = (format) => {
    const currentFormats = formData.rtb_config?.ad_formats || [];
    const updatedFormats = currentFormats.includes(format)
      ? currentFormats.filter(f => f !== format)
      : [...currentFormats, format];
    
    onInputChange('rtb_config.ad_formats', updatedFormats);
  };

  const handleAppCategoryToggle = (category) => {
    const currentCategories = formData.rtb_config?.app_categories || [];
    const updatedCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    onInputChange('rtb_config.app_categories', updatedCategories);
  };

  const isDisabledByProfile = profilesSelected;

  // Ensure we have at least one device model, ad format, and app category selected
  React.useEffect(() => {
    const rtb_config = formData.rtb_config || {};
    const updates = {};

    if (!rtb_config.device_models?.length) {
      updates.device_models = SAMSUNG_MODELS.slice(0, 3);
    }
    if (!rtb_config.ad_formats?.length) {
      updates.ad_formats = ['banner', 'interstitial', 'native'];
    }
    if (!rtb_config.app_categories?.length) {
      updates.app_categories = ['Games', 'Social Media', 'Shopping'];
    }

    if (Object.keys(updates).length > 0) {
      onInputChange('rtb_config', { ...rtb_config, ...updates });
    }
  }, [formData.rtb_config]);

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-cyan-400" />
          General RTB Configuration
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            OpenRTB Protocol
          </Badge>
        </CardTitle>
        <p className="text-sm text-slate-400">
          {profilesSelected 
            ? "General RTB settings. Selected user profiles will override these where specified."
            : "Configure Real-Time Bidding traffic. These settings apply if no specific user profiles are selected."}
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-8">
        {/* Device Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-white">Device Targeting (Defaults)</h3>
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-300 font-semibold">Device Brand</Label>
            <Select
              value={formData.rtb_config?.device_brand || "samsung"}
              onValueChange={(value) => onInputChange('rtb_config.device_brand', value)}
              disabled={isDisabledByProfile}
            >
              <SelectTrigger className={`bg-slate-800/50 border-slate-700 text-white ${isDisabledByProfile ? 'opacity-70 cursor-not-allowed' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="any">Any (from profiles or random)</SelectItem>
                <SelectItem value="samsung">Samsung</SelectItem>
                <SelectItem value="apple" disabled>Apple (Coming Soon)</SelectItem>
                <SelectItem value="google" disabled>Google (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
             {isDisabledByProfile && <p className="text-xs text-slate-500 mt-1">Device brand determined by selected user profile(s).</p>}
          </div>

          {/* Device Models */}
          {!isDisabledByProfile && formData.rtb_config?.device_brand !== 'any' && (
            <div className="space-y-3">
              <Label className="text-slate-300 font-semibold">Default Samsung Device Models</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SAMSUNG_MODELS.map((model) => (
                  <div
                    key={model}
                    onClick={() => !isDisabledByProfile && handleDeviceModelToggle(model)}
                    className={`p-3 rounded-lg border text-sm ${
                      isDisabledByProfile ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      (formData.rtb_config?.device_models || []).includes(model)
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                        : 'border-slate-700 bg-slate-800/30 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {model}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ad Format Configuration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-white">Ad Formats (Defaults)</h3>
          </div>
          {isDisabledByProfile && <p className="text-xs text-slate-500 mb-2">Ad formats determined by selected user profile(s).</p>}
          <div className={`grid gap-3 ${isDisabledByProfile ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {AD_FORMATS.map((format) => (
              <div
                key={format.value}
                onClick={() => !isDisabledByProfile && handleAdFormatToggle(format.value)}
                className={`p-4 rounded-lg border transition-all duration-200 ${isDisabledByProfile ? '' : 'cursor-pointer'} ${
                  (formData.rtb_config?.ad_formats || []).includes(format.value)
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-700 bg-slate-800/30 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{format.label}</p>
                    <p className="text-sm opacity-75">{format.description}</p>
                  </div>
                  {!isDisabledByProfile && (
                    <div className={`w-4 h-4 rounded border-2 ${
                      (formData.rtb_config?.ad_formats || []).includes(format.value)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-500'
                    }`} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Categories */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-400" />
            <h3 className="font-semibold text-white">App Categories (Defaults)</h3>
          </div>
          {isDisabledByProfile && <p className="text-xs text-slate-500 mb-2">App categories determined by selected user profile(s).</p>}
          <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${isDisabledByProfile ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {APP_CATEGORIES.map((category) => (
              <div
                key={category}
                onClick={() => !isDisabledByProfile && handleAppCategoryToggle(category)}
                className={`p-3 rounded-lg border text-sm ${
                  isDisabledByProfile ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  (formData.rtb_config?.app_categories || []).includes(category)
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-slate-700 bg-slate-800/30 text-slate-300 hover:border-slate-600'
                }`}
              >
                {category}
              </div>
            ))}
          </div>
        </div>
        
        {/* User Demographics Section */}
        {profilesSelected && (
            <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    <p className="text-sm text-slate-300">User demographics (age, gender, interests) will be sourced from the selected user profile(s).</p>
                </div>
            </div>
        )}

        {/* RTB Protocol Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="font-semibold text-white">RTB Protocol Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-white">Generate Advertising IDs</p>
                <p className="text-sm text-slate-400">
                  {profilesSelected 
                    ? "ADID generation preference taken from user profile(s)." 
                    : "Create unique ADID for each simulated user."}
                </p>
              </div>
              <Switch
                checked={formData.rtb_config?.generate_adid ?? true}
                onCheckedChange={(value) => onInputChange('rtb_config.generate_adid', value)}
                disabled={profilesSelected && formData.rtb_config?.generate_adid_from_profile}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-white">Simulate Bid Requests</p>
                <p className="text-sm text-slate-400">
                  {profilesSelected 
                    ? "Bid request simulation determined by user profile(s)." 
                    : "Simulate RTB bid requests for each ad impression."}
                </p>
              </div>
              <Switch
                checked={formData.rtb_config?.simulate_bid_requests ?? true}
                onCheckedChange={(value) => onInputChange('rtb_config.simulate_bid_requests', value)}
                disabled={profilesSelected && formData.rtb_config?.simulate_bid_requests_from_profile}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
