import React, { useState, useEffect } from "react";
import backendClient from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, 
  Zap, 
  Globe, 
  Activity, 
  TrendingUp,
  Clock,
  CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";

import StatsCard from "../components/dashboard/StatsCard";
import ActiveSessions from "../components/dashboard/ActiveSessions";
import RealTimeChart from "../components/dashboard/RealTimeChart";

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadSessions();
    generateMockChartData();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await backendClient.sessions.list();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      setSessions([]);
    }
    setIsLoading(false);
  };

  const generateMockChartData = () => {
    const data = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        requests: Math.floor(Math.random() * 50) + 10
      });
    }
    setChartData(data);
  };

  const handleSessionAction = async (sessionId, action) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    let newStatus = session.status;
    switch (action) {
      case 'start':
        newStatus = 'running';
        break;
      case 'pause':
        newStatus = 'paused';
        break;
      case 'stop':
        newStatus = 'stopped';
        break;
    }

    try {
      await backendClient.sessions.update(sessionId, { 
        status: newStatus,
        ...(action === 'start' && { start_time: new Date().toISOString() }),
        ...(action === 'stop' && { end_time: new Date().toISOString() })
      });
      loadSessions();
    } catch (error) {
      console.error(`Failed to ${action} session:`, error);
    }
  };

  const activeSessions = sessions.filter(s => ['running', 'paused'].includes(s.status));
  const totalRequests = sessions.reduce((sum, s) => sum + (s.total_requests || 0), 0);
  const runningCount = sessions.filter(s => s.status === 'running').length;

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
            <h1 className="text-4xl font-bold text-white mb-2">Traffic Dashboard</h1>
            <p className="text-slate-400 text-lg">Monitor and control your web traffic generation campaigns</p>
          </div>
          <Link to={createPageUrl("Generator")}>
            <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
              <Plus className="w-5 h-5 mr-2" />
              New Campaign
            </Button>
          </Link>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Active Sessions"
            value={runningCount}
            icon={Activity}
            trend="up"
            trendValue="2"
            gradientFrom="from-green-500"
            gradientTo="to-emerald-500"
            delay={0}
          />
          <StatsCard
            title="Total Requests"
            value={totalRequests.toLocaleString()}
            icon={Globe}
            trend="up"
            trendValue="1.2k"
            gradientFrom="from-blue-500"
            gradientTo="to-cyan-500"
            delay={0.1}
          />
          <StatsCard
            title="Success Rate"
            value="98.5%"
            icon={CheckCircle}
            trend="up"
            trendValue="0.3%"
            gradientFrom="from-purple-500"
            gradientTo="to-pink-500"
            delay={0.2}
          />
          <StatsCard
            title="Avg Response"
            value="245ms"
            icon={Clock}
            trend="down"
            trendValue="12ms"
            gradientFrom="from-orange-500"
            gradientTo="to-red-500"
            delay={0.3}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Real-time Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <RealTimeChart data={chartData} />
          </motion.div>

          {/* Active Sessions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <ActiveSessions 
              sessions={activeSessions} 
              onSessionAction={handleSessionAction}
            />
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to={createPageUrl("Generator")}>
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-300 cursor-pointer group">
                  <Zap className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-semibold text-white mb-1">Create New Session</h3>
                  <p className="text-sm text-slate-400">Set up a new traffic generation campaign</p>
                </div>
              </Link>
              <Link to={createPageUrl("Analytics")}>
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-300 cursor-pointer group">
                  <TrendingUp className="w-8 h-8 text-green-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-semibold text-white mb-1">View Analytics</h3>
                  <p className="text-sm text-slate-400">Analyze your traffic patterns and performance</p>
                </div>
              </Link>
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-300 cursor-pointer group">
                <Globe className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold text-white mb-1">Global Settings</h3>
                <p className="text-sm text-slate-400">Configure default traffic parameters</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}