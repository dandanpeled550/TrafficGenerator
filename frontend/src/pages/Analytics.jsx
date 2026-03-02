import React, { useState, useEffect } from "react";
import backendClient from "@/api/backendClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Download,
  Globe,
  Clock,
  Target,
  Activity,
  Loader2
} from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Return the cutoff Date for the selected time range
function getCutoffDate(timeRange) {
  const now = new Date();
  const days = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 }[timeRange] ?? 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export default function Analytics() {
  const [allSessions, setAllSessions] = useState([]);
  const [timeRange, setTimeRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await backendClient.sessions.list();
      setAllSessions(data);
    } catch (error) {
      console.error("Failed to load sessions for analytics:", error);
      setAllSessions([]);
    }
    setIsLoading(false);
  };

  // Filter sessions to only those created within the selected time range
  const sessions = allSessions.filter(s => {
    if (!s.created_at) return false;
    return new Date(s.created_at) >= getCutoffDate(timeRange);
  });

  const generatePerformanceData = () => {
    return sessions.slice(0, 7).map((session) => ({
      name: session.name ? session.name.substring(0, 10) + '...' : 'N/A',
      requests: session.total_requests || 0,
      success: session.successful_requests || 0,
      rate: session.requests_per_minute || 0
    }));
  };

  const generateTimelineData = () => {
    const days = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 }[timeRange] ?? 7;
    const buckets = Math.min(days, 30); // cap at 30 data points for readability
    const timeline = [];
    const now = new Date();
    const bucketMs = (days * 24 * 60 * 60 * 1000) / buckets;

    for (let i = buckets - 1; i >= 0; i--) {
      const bucketEnd = new Date(now.getTime() - i * bucketMs);
      const bucketStart = new Date(bucketEnd.getTime() - bucketMs);
      const bucketRequests = allSessions
        .filter(s => {
          if (!s.created_at) return false;
          const d = new Date(s.created_at);
          return d >= bucketStart && d < bucketEnd;
        })
        .reduce((sum, s) => sum + (s.total_requests || 0), 0);

      timeline.push({
        date: bucketEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        requests: bucketRequests
      });
    }
    return timeline;
  };

  const handleExport = () => {
    if (sessions.length === 0) return;
    const headers = ['Name', 'Status', 'Created At', 'Target URL', 'Total Requests', 'Successful Requests', 'Success Rate (%)', 'Requests/min', 'Duration (min)'];
    const rows = sessions.map(s => [
      s.name ?? '',
      s.status ?? '',
      s.created_at ?? '',
      s.target_url ?? '',
      s.total_requests ?? 0,
      s.successful_requests ?? 0,
      s.total_requests > 0 ? ((s.successful_requests / s.total_requests) * 100).toFixed(1) : '0.0',
      s.requests_per_minute ?? 0,
      s.duration_minutes ?? 0,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${timeRange}-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalRequests = sessions.reduce((sum, s) => sum + (s.total_requests || 0), 0);
  const avgSuccessRate = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + ((s.successful_requests || 0) / (s.total_requests || 1) * 100), 0) / sessions.length
    : 0;

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
            <h1 className="text-4xl font-bold text-white mb-2">RTB Traffic Analytics</h1>
            <p className="text-slate-400 text-lg">Analyze performance and insights from your RTB campaigns</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="1d">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="border-slate-700 hover:bg-slate-800"
              onClick={handleExport}
              disabled={sessions.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Total Sessions</p>
                    <p className="text-3xl font-bold text-white mt-2">{sessions.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Total Requests</p>
                    <p className="text-3xl font-bold text-white mt-2">{totalRequests.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Success Rate</p>
                    <p className="text-3xl font-bold text-white mt-2">{avgSuccessRate.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Avg Duration</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {sessions.length > 0 
                        ? (sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / sessions.length).toFixed(0)
                        : 0}m
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-white text-xl">Requests Over Time</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-16">
                    <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white">No Data Available</h3>
                    <p className="text-slate-400 mt-2">Start a campaign to see your analytics here.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={generateTimelineData()} margin={{
                      top: 5, right: 30, left: 20, bottom: 5,
                    }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-white text-xl">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-16">
                    <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white">No Data Available</h3>
                    <p className="text-slate-400 mt-2">Start a campaign to see its performance here.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={generatePerformanceData()} margin={{
                      top: 5, right: 30, left: 20, bottom: 5,
                    }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Bar dataKey="requests" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
