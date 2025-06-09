
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Settings, MapPin, Edit3, Trash2, Smartphone, Tv, Tag } from "lucide-react";

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-2 text-sm">
    <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
    <div>
      <span className="text-slate-400">{label}: </span>
      <span className="text-slate-200 font-medium">
        {Array.isArray(value) ? value.join(', ') || 'N/A' : value || 'N/A'}
      </span>
    </div>
  </div>
);

export default function UserProfileCard({ profile, onEdit, onDelete }) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm text-slate-300 hover:border-slate-700 transition-all duration-300">
      <CardHeader className="border-b border-slate-800 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold text-white mb-1">{profile.profile_name}</CardTitle>
            <p className="text-xs text-slate-400 italic">{profile.description || "No description"}</p>
          </div>
          <User className="w-8 h-8 text-blue-400 p-1.5 bg-blue-500/10 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="p-6 grid gap-4">
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
          <DetailItem icon={Settings} label="Age Group" value={profile.demographics?.age_group} />
          <DetailItem icon={Settings} label="Gender" value={profile.demographics?.gender} />
        </div>
        <DetailItem icon={Tag} label="Interests" value={profile.demographics?.interests} />
        <hr className="border-slate-700/50" />
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
          <DetailItem icon={Smartphone} label="Device Brand" value={profile.device_preferences?.device_brand} />
          <DetailItem icon={Smartphone} label="OS" value={profile.device_preferences?.operating_system} />
        </div>
        <DetailItem icon={Smartphone} label="Device Models" value={profile.device_preferences?.device_models} />
        <hr className="border-slate-700/50" />
        <DetailItem icon={Tv} label="App Categories" value={profile.app_usage?.preferred_app_categories} />
        <DetailItem icon={Settings} label="Ad Formats" value={profile.rtb_specifics?.preferred_ad_formats} />
        <DetailItem icon={Settings} label="ADID Persistence" value={profile.rtb_specifics?.adid_persistence} />
      </CardContent>
      <CardFooter className="border-t border-slate-800 p-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(profile)} className="border-slate-600 hover:bg-slate-700">
          <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(profile.id)} className="bg-red-700/50 hover:bg-red-600/50 border border-red-600/50 text-red-300 hover:text-red-200">
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
