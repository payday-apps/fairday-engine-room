import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { 
  Check, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Database, 
  Globe,
  Gavel,
  Info,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Claim {
  id: string;
  status: string;
  confidence_score: number;
  source: string;
  source_url: string;
  missing_fields: string[];
  created_at: string;
  raw_data: Record<string, any>;
}

export default function DataEngine() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [totalPending, setTotalPending] = useState<number>(0);
  const [sources, setSources] = useState<any[]>([]);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'risk'>('all');

  useEffect(() => {
    fetchClaims();
    fetchSources();
    fetchEngineStatus();
    
    // Poll engine status every 10 seconds if running
    const interval = setInterval(() => {
      fetchEngineStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchEngineStatus = async () => {
    try {
      const res = await api.get('/engine/status');
      setEngineStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch engine status:', error);
    }
  };

  const handleTriggerEngine = async () => {
    if (!window.confirm("Are you sure you want to trigger a manual run of Engine 2? This will scrape all sources and consume AI tokens.")) return;
    
    try {
      setEngineStatus({ ...engineStatus, status: 'STARTING...' });
      await api.post('/engine/trigger');
      setTimeout(fetchEngineStatus, 2000);
    } catch (error) {
      console.error('Failed to trigger engine:', error);
      alert('Failed to trigger engine. See console for details.');
      fetchEngineStatus();
    }
  };

  const fetchSources = async () => {
    try {
      const res = await api.get('/sources');
      setSources(res.data);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
    }
  };

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await api.get('/review-queue?status=pending&limit=100');
      setClaims(res.data.items || []);
      setTotalPending(res.data.pagination?.total || (res.data.items || []).length);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = useMemo(() => {
    let list = [...claims];
    // Sort by created_at desc
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (filter === 'all') return list;
    if (filter === 'high') return list.filter(c => c.confidence_score >= 0.8);
    if (filter === 'risk') return list.filter(c => !c.raw_data.filing_deadline || Number(c.raw_data.avg_settlement) === 0);
    return list;
  }, [claims, filter]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClaims.length && filteredClaims.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClaims.map(c => c.id)));
    }
  };

  const batchApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      setProcessing(true);
      const res = await api.post('/batch/approve', { ids: Array.from(selectedIds) });
      const listRes = await api.get('/review-queue?status=pending&limit=100');
      setClaims(listRes.data.items || []);
      setTotalPending(listRes.data.pagination?.total || (listRes.data.items || []).length);
      setSelectedIds(new Set());
      
      const successCount = res.data.results?.filter((r: any) => r.success).length || 0;
      const failCount = res.data.results?.filter((r: any) => !r.success).length || 0;
      alert(`Batch approve complete: ${successCount} published successfully, ${failCount} failed.`);
    } catch (error) {
      alert('Batch approval failed');
    } finally {
      setProcessing(false);
    }
  };

  const approveClaim = async (id: string, title: string) => {
    try {
      await api.post(`/review-queue/${id}/publish`);
      setClaims(claims.filter(c => c.id !== id));
      setTotalPending(prev => Math.max(0, prev - 1));
      
      // Remove from selected if it was selected
      if (selectedIds.has(id)) {
        const next = new Set(selectedIds);
        next.delete(id);
        setSelectedIds(next);
      }
      
      alert(`Success: "${title}" has been published to the live feed.`);
    } catch (error: any) {
      console.error('Publish failed:', error);
      alert(`Failed to publish: ${error.response?.data?.error || error.message}`);
    }
  };

  const getSourceTier = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('courtlistener')) return { label: 'Tier 1: Court', color: 'text-blue-400 bg-blue-400/10' };
    if (s.includes('angeion') || s.includes('kroll') || s.includes('epiq') || s.includes('administrators')) return { label: 'Tier 2: Admin', color: 'text-purple-400 bg-purple-400/10' };
    return { label: 'Tier 3: Aggregator', color: 'text-zinc-500 bg-white/5' };
  };

  if (loading) return <div className="p-8 text-zinc-400 flex items-center gap-3"><Database className="animate-spin text-neon" size={20} /> Synchronizing with Cloud Engine...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-32">
      {/* Strategic Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-sm font-bold text-neon uppercase tracking-widest flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
              Mission Control
            </h2>
            <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              Engine Room <span className="text-zinc-600">/</span> <span className="text-v2-neon">V2.0</span>
            </h1>
            <p className="text-zinc-400 mt-4 max-w-2xl leading-relaxed text-sm font-medium">
              We shifted discovery upstream. Tier 1 & 2 sources are prioritized. Gemini 2.5 Flash fact-checks payouts and builds matching logic before items arrive here.
            </p>

            {/* Engine Status & Controls */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                onClick={handleTriggerEngine}
                disabled={engineStatus?.status === 'RUNNING' || engineStatus?.status === 'STARTING...'}
                className="flex items-center gap-2 px-4 py-2 bg-v2-neon/10 hover:bg-v2-neon/20 border border-v2-neon/30 text-v2-neon text-xs font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap size={14} />
                {engineStatus?.status === 'RUNNING' || engineStatus?.status === 'STARTING...' ? 'Engine Running...' : 'Run Pipeline'}
              </button>

              {engineStatus && (
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className={cn(
                    "px-2 py-1 rounded border uppercase tracking-wider text-[10px] font-black",
                    engineStatus.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    engineStatus.status === 'FAILED' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  )}>
                    {engineStatus.status}
                  </span>

                  {engineStatus.status === 'FAILED' && engineStatus.error && (
                    <span className="text-red-400 max-w-xs truncate" title={engineStatus.error}>
                      Error: {engineStatus.error}
                    </span>
                  )}

                  {engineStatus.completionTime && engineStatus.status !== 'RUNNING' && (
                    <span className="text-zinc-500">
                      Last run: {new Date(engineStatus.completionTime).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Source Health Monitoring */}
            {sources.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 mr-2">
                  <Globe size={10} /> Live Sources
                </div>
                {sources.map(s => (
                  <div 
                    key={s.id} 
                    className={cn(
                      "px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5", 
                      s.enabled ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : "text-zinc-600 border-white/5 bg-white/5"
                    )}
                    title={s.url}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", s.enabled ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" : "bg-zinc-600")}></div>
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Queue Metrics */}
          <div className="flex gap-4 items-center">
            <div className="bg-surface p-5 rounded-2xl border border-white/5 text-center min-w-[160px] shadow-2xl">
              <div className="text-4xl font-black text-neon leading-none">{totalPending}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-3">Action Queue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between mb-6 bg-surface-elevated/40 p-3 rounded-2xl border border-white/10 backdrop-blur-xl sticky top-4 z-10 shadow-2xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setFilter('all')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
              filter === 'all' ? "bg-white/10 text-white shadow-inner" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            All Items
          </button>
          <button 
            onClick={() => setFilter('high')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2",
              filter === 'high' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-500 hover:text-emerald-400/60"
            )}
          >
            <Sparkles size={14} />
            High Conf
          </button>
          <button 
            onClick={() => setFilter('risk')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-2",
              filter === 'risk' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-zinc-500 hover:text-amber-400/60"
            )}
          >
            <AlertCircle size={14} />
            Check Logic
          </button>
        </div>

        <div className="flex items-center gap-4 pr-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={batchApprove}
              disabled={processing}
              className="bg-neon text-dark text-xs font-black px-8 py-3 rounded-xl hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(204,255,0,0.3)] group"
            >
              {processing ? 'Propagating...' : <><CheckCircle2 size={18} /> Publish {selectedIds.size} Claims</>}
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-surface rounded-[2.5rem] border border-white/5 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04]">
              <th className="p-6 w-14">
                <button onClick={toggleSelectAll} className="w-6 h-6 rounded-lg border border-white/10 flex items-center justify-center transition-all hover:border-neon hover:bg-neon/5">
                  {selectedIds.size === filteredClaims.length && filteredClaims.length > 0 && <Check size={14} className="text-neon font-black" />}
                </button>
              </th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Settlement Intelligence</th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-center">Traffic Tier</th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-center">AI Extraction</th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Est. Payout & Reason</th>
              <th className="p-6 text-right text-[11px] font-black text-zinc-500 uppercase tracking-widest">Verify</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredClaims.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-40 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-neon/10 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(204,255,0,0.1)]">
                      <Sparkles size={40} className="text-neon" />
                    </div>
                    <div className="text-white font-black text-2xl tracking-tighter">Engine Optimized</div>
                    <p className="text-zinc-500 text-sm mt-3 max-w-sm mx-auto leading-relaxed font-medium">
                      All new discoveries have been fact-checked and published. Pipeline is idling until next scheduled run.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredClaims.map((claim) => {
                const isSelected = selectedIds.has(claim.id);
                const isZero = Number(claim.raw_data.avg_settlement) === 0;
                const noDeadline = !claim.raw_data.filing_deadline;
                const tier = getSourceTier(claim.source);
                
                return (
                  <tr 
                    key={claim.id} 
                    onClick={() => toggleSelect(claim.id)}
                    className={cn(
                      "group cursor-pointer transition-all border-l-4",
                      isSelected ? "bg-neon/[0.03] border-neon" : "hover:bg-white/[0.01] border-transparent"
                    )}
                  >
                    <td className="p-6">
                      <div className={cn(
                        "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                        isSelected ? "bg-neon border-neon shadow-[0_0_10px_rgba(204,255,0,0.3)]" : "border-white/10 group-hover:border-white/20"
                      )}>
                        {isSelected && <Check size={14} className="text-dark font-black" />}
                      </div>
                    </td>
                    
                    <td className="p-6 max-w-md">
                      <div className="font-black text-[17px] text-white leading-tight group-hover:text-neon transition-colors tracking-tight">
                        {claim.raw_data.title}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{claim.raw_data.company_name || 'N/A'}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                        <span className="text-[10px] text-zinc-600 font-mono italic">TS: {new Date(claim.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="p-6 text-center">
                      <div className={cn("inline-flex px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em]", tier.color)}>
                        {tier.label}
                      </div>
                      <div className="text-[9px] text-zinc-600 mt-2 font-mono uppercase tracking-tighter opacity-60 font-bold">{claim.source}</div>
                    </td>

                    <td className="p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-tighter",
                          claim.confidence_score >= 0.8 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-zinc-500 border-white/5"
                        )}>
                          {(claim.confidence_score * 100).toFixed(0)}% Accuracy
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest font-mono">Plaid Logic Ready</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-6">
                      <div className="flex flex-col gap-2">
                        <div className={cn("text-xl font-black tracking-tighter flex items-baseline gap-1", isZero ? "text-zinc-700" : "text-white")}>
                          {isZero ? 'VARIES' : <><span className="text-xs text-zinc-500 font-bold opacity-50">$</span>{Number(claim.raw_data.avg_settlement).toLocaleString()}</>}
                        </div>
                        {isZero && claim.raw_data.payout_analysis && (
                          <div className="text-[10px] text-zinc-400 font-medium italic mt-1 leading-tight max-w-[140px]">
                            {claim.raw_data.payout_analysis}
                          </div>
                        )}

                        {/* suspicious payout warning */}
                        {!isZero && claim.raw_data.lawsuit_category === 'Class Action' && Number(claim.raw_data.avg_settlement) > 10000 && (
                          <div className="flex items-center gap-1 text-red-400 font-black text-[9px] uppercase bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20 w-fit">
                            <ShieldAlert size={10} />
                            Likely Total Fund Error
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {!noDeadline ? (
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <CheckCircle2 size={12} className="text-emerald-500/50" />
                              <span className="text-[11px] font-black font-mono tracking-tighter">{claim.raw_data.filing_deadline}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-amber-500/80 font-black text-[10px] uppercase tracking-tighter">
                                <AlertCircle size={12} />
                                Pending Dates
                              </div>
                              {claim.raw_data.deadline_reason && (
                                <div className="text-[10px] text-zinc-600 italic leading-tight font-medium max-w-[120px]">{claim.raw_data.deadline_reason}</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Payout analysis detail */}
                        {claim.raw_data.payout_analysis && (
                          <div className="text-[10px] text-zinc-500 leading-tight border-t border-white/5 pt-2 mt-1">
                            <span className="text-zinc-600 font-bold uppercase text-[8px] block mb-0.5">AI Analysis:</span>
                            {claim.raw_data.payout_analysis}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-3">
                        <a 
                          href={`https://staging-api.fairday.app/admin?id=${claim.id}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shadow-lg border border-white/5"
                          title="View Extracted JSON & Meta"
                        >
                          <Info size={18} />
                        </a>
                        <button 
                          onClick={(e) => { e.stopPropagation(); approveClaim(claim.id, claim.raw_data.title); }}
                          className="px-6 py-2.5 rounded-2xl bg-white/5 hover:bg-neon hover:text-dark text-white text-[11px] font-black transition-all hover:shadow-[0_0_20px_rgba(204,255,0,0.4)] uppercase tracking-widest border border-white/5 hover:border-neon"
                        >
                          Publish
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paradigm Legend */}
      <div className="mt-16 grid grid-cols-3 gap-8">
        <div className="bg-surface/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-sm">
          <div className="w-12 h-12 bg-blue-400/10 rounded-2xl flex items-center justify-center text-blue-400 mb-6 border border-blue-400/20">
            <Gavel size={24} />
          </div>
          <h4 className="text-base font-black text-white mb-3 tracking-tight">Court Dockets (Tier 1)</h4>
          <p className="text-[13px] text-zinc-500 leading-relaxed font-medium">Direct federal links. These are early alerts where Gemini infers the match logic based on the preliminary approval order.</p>
        </div>
        
        <div className="bg-surface/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-sm text-center transform scale-105 border-neon/20 ring-1 ring-neon/5 ring-offset-4 ring-offset-dark">
          <div className="w-12 h-12 bg-neon/10 rounded-2xl flex items-center justify-center text-neon mb-6 border border-neon/20 mx-auto">
            <Sparkles size={24} />
          </div>
          <h4 className="text-base font-black text-white mb-3 tracking-tight text-neon">Gemini 2.5 Flash</h4>
          <p className="text-[13px] text-zinc-500 leading-relaxed font-medium">Every row is enriched with a strict 38-column schema. If data is messy, AI flags it as "Needs Attention" automatically.</p>
        </div>

        <div className="bg-surface/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-sm">
          <div className="w-12 h-12 bg-purple-400/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 border border-purple-400/20 ml-auto">
            <Globe size={24} />
          </div>
          <h4 className="text-base font-black text-white mb-3 tracking-tight text-right text-purple-400">Admins (Tier 2)</h4>
          <p className="text-[13px] text-zinc-500 leading-relaxed font-medium text-right italic">Verified portals from Kroll, Epiq, etc. These carry verified deadlines and direct claim submission URLs.</p>
        </div>
      </div>
    </div>
  );
}