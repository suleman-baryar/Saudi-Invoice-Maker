import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface InvoiceBarcodeProps {
  value: string;
  className?: string;
  displayValue?: boolean;
  height?: number;
}

export const InvoiceBarcode: React.FC<InvoiceBarcodeProps> = ({
  value,
  className = '',
  displayValue = true,
  height = 36,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 1.3,
          height,
          displayValue,
          text: value,
          fontSize: 10,
          font: 'monospace',
          textMargin: 2,
          margin: 4,
          lineColor: '#1e293b',
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [value, displayValue, height]);

  if (!value) return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
};
