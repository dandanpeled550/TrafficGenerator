import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Trash2, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

export default function EdgeCaseManagerCard({ edgeCases, onUpdate, onSuggest, isSuggesting }) {
  
  const handleUpdate = (index, field, value) => {
    const updatedEdgeCases = [...edgeCases];
    updatedEdgeCases[index] = { ...updatedEdgeCases[index], [field]: value };
    onUpdate(updatedEdgeCases);
  };

  const handleRemove = (index) => {
    const updatedEdgeCases = edgeCases.filter((_, i) => i !== index);
    onUpdate(updatedEdgeCases);
  };

  const totalPercentage = edgeCases.reduce((sum, ec) => ec.is_enabled ? sum + (ec.traffic_percentage || 0) : sum, 0);

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            AI Edge Case Manager
          </CardTitle>
          <p className="text-sm text-slate-400">Inject targeted edge cases into your main campaign traffic.</p>
        </div>
        {totalPercentage > 0 && (
          <Badge className={`text-base ${totalPercentage > 100 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
            {totalPercentage}% of traffic allocated
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {edgeCases.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No edge cases defined. Let AI suggest some for you!</p>
            <Button type="button" onClick={onSuggest} disabled={isSuggesting}>
              <BrainCircuit className="w-4 h-4 mr-2" />
              {isSuggesting ? 'Thinking...' : 'Suggest Edge Cases'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {edgeCases.map((edgeCase, index) => (
                <motion.div
                  key={edgeCase.id || index}
                  layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -300 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`p-4 rounded-lg border transition-all ${edgeCase.is_enabled ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-800/20 border-slate-800 opacity-60'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{edgeCase.name}</p>
                      <p className="text-sm text-slate-400">{edgeCase.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                       <Switch
                        checked={edgeCase.is_enabled}
                        onCheckedChange={(checked) => handleUpdate(index, 'is_enabled', checked)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(index)}>
                        <Trash2 className="w-4 h-4 text-red-500/70 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {edgeCase.is_enabled && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4"
                    >
                      <Label className="text-slate-400">Traffic Percentage</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={edgeCase.traffic_percentage}
                          onChange={(e) => handleUpdate(index, 'traffic_percentage', parseInt(e.target.value) || 0)}
                          className="w-24 bg-slate-700/50 border-slate-600"
                        />
                         <span className="text-slate-400">%</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
             {totalPercentage > 100 && (
                <p className="text-sm text-red-400 text-center mt-4">Warning: Total traffic percentage for enabled edge cases exceeds 100%.</p>
            )}
            <div className="flex justify-center mt-6">
                <Button type="button" variant="outline" onClick={onSuggest} disabled={isSuggesting}>
                    <BrainCircuit className="w-4 h-4 mr-2" />
                    {isSuggesting ? 'Thinking...' : 'Suggest More Edge Cases'}
                </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}