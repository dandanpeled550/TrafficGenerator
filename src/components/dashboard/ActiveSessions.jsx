
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Play, Pause, Square, MoreVertical, Globe, TrendingUp, InfinityIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ActiveSessions({ sessions, onSessionAction }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getTrafficTypeIcon = (type) => {
    switch (type) {
      case 'rtb':
        return '📱'; // Mobile phone emoji for RTB (Real-Time Bidding, often mobile)
      case 'social':
        return '📢'; // Megaphone for social traffic
      case 'paid':
        return '💰'; // Money bag for paid traffic
      case 'organic':
        return '🔍'; // Magnifying glass for organic search
      default:
        return '🌐'; // Globe for general/unknown traffic
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Active Sessions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sessions.length === 0 ? (
          <div className="p-8 text-center">
            <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No active sessions</p>
            <p className="text-sm text-slate-500 mt-1">Create a new traffic session to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 hover:bg-slate-800/30 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{getTrafficTypeIcon(session.traffic_type)}</span>
                      <h3 className="font-semibold text-white truncate">{session.name}</h3>
                      <Badge className={`border ${getStatusColor(session.status)}`}>
                        {session.status}
                      </Badge>
                      {session.traffic_type === 'rtb' && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                          RTB
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 truncate mb-2">{session.target_url}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{session.requests_per_minute} bid req/min</span>
                      <span>
                        {session.duration_minutes === null 
                            ? <span className="flex items-center gap-1"><InfinityIcon className="w-3 h-3"/> Continuous</span>
                            : `${session.duration_minutes} min duration`}
                      </span>
                      <span className="text-green-400">{(session.total_requests || 0).toLocaleString()} reqs</span>
                      {session.traffic_type === 'rtb' && session.rtb_config?.device_brand && (
                        <span className="text-cyan-400 capitalize">{session.rtb_config.device_brand}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {session.status === 'running' ? (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onSessionAction(session.id, 'pause')}
                        className="border-slate-700 hover:bg-slate-800"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onSessionAction(session.id, 'start')}
                        className="border-slate-700 hover:bg-slate-800"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="border-slate-700 hover:bg-slate-800">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-slate-900 border-slate-700">
                        <DropdownMenuItem onClick={() => onSessionAction(session.id, 'stop')}>
                          <Square className="w-4 h-4 mr-2" />
                          Stop Session
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
