'use client';

import React, { useState, useEffect } from 'react';
import { School, Layers, Package, Plus, AlertCircle } from 'lucide-react';
import { apiClient, type CartItem } from '@/lib/api';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';

/**
 * Els materials que comencen per SOBRE van primer (són la base de les fitxes de
 * Honey Clay) i «Altres materials» sempre al final.
 */
const ordenaMaterials = (materials: string[]): string[] => {
  if (!materials?.length) return [];

  const sobres: string[] = [];
  const altres: string[] = [];
  const resta: string[] = [];

  for (const material of materials) {
    if (material === 'Altres materials') altres.push(material);
    else if (material.toUpperCase().startsWith('SOBRE')) sobres.push(material);
    else resta.push(material);
  }

  resta.sort((a, b) => a.localeCompare(b, 'ca', { sensitivity: 'base' }));
  return [...sobres, ...resta, ...altres];
};

interface ItemFormProps {
  selectedMonitor: string;
  onAddItem: (item: CartItem) => void;
  loading?: boolean;
}

const ALTRES = 'Altres materials';

/**
 * crypto.randomUUID nomes existeix en context segur: obrint l'app des del mobil
 * per IP (http://192.168.x.x) peta i no s'afegeix res al carret. Nomes cal que
 * sigui unic dins d'aquesta llista.
 */
