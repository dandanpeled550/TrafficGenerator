
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, Smartphone, Hash, MapPin, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

// Generate sample ADID
const generateADID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const mapAgeGroupToYOB = (ageGroup) => {
  if (!ageGroup) return 1990 + Math.floor(Math.random() * 30); // Default random YOB
  
  const currentYear = new Date().getFullYear();
  const parts = ageGroup.split('-');
  let minAge, maxAge;

  if (parts.length === 2) {
    minAge = parseInt(parts[0]);
    maxAge = parseInt(parts[1]);
  } else if (ageGroup.endsWith('+')) {
    minAge = parseInt(parts[0]);
    maxAge = minAge + 10; // Assume a 10-year range for "65+" like groups
  } else {
    return 1990 + Math.floor(Math.random() * 30); // Fallback
  }

  const yobMin = currentYear - maxAge;
  const yobMax = currentYear - minAge;
  return yobMin + Math.floor(Math.random() * (yobMax - yobMin + 1));
};

const GEO_COUNTRY_MAP = {
  "United States": "USA", "United Kingdom": "GBR", "Canada": "CAN",
  "Germany": "DEU", "France": "FRA", "Australia": "AUS",
  "Japan": "JPN", "Brazil": "BRA", "India": "IND", "Netherlands": "NLD"
};

// Generate sample bid request data with consistent user simulation
const generateBidRequestData = (rtbConfig, selectedProfiles = [], campaignGeoLocations = []) => {

  // If profiles are selected, use profile data for demographics
  let demographics = { age_groups: [], genders: [], interests: [] };
  let effectiveConfig = { ...rtbConfig, user_demographics: demographics };
  
  if (selectedProfiles.length > 0) {
    const firstProfile = selectedProfiles[0]; // Use first profile for preview
    demographics = {
      age_groups: firstProfile.demographics?.age_group && firstProfile.demographics.age_group !== 'any' ? [firstProfile.demographics.age_group] : [],
      genders: firstProfile.demographics?.gender && firstProfile.demographics.gender !== 'any' ? [firstProfile.demographics.gender] : [],
      interests: firstProfile.demographics?.interests?.length ? firstProfile.demographics.interests : []
    };
    effectiveConfig = {
      ...rtbConfig,
      device_models: firstProfile.device_preferences?.device_models?.length ? firstProfile.device_preferences.device_models : rtbConfig.device_models,
      ad_formats: firstProfile.rtb_specifics?.preferred_ad_formats?.length ? firstProfile.rtb_specifics.preferred_ad_formats : rtbConfig.ad_formats,
      device_brand: firstProfile.device_preferences?.device_brand && firstProfile.device_preferences.device_brand !== 'any' ? firstProfile.device_preferences.device_brand : rtbConfig.device_brand,
      user_demographics: demographics
    };
  }

  const deviceModels = effectiveConfig.device_models?.length ? effectiveConfig.device_models : ["Galaxy S24 Ultra"];
  const adFormats = effectiveConfig.ad_formats?.length ? effectiveConfig.ad_formats : ["banner"];
  
  const randomModel = deviceModels[Math.floor(Math.random() * deviceModels.length)];
  const randomFormat = adFormats[Math.floor(Math.random() * adFormats.length)];

  let selectedAgeGroup = null;
  if (effectiveConfig.user_demographics?.age_groups?.length) {
    selectedAgeGroup = effectiveConfig.user_demographics.age_groups[Math.floor(Math.random() * effectiveConfig.user_demographics.age_groups.length)];
  }
  const yob = mapAgeGroupToYOB(selectedAgeGroup);

  let selectedGender = null;
  if (effectiveConfig.user_demographics?.genders?.length) {
    const randomSelectedGender = effectiveConfig.user_demographics.genders[Math.floor(Math.random() * effectiveConfig.user_demographics.genders.length)];
    if (randomSelectedGender === "Male" || randomSelectedGender === "male") selectedGender = "M";
    else if (randomSelectedGender === "Female" || randomSelectedGender === "female") selectedGender = "F";
    else selectedGender = "O";
  } else {
    selectedGender = Math.random() > 0.5 ? "M" : "F";
  }
  
  const keywords = effectiveConfig.user_demographics?.interests?.length ? effectiveConfig.user_demographics.interests.join(',') : undefined;

  const userADID = effectiveConfig.generate_adid ? generateADID() : undefined;
  
  const randomCampaignCountry = campaignGeoLocations.length > 0
    ? campaignGeoLocations[Math.floor(Math.random() * campaignGeoLocations.length)]
    : "United States"; // Default if no geo locations are specified
    
  const countryCode = GEO_COUNTRY_MAP[randomCampaignCountry] || randomCampaignCountry.substring(0, 3).toUpperCase();

  return {
    id: "bid-" + Math.random().toString(36).substr(2, 9),
    imp: [{
      id: "1",
      banner: randomFormat === "banner" ? { w: 320, h: 50, pos: 1 } : undefined,
      video: randomFormat === "video" ? { w: 640, h: 480, minduration: 5, maxduration: 30 } : undefined,
      native: randomFormat === "native" ? { request: "{ \"ver\": \"1.2\" }" } : undefined
    }],
    device: {
      ua: `Mozilla/5.0 (Linux; Android 14; ${randomModel}) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36`,
      geo: {
        country: countryCode,
        region: "CA", // Placeholder, could be randomized based on country
        city: "Los Angeles", // Placeholder
        lat: 34.0522, // Placeholder
        lon: -118.2437 // Placeholder
      },
      ip: "192.168.1." + Math.floor(Math.random() * 255),
      devicetype: 1, // Mobile/Tablet
      make: effectiveConfig.device_brand === "samsung" ? "Samsung" : "Unknown",
      model: randomModel,
      os: "Android",
      osv: "14",
      ifa: userADID // Consistent ADID for this simulated user
    },
    user: {
      id: "user-" + Math.random().toString(36).substr(2, 9),
      yob: yob,
      gender: selectedGender,
      keywords: keywords 
    },
    app: { // Assuming mobile app context for RTB
      id: "app-" + Math.random().toString(36).substr(2, 9),
      name: "Sample Mobile App",
      bundle: "com.example.sampleapp",
      cat: rtbConfig.app_categories?.length ? rtbConfig.app_categories : ["IAB9"], // IAB9 = Hobbies & Interests
      ver: "1.0"
    },
    at: 1, // Auction Type: First Price
    tmax: 120, // Timeout in milliseconds
    cur: ["USD"]
  };
};

