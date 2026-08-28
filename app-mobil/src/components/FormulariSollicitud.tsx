'use client';

import React, { useState, useEffect } from 'react';
import { CalendarDays, User, TriangleAlert, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, type SollicitudMultiple, type CartItem } from '@/lib/api';
import { validarPlazoPedido, type ValidacionFecha } from '@/lib/dateValidation';
import { Combobox } from '@/components/ui/combobox';
import ItemForm from './ItemForm';
import CartView from './CartView';

export default function FormulariSollicitud() {
  const [carregant, setCarregant] = useState(true);
  const [enviant, setEnviant] = useState(false);
  const [enviat, setEnviat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monitors, setMonitors] = useState<string[]>([]);
  const [carret, setCarret] = useState<CartItem[]>([]);

  const [nomCognoms, setNomCognoms] = useState('');
  const [dataNecessitat, setDataNecessitat] = useState('');
  const [comentaris, setComentaris] = useState('');

  const [validacio, setValidacio] = useState<ValidacionFecha | null>(null);
  const [avisTermini, setAvisTermini] = useState(false);

  useEffect(() => {
    apiClient
      .getMonitors()
      .then(r => {
        if (r.success && r.data) setMonitors(r.data);
        else setError('No s\'han pogut carregar els monitors');
      })
      .catch(() => setError('Error carregant les dades inicials'))
      .finally(() => setCarregant(false));
  }, []);

  const canviarData = (valor: string) => {
    setDataNecessitat(valor);
    if (!valor) {
      setValidacio(null);
      return;
    }

    const resultat = validarPlazoPedido(new Date(valor));
    setValidacio(resultat);
    setAvisTermini(!resultat.cumplePlazo);
  };

  const enviar = async () => {
    setError(null);

    const nom = nomCognoms.trim();
    const esAdmin = nom.toLowerCase() === 'eixos';

    if (!nom) return setError('Tria el teu nom de la llista');
    if (!esAdmin && !monitors.includes(nom)) {
      return setError('Tria un nom vàlid de la llista, o escriu «eixos» per al mode admin');
    }
    if (!dataNecessitat) return setError('Indica per quin dia et fa falta');
    if (carret.length === 0) return setError('Afegeix almenys un material al carret');

    setEnviant(true);
    try {
      const sollicitud: SollicitudMultiple = {
        nomCognoms: nom,
        dataNecessitat,
        items: carret,
        altresMaterials: comentaris.trim() || undefined,
        entregaManual: validacio?.requiereEntregaManual || false,
      };

      const resposta = await apiClient.createMultipleSollicitud(sollicitud);

      if (resposta.success) {
        setEnviat(true);
        toast.success(`Sol·licitud enviada · ${carret.length} materials`);
        setNomCognoms('');
        setDataNecessitat('');
        setComentaris('');
        setCarret([]);
        setValidacio(null);
        setTimeout(() => setEnviat(false), 6000);
      } else {
        setError(resposta.error || 'Error enviant la sol·licitud');
      }
    } catch {
      setError('Error de connexió. Comprova que tens internet.');
    } finally {
      setEnviant(false);
    }
  };

  if (carregant) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p className="text-sm text-fg3">Carregant…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-12">
      <header className="pt-header pb-5 text-center">
        <img
          src="https://www.eixoscreativa.com/wp-content/uploads/2024/01/Eixos-creativa.png.webp"
          alt="Eixos Creativa"
          className="mx-auto h-9 object-contain dark:brightness-0 dark:invert"
        />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-fg1">
          Sol·licitud de materials
        </h1>
        <p className="mt-1 text-sm text-fg3">
          Afegeix el que necessites i envia-ho tot de cop
        </p>
      </header>

      {enviat && (
        <p className="mb-4 flex items-start gap-2 rounded-[var(--radius-field)] bg-verd-50 px-4 py-3 text-sm text-verd-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Sol·licitud enviada correctament. Rebràs la confirmació aviat.
        </p>
      )}

      {error && (
        <p className="mb-4 flex items-start gap-2 rounded-[var(--radius-field)] bg-coral-50 px-4 py-3 text-sm text-coral-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="space-y-4">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-1)]">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-fg1">
            Les teves dades
          </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-fg2">Nom i cognoms</label>
              <Combobox
                value={nomCognoms}
                onChange={setNomCognoms}
                options={monitors}
                allowCustom
                placeholder="Qui ets?"
                emptyText="Cap monitor amb aquest nom"
                icon={<User className="size-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="data" className="block text-sm font-medium text-fg2">
                Per quin dia et fa falta
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg3" />
                <input
                  id="data"
                  type="date"
                  value={dataNecessitat}
                  onChange={e => canviarData(e.target.value)}
                  className="w-full rounded-[var(--radius-field)] border border-line bg-field py-3 pl-11 pr-4 text-[15px] outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
                />
              </div>

              {validacio && !validacio.cumplePlazo && (
                <button
                  type="button"
                  onClick={() => setAvisTermini(true)}
                  className="flex w-full items-center gap-2 rounded-[var(--radius-field)] bg-groc-50 px-4 py-2.5 text-left text-sm text-groc-700"
                >
                  <TriangleAlert className="size-4 shrink-0" />
                  Termini just — toca per veure què implica
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="comentaris" className="block text-sm font-medium text-fg2">
                Comentaris <span className="font-normal text-fg3">(opcional)</span>
              </label>
              <textarea
                id="comentaris"
                rows={2}
                value={comentaris}
                onChange={e => setComentaris(e.target.value)}
                placeholder="Alguna cosa que hàgim de saber"
                className="w-full resize-none rounded-[var(--radius-field)] border border-line bg-field px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-fg3 focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </div>
          </div>
        </section>

        <ItemForm
          selectedMonitor={nomCognoms}
          onAddItem={item => {
            setCarret(prev => [...prev, item]);
            setError(null);
          }}
          loading={enviant}
        />

        <CartView
          items={carret}
          onRemoveItem={id => setCarret(prev => prev.filter(i => i.id !== id))}
          onSubmitCart={enviar}
          submitting={enviant}
        />
      </div>

      <p className="mt-6 px-2 text-center text-sm text-fg3">
        Pots posar materials de diferents escoles i activitats al mateix carret.
      </p>

      {avisTermini && validacio && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
          onClick={() => setAvisTermini(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-hero)] bg-surface p-6 shadow-[var(--shadow-3)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold text-fg1">
                <TriangleAlert className="size-5 text-groc-600" />
                Termini vençut
              </h3>
              <button
                type="button"
                onClick={() => setAvisTermini(false)}
                aria-label="Tancar"
                className="-mr-2 -mt-1 rounded-full p-2 text-fg3 hover:bg-soft"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="whitespace-pre-line text-[15px] leading-relaxed text-fg2">
              {validacio.mensaje}
            </p>

            <button
              type="button"
              onClick={() => setAvisTermini(false)}
              className="mt-5 min-h-12 w-full rounded-[var(--radius-field)] bg-brand px-5 font-semibold text-white shadow-[var(--shadow-blau)] active:scale-[0.99]"
            >
              Entesos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
