'use client';

/**
 * Selector amb cerca.
 *
 * Substitueix l'`Autocomplete` de MUI. Les llistes d'aquesta app són curtes
 * —21 monitores, les 6 escoles d'una monitora, 30 materials com a molt— així
 * que el camp de cerca només apareix quan de debò ajuda (a partir de 8 opcions).
 *
 * Pensat per al dit: opcions de 48px, la llista ocupa l'ample sencer i es tanca
 * tocant fora.
 */

import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const SENSE_ACCENTS = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  /** Text lliure permès (el mode "eixos" del camp de nom). */
  allowCustom?: boolean;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  icon?: React.ReactNode;
  id?: string;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  allowCustom = false,
  disabled = false,
  loading = false,
  emptyText = 'Cap opció',
  icon,
  id,
}: ComboboxProps) {
  const [obert, setObert] = React.useState(false);
  const [cerca, setCerca] = React.useState('');
  const contenidor = React.useRef<HTMLDivElement>(null);
  const campCerca = React.useRef<HTMLInputElement>(null);

  const ambCerca = options.length >= 8;

  const filtrades = React.useMemo(() => {
    if (!cerca.trim()) return options;
    const q = SENSE_ACCENTS(cerca);
    return options.filter(o => SENSE_ACCENTS(o).includes(q));
  }, [options, cerca]);

  // Tancar en tocar fora
  React.useEffect(() => {
    if (!obert) return;
    const fora = (e: MouseEvent) => {
      if (contenidor.current && !contenidor.current.contains(e.target as Node)) {
        setObert(false);
        setCerca('');
      }
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [obert]);

  React.useEffect(() => {
    if (obert && ambCerca) campCerca.current?.focus();
  }, [obert, ambCerca]);

  const triar = (opcio: string) => {
    onChange(opcio);
    setObert(false);
    setCerca('');
  };

  const confirmarLliure = () => {
    const text = cerca.trim();
    if (allowCustom && text) triar(text);
  };

  return (
    <div ref={contenidor} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={() => setObert(o => !o)}
        className={cn(
          'flex w-full items-center gap-2 rounded-[var(--radius-field)] border border-line bg-field px-4 py-3 text-left text-[15px] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          disabled || loading ? 'cursor-not-allowed opacity-50' : 'hover:border-line-strong',
          obert && 'border-brand ring-2 ring-brand/25'
        )}
      >
        {icon && <span className="shrink-0 text-fg3">{icon}</span>}
        <span className={cn('flex-1 truncate', !value && 'text-fg3')}>
          {loading ? 'Carregant…' : value || placeholder}
        </span>
        {value && !disabled && !loading && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Esborrar"
            onClick={e => {
              e.stopPropagation();
              onChange('');
            }}
            className="shrink-0 rounded-full p-0.5 text-fg3 hover:bg-soft hover:text-fg1"
          >
            <X className="size-4" />
          </span>
        )}
        <ChevronDown
          className={cn('size-4 shrink-0 text-fg3 transition-transform', obert && 'rotate-180')}
        />
      </button>

      {obert && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-3)]">
          {ambCerca && (
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <Search className="size-4 shrink-0 text-fg3" />
              <input
                ref={campCerca}
                value={cerca}
                onChange={e => setCerca(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filtrades.length === 1) triar(filtrades[0]);
                    else confirmarLliure();
                  }
                  if (e.key === 'Escape') setObert(false);
                }}
                placeholder="Cerca…"
                className="w-full bg-transparent py-1 text-[15px] outline-none placeholder:text-fg3"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {filtrades.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-fg3">
                {allowCustom && cerca.trim() ? (
                  <button
                    type="button"
                    onClick={confirmarLliure}
                    className="font-medium text-brand hover:underline"
                  >
                    Fer servir «{cerca.trim()}»
                  </button>
                ) : (
                  emptyText
                )}
              </div>
            ) : (
              filtrades.map(opcio => (
                <button
                  key={opcio}
                  type="button"
                  onClick={() => triar(opcio)}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] transition-colors',
                    'hover:bg-soft active:bg-soft',
                    opcio === value && 'bg-blau-50 font-semibold text-brand'
                  )}
                >
                  <span className="flex-1">{opcio}</span>
                  {opcio === value && <Check className="size-4 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
