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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
        setTrafficData(trafficResponse.data || []);
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

    trafficData.forEach(entry => {
      // Extract ADIDs
      const rtbData = entry.rtb_data || {};
      const user = rtbData.user || {};
      if (user.id) uniqueAdids.add(user.id);

      // Extract banners/ad formats
      const imp = rtbData.imp || [];
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

      // Extract devices
      const device = rtbData.device || {};
      if (device.model) uniqueDevices.add(device.model);
      if (device.make) uniqueDevices.add(device.make);
    });

    return {
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
            <TabsList className="grid w-full grid-cols-5 bg-slate-800">
              <TabsTrigger value="profiles" className="data-[state=active]:bg-slate-700">
                <Users className="w-4 h-4 mr-2" />
                Profiles
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