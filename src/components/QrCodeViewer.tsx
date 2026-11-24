import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Maximize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { buildQrPayload, formatNpr } from '../utils/storeLogic';
import type { StoreSettings, TopUpPaymentMethod } from '../types/store';

interface FullscreenZoomModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  imageSrc: string;
  onClose: () => void;
}

export const FullscreenZoomModal: React.FC<FullscreenZoomModalProps> = ({
  open,
  title,
  subtitle,
  imageSrc,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinchDistRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, imageSrc]);

  if (!open || !imageSrc) return null;

  const clampScale = (val: number) => Math.min(4, Math.max(1, Number(val.toFixed(2))));

  const handleDoubleTap = () => {
    if (scale > 1.05) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && scale > 1) {
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        px: pan.x,
        py: pan.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchDistRef.current;
      pinchDistRef.current = dist;
      setScale((prev) => clampScale(prev * ratio));
    } else if (e.touches.length === 1 && dragStartRef.current && scale > 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPan({ x: dragStartRef.current.px + dx, y: dragStartRef.current.py + dy });
    }
  };

  const handleTouchEnd = () => {
    pinchDistRef.current = null;
    dragStartRef.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] bg-[#040812]/95 flex flex-col"
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-300 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setScale(1.5);
              setPan({ x: 0, y: 0 });
            }}
            className="px-3 py-2 rounded-lg bg-[#2186FF] text-white text-xs font-semibold hover:bg-[#1a73e8] transition-colors whitespace-nowrap"
          >
            Zoom 1.5x
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setScale((s) => clampScale(s + 0.5))}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() =>
              setScale((s) => {
                const next = clampScale(s - 0.5);
                if (next === 1) setPan({ x: 0, y: 0 });
                return next;
              })
            }
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            onClick={() => {
              setScale(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Close fullscreen viewer"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 text-white hover:bg-red-500/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        onWheel={handleWheel}
        onDoubleClick={handleDoubleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-hidden flex items-center justify-center p-6 select-none cursor-zoom-in"
      >
        <img
          src={imageSrc}
          alt={title}
          referrerPolicy="no-referrer"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transition: 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="max-h-[78vh] max-w-full rounded-2xl bg-white p-3 shadow-2xl object-contain"
        />
      </div>

      <div className="px-5 py-3 text-center text-xs text-slate-400 border-t border-white/10">
        Pinch, scroll, double-tap, or tap Zoom 1.5x · Current scale {scale.toFixed(1)}x
      </div>
    </div>
  );
};

interface PaymentQrCardProps {
  method?: TopUpPaymentMethod;
  settings: StoreSettings;
  amountNpr: number;
  reference: string;
}

export const PaymentQrCard: React.FC<PaymentQrCardProps> = ({
  settings,
  amountNpr,
  reference,
}) => {
  const [generatedQrUrl, setGeneratedQrUrl] = useState('');
  const [zoomOpen, setZoomOpen] = useState(false);

  const customQrUrl = settings.esewaQrImageUrl?.trim() || '';
  const payload = buildQrPayload('esewa', settings, amountNpr, reference);

  useEffect(() => {
    if (customQrUrl) {
      setGeneratedQrUrl('');
      return;
    }
    let active = true;
    QRCode.toDataURL(payload, {
      width: 520,
      margin: 2,
      color: { dark: '#040812', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setGeneratedQrUrl(url);
      })
      .catch(() => {
        if (active) setGeneratedQrUrl('');
      });
    return () => {
      active = false;
    };
  }, [payload, customQrUrl]);

  const activeQrUrl = customQrUrl || generatedQrUrl;
  const accountName = settings.bankAccountName?.trim() || 'Diamond Store NP';
  const label = `eSewa QR · ${settings.esewaId}`;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-[#F2F6FC] dark:bg-[#091224] p-4 flex flex-col sm:flex-row items-center gap-4">
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Open fullscreen zoomable eSewa QR code"
          className="relative group shrink-0 rounded-xl bg-white p-2.5 border border-slate-200 hover:border-[#2186FF] transition-colors"
        >
          {activeQrUrl ? (
            <img
              src={activeQrUrl}
              alt="eSewa payment QR"
              className="w-28 h-28 object-contain"
            />
          ) : (
            <div className="w-28 h-28 flex items-center justify-center text-xs text-slate-500">
              Generating QR…
            </div>
          )}
          <span className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#0B3D91]">
            <Maximize2 className="w-3 h-3" />
            Tap to Zoom QR
          </span>
        </button>

        <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            eSewa Personal / Merchant {customQrUrl ? '· Official QR' : ''}
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white font-mono-num">
            {formatNpr(amountNpr)}
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
            <div className="font-mono-num font-semibold">eSewa ID: {settings.esewaId}</div>
            <div>Account Name: {accountName}</div>
          </div>
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold text-[#0B3D91] dark:text-[#00D2FF] hover:underline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            Open Fullscreen QR Viewer
          </button>
        </div>
      </div>

      <FullscreenZoomModal
        open={zoomOpen}
        title={label}
        subtitle={`Amount ${formatNpr(amountNpr)} · ${accountName}`}
        imageSrc={activeQrUrl}
        onClose={() => setZoomOpen(false)}
      />
    </>
  );
};
