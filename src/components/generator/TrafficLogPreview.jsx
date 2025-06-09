import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, FileJson, FileText } from "lucide-react";

// This function generates a sample log line based on the campaign data
const generateSampleLog = (formData) => {
  const now = new Date();
  const ip = "192.168.1." + Math.floor(Math.random() * 255);
  const userAgent = formData.user_agents?.[0] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
  const status = "200";
  const bytes = Math.floor(Math.random() * 2000) + 500;
  const referrer = formData.referrers?.[0] || "-";

  // Common fields for JSON and CSV
  const commonData = {
    timestamp: now.toISOString(),
    campaign_id: "preview_id",
    campaign_name: formData.name || "Test Campaign",
    target_url: formData.target_url || "https://example.com",
    method: "GET",
    status_code: parseInt(status),
    ip_address: ip,
    user_agent: userAgent,
    referrer: referrer,
    geo_location: formData.geo_locations?.[0] || "United States",
    success: true,
  };

  switch (formData.config?.log_format) {
    case "json":
      return JSON.stringify(commonData, null, 2);
    
    case "apache_combined":
      return `${ip} - - [${now.toUTCString()}] "GET / HTTP/1.1" ${status} ${bytes} "${referrer}" "${userAgent}"`;

    case "csv":
    default:
      const headers = Object.keys(commonData).join(',');
      const values = Object.values(commonData).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      return `${headers}\n${values}`;
  }
};

export default function TrafficLogPreview({ formData, isVisible }) {
  if (!isVisible) return null;

  const sampleLog = generateSampleLog(formData);

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" />
          Log Entry Preview
           <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            Sample Data
          </Badge>
        </CardTitle>
        <p className="text-sm text-slate-400">
          This is a sample of what a single log entry will look like based on your current settings. It is for preview and debugging purposes only.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-3">
          {formData.config?.log_format === 'csv' && <FileText className="w-4 h-4 text-purple-300" />}
          {formData.config?.log_format === 'json' && <FileJson className="w-4 h-4 text-purple-300" />}
          <h3 className="font-semibold text-white">Format: {formData.config?.log_format?.toUpperCase()}</h3>
        </div>
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 max-h-64 overflow-y-auto">
          <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all">
            {sampleLog}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}