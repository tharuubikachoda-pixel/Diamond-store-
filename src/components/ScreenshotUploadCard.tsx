import React, { useRef, useState } from 'react';
import { FolderOpen, ImagePlus, Trash2, ZoomIn } from 'lucide-react';
import { compressImageFileToDataUrl } from '../utils/imageUtils';
import { FullscreenZoomModal } from './QrCodeViewer';

interface ScreenshotUploadCardProps {
  label: string;
  emptyHint?: string;
  previewAlt?: string;
  choosePhotoLabel?: string;
  filesLabel?: string;
  value: string;
  onChange: (dataUrl: string) => void;
}

export const ScreenshotUploadCard: React.FC<ScreenshotUploadCardProps> = ({
  label,
  emptyHint = 'Upload your eSewa payment receipt screenshot',
  previewAlt = 'Image preview',
  choosePhotoLabel = 'Choose Photo',
  filesLabel = 'Files',
  value,
  onChange,
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoomOpen, setZoomOpen] = useState(false);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const compressed = await compressImageFileToDataUrl(file);
      onChange(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process screenshot.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</div>

      <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-[#2186FF]/40 bg-white/70 dark:bg-[#091224] p-4">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {value ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              className="relative group shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-white/15"
            >
              <img
                src={value}
                alt={previewAlt}
                className="w-20 h-20 object-cover"
              />
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="w-5 h-5" />
              </span>
            </button>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Image attached · Tap image to zoom
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B3D91]/10 dark:bg-[#00D2FF]/15 text-[#0B3D91] dark:text-[#00D2FF] text-xs font-semibold"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  Preview Zoom
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-1">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {emptyHint}
            </p>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <button
                type="button"
                disabled={busy}
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B3D91] dark:bg-[#2186FF] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <ImagePlus className="w-4 h-4" />
                {busy ? 'Processing…' : choosePhotoLabel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0F1B33] text-slate-800 dark:text-slate-100 text-xs font-semibold hover:border-[#2186FF] transition-colors disabled:opacity-50"
              >
                <FolderOpen className="w-4 h-4" />
                {filesLabel}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <FullscreenZoomModal
        open={zoomOpen}
        title="Payment Screenshot Preview"
        imageSrc={value}
        onClose={() => setZoomOpen(false)}
      />
    </div>
  );
};
