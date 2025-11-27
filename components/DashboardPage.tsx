import React from 'react';
import { 
  Search, 
  Filter, 
  Database, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  AlertCircle,
  HardDrive,
  Activity,
  ArrowUpRight,
  Download,
  MoreHorizontal
} from 'lucide-react';

type Status = 'success' | 'processing' | 'pending' | 'error';

interface NotebookData {
  id: string;
  name: string;
  status: Status;
  documents: number;
  size: string;
  lastSync: string;
  created: string;
}

const mockData: NotebookData[] = [
  { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Financial Reports Q3', status: 'success', documents: 124, size: '45.2 MB', lastSync: '2 mins ago', created: 'Oct 24, 2023' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Engineering Docs', status: 'processing', documents: 850, size: '1.2 GB', lastSync: 'Syncing...', created: 'Sep 12, 2023' },
  { id: 'c496a123-4567-89ab-cdef-012345678901', name: 'Legal Contracts', status: 'pending', documents: 45, size: '12.5 MB', lastSync: '1 hour ago', created: 'Nov 01, 2023' },
  { id: 'd528a123-4567-89ab-cdef-012345678902', name: 'Customer Support Logs', status: 'error', documents: 0, size: '0 KB', lastSync: 'Failed', created: 'Yesterday' },
  { id: 'e639a123-4567-89ab-cdef-012345678903', name: 'Marketing Assets', status: 'success', documents: 210, size: '156 MB', lastSync: '3 days ago', created: 'Aug 15, 2023' },
  { id: 'f740b234-5678-90cd-ef12-345678901234', name: 'Product Specs', status: 'success', documents: 56, size: '24 MB', lastSync: '5 hours ago', created: 'Oct 30, 2023' },
  { id: '0851c345-6789-01de-f234-567890123456', name: 'HR Policies', status: 'success', documents: 12, size: '4.1 MB', lastSync: '1 week ago', created: 'Jan 10, 2023' },
  { id: '1962d456-7890-12ef-0345-678901234567', name: 'API Documentation', status: 'success', documents: 156, size: '18 MB', lastSync: '2 days ago', created: 'Feb 20, 2023' },
  { id: '2a73e567-8901-23f0-1456-789012345678', name: 'Sales Playbook', status: 'processing', documents: 89, size: '112 MB', lastSync: 'Syncing...', created: 'Mar 05, 2023' },
  { id: '3b84f678-9012-3401-2567-890123456789', name: 'Legacy Data Archive', status: 'success', documents: 1420, size: '2.4 GB', lastSync: '1 month ago', created: 'Jan 01, 2022' },
];

const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    error: 'text-red-400 bg-red-400/10 border-red-400/20',
  };
  
  const Icons = {
    success: CheckCircle2,
    processing: Loader2,
    pending: Clock,
    error: AlertCircle,
  };
  
  const Icon = Icons[status];
  
  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status]} transition-all duration-300`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {status}
    </div>
  );
};

interface DashboardPageProps {
  onOpenNotebook?: (id: string, name: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenNotebook }) => {
  return (
    <div className="p-8 md:p-12 max-w-[1600px] mx-auto h-full flex flex-col relative z-10">
      
      {/* Header */}
      <div className="flex items-end justify-between mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight mb-2">
            Dashboard
          </h1>
          <div className="flex items-center gap-3 text-text-subtle">
            <span className="text-sm font-medium">System Overview</span>
            <span className="w-1 h-1 rounded-full bg-white/20"></span>
            <span className="text-sm font-mono opacity-70">LIVE DATA STREAM</span>
          </div>
        </div>
        
        {/* System Status Pill */}
        <div className="hidden md:flex items-center gap-4 bg-surface border border-white/10 rounded-full px-5 py-2 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-white tracking-wide">SYSTEM OPERATIONAL</span>
            </div>
            <div className="w-px h-4 bg-white/10"></div>
            <span className="text-xs font-mono text-text-subtle">v2.4.0</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 bg-surface/50 backdrop-blur-xl border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        
        {/* Top Neon Accent */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-50"></div>

        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/[0.02]">
           {/* Search */}
           <div className="relative w-full sm:w-96 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-subtle/50 group-focus-within:text-primary transition-colors duration-300" />
              </div>
              <input 
                type="text" 
                placeholder="Search notebooks..." 
                className="block w-full pl-10 pr-4 py-2 border border-white/10 rounded-lg bg-surface-highlight text-white placeholder-text-subtle/40 focus:outline-none focus:border-primary/40 focus:bg-[#1A1A21] text-sm font-medium transition-all duration-200"
              />
           </div>

           {/* Actions */}
           <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-subtle hover:text-white bg-transparent border border-white/10 rounded-lg hover:bg-white/5 transition-all">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-subtle hover:text-white bg-transparent border border-white/10 rounded-lg hover:bg-white/5 transition-all">
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
           </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse relative z-10">
            <thead className="sticky top-0 z-20 bg-[#0F0F13] border-b border-white/5 shadow-sm">
              <tr>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest w-[300px]">Context Name</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest text-right">Usage</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest text-right">Size</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle/50 uppercase tracking-widest text-right">Last Sync</th>
                <th className="py-4 px-6 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {mockData.map((row) => (
                <tr 
                  key={row.id} 
                  className="group hover:bg-white/[0.02] transition-colors duration-200 relative cursor-pointer"
                  onClick={() => onOpenNotebook && onOpenNotebook(row.id, row.name)}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-surface-highlight border border-white/5 flex items-center justify-center text-text-subtle group-hover:text-primary group-hover:border-primary/30 transition-all duration-300 shadow-sm">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm group-hover:text-primary transition-colors">{row.name}</div>
                        <div className="font-mono text-[10px] text-text-subtle/50 mt-0.5 tracking-wide">{row.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white/90">{row.documents}</span>
                            <span className="text-[9px] text-text-subtle uppercase font-bold tracking-wider">Docs</span>
                        </div>
                        <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full ${row.documents > 500 ? 'bg-secondary shadow-[0_0_5px_#E03B8A]' : 'bg-primary shadow-[0_0_5px_#7EF9FF]'} opacity-80`} 
                                style={{ width: `${Math.min((row.documents / 1500) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-mono text-text-subtle group-hover:text-white transition-colors">{row.size}</span>
                        <HardDrive className="w-3 h-3 text-text-subtle/30" />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="inline-flex items-center gap-2 text-text-subtle/70">
                        <Activity className="w-3 h-3" />
                        <span className="text-xs font-medium">{row.lastSync}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex justify-end">
                        <button className="p-1.5 text-text-subtle/50 hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 transform translate-x-2 group-hover:translate-x-0">
                        <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer Pagination */}
        <div className="p-4 border-t border-white/5 bg-[#0F0F13] flex justify-between items-center">
           <div className="text-xs text-text-subtle">
                Showing <span className="font-bold text-white">1-10</span> of <span className="font-bold text-white">128</span>
           </div>
           <div className="flex gap-2">
             <button className="h-8 px-3 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 text-text-subtle hover:text-white text-xs font-medium transition-all disabled:opacity-50">
                Previous
             </button>
             <button className="h-8 px-3 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium hover:bg-white/10 transition-all">
                Next
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;