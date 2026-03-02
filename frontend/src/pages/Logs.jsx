import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { FileText, Clock } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText /> Log Explorer
          </h1>
          <p className="text-slate-400 text-lg">
            View and filter real-time traffic request logs.
          </p>
        </motion.div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardContent>
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Clock className="w-16 h-16 text-slate-600" />
              <h3 className="text-xl font-semibold text-white">Coming Soon</h3>
              <p className="text-slate-400 text-center max-w-md">
                The Log Explorer is under development. Once the database layer is in
                place, you&apos;ll be able to search, filter, and paginate through every
                request generated across all campaigns.
              </p>
              <p className="text-slate-500 text-sm text-center">
                In the meantime, view per-campaign traffic data from the{" "}
                <span className="text-blue-400">Campaigns</span> page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}