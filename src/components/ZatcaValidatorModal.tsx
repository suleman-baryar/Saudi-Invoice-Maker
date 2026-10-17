import React from 'react';
import { X, CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';
import { decodeZatcaTlvBase64, DecodedTlvTag } from '../utils/zatcaTlv';
import { Language, translations } from '../utils/translations';

interface ZatcaValidatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  base64String: string;
  lang?: Language;
}

export const ZatcaValidatorModal: React.FC<ZatcaValidatorModalProps> = ({
  isOpen,
  onClose,
  base64String,
  lang = 'ar',
}) => {
  const [copied, setCopied] = React.useState(false);
  const t = translations[lang].zatcaModal;
  const isRtl = lang === 'ar';

  if (!isOpen) return null;

  const tags: DecodedTlvTag[] = base64String ? decodeZatcaTlvBase64(base64String) : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(base64String);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasAllMandatoryTags = [1, 2, 3, 4, 5].every((requiredTag) =>
    tags.some((t) => t.tag === requiredTag && t.value.trim().length > 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {t.title}
              </h3>
              <p className="text-xs text-slate-500">
                {t.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div
            className={`p-4 rounded-lg border flex items-start gap-3 ${
              hasAllMandatoryTags
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">
                {hasAllMandatoryTags ? t.verifiedMsg : t.warningMsg}
              </p>
              <p className="text-xs mt-1 text-slate-600">
                {t.desc}
              </p>
            </div>
          </div>

          {/* Decoded Tags Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              {t.tagsHeader}
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className={`w-full text-xs ${isRtl ? 'text-right' : 'text-left'}`}>
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-2.5 w-16 text-center">{t.tagCol}</th>
                    <th className="p-2.5">{t.fieldCol}</th>
                    <th className="p-2.5 w-20 text-center">{t.lengthCol}</th>
                    <th className="p-2.5">{t.valueCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {tags.map((tItem) => (
                    <tr key={tItem.tag} className="hover:bg-slate-50/80">
                      <td className="p-2.5 text-center font-bold text-blue-600">#{tItem.tag}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800">{tItem.tagName}</td>
                      <td className="p-2.5 text-center text-slate-500">{tItem.length}</td>
                      <td className="p-2.5 text-slate-900 break-all bg-slate-50/50">{tItem.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw Base64 string */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t.base64Header}
              </h4>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t.copied : t.copyBase64}
              </button>
            </div>
            <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-lg break-all select-all leading-relaxed max-h-24 overflow-y-auto">
              {base64String || '(N/A)'}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition"
          >
            {t.closeModal}
          </button>
        </div>
      </div>
    </div>
  );
};
