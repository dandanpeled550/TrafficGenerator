
import React, { useState, useEffect } from "react";
import { TrafficSession } from "@/api/entities";
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
  Activity
} from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Analytics() {
  const [sessions, setSessions] = useState([]);
  const [timeRange, setTimeRange] = useState("7d");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    const data = await TrafficSession.list("-created_date");
    // Filter sessions to only include 'RTB' traffic type
    const rtbSessions = data.filter(session => session.traffic_type === 'RTB');
    setSessions(rtbSessions);
    setIsLoading(false);
  };

  // generateChartData function is removed as the PieChart for traffic distribution is no longer used.

  const generatePerformanceData = () => {
    return sessions.slice(0, 7).map((session, index) => ({
      name: session.name.substring(0, 10) + '...',
      requests: session.total_requests || 0,
      success: session.successful_requests || 0,
      rate: session.requests_per_minute || 0
    }));
  };

  const generateTimelineData = () => {
    const timeline = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayRequests = sessions
        .filter(s => new Date(s.created_date).toDateString() === date.toDateString())
        .reduce((sum, s) => sum + (s.total_requests || 0), 0);
      
      timeline.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        requests: dayRequests
      });
    }
    return timeline;
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
            <Button variant="outline" className="border-slate-700 hover:bg-slate-800">
              <Download className="w-4 h-4 mr-2" />
              Export
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

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-1 gap-6 mb-8">
          {/* Timeline Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl font-bold text-white">Daily Traffic Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={generateTimelineData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="requests" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-xl font-bold text-white">Session Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={generatePerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <Bar dataKey="requests" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="success" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span className="text-sm text-slate-300">Total Requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span className="text-sm text-slate-300">Successful Requests</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
