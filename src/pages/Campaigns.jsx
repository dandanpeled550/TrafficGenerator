import React, { useState, useEffect, useRef, useCallback } from "react";
import backendClient from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Filter,
  Play,
  Square,
  Trash2,
  Plus,
  RefreshCw,
  Activity,
  Eye,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const buildTrafficConfig = (campaign) => ({
  campaign_id: campaign.id,
  target_url: campaign.target_url,
  requests_per_minute: campaign.requests_per_minute || 10,
  duration_minutes: campaign.duration_minutes || 60,
  user_profile_ids: campaign.user_profile_ids || [],
  profile_user_counts: campaign.profile_user_counts || {},
  total_profile_users: Object.values(campaign.profile_user_counts || {}).reduce((a, b) => a + b, 0),
  geo_locations: campaign.geo_locations || ["United States"],
  rtb_config: campaign.rtb_config || {},
  config: campaign.config || {},
  log_file_path: campaign.log_file_path
});

const CampaignCard = ({ campaign, onDelete, onStatusChange }) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

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

  const handleStartCampaign = async () => {
    console.log('[DEBUG] handleStartCampaign in Campaigns.jsx triggered');
    setIsStarting(true);
    try {
      console.log('[DEBUG] About to update campaign status');
      await backendClient.traffic.updateCampaignStatus(campaign.id, 'running');
      console.log('[DEBUG] Status updated, building config');
      // Build traffic config (example, adjust as needed)
      const trafficConfig = buildTrafficConfig(campaign);
      console.log('[DEBUG] Built traffic config:', trafficConfig);
      console.log('[DEBUG] About to call backendClient.traffic.generate');
      const result = await backendClient.traffic.generate(trafficConfig);
      console.log('[DEBUG] backendClient.traffic.generate result:', result);
      if (result.success) {
        // Optionally update UI or state
        console.log('[DEBUG] Traffic generation started successfully');
      } else {
        console.error('[DEBUG] Failed to start traffic generation:', result.error);
      }
    } catch (error) {
      console.error('[DEBUG] Error in handleStartCampaign in Campaigns.jsx:', error);
    } finally {
      setIsStarting(false);
      console.log('[DEBUG] handleStartCampaign in Campaigns.jsx finished');
    }
  };

  const handleStopCampaign = async () => {
    setIsStopping(true);
    try {
      await backendClient.traffic.stop(campaign.id);
      await backendClient.traffic.updateCampaignStatus(campaign.id, 'stopped');
      onStatusChange(campaign.id, 'stopped');
    } catch (error) {
      console.error('Error stopping campaign:', error);
    }
    setIsStopping(false);
  };

  const totalRequests = campaign.total_requests || 0;
  const successfulRequests = campaign.successful_requests || 0;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:bg-slate-900/70 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold text-white">
            {campaign.name}
          </CardTitle>
          {campaign.status === 'running' && (
            <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs rounded-full animate-pulse">Live</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-400 hover:bg-red-900/20 hover:text-red-500"
            title="Delete Campaign"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Campaign URL */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <p className="text-white truncate">{campaign.target_url}</p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{totalRequests.toLocaleString()}</p>
              <p className="text-sm text-slate-400">Requests</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{successRate.toFixed(1)}%</p>
              <p className="text-sm text-slate-400">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{successfulRequests.toLocaleString()}</p>
              <p className="text-sm text-slate-400">Successful</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link to={`/campaign/${campaign.id}`}>
              <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </Link>
            
            {campaign.status === 'draft' && (
              <Button 
                size="sm" 
                onClick={handleStartCampaign}
                disabled={isStarting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isStarting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start
              </Button>
            )}
            
            {campaign.status === 'running' && (
              <Button 
                size="sm" 
                onClick={handleStopCampaign}
                disabled={isStopping}
                variant="destructive"
              >
                {isStopping ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                Stop
              </Button>
            )}
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
  const pollingIntervalRef = useRef(null);

  // Main data loader
  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    try {
      const campaignsData = await backendClient.sessions.list();
      setCampaigns(campaignsData);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    if (!isRefresh) setIsLoading(false);
    setLastRefreshed(new Date());
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling for running campaigns
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    const hasRunningCampaigns = campaigns.some(c => c.status === 'running');
    if (hasRunningCampaigns) {
      pollingIntervalRef.current = setInterval(() => {
        loadData(true);
      }, 3000); // Poll every 3 seconds
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [campaigns, loadData]);

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await backendClient.traffic.updateCampaignStatus(campaignId, newStatus);
      await loadData();
    } catch (error) {
      console.error("Failed to update campaign status:", error);
    }
  };

  const handleDelete = async () => {
    if (!campaignToDelete) return;
    try {
      await backendClient.sessions.delete(campaignToDelete.id);
      await loadData();
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
    setShowDeleteConfirm(false);
    setCampaignToDelete(null);
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
            <h1 className="text-4xl font-bold text-white mb-2">Campaigns</h1>
            <p className="text-slate-400 text-lg">Manage your traffic campaigns</p>
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
                : "Get started by creating your first campaign"}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCampaigns.map((campaign, index) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <CampaignCard
                    campaign={campaign}
                    onDelete={() => confirmDelete(campaign)}
                    onStatusChange={handleStatusChange}
                  />
                </motion.div>
              ))}
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