const idUnic = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function ItemForm({ selectedMonitor, onAddItem, loading = false }: ItemFormProps) {
  const [escola, setEscola] = useState('');
  const [activitat, setActivitat] = useState('');
  const [material, setMaterial] = useState('');
  const [materialLliure, setMaterialLliure] = useState('');
  const [unitats, setUnitats] = useState('');

  const [escoles, setEscoles] = useState<string[]>([]);
  const [activitats, setActivitats] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);

  const [carregantEscoles, setCarregantEscoles] = useState(false);
  const [carregantActivitats, setCarregantActivitats] = useState(false);
  const [carregantMaterials, setCarregantMaterials] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "eixos" és el mode admin: veu totes les escoles, no només les seves
  const esAdmin = selectedMonitor.trim().toLowerCase() === 'eixos';

  useEffect(() => {
    setEscola('');
    setActivitat('');
    setMaterial('');
    setMaterialLliure('');

    if (!selectedMonitor) {
      setEscoles([]);
      return;
    }

    let cancelat = false;
    setCarregantEscoles(true);

    const carregar = esAdmin
      ? apiClient.getEscoles()
      : apiClient.getSchoolsByMonitor(selectedMonitor);

    carregar
      .then(r => {
        if (!cancelat) setEscoles(r.success && r.data ? r.data : []);
      })
      .catch(err => {
        if (cancelat) return;
        console.error('Error carregant escoles:', err);
        setEscoles([]);
      })
      .finally(() => {
        if (!cancelat) setCarregantEscoles(false);
      });

    return () => {
      cancelat = true;
    };
  }, [selectedMonitor, esAdmin]);

  useEffect(() => {
    setActivitat('');
    setMaterial('');
    setMaterialLliure('');

    if (!escola || !selectedMonitor) {
      setActivitats([]);
      return;
    }

    let cancelat = false;
    setCarregantActivitats(true);

    const carregar = esAdmin
      ? apiClient.getActivitiesBySchool(escola)
      : apiClient.getActivitiesByMonitorAndSchool(selectedMonitor, escola);

    carregar
      .then(r => {
        if (!cancelat) setActivitats(r.success && r.data ? r.data : []);
      })
      .catch(err => {
        if (cancelat) return;
        console.error('Error carregant activitats:', err);
        setActivitats([]);
      })
      .finally(() => {
        if (!cancelat) setCarregantActivitats(false);
      });

    return () => {
      cancelat = true;
    };
  }, [escola, selectedMonitor, esAdmin]);

  useEffect(() => {
    setMaterial('');
    setMaterialLliure('');

    if (!activitat) {
      setMaterials([]);
      return;
    }

    let cancelat = false;
    setCarregantMaterials(true);

    apiClient
      .getMaterialsByActivity(activitat)
      .then(r => {
        if (cancelat) return;
        // Sense catàleg (TC, JL) o resposta buida: només entrada manual
        const llista = r.success && r.data?.length ? [...r.data, ALTRES] : [ALTRES];
        setMaterials(ordenaMaterials(llista));
      })
      .catch(() => {
        if (!cancelat) setMaterials([ALTRES]);
      })
      .finally(() => {
        if (!cancelat) setCarregantMaterials(false);
      });

    return () => {
      cancelat = true;
    };
  }, [activitat]);

  const esLliure = material === ALTRES;

  const afegir = () => {
    setError(null);

    if (!escola || !activitat || !material) {
      setError('Omple escola, activitat i material');
      return;
    }
    if (esLliure && !materialLliure.trim()) {
      setError('Escriu quin material necessites');
      return;
    }

    const quantitat = parseInt(unitats, 10) || 1;
    if (quantitat <= 0) {
      setError('Les unitats han de ser un nombre positiu');
      return;
    }

    onAddItem({
      id: idUnic(),
      escola,
      activitat,
      material: esLliure ? materialLliure.trim() : material,
      customMaterial: esLliure ? materialLliure.trim() : undefined,
      unitats: quantitat,
    });

    // L'escola i l'activitat es mantenen: normalment s'afegeixen diversos
    // materials seguits de la mateixa activitat.
    setMaterial('');
    setMaterialLliure('');
    setUnitats('');
  };

  const potAfegir = Boolean(escola && activitat && material && (!esLliure || materialLliure.trim()));

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-1)]">
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-lg font-semibold text-fg1">
        Afegir material
      </h2>

      {!selectedMonitor && (
        <p className="rounded-[var(--radius-field)] bg-soft px-4 py-3 text-sm text-fg2">
          Tria primer el teu nom a dalt.
        </p>
      )}

      {selectedMonitor && (
        <div className="space-y-4">
          <Field label="Escola">
            <Combobox
              value={escola}
              onChange={setEscola}
              options={escoles}
              loading={carregantEscoles}
              placeholder="A quina escola?"
              emptyText="Cap escola per a aquest monitor"
              icon={<School className="size-4" />}
            />
          </Field>

          <Field label="Activitat">
            <Combobox
              value={activitat}
              onChange={setActivitat}
              options={activitats}
              disabled={!escola}
              loading={carregantActivitats}
              placeholder={escola ? 'Quina activitat?' : 'Tria una escola primer'}
              emptyText="Cap activitat en aquesta escola"
              icon={<Layers className="size-4" />}
            />
          </Field>

          <Field label="Material">
            <Combobox
              value={material}
              onChange={setMaterial}
              options={materials}
              disabled={!activitat}
              loading={carregantMaterials}
              placeholder={activitat ? 'Quin material?' : "Tria una activitat primer"}
              icon={<Package className="size-4" />}
            />
          </Field>

          {esLliure && (
            <Field label="Quin material">
              <input
                value={materialLliure}
                onChange={e => setMaterialLliure(e.target.value)}
                placeholder="Escriu-lo tal com el demanaries"
                autoFocus
                className="w-full rounded-[var(--radius-field)] border border-line bg-field px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-fg3 focus:border-brand focus:ring-2 focus:ring-brand/25"
              />
            </Field>
          )}

          <Field label="Unitats">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={unitats}
              onChange={e => setUnitats(e.target.value)}
              placeholder="1"
              className="w-full rounded-[var(--radius-field)] border border-line bg-field px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-fg3 focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </Field>

          {error && (
            <p className="flex items-start gap-2 rounded-[var(--radius-field)] bg-coral-50 px-4 py-3 text-sm text-coral-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={afegir}
            disabled={!potAfegir || loading}
            className={cn(
              'flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-field)] px-5 font-semibold transition-all',
              potAfegir && !loading
                ? 'bg-brand text-white shadow-[var(--shadow-blau)] active:scale-[0.99]'
                : 'cursor-not-allowed bg-soft text-fg3'
            )}
          >
            <Plus className="size-5" />
            Afegir al carret
          </button>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-fg2">{label}</label>
      {children}
    </div>
  );
}
