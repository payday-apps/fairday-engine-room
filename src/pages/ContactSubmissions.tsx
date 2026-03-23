import { useState, useEffect, useMemo, Fragment } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Inbox,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

type SubmissionStatus = 'new' | 'in_progress' | 'resolved' | 'spam';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  reason: string;
  message: string;
  status: SubmissionStatus;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const statusConfig: Record<SubmissionStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  resolved: { label: 'Resolved', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  spam: { label: 'Spam', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20 text-red-400' },
};

type FilterType = 'all' | SubmissionStatus;

export default function ContactSubmissions() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      // api instance is based at /api/admin/claims. Since we want /api/admin/contact-submissions, 
      // we need to override the baseURL or just use an absolute path for this specific call
      // to keep it simple, we'll hit the absolute path but use the api instance so credentials pass.
      const res = await api.get('https://staging-api.fairday.app/api/admin/contact-submissions/');
      setSubmissions(res.data.submissions || res.data || []);
    } catch (error) {
      console.error('Failed to fetch contact submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: SubmissionStatus) => {
    try {
      setUpdatingId(id);
      await api.patch(`https://staging-api.fairday.app/api/admin/contact-submissions/${id}`, { status: newStatus });
      setSubmissions(prev =>
        prev.map(s => (s.id === id ? { ...s, status: newStatus } : s))
      );
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. See console for details.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredSubmissions = useMemo(() => {
    const list = [...submissions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (filter === 'all') return list;
    return list.filter(s => s.status === filter);
  }, [submissions, filter]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: submissions.length, new: 0, in_progress: 0, resolved: 0, spam: 0 };
    submissions.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return counts;
  }, [submissions]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="p-8 text-zinc-400 flex items-center gap-3">
        <Loader2 className="animate-spin text-neon" size={20} /> Loading contact submissions...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-32">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-sm font-bold text-neon uppercase tracking-widest flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
              Inbox
            </h2>
            <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
              Contact Submissions
            </h1>
            <p className="text-zinc-400 mt-4 max-w-2xl leading-relaxed text-sm font-medium">
              User-submitted contact form messages. Triage incoming requests, track resolution status, and flag spam.
            </p>
          </div>
          {/* Metric */}
          <div className="flex gap-4 items-center">
            <div className="bg-surface p-5 rounded-2xl border border-white/5 text-center min-w-[160px] shadow-2xl">
              <div className="text-4xl font-black text-neon leading-none">{countByStatus.new}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mt-3">New Messages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-6 bg-surface-elevated/40 p-3 rounded-2xl border border-white/10 backdrop-blur-xl sticky top-4 z-10 shadow-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
              filter === 'all' ? "bg-white/10 text-white shadow-inner" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            All ({countByStatus.all})
          </button>
          <button
            onClick={() => setFilter('new')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
              filter === 'new' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-zinc-500 hover:text-amber-400/60"
            )}
          >
            New ({countByStatus.new})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
              filter === 'in_progress' ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-zinc-500 hover:text-blue-400/60"
            )}
          >
            In Progress ({countByStatus.in_progress})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
              filter === 'resolved' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-500 hover:text-emerald-400/60"
            )}
          >
            Resolved ({countByStatus.resolved})
          </button>
          <button
            onClick={() => setFilter('spam')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all",
              filter === 'spam' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-zinc-500 hover:text-red-400/60"
            )}
          >
            Spam ({countByStatus.spam})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-[2.5rem] border border-white/5 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.04]">
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest w-28">Status</th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Name</th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Email</th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Reason</th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest">Message</th>
              <th className="p-6 text-[11px] font-black text-zinc-500 uppercase tracking-widest text-right">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredSubmissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-40 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-neon/10 rounded-full flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(204,255,0,0.1)]">
                      <Inbox size={40} className="text-neon" />
                    </div>
                    <div className="text-white font-black text-2xl tracking-tighter">No Submissions</div>
                    <p className="text-zinc-500 text-sm mt-3 max-w-sm mx-auto leading-relaxed font-medium">
                      {filter === 'all'
                        ? 'No contact submissions have been received yet.'
                        : `No submissions with status "${filter.replace('_', ' ')}".`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredSubmissions.map((submission) => {
                const isExpanded = expandedId === submission.id;
                const config = statusConfig[submission.status] || statusConfig.new;

                return (
                  <Fragment key={submission.id}>
                    <tr
                      onClick={() => toggleExpand(submission.id)}
                      className={cn(
                        "group cursor-pointer transition-all",
                        isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"
                      )}
                    >
                      <td className="p-6 align-top">
                        <span className={cn(
                          "inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          config.bgColor
                        )}>
                          {config.label}
                        </span>
                      </td>
                      <td className="p-6 align-top">
                        <div className="font-bold text-white text-sm">{submission.name}</div>
                      </td>
                      <td className="p-6 align-top">
                        <a
                          href={`mailto:${submission.email}`}
                          className="text-sm text-zinc-400 hover:text-neon transition-colors font-mono"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {submission.email}
                        </a>
                      </td>
                      <td className="p-6 align-top">
                        <span className="text-sm text-zinc-300 font-medium">{submission.reason || '—'}</span>
                      </td>
                      <td className="p-6 align-top">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-400 font-medium line-clamp-1 max-w-xs">
                            {submission.message}
                          </span>
                          {isExpanded
                            ? <ChevronUp size={14} className="text-zinc-600 shrink-0" />
                            : <ChevronDown size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                          }
                        </div>
                      </td>
                      <td className="p-6 align-top text-right">
                        <span className="text-sm text-zinc-500 font-mono" title={new Date(submission.created_at).toLocaleString()}>
                          {timeAgo(submission.created_at)}
                        </span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="px-6 pb-6 pt-4 bg-white/[0.02] border-t border-white/5">
                            <div className="mb-4">
                              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Full Message</div>
                              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                {submission.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">Set Status:</span>
                              {(Object.keys(statusConfig) as SubmissionStatus[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={(e) => { e.stopPropagation(); updateStatus(submission.id, s); }}
                                  disabled={updatingId === submission.id || submission.status === s}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all",
                                    submission.status === s
                                      ? statusConfig[s].bgColor
                                      : "border-white/10 text-zinc-500 hover:text-white hover:border-white/20",
                                    (updatingId === submission.id || submission.status === s) && "opacity-50 cursor-not-allowed"
                                  )}
                                >
                                  {updatingId === submission.id ? '...' : statusConfig[s].label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
