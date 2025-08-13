import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import backendClient from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Globe,
  Users,
  MapPin,
  Smartphone,
  BarChart3,
  Download,
  Play,
  Square,
  Trash2,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Zap,
  Database,
  FileText,
  Settings,
  Eye,
  TrendingUp,
  Globe2,
  Smartphone as DeviceIcon,
  Tag,
  Hash,
  Link as LinkIcon,
  List,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// RequestCard component for displaying individual requests
const RequestCard = ({ request }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getStatusIcon = (success) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-400" />
    );
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader 
        className="cursor-pointer hover:bg-slate-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(request.success)}
            <div>
              <CardTitle className="text-white text-sm">
                Request {request.request_key || request.id}
              </CardTitle>
              <p className="text-slate-400 text-xs">
                {formatTimestamp(request.timestamp)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-slate-600">
              {request.success ? 'Success' : 'Failed'}
            </Badge>
            {request.response_time && (
              <Badge variant="outline" className="text-xs border-slate-600">
                {request.response_time}ms
              </Badge>
            )}
            <ChevronDown 
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Basic Info */}
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Basic Information</h4>
              <div className="space-y-1 text-slate-300">
                <p><span className="text-slate-400">Campaign ID:</span> {request.campaign_id}</p>
                <p><span className="text-slate-400">Target URL:</span> {request.target_url}</p>
                <p><span className="text-slate-400">Status Code:</span> {request.status_code || 'N/A'}</p>
                <p><span className="text-slate-400">Response Size:</span> {request.response_size || 'N/A'} bytes</p>
              </div>
            </div>

            {/* RTB Information */}
            <div className="space-y-2">
              <h4 className="font-semibold text-white">RTB Information</h4>
              <div className="space-y-1 text-slate-300">
                <p><span className="text-slate-400">RTB ID:</span> {request.rtb_id || 'N/A'}</p>
                <p><span className="text-slate-400">User ID:</span> {request.rtb_user?.id || request.rtb_data?.user?.id || 'N/A'}</p>
                <p><span className="text-slate-400">Device:</span> {request.rtb_device?.model || request.rtb_data?.device?.model || 'N/A'}</p>
                <p><span className="text-slate-400">Geo:</span> {request.geo_locations?.join(', ') || 'N/A'}</p>
              </div>
            </div>

            {/* Detailed RTB Data */}
            {request.rtb_data && (
              <div className="md:col-span-2">
                <h4 className="font-semibold text-white mb-2">Detailed RTB Data</h4>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <pre className="text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(request.rtb_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [trafficData, setTrafficData] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stats, setStats] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadCampaignData();
  }, [campaignId]);

  const loadCampaignData = async () => {
    setIsLoading(true);
    try {
      // Load campaign data
      const campaigns = await backendClient.sessions.list();
      const campaignData = campaigns.find(c => c.id === campaignId);
      if (!campaignData) {
        navigate(createPageUrl("Campaigns"));
        return;
      }
      setCampaign(campaignData);

      // Load traffic data
      try {
        const trafficResponse = await backendClient.traffic.getGenerated(campaignId);
        // Handle new structure where each request is already a separate entity
        if (trafficResponse.success) {
          // Extract requests from the response (excluding metadata and success fields)
          const requests = Object.entries(trafficResponse)
            .filter(([key, value]) => 
              key !== 'success' && 
              key !== 'metadata' && 
              typeof value === 'object' && 
              value !== null
            )
            .map(([key, value]) => ({
              ...value,
              request_key: key // Keep track of the original key
            }));
          setTrafficData(requests);
        } else {
          setTrafficData([]);
        }
      } catch (error) {
        console.error("Failed to load traffic data:", error);
        setTrafficData([]);
      }

      // Load profiles
      try {
        const allProfiles = await backendClient.profiles.list();
        const campaignProfiles = allProfiles.filter(profile => 
          campaignData.user_profile_ids?.includes(profile.id)
        );
        setProfiles(campaignProfiles);
      } catch (error) {
        console.error("Failed to load profiles:", error);
        setProfiles([]);
      }

      // Load detailed stats
      try {
        const statsResponse = await backendClient.traffic.getStats(campaignId);
        setStats(statsResponse.data || {});
      } catch (error) {
        console.error("Failed to load stats:", error);
        setStats({});
      }

    } catch (error) {
      console.error("Failed to load campaign data:", error);
      navigate(createPageUrl("Campaigns"));
    }
    setIsLoading(false);
  };

  const handleStartCampaign = async () => {
    setIsStarting(true);
    try {
      await backendClient.traffic.updateCampaignStatus(campaignId, 'running');
      await loadCampaignData();
    } catch (error) {
      console.error('Error starting campaign:', error);
    }
    setIsStarting(false);
  };

  const handleStopCampaign = async () => {
    setIsStopping(true);
    try {
      await backendClient.traffic.stop(campaignId);
      await backendClient.traffic.updateCampaignStatus(campaignId, 'stopped');
      await loadCampaignData();
    } catch (error) {
      console.error('Error stopping campaign:', error);
    }
    setIsStopping(false);
  };

  const handleDelete = async () => {
    try {
      await backendClient.sessions.delete(campaignId);
      navigate(createPageUrl("Campaigns"));
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    }
    setShowDeleteConfirm(false);
  };

  const handleDownloadTraffic = async () => {
    setIsDownloading(true);
    try {
      const response = await backendClient.traffic.downloadTraffic(campaignId);
      if (response && response.data) {
        const filename = response.filename || `traffic_${campaignId}.json`;
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download traffic data:', error);
      // Optionally show a toast or alert here
    }
    setIsDownloading(false);
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

  const extractUniqueData = () => {
    const uniqueAdids = new Set();
    const uniqueBanners = new Set();
    const uniqueUrls = new Set();
    const uniqueGeo = new Set();
    const uniqueDevices = new Set();
    const uniqueRtbIds = new Set();

    trafficData.forEach(entry => {
      // Extract RTB IDs from new structure
      if (entry.rtb_id) uniqueRtbIds.add(entry.rtb_id);
      
      // Extract ADIDs - try new structure first, fall back to old
      let userId = null;
      if (entry.rtb_user && entry.rtb_user.id) {
        userId = entry.rtb_user.id;
      } else {
        // Fall back to old structure
        const rtbData = entry.rtb_data || {};
        const user = rtbData.user || {};
        userId = user.id;
      }
      if (userId) uniqueAdids.add(userId);

      // Extract banners/ad formats - try new structure first, fall back to old
      let imp = entry.rtb_imp || [];
      if (!imp.length) {
        // Fall back to old structure
        const rtbData = entry.rtb_data || {};
        imp = rtbData.imp || [];
      }
      imp.forEach(impression => {
        const banner = impression.banner || {};
        if (banner.format) uniqueBanners.add(banner.format);
        if (banner.w) uniqueBanners.add(`${banner.w}x${banner.h}`);
      });

      // Extract URLs
      if (entry.target_url) uniqueUrls.add(entry.target_url);

      // Extract geo locations
      const geo = entry.geo_locations || [];
      geo.forEach(location => uniqueGeo.add(location));

      // Extract devices - try new structure first, fall back to old
      let device = entry.rtb_device || {};
      if (!device.model && !device.make) {
        // Fall back to old structure
        const rtbData = entry.rtb_data || {};
        device = rtbData.device || {};
      }
      if (device.model) uniqueDevices.add(device.model);
      if (device.make) uniqueDevices.add(device.make);
    });

    return {
      uniqueRtbIds: Array.from(uniqueRtbIds),
      uniqueAdids: Array.from(uniqueAdids),
      uniqueBanners: Array.from(uniqueBanners),
      uniqueUrls: Array.from(uniqueUrls),
      uniqueGeo: Array.from(uniqueGeo),
      uniqueDevices: Array.from(uniqueDevices),
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-white mb-2">Campaign not found</h2>
            <Link to={createPageUrl("Campaigns")}>
              <Button>Back to Campaigns</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const uniqueData = extractUniqueData();
  const totalRequests = campaign.total_requests || 0;
  const successfulRequests = campaign.successful_requests || 0;
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Campaigns")}>
              <Button variant="outline" size="icon" className="border-slate-700 hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{campaign.name}</h1>
              <div className="flex items-center gap-4">
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
                {campaign.status === 'running' && (
                  <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-xs rounded-full animate-pulse">Live</span>
                )}
                <span className="text-slate-400 text-sm">
                  Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={loadCampaignData}
              className="border-slate-700 hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownloadTraffic}
              disabled={isDownloading}
              className="border-blue-700 text-blue-400 hover:bg-blue-900/20"
              title="Download Traffic Data"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
            
            {campaign.status === 'draft' && (
              <Button 
                onClick={handleStartCampaign}
                disabled={isStarting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isStarting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start Campaign
              </Button>
            )}
            
            {campaign.status === 'running' && (
              <Button 
                onClick={handleStopCampaign}
                disabled={isStopping}
                variant="destructive"
              >
                {isStopping ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                Stop Campaign
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="border-red-700 text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </motion.div>

        {/* Key Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <span className="text-slate-400 text-sm">Total Requests</span>
              </div>
              <p className="text-3xl font-bold text-white">{totalRequests.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-slate-400 text-sm">Success Rate</span>
              </div>
              <p className="text-3xl font-bold text-white">{successRate.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-5 h-5 text-purple-400" />
                <span className="text-slate-400 text-sm">Unique RTB IDs</span>
              </div>
              <p className="text-3xl font-bold text-white">{uniqueData.uniqueRtbIds.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="text-slate-400 text-sm">Unique ADIDs</span>
              </div>
              <p className="text-3xl font-bold text-white">{uniqueData.uniqueAdids.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-orange-400" />
                <span className="text-slate-400 text-sm">Geo Locations</span>
              </div>
              <p className="text-3xl font-bold text-white">{uniqueData.uniqueGeo.length}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Campaign URL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Target URL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white font-mono text-sm break-all">{campaign.target_url}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detailed Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="profiles" className="w-full">
            <TabsList className="grid w-full grid-cols-8 bg-slate-800">
              <TabsTrigger value="profiles" className="data-[state=active]:bg-slate-700">
                <Users className="w-4 h-4 mr-2" />
                Profiles
              </TabsTrigger>
              <TabsTrigger value="rtbids" className="data-[state=active]:bg-slate-700">
                <Hash className="w-4 h-4 mr-2" />
                RTB IDs
              </TabsTrigger>
              <TabsTrigger value="adids" className="data-[state=active]:bg-slate-700">
                <Hash className="w-4 h-4 mr-2" />
                ADIDs
              </TabsTrigger>
              <TabsTrigger value="banners" className="data-[state=active]:bg-slate-700">
                <Tag className="w-4 h-4 mr-2" />
                Banners
              </TabsTrigger>
              <TabsTrigger value="geo" className="data-[state=active]:bg-slate-700">
                <MapPin className="w-4 h-4 mr-2" />
                Geo
              </TabsTrigger>
              <TabsTrigger value="devices" className="data-[state=active]:bg-slate-700">
                <DeviceIcon className="w-4 h-4 mr-2" />
                Devices
              </TabsTrigger>
              <TabsTrigger value="requests" className="data-[state=active]:bg-slate-700">
                <List className="w-4 h-4 mr-2" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="referrers" className="data-[state=active]:bg-slate-700">
                <LinkIcon className="w-4 h-4 mr-2" />
                Referrers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">User Profiles ({profiles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {profiles.length === 0 ? (
                    <p className="text-slate-400">No profiles assigned to this campaign</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {profiles.map(profile => (
                        <Card key={profile.id} className="bg-slate-800/50 border-slate-700">
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-white mb-2">{profile.name}</h3>
                            <p className="text-slate-400 text-sm mb-2">{profile.description}</p>
                            <div className="space-y-1 text-xs text-slate-500">
                              <p>Device: {profile.device_preferences?.device_brand || 'N/A'}</p>
                              <p>OS: {profile.device_preferences?.operating_system || 'N/A'}</p>
                              <p>Age: {profile.demographics?.age_group || 'N/A'}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rtbids" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">RTB IDs ({uniqueData.uniqueRtbIds.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {uniqueData.uniqueRtbIds.length === 0 ? (
                    <p className="text-slate-400">No RTB IDs found in traffic data</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {uniqueData.uniqueRtbIds.map((rtbId, index) => (
                        <div key={index} className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-white font-mono text-sm break-all">{rtbId}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adids" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Unique ADIDs ({uniqueData.uniqueAdids.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {uniqueData.uniqueAdids.length === 0 ? (
                    <p className="text-slate-400">No ADIDs found in traffic data</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {uniqueData.uniqueAdids.map((adid, index) => (
                        <div key={index} className="bg-slate-800/50 p-3 rounded-lg">
                          <p className="text-white font-mono text-sm break-all">{adid}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banners" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Banner Formats ({uniqueData.uniqueBanners.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {uniqueData.uniqueBanners.length === 0 ? (
                    <p className="text-slate-400">No banner formats found in traffic data</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {uniqueData.uniqueBanners.map((banner, index) => (
                        <Badge key={index} variant="outline" className="border-slate-700 text-white">
                          {banner}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="geo" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Geo Locations ({uniqueData.uniqueGeo.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {uniqueData.uniqueGeo.length === 0 ? (
                    <p className="text-slate-400">No geo locations found in traffic data</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {uniqueData.uniqueGeo.map((geo, index) => (
                        <Badge key={index} variant="outline" className="border-slate-700 text-white">
                          <MapPin className="w-3 h-3 mr-1" />
                          {geo}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="devices" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Device Models ({uniqueData.uniqueDevices.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {uniqueData.uniqueDevices.length === 0 ? (
                    <p className="text-slate-400">No device models found in traffic data</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {uniqueData.uniqueDevices.map((device, index) => (
                        <Badge key={index} variant="outline" className="border-slate-700 text-white">
                          <DeviceIcon className="w-3 h-3 mr-1" />
                          {device}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Individual Requests ({trafficData.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {trafficData.length === 0 ? (
                    <p className="text-slate-400">No traffic requests found for this campaign</p>
                  ) : (
                    <div className="space-y-4">
                      {trafficData.map((request, index) => (
                        <RequestCard key={request.request_key || request.id || index} request={request} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referrers" className="mt-6">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Campaign Referrers</CardTitle>
                </CardHeader>
                <CardContent>
                  {!campaign.campaign_referrers || Object.keys(campaign.campaign_referrers).length === 0 ? (
                    <p className="text-slate-400">No campaign-specific referrers generated yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(campaign.campaign_referrers).map(([key, referrers]) => {
                        const [interest, country] = key.split('|');
                        return (
                          <div key={key} className="bg-slate-800/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline" className="border-blue-700 text-blue-400">
                                {interest}
                              </Badge>
                              <Badge variant="outline" className="border-green-700 text-green-400">
                                {country}
                              </Badge>
                              <span className="text-slate-400 text-sm">
                                ({referrers.length} referrers)
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {referrers.map((referrer, index) => (
                                <div key={index} className="bg-slate-700/50 p-2 rounded text-xs">
                                  <a 
                                    href={referrer} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 break-all"
                                  >
                                    {referrer}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete the campaign "{campaign.name}"? This action cannot be undone.
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