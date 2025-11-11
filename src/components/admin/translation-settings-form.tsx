'use client';

import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { BudgetExhaustedMode, TranslationProvider, TranslationSettings } from '@prisma/client';

const providerLabels: Record<TranslationProvider, string> = {
  OPENAI: 'OpenAI (پیشنهاد شده)',
  LIBRETRANSLATE: 'LibreTranslate (آزمایشی)',
  DISABLED: 'غیرفعال'
};

const budgetModeLabels: Record<BudgetExhaustedMode, string> = {
  SHOW_ENGLISH: 'نمایش متن انگلیسی با هشدار',
  QUEUE_TOMORROW: 'صف‌بندی برای فردا',
  SKIP: 'بدون اقدام'
};

type FormState = {
  enabled: boolean;
  defaultProvider: TranslationProvider;
  allowLibreExperimental: boolean;
  fallbackProvider: TranslationProvider | null;
  openaiModel: string;
  dailyBudgetUsd: number;
  dailyTokenLimit: number;
  budgetExhaustedMode: BudgetExhaustedMode;
};

type TranslationSettingsFormProps = {
  initialSettings: TranslationSettings;
};

export default function TranslationSettingsForm({ initialSettings }: TranslationSettingsFormProps) {
  const [form, setForm] = useState<FormState>({
    enabled: initialSettings.enabled,
    defaultProvider: initialSettings.defaultProvider,
    allowLibreExperimental: initialSettings.allowLibreExperimental,
    fallbackProvider: initialSettings.fallbackProvider ?? null,
    openaiModel: initialSettings.openaiModel,
    dailyBudgetUsd: initialSettings.dailyBudgetUsd,
    dailyTokenLimit: initialSettings.dailyTokenLimit,
    budgetExhaustedMode: initialSettings.budgetExhaustedMode
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const defaultProviderOptions = useMemo(() => {
    const options: { value: TranslationProvider; label: string; disabled?: boolean }[] = [
      { value: 'OPENAI', label: providerLabels.OPENAI },
      { value: 'DISABLED', label: providerLabels.DISABLED }
    ];

    if (form.allowLibreExperimental) {
      options.push({ value: 'LIBRETRANSLATE', label: providerLabels.LIBRETRANSLATE });
    }

    return options;
  }, [form.allowLibreExperimental]);

  const fallbackProviderOptions = useMemo(() => {
    const options: { value: TranslationProvider | 'NONE'; label: string }[] = [
      { value: 'NONE', label: 'بدون جایگزین' }
    ];

    if (form.allowLibreExperimental) {
      options.push({ value: 'LIBRETRANSLATE', label: providerLabels.LIBRETRANSLATE });
    }

    return options;
  }, [form.allowLibreExperimental]);

  function handleToggleEnabled(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked;
    setForm((prev) => ({ ...prev, enabled: checked }));
  }

  function handleToggleLibre(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked;
    setForm((prev) => ({
      ...prev,
      allowLibreExperimental: checked,
      defaultProvider:
        !checked && prev.defaultProvider === 'LIBRETRANSLATE' ? 'OPENAI' : prev.defaultProvider,
      fallbackProvider: checked ? prev.fallbackProvider : null
    }));
  }

  function handleDefaultProviderChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as TranslationProvider;
    setForm((prev) => ({ ...prev, defaultProvider: value }));
  }

  function handleFallbackProviderChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as TranslationProvider | 'NONE';
    setForm((prev) => ({ ...prev, fallbackProvider: value === 'NONE' ? null : (value as TranslationProvider) }));
  }

  function handleOpenaiModelChange(event: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, openaiModel: event.target.value }));
  }

  function handleDailyBudgetChange(event: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, dailyBudgetUsd: Number(event.target.value) }));
  }

  function handleDailyTokenLimitChange(event: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, dailyTokenLimit: Number(event.target.value) }));
  }

  function handleBudgetModeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as BudgetExhaustedMode;
    setForm((prev) => ({ ...prev, budgetExhaustedMode: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setStatus('idle');
    setErrorMessage(null);

    const payload = {
      enabled: form.enabled,
      defaultProvider: form.defaultProvider,
      allowLibreExperimental: form.allowLibreExperimental,
      fallbackProvider: form.fallbackProvider,
      openaiModel: form.openaiModel.trim() || 'gpt-4o-mini',
      dailyBudgetUsd: Number.isFinite(form.dailyBudgetUsd) ? form.dailyBudgetUsd : 0,
      dailyTokenLimit: Number.isFinite(form.dailyTokenLimit) ? Math.floor(form.dailyTokenLimit) : 0,
      budgetExhaustedMode: form.budgetExhaustedMode
    };

    if (!form.allowLibreExperimental && payload.defaultProvider === 'LIBRETRANSLATE') {
      payload.defaultProvider = 'OPENAI';
    }

    if (!form.allowLibreExperimental) {
      payload.fallbackProvider = null;
    }

    try {
      const response = await fetch('/api/admin/translation/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(data?.error ?? 'به‌روزرسانی تنظیمات با خطا مواجه شد.');
      } else {
        setStatus('saved');
      }
    } catch (error) {
      console.error('Failed to update translation settings', error);
      setStatus('error');
      setErrorMessage('برقراری ارتباط با سرور امکان‌پذیر نبود.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-700 bg-slate-800/60 p-6">
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-100">عمومی</legend>
        <label className="flex items-center gap-3 text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.enabled}
            onChange={handleToggleEnabled}
          />
          فعال‌سازی ترجمه خودکار
        </label>
        <label className="flex items-center gap-3 text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.allowLibreExperimental}
            onChange={handleToggleLibre}
          />
          فعال‌سازی گزینه‌های آزمایشی LibreTranslate
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-100">ارائه‌دهنده</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-slate-200">
            <span>ارائه‌دهنده پیش‌فرض</span>
            <select
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
              value={form.defaultProvider}
              onChange={handleDefaultProviderChange}
            >
              {defaultProviderOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-slate-200">
            <span>ارائه‌دهنده جایگزین</span>
            <select
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
              value={form.fallbackProvider ?? 'NONE'}
              onChange={handleFallbackProviderChange}
              disabled={!form.allowLibreExperimental}
            >
              {fallbackProviderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-100">OpenAI</legend>
        <label className="flex flex-col gap-2 text-slate-200">
          <span>مدل پیش‌فرض</span>
          <input
            type="text"
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
            value={form.openaiModel}
            onChange={handleOpenaiModelChange}
            placeholder="gpt-4o-mini"
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-slate-100">بودجه روزانه</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-slate-200">
            <span>بودجه (دلار)</span>
            <input
              type="number"
              min={0}
              step={0.1}
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
              value={form.dailyBudgetUsd}
              onChange={handleDailyBudgetChange}
            />
          </label>
          <label className="flex flex-col gap-2 text-slate-200">
            <span>حداکثر توکن</span>
            <input
              type="number"
              min={0}
              step={1000}
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
              value={form.dailyTokenLimit}
              onChange={handleDailyTokenLimitChange}
            />
          </label>
        </div>
        <label className="flex flex-col gap-2 text-slate-200">
          <span>رفتار پس از اتمام بودجه</span>
          <select
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100"
            value={form.budgetExhaustedMode}
            onChange={handleBudgetModeChange}
          >
            {Object.entries(budgetModeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm">
          {status === 'saved' && <span className="text-emerald-400">تنظیمات با موفقیت ذخیره شد.</span>}
          {status === 'error' && <span className="text-rose-400">{errorMessage}</span>}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-wait disabled:bg-emerald-700"
        >
          {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
        </button>
      </div>
    </form>
  );
}
