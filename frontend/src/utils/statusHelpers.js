export const getStatusColor = (status) => {
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
