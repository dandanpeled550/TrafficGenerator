import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Database, Download } from "lucide-react";

export default function TrafficLoggingCard({ formData, onInputChange }) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-400" />
          Traffic Data Logging
        </CardTitle>
        <p className="text-sm text-slate-400">
          Configure how traffic data is logged for external service access and debugging.
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700">
          <div>
            <p className="font-semibold text-white">Enable Traffic Logging</p>
            <p className="text-sm text-slate-400">
              Log all generated traffic data to files for analysis.
            </p>
          </div>
          <Switch
            checked={formData.config?.enable_logging ?? true}
            onCheckedChange={(value) => onInputChange('config.enable_logging', value)}
          />
        </div>

        {formData.config?.enable_logging !== false && (
          <>
            <div className="space-y-2">
              <Label className="text-slate-300 font-semibold">Log File Format</Label>
              <Select
                value={formData.config?.log_format || "csv"}
                onValueChange={(value) => onInputChange('config.log_format', value)}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="csv">CSV (Recommended for RTB)</SelectItem>
                  <SelectItem value="json">JSON Format</SelectItem>
                  <SelectItem value="apache_combined">Apache Combined Log</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300 mb-2">Log File Naming</p>
                  <p className="text-xs text-slate-300">
                    A unique log file will be generated for your campaign with a name like: <br />
                    <span className="font-mono bg-slate-800/50 px-1 rounded">campaign_&#123;timestamp&#125;_&#123;name&#125;.csv</span>
                  </p>
                   <p className="text-xs text-slate-400 mt-2">You can download this file from the main Campaigns page once the campaign has run.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Real-time Access</p>
                <p className="text-sm text-white font-semibold">Live data streaming</p>
                <p className="text-xs text-slate-500 mt-1">Data is written immediately as traffic generates.</p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">External Integration</p>
                <p className="text-sm text-white font-semibold">API-ready format</p>
                <p className="text-xs text-slate-500 mt-1">Structured data for easy parsing by other services.</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}