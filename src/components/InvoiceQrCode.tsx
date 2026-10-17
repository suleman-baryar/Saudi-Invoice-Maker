import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface InvoiceQrCodeProps {
  value: string;
  size?: number;
  className?: string;
  onInspect?: () => void;
  showInspectButton?: boolean;
}

export const InvoiceQrCode: React.FC<InvoiceQrCodeProps> = ({
  value,
  size = 125,
  className = '',
  onInspect,
  showInspectButton = false,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) {
      setDataUrl('');
      return;
    }

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-xs text-slate-400"
      >
        QR
      </div>
    );
  }

  return (
    <div className={`relative group flex flex-col items-center ${className}`}>
      <img
        src={dataUrl}
        alt="ZATCA E-Invoice TLV QR Code"
        width={size}
        height={size}
        className="border border-slate-300 rounded p-1 bg-white shadow-xs"
      />
      {showInspectButton && onInspect && (
        <button
          type="button"
          onClick={onInspect}
          className="mt-1 text-[10px] text-blue-700 hover:text-blue-900 underline font-medium print-hide"
        >
          فحص بيانات ZATCA
        </button>
      )}
    </div>
  );
};