export default function RTBDataPreview({ campaignFormData, isVisible, selectedProfiles = [] }) {
  const [sampleData, setSampleData] = React.useState(null);
  const [adid, setAdid] = React.useState("");

  React.useEffect(() => {
    if (isVisible && campaignFormData) {
      const generatedSampleData = generateBidRequestData(campaignFormData.rtb_config, selectedProfiles, campaignFormData.geo_locations);
      setSampleData(generatedSampleData);

      if (campaignFormData.rtb_config?.generate_adid && generatedSampleData.device.ifa) {
        setAdid(generatedSampleData.device.ifa);
      } else {
        setAdid("");
      }
    }
  }, [isVisible, campaignFormData, selectedProfiles]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-green-400" />
            RTB Data Preview
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              Sample Data
            </Badge>
          </CardTitle>
          <p className="text-sm text-slate-400">
            Preview of the OpenRTB data that will be generated for your campaign. Geo-location is sourced from your campaign settings.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* ADID Preview */}
          {campaignFormData?.rtb_config?.generate_adid && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-white">Sample User Advertising ID</h3>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400">{adid}</span>
                  <Badge variant="outline" className="text-xs">
                    Persistent per user
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Each simulated user will have a unique ADID that persists throughout the campaign
                </p>
              </div>
            </div>
          )}

          {/* Demographic Info Preview */}
          {(sampleData?.user?.yob || sampleData?.user?.gender || sampleData?.user?.keywords) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white">User Demographics (Sample)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Year of Birth</p>
                  <p className="text-white font-semibold">{sampleData?.user?.yob || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Gender</p>
                  <p className="text-white font-semibold">
                    {sampleData?.user?.gender === "M" ? "Male" : 
                     sampleData?.user?.gender === "F" ? "Female" : 
                     sampleData?.user?.gender === "O" ? "Other" : "N/A"}
                  </p>
                </div>
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Interests</p>
                  <p className="text-white font-semibold truncate" title={sampleData?.user?.keywords}>
                    {sampleData?.user?.keywords || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Device Info Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-white">Device Information (Sample)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Device</p>
                <p className="text-white font-semibold">{sampleData?.device?.make} {sampleData?.device?.model}</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 uppercase tracking-wide">OS Version</p>
                <p className="text-white font-semibold">{sampleData?.device?.os} {sampleData?.device?.osv}</p>
              </div>
            </div>
          </div>

          {/* OpenRTB Bid Request Structure */}
          {campaignFormData?.rtb_config?.simulate_bid_requests && sampleData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                <h3 className="font-semibold text-white">OpenRTB Bid Request Structure (Sample)</h3>
              </div>
              <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 max-h-96 overflow-y-auto">
                <pre className="text-xs text-slate-300 overflow-x-auto">
{JSON.stringify(sampleData, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
        </CardContent>
      </Card>
    </motion.div>
  );
}
