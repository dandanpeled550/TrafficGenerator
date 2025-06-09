import React, { useState, useEffect, useCallback } from "react";
import { TrafficLogEntry } from "@/api/entities";
import { TrafficSession } from "@/api/entities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { FileText, Filter, CheckCircle, XCircle, Loader2, Server } from "lucide-react";

const LOGS_PER_PAGE = 50;

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    // Fetch campaigns for the filter dropdown
    TrafficSession.list("-created_date").then(setCampaigns);
  }, []);

  const fetchLogs = useCallback(async (campaignId, pageNum) => {
    if (pageNum === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    let newLogs = [];
    const offset = (pageNum - 1) * LOGS_PER_PAGE;

    try {
      if (campaignId === "all") {
        newLogs = await TrafficLogEntry.list("-created_date", LOGS_PER_PAGE, offset);
      } else {
        newLogs = await TrafficLogEntry.filter({ campaign_id: campaignId }, "-created_date", LOGS_PER_PAGE, offset);
      }

      setHasMore(newLogs.length === LOGS_PER_PAGE);

      if (pageNum === 1) {
        setLogs(newLogs);
      } else {
        setLogs(prevLogs => [...prevLogs, ...newLogs]);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setLogs([]);
    setHasMore(true);
    fetchLogs(selectedCampaign, 1);
  }, [selectedCampaign, fetchLogs]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(selectedCampaign, nextPage);
  };
  
  const getStatusBadge = (success) => {
    return success ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText /> Log Explorer
            </h1>
            <p className="text-slate-400 text-lg">View and filter real-time traffic request logs from the database.</p>
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white w-64">
                <SelectValue placeholder="Filter by campaign..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Request Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-300">Timestamp</TableHead>
                    <TableHead className="text-slate-300">Campaign</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Device</TableHead>
                    <TableHead className="text-slate-300">Geo</TableHead>
                    <TableHead className="text-slate-300">Ad Format</TableHead>
                    <TableHead className="text-slate-300 text-right">Response (ms)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && logs.length > 0 && logs.map(log => (
                    <TableRow key={log.id} className="border-slate-800">
                      <TableCell className="font-mono text-xs text-slate-400">
                        {format(new Date(log.timestamp), "MMM d, HH:mm:ss.SSS")}
                      </TableCell>
                      <TableCell className="text-slate-200">{log.campaign_name}</TableCell>
                      <TableCell>{getStatusBadge(log.success)}</TableCell>
                      <TableCell className="text-slate-300">{log.device_model}</TableCell>
                      <TableCell className="text-slate-300">{log.geo_location}</TableCell>
                      <TableCell className="text-slate-300">{log.ad_format}</TableCell>
                      <TableCell className="text-right text-slate-300">{log.response_time_ms}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            )}
            
            {!isLoading && logs.length === 0 && (
              <div className="text-center py-16">
                 <Server className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-xl font-semibold text-white">No Logs Found</h3>
                 <p className="text-slate-400 mt-2">
                   {selectedCampaign === "all" 
                    ? "Start a campaign to generate logs."
                    : "No logs found for the selected campaign."}
                 </p>
              </div>
            )}

            {hasMore && !isLoading && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="border-slate-700 hover:bg-slate-800"
                >
                  {isLoadingMore ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}