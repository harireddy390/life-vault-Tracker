import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  FileText,
  Image as ImageIcon,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import { API_URL } from '../../api/axiosConfig';
import { formatCurrency } from './CashflowSummaryBar';

export function resolveFinanceUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const clean = url.replace(/\\/g, '/');
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
}

export default function ReceiptPreviewModal({ transaction, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);

  if (!transaction || !transaction.receipt_url) return null;

  const fileUrl = resolveFinanceUrl(transaction.receipt_url);
  const isPdf =
    transaction.receipt_name?.toLowerCase().endsWith('.pdf') ||
    transaction.receipt_url.toLowerCase().endsWith('.pdf');
  const isImage =
    transaction.receipt_name?.match(/\.(png|jpe?g|webp|gif)$/i) ||
    transaction.receipt_url.match(/\.(png|jpe?g|webp|gif)$/i);

  return (
    <div
      className="fin-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ zIndex: 10000 }}
    >
      <div
        className="fin-modal fin-receipt-modal"
        style={{
          maxWidth: isFullscreen ? '98vw' : '90vw',
          width: isFullscreen ? '98vw' : '980px',
          height: isFullscreen ? '96vh' : '88vh',
          maxHeight: isFullscreen ? '96vh' : '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          background: '#0b1120',
          borderColor: '#1e293b',
        }}
      >
        {/* Modal Header */}
        <div
          className="fin-modal-header"
          style={{
            flexShrink: 0,
            borderBottom: '1px solid #1e293b',
            background: '#0b1120',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={transaction.title}
                >
                  {transaction.title}
                </h2>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: transaction.type === 'income' ? '#10b981' : '#ef4444',
                    fontFamily: 'monospace',
                  }}
                >
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Attached Bill Proof · {transaction.receipt_name || 'Receipt Document'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <a
              href={fileUrl}
              download={transaction.receipt_name || `${transaction.title}_receipt`}
              target="_blank"
              rel="noreferrer"
              className="fin-btn-ghost fin-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              title="Download original receipt file"
            >
              <Download size={14} /> Download
            </a>
            <button
              className="fin-btn-ghost fin-btn-sm"
              onClick={() => window.open(fileUrl, '_blank')}
              title="Open file in separate tab"
            >
              <ExternalLink size={14} /> Open in Tab
            </button>
            <button
              className="fin-icon-btn"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? 'Restore' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="fin-modal-close" onClick={onClose} title="Close preview">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar for image controls */}
        {isImage && (
          <div
            style={{
              flexShrink: 0,
              background: '#0f172a',
              borderBottom: '1px solid #1e293b',
              padding: '6px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button
              className="fin-icon-btn"
              style={{ width: 26, height: 26 }}
              onClick={() => setImgZoom((z) => Math.max(0.5, z - 0.25))}
              title="Zoom out"
            >
              <Minus size={12} />
            </button>
            <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: 36, textAlign: 'center' }}>
              {Math.round(imgZoom * 100)}%
            </span>
            <button
              className="fin-icon-btn"
              style={{ width: 26, height: 26 }}
              onClick={() => setImgZoom((z) => Math.min(3, z + 0.25))}
              title="Zoom in"
            >
              <Plus size={12} />
            </button>
            <button
              className="fin-icon-btn"
              style={{ width: 26, height: 26 }}
              onClick={() => setImgRotation((r) => (r + 90) % 360)}
              title="Rotate 90 degrees"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        )}

        {/* Viewer Content Frame */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#090e1a',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              title="Receipt document"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#ffffff',
              }}
            />
          ) : isImage ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
              }}
            >
              <img
                src={fileUrl}
                alt="Receipt"
                style={{
                  transform: `scale(${imgZoom}) rotate(${imgRotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 8,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <FileText size={48} color="#4f46e5" style={{ marginBottom: 12 }} />
              <h3 style={{ color: '#f8fafc', marginBottom: 8 }}>{transaction.receipt_name || 'Receipt File'}</h3>
              <p style={{ maxWidth: 420, margin: '0 auto 20px', fontSize: 13, color: '#64748b' }}>
                Preview is not supported for this file format directly in-browser.
              </p>
              <a
                href={fileUrl}
                download
                className="fin-btn-primary"
                style={{ textDecoration: 'none' }}
              >
                <Download size={14} /> Download Receipt
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
