import { useState, useRef } from 'react';
import { Plus, Loader2, FolderInput } from 'lucide-react';
import { useIngestUrl, usePendingIngests } from '../hooks/useIngest';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

const STATUS_LABELS: Record<string, string> = {
  pending:    'queued',
  downloading:'downloading',
  analyzing:  'analyzing',
  tagging:    'tagging',
  done:       'done',
  error:      'error',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    'text-[#33ff33]/50',
  downloading:'text-yellow-400',
  analyzing:  'text-blue-400',
  tagging:    'text-purple-400',
  done:       'text-[#33ff33]',
  error:      'text-red-400',
};

export function IngestBar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ingestUrl = useIngestUrl();
  const { data: pendingData } = usePendingIngests();

  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pending = pendingData?.items ?? [];
  const activeCount = pending.filter(
    (p) => p.ingest_status !== 'done' && p.ingest_status !== 'error'
  ).length;

  const submit = async (url: string) => {
    url = url.trim();
    if (!url) return;

    try {
      const result = await ingestUrl.mutateAsync(url);
      setInputVal('');

      if (result.duplicate) {
        toast({ description: 'Already in library', variant: 'default' });
      } else {
        toast({ description: `Ingesting… analysis + tagging running in background` });
        queryClient.invalidateQueries({ queryKey: ['ingest', 'pending'] });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Ingest failed' });
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit(inputVal);
    if (e.key === 'Escape') { setOpen(false); setInputVal(''); }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.startsWith('http')) {
      e.preventDefault();
      submit(text);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Active pipeline indicator */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-[#33ff33]/60 border border-[#33ff33]/20 px-2 py-0.5">
          <Loader2 className="h-2.5 w-2.5 animate-spin text-[#33ff33]" />
          <span>{activeCount} processing</span>
        </div>
      )}

      {/* Recent items mini-list */}
      {pending.length > 0 && (
        <div className="hidden lg:flex items-center gap-1">
          {pending.slice(0, 3).map((item) => (
            <span
              key={item.id}
              className={`text-[9px] font-mono truncate max-w-[80px] ${STATUS_COLORS[item.ingest_status] || 'text-[#33ff33]/40'}`}
              title={`${item.id}: ${item.ingest_status}`}
            >
              {STATUS_LABELS[item.ingest_status] ?? item.ingest_status}
            </span>
          ))}
        </div>
      )}

      {/* Inbox folder hint */}
      <div className="hidden xl:flex items-center gap-1 text-[9px] text-[#33ff33]/25 border border-[#33ff33]/10 px-1.5 py-0.5">
        <FolderInput className="h-2.5 w-2.5" />
        <span>database/inbox</span>
      </div>

      {/* URL paste input */}
      {open ? (
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            autoFocus
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            onBlur={() => { if (!inputVal) setOpen(false); }}
            placeholder="Paste URL and press Enter…"
            className={[
              'w-64 text-xs px-2 py-1',
              'bg-[#28272a] text-[#E0E0E0]',
              'border border-[#33ff33]/40 focus:border-[#33ff33]/80',
              'placeholder-[#33ff33]/20 focus:outline-none',
            ].join(' ')}
          />
          {ingestUrl.isPending && (
            <Loader2 className="h-3 w-3 animate-spin text-[#33ff33]/60 shrink-0" />
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold border border-[#33ff33]/20 text-[#33ff33]/50 hover:text-[#33ff33] hover:border-[#33ff33]/50 hover:bg-[#33ff33]/5 transition-all duration-200"
          title="Ingest URL or drop files into database/inbox/"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      )}
    </div>
  );
}
