import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue,
  gradientFrom,
  gradientTo,
  delay = 0 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm overflow-hidden relative group hover:border-slate-700 transition-all duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
        <CardContent className="p-6 relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">{title}</p>
              <p className="text-3xl font-bold text-white mt-2">{value}</p>
              {trend && (
                <div className="flex items-center mt-3 text-sm">
                  <span className={`font-semibold ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                    {trend === 'up' ? '+' : '-'}{trendValue}
                  </span>
                  <span className="text-slate-400 ml-1">vs last hour</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}