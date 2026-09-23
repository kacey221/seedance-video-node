import React, { type CSSProperties } from 'react';
import { Image as ImageIcon, Video, X } from 'lucide-react';

export const NODE_CREATE_CHOOSER_OPTIONS = [
  {
    id: 'image',
    label: '\u56fe\u7247\u751f\u56fe\u8282\u70b9',
    icon: ImageIcon,
  },
  {
    id: 'video',
    label: '\u89c6\u9891\u751f\u6210\u8282\u70b9',
    icon: Video,
  },
] as const;

export type NodeCreateOptionId = (typeof NODE_CREATE_CHOOSER_OPTIONS)[number]['id'];

interface NodeCreateMenuProps {
  title: string;
  onClose: () => void;
  onSelect: (nodeType: NodeCreateOptionId) => void;
  className?: string;
  style?: CSSProperties;
}

export function NodeCreateMenu({
  title,
  onClose,
  onSelect,
  className = '',
  style,
}: NodeCreateMenuProps) {
  return (
    <div
      className={`node-create-menu absolute z-50 w-[212px] rounded-[1.75rem] border border-slate-200 bg-white/95 p-3.5 shadow-[0_20px_56px_rgba(15,23,42,0.14)] backdrop-blur-xl ${className}`.trim()}
      style={style}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="text-[11px] font-black tracking-wide text-slate-800">{title}</div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close node creation menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5 pt-3">
        {NODE_CREATE_CHOOSER_OPTIONS.map((option) => {
          const Icon = option.icon;

          return (
            <button
              key={option.id}
              type="button"
              data-node-create-option={option.id}
              onClick={() => onSelect(option.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left text-slate-700 transition-colors hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[13px] font-semibold">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
