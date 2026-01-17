import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Download,
  RefreshCw,
  Loader2,
  Zap
} from "lucide-react";

export function TrafficSimulationPreview({ formData, onGenerate }) {
  const [sampleRequests, setSampleRequests] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);

  useEffect(() => {
    generateSampleRequests();
  }, [formData]);

  // Add status checking effect
  useEffect(() => {
    if (formData.id) {
      // Start status checking
      const interval = setInterval(async () => {
        try {
          const response = await backendClient.traffic.getStatus(formData.id);
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
  }, [formData.id]);

  const generateSampleRequests = async () => {
    try {
      const response = await backendClient.traffic.generateSample(formData);
      setSampleRequests(response.data);
    } catch (error) {
      console.error("Failed to generate sample requests:", error);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSampleCSV = () => {
    if (sampleRequests.length === 0) return;

    const headers = [
      "Timestamp",
      "IP Address",
      "User Agent",
      "Referrer",
      "Request Type",
      "Status Code",
      "Response Time",
      "Edge Case"
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRequests.map(request => [
        request.timestamp,
        request.ip_address,
        request.user_agent,
        request.referrer,
        request.request_type,
        request.status_code,
        request.response_time,
        request.edge_case || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_traffic.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Traffic Preview
        </CardTitle>
        <CardDescription className="text-slate-400">
          Preview the traffic that will be generated based on your configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStatusBadge()}
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={generateSampleRequests}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Preview
            </Button>
            <Button
              variant="outline"
              onClick={downloadSampleCSV}
              className="text-slate-400 hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Sample
            </Button>
          </div>

          <div className="grid gap-4">
            {sampleRequests.map((request, index) => (
              <div
                key={index}
                className="p-4 bg-slate-800/30 rounded-lg border border-slate-700"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Timestamp</p>
                    <p className="text-white font-mono">{request.timestamp}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">IP Address</p>
                    <p className="text-white font-mono">{request.ip_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">User Agent</p>
                    <p className="text-white font-mono text-sm truncate">
                      {request.user_agent}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Referrer</p>
                    <p className="text-white font-mono text-sm truncate">
                      {request.referrer}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Request Type</p>
                    <p className="text-white font-mono">{request.request_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Status Code</p>
                    <p className="text-white font-mono">{request.status_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Response Time</p>
                    <p className="text-white font-mono">{request.response_time}ms</p>
                  </div>
                  {request.edge_case && (
                    <div>
                      <p className="text-sm text-slate-400">Edge Case</p>
                      <p className="text-white font-mono">{request.edge_case}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Traffic...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Start Traffic Generation
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}