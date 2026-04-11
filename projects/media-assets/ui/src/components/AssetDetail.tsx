import { useEffect, useState } from 'react';
import { X, Save, Upload, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { TagEditor } from './TagEditor';
import { api } from '../lib/api';
import { useAsset, usePatchAsset } from '../hooks/useAssets';
import { cn } from '../lib/utils';
import { AssetType, TYPE_COLORS } from '../lib/utils';

interface AssetDetailProps {
  assetId: string | null;
  onClose: () => void;
}

export function AssetDetail({ assetId, onClose }: AssetDetailProps) {
  const { toast } = useToast();
  const patchAsset = usePatchAsset();
  const { data: asset, isLoading } = useAsset(assetId);
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, any>>({});

  useEffect(() => {
    if (assetId && asset) {
      setEdits({
        text: asset.text,
        visual_summary: asset.visual_summary,
        tags: asset.tags,
      });
      setEditMode(false);
    }
  }, [assetId, asset]);

  const handleSave = async () => {
    try {
      await patchAsset.mutateAsync({
        id: asset!.id,
        fields: {
          text: edits.text,
          visual_summary: edits.visual_summary,
          tags: edits.tags,
        },
      });
      setEditMode(false);
      toast({ description: 'Asset updated successfully' });
    } catch (error) {
      toast({ variant: 'destructive', description: 'Failed to update asset' });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !assetId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('token_id', assetId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setEdits({
        ...edits,
        visual_summary: result.url,
        filename: file.name,
      });
      toast({ description: 'Image uploaded successfully' });
    } catch (error) {
      toast({ variant: 'destructive', description: 'Upload failed' });
    }
  };

  const handleDownload = () => {
    if (!asset || !asset.text) return;
    
    const blob = new Blob([asset.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-${asset.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ description: 'Asset downloaded' });
  };

  const typeColor = TYPE_COLORS[asset?.type as AssetType] || TYPE_COLORS.image;

  if (!assetId) return null;

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-xl z-40',
        'transform transition-transform duration-300 ease-in-out',
        assetId ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeColor}`}>
            {asset?.type}
          </span>
          <span className="text-sm text-muted-foreground font-mono">#{asset?.id}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-8rem)] p-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Asset info */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Content</h3>
              {editMode ? (
                <Textarea
                  value={edits.text || ''}
                  onChange={(e) => setEdits({ ...edits, text: e.target.value })}
                  className="min-h-[120px]"
                  placeholder="Enter text content..."
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{asset?.text || 'No content'}</p>
                </div>
              )}
            </div>

            {/* Visual summary */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Visual Summary</h3>
              {asset?.visual_summary && editMode ? (
                <Input
                  value={edits.visual_summary || ''}
                  onChange={(e) => setEdits({ ...edits, visual_summary: e.target.value })}
                  placeholder="Image URL..."
                />
              ) : (
                <div className="space-y-2">
                  {asset?.gateway_image_url && (
                    <img
                      src={asset.gateway_image_url}
                      alt="Asset visual"
                      className="w-full max-w-lg rounded border"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {asset?.visual_summary || 'No visual summary'}
                  </p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-3">Metadata</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{asset?.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {asset?.created_at ? new Date(asset.created_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                {asset?.author_handle && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Author:</span>
                    <span className="font-medium">@{asset.author_handle}</span>
                  </div>
                )}
                {asset?.stats && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stats:</span>
                    <span className="font-medium">
                      💙 {asset.stats.likes} 🔁 {asset.stats.retweets} 💬 {asset.stats.replies}
                    </span>
                  </div>
                )}
                {asset?.flagged_by && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviewed by:</span>
                    <span className="font-medium capitalize">
                      {asset.flagged_by === 'ai' ? 'AI' : 'Human'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <Separator />
            <TagEditor asset={asset} edits={edits} setEdits={setEdits} />

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              {editMode ? (
                <>
                  <Button onClick={handleSave} disabled={patchAsset.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button variant="outline">
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </span>
                    </Button>
                  </label>
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
