import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Monitor, 
  Globe, 
  Smartphone, 
  User, 
  Clock,
  Target,
  Activity,
  Download
} from "lucide-react";

export default function TrafficSimulationPreview({ formData }) {
  const [sampleRequests, setSampleRequests] = useState([]);

  useEffect(() => {
    generateSampleRequests();
  }, [formData]);

  const generateSampleRequests = () => {
    const requests = [];
    const deviceBrands = formData.rtb_config?.device_models || ['Galaxy S24', 'Galaxy S23', 'Galaxy A54'];
    const geoLocations = formData.geo_locations || ['United States'];
    const adFormats = formData.rtb_config?.ad_formats || ['banner'];
    
    for (let i = 0; i < 5; i++) {
      const deviceModel = deviceBrands[Math.floor(Math.random() * deviceBrands.length)];
      const country = geoLocations[Math.floor(Math.random() * geoLocations.length)];
      const adFormat = adFormats[Math.floor(Math.random() * adFormats.length)];
      const timestamp = new Date(Date.now() + i * 60000).toISOString();
      
      requests.push({
        id: `req-${Date.now()}-${i}`,
        timestamp,
        device_model: deviceModel,
        country,
        ad_format: adFormat,
        user_agent: `Mozilla/5.0 (Linux; Android 14; ${deviceModel}) AppleWebKit/537.36`,
        adid: `${Math.random().toString(36).substr(2, 8)}-${Math.random().toString(36).substr(2, 4)}`,
        bid_id: `bid-${Math.random().toString(36).substr(2, 12)}`,
        status: Math.random() > 0.15 ? 'success' : 'failed',
        response_time: Math.floor(Math.random() * 500) + 100
      });
    }
    
    setSampleRequests(requests);
  };

  const downloadSampleCSV = () => {
    const headers = [
      'timestamp', 'bid_id', 'device_model', 'country', 'ad_format', 
      'adid', 'status', 'response_time', 'user_agent'
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleRequests.map(req => [
        req.timestamp,
        req.bid_id,
        req.device_model,
        req.country,
        req.ad_format,
        req.adid,
        req.status,
        req.response_time,
        `"${req.user_agent}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_rtb_traffic.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            Traffic Preview
          </div>
          <Button
            onClick={downloadSampleCSV}
            variant="outline"
            size="sm"
            className="border-slate-700 hover:bg-slate-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Sample CSV
          </Button>
        </CardTitle>
        <p className="text-sm text-slate-400">
          Preview of RTB traffic data that will be generated based on your configuration.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Target</span>
            </div>
            <p className="text-sm text-white font-semibold truncate">{formData.target_url || 'Not set'}</p>
          </div>
          
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Rate</span>
            </div>
            <p className="text-sm text-white font-semibold">{formData.requests_per_minute || 10}/min</p>
          </div>
          
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Duration</span>
            </div>
            <p className="text-sm text-white font-semibold">
              {formData.duration_minutes ? `${formData.duration_minutes}m` : 'Indefinite'}
            </p>
          </div>
          
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wide">Locations</span>
            </div>
            <p className="text-sm text-white font-semibold">{formData.geo_locations?.length || 0} countries</p>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Sample RTB Requests</h4>
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {sampleRequests.map((request) => (
                <div key={request.id} className="p-4 bg-slate-800/40 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {request.bid_id}
                      </Badge>
                      <Badge className={
                        request.status === 'success' 
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }>
                        {request.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(request.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{request.device_model}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{request.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{request.ad_format}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-slate-400 truncate">
                    ADID: {request.adid} • Response: {request.response_time}ms
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}