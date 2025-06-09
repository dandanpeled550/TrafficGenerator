import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Activity } from "lucide-react";

export default function RealTimeChart({ data }) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Real-Time Traffic
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="time" 
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
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#1e293b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}