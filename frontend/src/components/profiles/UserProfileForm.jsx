import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch"; // Still needed for other potential switches in future, or if some features are kept. But in this change, it's removed from RTB section.
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Tag, PlusCircle, Save, Users } from "lucide-react"; // Added Users icon
import {
  AGE_GROUPS, GENDERS, INTERESTS_SUGGESTIONS, DEVICE_BRANDS, SAMSUNG_MODELS, APPLE_MODELS, GOOGLE_MODELS,
  OPERATING_SYSTEMS, APP_CATEGORIES_SUGGESTIONS, AD_FORMATS_PROFILE, GEO_LOCATIONS_SUGGESTIONS,
  ADID_PERSISTENCE_OPTIONS, getDefaultUserProfile // Added ADID_PERSISTENCE_OPTIONS
} from './ProfileConstants';

const MultiSelectPills = ({ label, items, setItems, suggestions }) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = (item) => {
    if (item && !items.includes(item)) {
      setItems([...items, item]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      handleAdd(inputValue);
    }
  };

  const handleRemove = (itemToRemove) => {
    setItems(items.filter(item => item !== itemToRemove));
  };

  return (
    <div className="space-y-2">
      <Label className="text-slate-300 font-semibold">{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map(item => (
          <Badge
            key={item}
            variant="secondary"
            className="bg-blue-500/20 text-blue-300 border-blue-500/30 py-1 px-3 text-sm flex items-center gap-1"
          >
            {item}
            <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemove(item)} />
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Type and press Enter or select`}
          className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-400"
          list={`${label}-suggestions`}
        />
        <Button type="button" variant="outline" size="icon" onClick={() => handleAdd(inputValue)} className="border-slate-600 hover:bg-slate-700">
          <PlusCircle className="w-4 h-4" />
        </Button>
      </div>
      {suggestions && suggestions.length > 0 && (
        <datalist id={`${label}-suggestions`}>
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
      )}
       {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {suggestions.slice(0,5).map(s => (
             !items.includes(s) && <Button key={s} type="button" size="sm" variant="outline" className="text-xs border-slate-600 hover:bg-slate-700" onClick={() => handleAdd(s)}>+ {s}</Button>
          ))}
        </div>
       )}
    </div>
  );
};

const DeviceModelSelector = ({ brand, selectedModels, setSelectedModels }) => {
  let availableModels = [];
  if (brand === 'samsung') availableModels = SAMSUNG_MODELS;
  // else if (brand === 'apple') availableModels = APPLE_MODELS; // For future
  // else if (brand === 'google') availableModels = GOOGLE_MODELS; // For future

  if (brand === 'any' || availableModels.length === 0) return null;

  const toggleModel = (model) => {
    setSelectedModels(
      selectedModels.includes(model)
        ? selectedModels.filter(m => m !== model)
        : [...selectedModels, model]
    );
  };

  return (
    <div className="space-y-2">
      <Label className="text-slate-300 font-semibold">{brand.charAt(0).toUpperCase() + brand.slice(1)} Device Models</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 rounded-md border border-slate-700">
        {availableModels.map(model => (
          <div
            key={model}
            onClick={() => toggleModel(model)}
            className={`p-2 rounded-md border cursor-pointer text-xs text-center ${
              selectedModels.includes(model)
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                : 'border-slate-600 bg-slate-800/30 text-slate-300 hover:border-slate-500'
            }`}
          >
            {model}
          </div>
        ))}
      </div>
    </div>
  );
};


export default function UserProfileForm({ initialProfile, onSubmit, onCancel, isSubmitting }) {
  const [profile, setProfile] = useState(initialProfile || getDefaultUserProfile());

  useEffect(() => {
    setProfile(initialProfile || getDefaultUserProfile());
  }, [initialProfile]);

  const handleChange = (path, value) => {
    const keys = path.split('.');
    setProfile(prev => {
      const newProfile = { ...prev };
      let current = newProfile;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}; // Create nested object if it doesn't exist
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      // Reset device_models if brand changes
      if (path === 'device_preferences.device_brand') {
        newProfile.device_preferences.device_models = [];
      }
      return newProfile;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(profile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-slate-200">
      <Card className="bg-slate-900/70 border-slate-800 backdrop-blur-sm">
        <CardHeader><CardTitle className="text-xl">Basic Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-300 font-semibold">Profile Name</Label>
            <Input id="name" value={profile.name} onChange={e => handleChange('name', e.target.value)} required className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-400" />
          </div>
          <div>
            <Label htmlFor="description" className="text-slate-300 font-semibold">Description</Label>
            <Textarea id="description" value={profile.description} onChange={e => handleChange('description', e.target.value)} className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/70 border-slate-800 backdrop-blur-sm">
        <CardHeader><CardTitle className="text-xl">Demographics</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="age_group" className="text-slate-300 font-semibold">Age Group</Label>
            <Select value={profile.demographics.age_group} onValueChange={val => handleChange('demographics.age_group', val)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">{AGE_GROUPS.map(ag => <SelectItem key={ag} value={ag}>{ag}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-slate-300 font-semibold">Gender</Label>
            <Select value={profile.demographics.gender} onValueChange={val => handleChange('demographics.gender', val)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">{GENDERS.map(g => <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <MultiSelectPills
              label="Interests"
              items={profile.demographics.interests || []}
              setItems={items => handleChange('demographics.interests', items)}
              suggestions={INTERESTS_SUGGESTIONS}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-slate-900/70 border-slate-800 backdrop-blur-sm">
        <CardHeader><CardTitle className="text-xl">Device Preferences</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="device_brand" className="text-slate-300 font-semibold">Device Brand</Label>
            <Select value={profile.device_preferences.device_brand} onValueChange={val => handleChange('device_preferences.device_brand', val)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">{DEVICE_BRANDS.map(b => <SelectItem key={b} value={b} disabled={b !== 'samsung' && b!== 'any'}>{b.charAt(0).toUpperCase() + b.slice(1)}{b !== 'samsung' && b!== 'any' ? ' (Soon)' : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="operating_system" className="text-slate-300 font-semibold">Operating System</Label>
            <Select value={profile.device_preferences.operating_system} onValueChange={val => handleChange('device_preferences.operating_system', val)}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">{OPERATING_SYSTEMS.map(os => <SelectItem key={os} value={os} disabled={os !== 'android' && os!== 'any'}>{os.charAt(0).toUpperCase() + os.slice(1)}{os !== 'android' && os!== 'any' ? ' (Soon)' : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <DeviceModelSelector
              brand={profile.device_preferences.device_brand}
              selectedModels={profile.device_preferences.device_models || []}
              setSelectedModels={models => handleChange('device_preferences.device_models', models)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/70 border-slate-800 backdrop-blur-sm">
        <CardHeader><CardTitle className="text-xl">App Usage (for RTB)</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
           <div className="md:col-span-2">
            <MultiSelectPills
              label="Preferred App Categories"
              items={profile.app_usage.preferred_app_categories || []}
              setItems={items => handleChange('app_usage.preferred_app_categories', items)}
              suggestions={APP_CATEGORIES_SUGGESTIONS}
            />
          </div>
          <div>
            <Label htmlFor="session_duration_avg_minutes" className="text-slate-300 font-semibold">Avg. Session Duration (minutes)</Label>
            <Input id="session_duration_avg_minutes" type="number" min="1" value={profile.app_usage.session_duration_avg_minutes} onChange={e => handleChange('app_usage.session_duration_avg_minutes', parseInt(e.target.value))} className="bg-slate-800/50 border-slate-700 text-white" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/70 border-slate-800 backdrop-blur-sm">
        <CardHeader><CardTitle className="text-xl">RTB Specifics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
           <MultiSelectPills
              label="Preferred Ad Formats"
              items={profile.rtb_specifics.preferred_ad_formats || []}
              setItems={items => handleChange('rtb_specifics.preferred_ad_formats', items)}
              suggestions={AD_FORMATS_PROFILE}
            />
          
          <div className="space-y-2">
            <Label className="text-slate-300 font-semibold">ADID Persistence</Label>
            <Select 
              value={profile.rtb_specifics.adid_persistence} 
              onValueChange={val => handleChange('rtb_specifics.adid_persistence', val)}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {ADID_PERSISTENCE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} className="py-2">
                    <div>
                      <div className="font-medium text-white">{option.label}</div>
                      <div className="text-xs text-slate-400">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              Controls how advertising IDs are generated and reused during the campaign
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="border-slate-700 hover:bg-slate-800 text-slate-300">Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg">
          <Save className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
