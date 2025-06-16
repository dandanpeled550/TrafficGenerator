import React, { useState, useEffect, useRef } from "react";
import backendClient from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import DirectTrafficInjector from "../components/campaigns/DirectTrafficInjector"; 
import {
  Search,
  Filter,
  Edit3,
  Play,
  Pause,
  Square,
  Trash2,
  Plus,
  Globe,
  Users,
  Clock,
  MoreVertical,
  Infinity,
  Download,
  RefreshCw,
  Wand2,
  CheckCircle,
  XCircle,
  Activity,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const CampaignCard = ({ campaign, onDelete, onStatusChange, allProfiles }) => {
  const [isInjecting, setIsInjecting] = useState(false);
  const [error, setError] = useState(null);
  const [monitoringData, setMonitoringData] = useState({
    total_requests: 0,
    successful_requests: 0,
    requests_per_minute: 0,
    success_rate: 0,
    average_response_time: 0,
    last_updated: null
  });
  const monitoringIntervalRef = useRef(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'stopped':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'draft':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getProfileNames = (profileIds) => {
    if (!profileIds || !profileIds.length) return "No profiles selected";
    return profileIds
      .map(id => {
        const profile = allProfiles.find(p => p.id === id);
        return profile ? profile.name : `Unknown Profile (${id})`;
      })
      .join(", ");
  };

  useEffect(() => {
    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  const startMonitoring = async () => {
    const fetchMonitoringData = async () => {
      try {
        const response = await backendClient.traffic.monitor(campaign.id);
        if (response.success && response.data) {
          setMonitoringData({
            total_requests: response.data.total_requests || 0,
            successful_requests: response.data.successful_requests || 0,
            requests_per_minute: response.data.requests_per_minute || 0,
            success_rate: response.data.success_rate || 0,
            average_response_time: response.data.average_response_time || 0,
            last_updated: response.data.last_updated
          });
        }
      } catch (error) {
        console.error(`[Monitor] Error fetching monitoring data:`, error);
      }
    };

    await fetchMonitoringData();
    monitoringIntervalRef.current = setInterval(fetchMonitoringData, 2000);
  };

  const stopMonitoring = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  };

  const startTrafficGeneration = async (campaign) => {
    try {
      const config = {
        campaign_id: campaign.id,
        target_url: campaign.target_url,
        requests_per_minute: campaign.requests_per_minute,
        duration_minutes: campaign.duration_minutes,
        user_profile_ids: campaign.user_profile_ids,
        profile_user_counts: campaign.profile_user_counts,
        geo_locations: campaign.geo_locations || ["United States"],
        rtb_config: campaign.rtb_config || {},
        config: campaign.config || {},
        log_file_path: campaign.log_file_path,
        log_level: campaign.log_level,
        log_format: campaign.log_format
      };

      console.log('Starting traffic generation with config:', JSON.stringify(config, null, 2));

      const response = await backendClient.traffic.generate(config);

      if (!response.success) {
        let errorMessage = 'Failed to start traffic generation';
        if (response.error) {
          errorMessage = response.error;
        }
        if (response.status === 'running') {
          errorMessage = 'Traffic generation is already running for this campaign';
        }
        console.error('Traffic generation error:', {
          response: response,
          config: config
        });
        throw new Error(errorMessage);
      }

      console.log('Traffic generation started successfully:', response);
      setCampaigns(prevCampaigns =>
        prevCampaigns.map(c =>
          c.id === campaign.id
            ? { ...c, status: 'running', last_started: new Date().toISOString() }
            : c
        )
      );

      await startMonitoring();
    } catch (error) {
      console.error('Error starting traffic generation:', error);
      setError(error.message || 'Failed to start traffic generation');
      setCampaigns(prevCampaigns =>
        prevCampaigns.map(c =>
          c.id === campaign.id
            ? { ...c, status: 'error', error_message: error.message }
            : c
        )
      );
    }
  };

  const stopTrafficGeneration = async () => {
    stopMonitoring();
    setIsInjecting(false);
    try {
      await backendClient.sessions.update(campaign.id, {
        status: 'stopped',
        end_time: new Date().toISOString()
      });
      onStatusChange(campaign.id, 'stopped');
    } catch (error) {
      console.error(`[Injector] Error stopping traffic generation:`, error);
      setError(`Failed to stop traffic generation: ${error.message}`);
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          {campaign.name}
        </CardTitle>
        <Badge className={getStatusColor(campaign.status)}>
          {campaign.status}
        </Badge>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Campaign Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Target URL</p>
              <p className="text-white truncate">{campaign.target_url}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Profiles</p>
              <p className="text-white">{getProfileNames(campaign.user_profile_ids)}</p>
            </div>
          </div>

          {/* Monitoring Stats */}
          {isInjecting && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-slate-400 text-sm">Total Requests</p>
                <p className="text-white text-xl font-semibold">{monitoringData.total_requests}</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-slate-400 text-sm">Success Rate</p>
                <p className="text-white text-xl font-semibold">{monitoringData.success_rate.toFixed(1)}%</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-slate-400 text-sm">Requests/Min</p>
                <p className="text-white text-xl font-semibold">{monitoringData.requests_per_minute.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <p className="text-slate-400 text-sm">Avg Response</p>
                <p className="text-white text-xl font-semibold">{monitoringData.average_response_time.toFixed(0)}ms</p>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex justify-end gap-2">
            {!isInjecting ? (
              <Button
                onClick={() => startTrafficGeneration(campaign)}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={campaign.status === 'running'}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Traffic
              </Button>
            ) : (
              <Button
                onClick={stopTrafficGeneration}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Traffic
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onDelete(campaign)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);

  useEffect(() => {
    loadData();
    // Load all profiles for name resolution
    backendClient.profiles.list().then(setAllProfiles).catch(console.error);
  }, []);

  // Effect for auto-refresh based on running campaigns
  useEffect(() => {
    const hasRunningCampaigns = campaigns.some(c => c.status === 'running');
    let intervalId = null;

    if (hasRunningCampaigns) {
      intervalId = setInterval(() => {
        loadData(true); // silent refresh
      }, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [campaigns]); // Re-run effect when campaigns change (e.g., status updates)

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    try {
      const campaignsData = await backendClient.sessions.list();
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    if (!isRefresh) setIsLoading(false);
    setLastRefreshed(new Date()); // Update last refreshed time
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      const updates = { 
        status: newStatus,
        ...(newStatus === 'running' && { start_time: new Date().toISOString() }),
        ...(newStatus === 'stopped' && { end_time: new Date().toISOString() })
      };
      
      await backendClient.sessions.update(campaignId, updates);
      loadData();
    } catch (error) {
      console.error("Failed to update campaign status:", error);
    }
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;
    
    try {
      await backendClient.sessions.delete(campaignToDelete.id);
      loadData();
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
    
    setShowDeleteConfirm(false);
    setCampaignToDelete(null);
  };

  const handleDownloadLogs = (filePath) => {
    if (!filePath) return;
    window.open(`${import.meta.env.VITE_API_URL}/api/logs/${filePath}`, '_blank');
  };

  const handleDownloadTraffic = async (campaignId) => {
    try {
      const trafficData = await backendClient.traffic.getCampaignGenerated(campaignId);
      if (trafficData.length === 0) {
        console.log("No traffic data to download for this campaign.");
        return;
      }
      const dataStr = JSON.stringify(trafficData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traffic_${campaignId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download traffic data:", error);
    }
  };

  const confirmDelete = (campaign) => {
    setCampaignToDelete(campaign);
    setShowDeleteConfirm(true);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.target_url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Campaign Management</h1>
            <p className="text-slate-400 text-lg">View, edit, and manage all your RTB traffic campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <p className="text-xs text-slate-500 mr-2 whitespace-nowrap">
                Last updated: {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
              </p>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadData(true)}
              className="border-slate-700 hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link to={createPageUrl("Generator")}>
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                New Campaign
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white placeholder-slate-400 pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="stopped">Stopped</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter className="w-4 h-4" />
            <span>{filteredCampaigns.length} of {campaigns.length} campaigns</span>
          </div>
        </motion.div>

        {/* Campaigns Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-slate-900/30 rounded-xl border border-slate-800"
          >
            <Activity className="w-20 h-20 text-slate-600 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-white mb-2">
              {searchTerm || statusFilter !== "all" ? "No campaigns match your filters" : "No campaigns found"}
            </h2>
            <p className="text-slate-400 mb-6">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Get started by creating your first RTB campaign"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Link to={createPageUrl("Generator")}>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Campaign
                </Button>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {filteredCampaigns.map((campaign, index) => {
                const totalRequests = campaign.total_requests || 0;
                const successfulRequests = campaign.successful_requests || 0;
                const failedRequests = totalRequests - successfulRequests;
                const successRate = totalRequests > 0 
                  ? (successfulRequests / totalRequests) * 100 
                  : 0;

                const needsTrafficInjection = (campaign.status === 'running' || campaign.status === 'draft') && totalRequests === 0;

                return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-4"
                >
                  {/* Direct Traffic Injector - Show for campaigns that need it */}
                  {needsTrafficInjection && (
                    <DirectTrafficInjector 
                      campaign={campaign} 
                      onUpdate={loadData}
                    />
                  )}

                  {/* Main Campaign Card */}
                  <CampaignCard
                    campaign={campaign}
                    onDelete={confirmDelete}
                    onStatusChange={handleStatusChange}
                    allProfiles={allProfiles}
                  />
                </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete the campaign "{campaignToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
              className="border-slate-700 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
