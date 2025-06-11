import React, { useState, useEffect } from "react";
import backendClient from "@/api/backendClient";
import { TrafficSession } from "@/api/entities";
import { UserProfile } from "@/api/entities";
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

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  useEffect(() => {
    loadData();
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
    if (!profileIds || profileIds.length === 0) return "No profiles";
    return profileIds
      .map(id => userProfiles.find(p => p.id === id)?.profile_name)
      .filter(Boolean)
      .join(", ");
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
                  <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-slate-700 transition-all duration-300">
                    <CardHeader className="border-b border-slate-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-xl font-bold text-white truncate">
                              {campaign.name}
                            </CardTitle>
                            <Badge className={`border ${getStatusColor(campaign.status)}`}>
                              {campaign.status}
                            </Badge>
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              RTB
                            </Badge>
                          </div>
                          <p className="text-slate-400 truncate">{campaign.target_url}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Status Control Buttons */}
                          {campaign.status === 'draft' || campaign.status === 'paused' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(campaign.id, 'running')}
                              className="border-green-700 text-green-400 hover:bg-green-900/20"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Start
                            </Button>
                          ) : campaign.status === 'running' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(campaign.id, 'paused')}
                              className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20"
                            >
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </Button>
                          ) : null}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-900 border-slate-700">
                              <DropdownMenuItem 
                                onClick={() => navigate(createPageUrl("Generator") + `?edit=${campaign.id}`)}
                              >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit Campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadLogs(campaign.log_file_path)}
                                disabled={!campaign.log_file_path}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Logs
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDownloadTraffic(campaign.id)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Traffic
                              </DropdownMenuItem>
                              {(campaign.status === 'running' || campaign.status === 'paused') && (
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(campaign.id, 'stopped')}
                                >
                                  <Square className="w-4 h-4 mr-2" />
                                  Stop Campaign
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => confirmDelete(campaign)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Campaign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      {/* Progress Bar and Last Activity */}
                      {campaign.status !== 'draft' && (
                        <div className="mb-6">
                           <div className="flex justify-between items-center mb-2">
                                <p className="text-sm text-slate-300 font-medium">
                                 Progress 
                                 <span className="text-slate-400 ml-2">({totalRequests.toLocaleString()} requests)</span>
                                </p>
                                <p className="text-xs text-slate-400">
                                 {campaign.duration_minutes === null ? 'Continuous' : `${(campaign.progress_percentage || 0).toFixed(0)}%`}
                                </p>
                           </div>
                           {campaign.duration_minutes !== null && <Progress value={campaign.progress_percentage || 0} className="w-full h-2" />}
                           <p className="text-xs text-slate-500 text-right mt-2">
                            Last activity: {campaign.last_activity_time ? formatDistanceToNow(new Date(campaign.last_activity_time), { addSuffix: true }) : 'N/A'}
                           </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                        <div className="space-y-1">
                          <p className="text-slate-400">Total Requests</p>
                          <p className="text-lg font-bold text-white">{totalRequests.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400">Successful</p>
                          <p className="text-lg font-bold text-green-400 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> {successfulRequests.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400">Failed</p>
                          <p className="text-lg font-bold text-red-400 flex items-center gap-1.5">
                            <XCircle className="w-4 h-4" /> {failedRequests.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400">Success Rate</p>
                          <p className="text-lg font-bold text-white">{successRate.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400">Requests/Min</p>
                          <p className="text-lg font-bold text-white">{campaign.requests_per_minute}</p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-slate-400">Duration</p>
                           <p className="text-lg font-bold text-white">
                            {campaign.duration_minutes === null ? (
                              <span className="flex items-center gap-1">
                                <Infinity className="w-4 h-4" /> Continuous
                              </span>
                            ) : (
                              `${campaign.duration_minutes}m`
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-purple-400" />
                            <div>
                               <p className="text-slate-400">Profiles</p>
                               <p className="font-semibold text-white truncate" title={getProfileNames(campaign.user_profile_ids)}>{getProfileNames(campaign.user_profile_ids)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <Globe className="w-5 h-5 text-orange-400" />
                             <div>
                                <p className="text-slate-400">Locations</p>
                                <p className="font-semibold text-white">{campaign.geo_locations?.join(', ') || 'N/A'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Wand2 className="w-5 h-5 text-blue-400" />
                            <div>
                               <p className="text-slate-400">Edge Cases</p>
                               <p className="font-semibold text-white">
                                {campaign.edge_cases?.filter(ec => ec.is_enabled).length || 0} enabled
                               </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
