'use client';

import React from 'react';
import { ShoppingCart, Trash2, Send, Loader2 } from 'lucide-react';
import { type CartItem } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CartViewProps {
  items: CartItem[];
  onRemoveItem: (itemId: string) => void;
  onSubmitCart: () => void;
  submitting?: boolean;
}

const capitalitza = (text: string | null | undefined): string => {
  const net = String(text ?? '').trim();
  if (!net) return '';
  return net.charAt(0).toUpperCase() + net.slice(1).toLowerCase();
};

export default function CartView({
  items,
  onRemoveItem,
  onSubmitCart,
  submitting = false,
}: CartViewProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface px-5 py-10 text-center">
        <ShoppingCart className="mx-auto mb-3 size-10 text-fg3" strokeWidth={1.5} />
        <p className="font-[family-name:var(--font-display)] font-semibold text-fg2">
          El carret és buit
        </p>
        <p className="mt-1 text-sm text-fg3">Afegeix materials amb el formulari de dalt</p>
      </section>
    );
  }

  // Agrupats per escola: sovint es demana per a més d'un centre alhora
  const perEscola = items.reduce<Record<string, CartItem[]>>((acc, item) => {
    (acc[item.escola] ||= []).push(item);
    return acc;
  }, {});

  const totalUnitats = items.reduce((suma, item) => suma + item.unitats, 0);

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-1)]">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold text-fg1">
          <ShoppingCart className="size-5 text-brand" />
          El carret
        </h2>
        <span className="rounded-full bg-blau-50 px-3 py-1 text-sm font-semibold text-blau-700">
          {items.length} {items.length === 1 ? 'material' : 'materials'} · {totalUnitats} u.
        </span>
      </header>

      <div className="divide-y divide-line">
        {Object.entries(perEscola).map(([escola, materials]) => (
          <div key={escola} className="px-5 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg3">{escola}</p>

            <ul className="space-y-2">
              {materials.map(item => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-[var(--radius-field)] bg-soft px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg1">{capitalitza(item.material)}</p>
                    <p className="mt-0.5 text-sm text-fg3">
                      {item.activitat} · {item.unitats}{' '}
                      {item.unitats === 1 ? 'unitat' : 'unitats'}
                      {item.customMaterial && ' · escrit a mà'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Treure ${item.material}`}
                    className="-mr-1 shrink-0 rounded-full p-2 text-fg3 transition-colors hover:bg-coral-50 hover:text-coral-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line p-5">
        <button
          type="button"
          onClick={onSubmitCart}
          disabled={submitting}
          className={cn(
            'flex min-h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-field)] px-5 py-3.5 font-semibold transition-all',
            submitting
              ? 'cursor-wait bg-soft text-fg3'
              : 'bg-cta text-white shadow-[var(--shadow-coral)] active:scale-[0.99]'
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Enviant…
            </>
          ) : (
            <>
              <Send className="size-5" />
              Enviar la sol·licitud
            </>
          )}
        </button>
      </div>
    </section>
  );
}
