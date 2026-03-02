/**
 * Azure Voice Live Pricing Calculator
 * Fetches live prices from Azure Retail Prices API and calculates costs.
 */

(function () {
    'use strict';

    // ───── Default Prices (accurate fallback from API as of Feb 2026, East US) ─────
    const DEFAULT_PRICES = {
        voiceLive: {
            pro: {
                standardAudioInput: 0.017, standardAudioOutput: 0.038, standardAudioCached: 0.00044,
                customAudioInput: 0.04, customAudioOutput: 0.055, customAudioCached: 0.00044,
                llmTextInput: 0.0044, llmTextOutput: 0.0176, llmTextCached: 0.001375,
                llmAudioInput: 0.0352, llmAudioOutput: 0.0704, llmAudioCached: 0.00044
            },
            standard: {
                standardAudioInput: 0.015, standardAudioOutput: 0.033, standardAudioCached: 0.00033,
                customAudioInput: 0.039, customAudioOutput: 0.05, customAudioCached: 0.00033,
                llmTextInput: 0.00066, llmTextOutput: 0.00264, llmTextCached: 0.00033,
                llmAudioInput: 0.011, llmAudioOutput: 0.022, llmAudioCached: 0.00033
            },
            lite: {
                standardAudioInput: 0.015, standardAudioOutput: 0.033, standardAudioCached: 0.00004,
                customAudioInput: 0.038, customAudioOutput: 0.05, customAudioCached: 0.00004,
                llmTextInput: 0.00011, llmTextOutput: 0.00044, llmTextCached: 0.00004,
                llmAudioInput: 0.004, llmAudioOutput: 0, llmAudioCached: 0.00004
            },
            byo: {
                standardAudioInput: 0.0125, standardAudioOutput: 0.03, standardAudioCached: 0,
                customAudioInput: 0.036, customAudioOutput: 0.047, customAudioCached: 0,
                llmTextInput: 0, llmTextOutput: 0, llmTextCached: 0,
                llmAudioInput: 0, llmAudioOutput: 0, llmAudioCached: 0
            }
        },
        stt: {
            realtimeStandard: 1.00, realtimeCustom: 1.20,
            batchStandard: 0.18, batchCustom: 0.225,
            fastStandard: 0.36, fastCustom: 0.45,
            enhancedLangId: 0.30, enhancedDiarization: 0.30, enhancedPronunciation: 0.30,
            customTraining: 10.00, customHosting: 0.05375
        },
        tts: {
            neural: 15.00, neuralHD: 30.00,
            customNeural: 24.00, customNeuralHD: 48.00,
            personalVoice: 24.00,
            customVoiceTraining: 52.00, customVoiceHosting: 4.032
        },
        translation: { realtime: 2.50 },
        interpreter: {
            inputAudio: 1.00, outputText: 10.00,
            outputAudioStd: 1.50, outputAudioCustom: 2.00
        },
        video: {
            inputVideo: 5.00, outputStd: 15.00, outputPersonal: 20.00
        },
        avatar: { interactiveRealtime: 0.50 },
        speaker: { identification: 10.00, verification: 5.00 }
    };

    // ───── Meter name mapping from Azure API to our internal keys ─────
    // IMPORTANT: These must match the EXACT meter names returned by the Azure Retail Prices API,
    // including typos and inconsistent spacing present in the real API responses.
    const METER_MAP = {
        // Voice Live Pro (all end with " Tokens" in the API)
        'Voice Live API Pro - Standard Speech Audio Input Tokens': { tier: 'pro', key: 'standardAudioInput' },
        'Voice Live API Pro - Standard Speech Audio Output Tokens': { tier: 'pro', key: 'standardAudioOutput' },
        'Voice Live API Pro - Standard Speech Audio Cached Tokens': { tier: 'pro', key: 'standardAudioCached' },
        'Voice Live API Pro - Custom Speech Audio Input Tokens': { tier: 'pro', key: 'customAudioInput' },
        'Voice Live API Pro - Custom Speech Audio Output Tokens': { tier: 'pro', key: 'customAudioOutput' },
        'Voice Live API Pro - Custom Speech Audio Cached Tokens': { tier: 'pro', key: 'customAudioCached' },
        'Voice Live API Pro - LLM Text Input Tokens': { tier: 'pro', key: 'llmTextInput' },
        'Voice Live API Pro - LLM Text Output Tokens': { tier: 'pro', key: 'llmTextOutput' },
        'Voice Live API Pro - LLM Text Cached Tokens': { tier: 'pro', key: 'llmTextCached' },
        'Voice Live API Pro - LLM Audio Input Tokens': { tier: 'pro', key: 'llmAudioInput' },
        'Voice Live API Pro - LLM Audio Output Tokens': { tier: 'pro', key: 'llmAudioOutput' },
        'Voice Live API Pro - LLM Audio Cached Tokens': { tier: 'pro', key: 'llmAudioCached' },
        // Voice Live Standard (note Azure API typos: "Outpt", "Cache", missing space before dash)
        'Voice Live API Std - Standard Speech Audio Input Tokens': { tier: 'standard', key: 'standardAudioInput' },
        'Voice Live API Std - Standard Speech Audio Outpt Tokens': { tier: 'standard', key: 'standardAudioOutput' },
        'Voice Live API Std - Standard Speech Audio Cache Tokens': { tier: 'standard', key: 'standardAudioCached' },
        'Voice Live API Std - Custom Speech Audio Input Tokens': { tier: 'standard', key: 'customAudioInput' },
        'Voice Live API Std - Custom Speech Audio Output Tokens': { tier: 'standard', key: 'customAudioOutput' },
        'Voice Live API Std - Custom Speech Audio Cached Tokens': { tier: 'standard', key: 'customAudioCached' },
        'Voice Live API Std - LLM Text Input Tokens': { tier: 'standard', key: 'llmTextInput' },
        'Voice Live API Std - LLM Text Output Tokens': { tier: 'standard', key: 'llmTextOutput' },
        'Voice Live API Std - LLM Text Cached Tokens': { tier: 'standard', key: 'llmTextCached' },
        'Voice Live API Std - LLM Audio Input Tokens': { tier: 'standard', key: 'llmAudioInput' },
        'Voice Live API Std- LLM Audio Output Tokens': { tier: 'standard', key: 'llmAudioOutput' },  // API has no space before dash
        'Voice Live API Std- LLM Audio Cached Tokens': { tier: 'standard', key: 'llmAudioCached' },  // API has no space before dash
        // Voice Live Lite
        'Voice Live API Lite - Standard Speech Audio Input Tokens': { tier: 'lite', key: 'standardAudioInput' },
        'Voice Live API Lite - Standard Speech Audio Output Tokens': { tier: 'lite', key: 'standardAudioOutput' },
        'Voice Live API Lite - Standard Speech Audio Cached Tokens': { tier: 'lite', key: 'standardAudioCached' },
        'Voice Live API Lite - Custom Speech Audio Input Tokens': { tier: 'lite', key: 'customAudioInput' },
        'Voice Live API Lite - Custom Speech Audio Output Tokens': { tier: 'lite', key: 'customAudioOutput' },
        'Voice Live API Lite - Custom Speech Audio Cached Tokens': { tier: 'lite', key: 'customAudioCached' },
        'Voice Live API Lite - LLM Text Input Tokens': { tier: 'lite', key: 'llmTextInput' },
        'Voice Live API Lite - LLM Text Output Tokens': { tier: 'lite', key: 'llmTextOutput' },
        'Voice Live API Lite - LLM Text Cached Tokens': { tier: 'lite', key: 'llmTextCached' },
        'Voice Live API Lite - LLM Audio Input Tokens': { tier: 'lite', key: 'llmAudioInput' },
        'Voice Live API Lite - LLM Audio Cached Tokens': { tier: 'lite', key: 'llmAudioCached' },
        // Voice Live BYO
        'Voice Live BYO Standard Speech Audio Input Tokens': { tier: 'byo', key: 'standardAudioInput' },
        'Voice Live BYO Standard Speech Audio Output Tokens': { tier: 'byo', key: 'standardAudioOutput' },
        'Voice Live BYO Custom Speech Audio Input Tokens': { tier: 'byo', key: 'customAudioInput' },
        'Voice Live BYO Custom Speech Audio Output Tokens': { tier: 'byo', key: 'customAudioOutput' },
        // STT (note: API uses mixed casing – "To" vs "to" for different meters)
        'S1 Speech To Text': { category: 'stt', key: 'realtimeStandard' },
        'S1 Custom Speech To Text': { category: 'stt', key: 'realtimeCustom' },
        'S1 Speech to Text Batch': { category: 'stt', key: 'batchStandard' },          // lowercase "to" in API
        'S1 Custom Speech to Text Batch': { category: 'stt', key: 'batchCustom' },      // lowercase "to" in API
        'Fast Transcription Speech To Text': { category: 'stt', key: 'fastStandard' },
        'Custom - Fast Transcription Speech To Text': { category: 'stt', key: 'fastCustom' },
        'S1 Speech to Text Enhanced Feature Audio': { category: 'stt', key: 'enhancedLangId' },
        'S1 Custom Speech Training': { category: 'stt', key: 'customTraining' },
        'S1 Custom Speech Model Hosting Unit': { category: 'stt', key: 'customHosting', unitFilter: '1/Hour' },
        // TTS
        'S1 Neural Text To Speech Characters': { category: 'tts', key: 'neural' },
        'Neural HD Text to Speech Characters': { category: 'tts', key: 'neuralHD' },
        'S1 Custom Neural Realtime Characters': { category: 'tts', key: 'customNeural' },
        'CNV Neural HD Synthesis Characters': { category: 'tts', key: 'customNeuralHD' },
        'Text to Speech - Personal Voice Characters': { category: 'tts', key: 'personalVoice' },
        'S1 Custom Neural Training': { category: 'tts', key: 'customVoiceTraining' },
        'S1 Custom Neural Voice Model Hosting Unit': { category: 'tts', key: 'customVoiceHosting' },
        // Translation
        'S1 Speech Translation': { category: 'translation', key: 'realtime' },
        // Interpreter
        'Live Interpreter Input Audio': { category: 'interpreter', key: 'inputAudio' },
        'Live Interpreter Text Output Characters': { category: 'interpreter', key: 'outputText' },
        'Live Interpreter Std Audio Output': { category: 'interpreter', key: 'outputAudioStd' },
        'Live Interpreter Custom Audio': { category: 'interpreter', key: 'outputAudioCustom' },
        // Video Translation
        'Video Translation Input Audio': { category: 'video', key: 'inputVideo' },
        'Video Translation Std Audio Output': { category: 'video', key: 'outputStd' },
        'Video Translation Cstm Audio Output': { category: 'video', key: 'outputPersonal' },
        // Avatar
        'TTS Standard Avatar Realtime Speech': { category: 'avatar', key: 'interactiveRealtime' },
        // Speaker
        'S1 Speaker Identification Transactions': { category: 'speaker', key: 'identification' },
        'S1 Speaker Verification Transactions': { category: 'speaker', key: 'verification' }
    };

    // ───── Unit labels for display ─────
    const UNIT_LABELS = {
        voiceLive: {
            standardAudioInput: '1K tokens', standardAudioOutput: '1K tokens', standardAudioCached: '1K tokens',
            customAudioInput: '1K tokens', customAudioOutput: '1K tokens', customAudioCached: '1K tokens',
            llmTextInput: '1K tokens', llmTextOutput: '1K tokens', llmTextCached: '1K tokens',
            llmAudioInput: '1K tokens', llmAudioOutput: '1K tokens', llmAudioCached: '1K tokens'
        },
        stt: {
            realtimeStandard: 'hour', realtimeCustom: 'hour',
            batchStandard: 'hour', batchCustom: 'hour',
            fastStandard: 'hour', fastCustom: 'hour',
            enhancedLangId: 'hour', enhancedDiarization: 'hour', enhancedPronunciation: 'hour',
            customTraining: 'compute hour', customHosting: 'hour'
        },
        tts: {
            neural: '1M chars', neuralHD: '1M chars',
            customNeural: '1M chars', customNeuralHD: '1M chars',
            personalVoice: '1M chars',
            customVoiceTraining: 'compute hour', customVoiceHosting: 'hour'
        },
        translation: { realtime: 'audio hour' },
        interpreter: { inputAudio: 'hour', outputText: '1M chars', outputAudioStd: 'hour', outputAudioCustom: 'hour' },
        video: { inputVideo: 'hour', outputStd: 'hour', outputPersonal: 'hour' },
        avatar: { interactiveRealtime: 'minute' },
        speaker: { identification: '1K txns', verification: '1K txns' }
    };

    // Friendly category names
    const CATEGORY_NAMES = {
        voiceLive: 'Voice Live API',
        stt: 'Speech to Text',
        tts: 'Text to Speech',
        translation: 'Speech Translation',
        interpreter: 'Live Interpreter',
        video: 'Video Translation',
        avatar: 'Avatar',
        speaker: 'Speaker Recognition'
    };

    // Friendly meter names
    const METER_NAMES = {
        standardAudioInput: 'Std Audio Input', standardAudioOutput: 'Std Audio Output', standardAudioCached: 'Std Audio Cached',
        customAudioInput: 'Custom Audio Input', customAudioOutput: 'Custom Audio Output', customAudioCached: 'Custom Audio Cached',
        llmTextInput: 'LLM Text Input', llmTextOutput: 'LLM Text Output', llmTextCached: 'LLM Text Cached',
        llmAudioInput: 'LLM Audio Input', llmAudioOutput: 'LLM Audio Output', llmAudioCached: 'LLM Audio Cached',
        realtimeStandard: 'Realtime – Standard', realtimeCustom: 'Realtime – Custom',
        batchStandard: 'Batch – Standard', batchCustom: 'Batch – Custom',
        fastStandard: 'Fast Transcription', fastCustom: 'Fast Transcription – Custom',
        enhancedLangId: 'Enhanced: Language ID', enhancedDiarization: 'Enhanced: Diarization',
        enhancedPronunciation: 'Enhanced: Pronunciation',
        customTraining: 'Custom Training', customHosting: 'Custom Model Hosting',
        neural: 'Neural Voice', neuralHD: 'Neural HD Voice',
        customNeural: 'Custom Neural Pro', customNeuralHD: 'Custom Neural HD',
        personalVoice: 'Personal Voice',
        customVoiceTraining: 'Voice Training', customVoiceHosting: 'Voice Hosting',
        realtime: 'Real-time Translation',
        inputAudio: 'Input Audio', outputText: 'Output Text',
        outputAudioStd: 'Output Audio (Std)', outputAudioCustom: 'Output Audio (Custom)',
        inputVideo: 'Input Video', outputStd: 'Output Std Voice', outputPersonal: 'Output Personal Voice',
        interactiveRealtime: 'Interactive Real-time',
        identification: 'Speaker ID', verification: 'Speaker Verify'
    };

    // ───── State ─────
    const STORAGE_KEY = 'azureVoiceLivePrices';
    let currentPrices = JSON.parse(JSON.stringify(DEFAULT_PRICES));
    let selectedTier = 'pro';
    let apiPricesLoaded = false;
    let lastRefreshInfo = null; // { date, region, currency, meterCount }

    // ───── DOM refs ─────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ───── Init ─────
    function init() {
        generateQuoteRef();
        loadCachedPrices();
        bindTierSelection();
        bindToggles();
        bindInputs();
        bindVoiceLiveEstimator();
        bindExports();
        bindRefresh();
        bindConfigChanges();
        recalculate();
    }

    function generateQuoteRef() {
        const now = new Date();
        const ref = 'AZ-VL-' +
            now.getFullYear().toString().slice(2) +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '-' +
            Math.random().toString(36).substring(2, 6).toUpperCase();
        $('#quoteRef').value = ref;
    }

    // ───── Price Persistence (localStorage) ─────
    function loadCachedPrices() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const cached = JSON.parse(raw);
            if (cached.prices && cached.meta) {
                currentPrices = cached.prices;
                lastRefreshInfo = cached.meta;
                apiPricesLoaded = true;
                updatePriceStatus(true, cached.meta.meterCount);
                updateTierPreviews();
            }
        } catch (e) {
            console.warn('[Pricing] Failed to load cached prices:', e);
        }
    }

    function savePricesToCache(meterCount) {
        const region = $('#regionSelect').value;
        const currency = $('#currencySelect').value;
        lastRefreshInfo = {
            date: new Date().toISOString(),
            region,
            currency,
            meterCount
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                prices: currentPrices,
                meta: lastRefreshInfo
            }));
        } catch (e) {
            console.warn('[Pricing] Failed to cache prices:', e);
        }
    }

    // ───── LLM Mode ↔ Tier/Model compatibility ─────
    // Maps model values to allowed LLM processing modes.
    // Realtime models support native audio; text models support text; both is available when audio is.
    // Lite SLMs are text-only (no LLM audio output). BYO has no LLM tokens.
    // Which LLM modes each model supports
    const MODEL_LLM_MODES = {
        'gpt-realtime':        ['audio', 'text', 'both'],
        'gpt-4o':              ['text', 'audio', 'both'],
        'gpt-4.1':             ['text', 'audio', 'both'],
        'gpt-4o-mini-realtime':['audio', 'text', 'both'],
        'gpt-4o-mini':         ['text', 'audio', 'both'],
        'gpt-4.1-mini':        ['text', 'audio', 'both'],
        'gpt-4.1-nano':        ['text'],
        'phi':                 ['text'],
        'custom':              ['text', 'audio', 'both']  // BYO
    };

    // Audio token rates per model family (from Microsoft docs)
    const MODEL_TOKEN_RATES = {
        'gpt-realtime':        { input: 10,   output: 20 },
        'gpt-4o':              { input: 10,   output: 20 },
        'gpt-4.1':             { input: 10,   output: 20 },
        'gpt-4o-mini-realtime':{ input: 10,   output: 20 },
        'gpt-4o-mini':         { input: 10,   output: 20 },
        'gpt-4.1-mini':        { input: 10,   output: 20 },
        'gpt-4.1-nano':        { input: 10,   output: 20 },
        'phi':                 { input: 12.5, output: 20 },
        'custom':              { input: 10,   output: 20 },
    };

    const LLM_MODE_LABELS = {
        'audio': 'Native Audio (speech-to-speech)',
        'text':  'Text mode (STT → LLM → TTS)',
        'both':  'Both Audio + Text'
    };

    function updateLlmModeOptions() {
        $$('.llm-mode-select').forEach(llmSelect => {
            const tier = llmSelect.dataset.tier;
            const modelSelect = $(`.model-select[data-tier="${tier}"]`);
            const model = modelSelect ? modelSelect.value : 'custom';
            const allowed = MODEL_LLM_MODES[model] || ['text'];
            const currentValue = llmSelect.value;

            llmSelect.disabled = false;
            llmSelect.innerHTML = allowed.map(mode =>
                `<option value="${mode}">${LLM_MODE_LABELS[mode]}</option>`
            ).join('');

            if (allowed.includes(currentValue)) {
                llmSelect.value = currentValue;
            } else {
                llmSelect.value = allowed[0];
            }
        });
    }

    /** Auto-set audio token rates based on the active tier's model */
    function updateTokenRatesFromModel() {
        const modelSelect = $(`.model-select[data-tier="${selectedTier}"]`);
        const model = modelSelect ? modelSelect.value : 'custom';
        const rates = MODEL_TOKEN_RATES[model] || { input: 10, output: 20 };
        const inputEl = $('#vlTokenRateInput');
        const outputEl = $('#vlTokenRateOutput');
        if (inputEl)  inputEl.value = rates.input;
        if (outputEl) outputEl.value = rates.output;
    }

    /** Get the LLM mode from the currently selected tier card */
    function getSelectedLlmMode() {
        const sel = $(`.llm-mode-select[data-tier="${selectedTier}"]`);
        return sel ? sel.value : 'audio';
    }

    // ───── Tier Selection ─────
    function bindTierSelection() {
        $$('.tier-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.model-select')) return;
                $$('.tier-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedTier = card.dataset.tier;
                updateLlmModeOptions();
                updateTokenRatesFromModel();
                recalculate();
            });
        });

        // When a model dropdown changes, update that card's LLM mode options
        $$('.model-select').forEach(sel => {
            sel.addEventListener('change', () => {
                updateLlmModeOptions();
                if (sel.dataset.tier === selectedTier) {
                    updateTokenRatesFromModel();
                    recalculate();
                }
            });
        });

        // Wire all LLM mode selects to recalculate
        $$('.llm-mode-select').forEach(sel => {
            sel.addEventListener('change', recalculate);
        });

        // Set initial options
        updateLlmModeOptions();
        updateTokenRatesFromModel();
    }

    // ───── Section Toggles ─────
    function bindToggles() {
        const toggleMap = {
            toggleVoiceLive: 'voiceLiveInputs',
            toggleSTT: 'sttInputs',
            toggleTTS: 'ttsInputs',
            toggleTranslation: 'translationInputs',
            toggleInterpreter: 'interpreterInputs',
            toggleVideo: 'videoInputs',
            toggleAvatar: 'avatarInputs',
            toggleSpeaker: 'speakerInputs'
        };

        Object.entries(toggleMap).forEach(([toggleId, gridId]) => {
            const toggle = $('#' + toggleId);
            const grid = $('#' + gridId);

            // Also allow clicking the header to toggle
            const header = toggle.closest('.section-header-compact');
            header.addEventListener('click', (e) => {
                if (e.target.closest('.toggle-switch')) return;
                toggle.checked = !toggle.checked;
                toggle.dispatchEvent(new Event('change'));
            });

            toggle.addEventListener('change', () => {
                grid.classList.toggle('collapsed', !toggle.checked);
                if (!toggle.checked) {
                    grid.querySelectorAll('.calc-input').forEach(i => { i.value = 0; });
                }
                recalculate();
            });
        });
    }

    // ───── Input Binding ─────
    function bindInputs() {
        $$('.calc-input').forEach(input => {
            input.addEventListener('input', recalculate);
        });
    }

    // ───── Config Changes ─────
    function bindConfigChanges() {
        $('#billingPeriod').addEventListener('change', recalculate);
        $('#currencySelect').addEventListener('change', recalculate);
    }

    // ───── Voice Live Call Estimator ─────
    // Default token rates from Microsoft docs:
    // https://learn.microsoft.com/azure/ai-services/speech-service/voice-live#token-usage-and-cost-estimation
    const DEFAULT_TOKEN_RATES = { input: 10, output: 20, textPerTurn: 150 };

    const CACHE_RATIOS = { none: 0, light: 0.08, heavy: 0.25 };
    let isEstimating = false;
    let lastHoursSource = 'none'; // tracks which field was last edited: 'hours' or 'calls'

    function bindVoiceLiveEstimator() {
        // Sync hours ↔ calls
        const hoursField = $('#vlHoursPerMonth');
        const callsField = $('#vlCallsPerMonth');
        const durationField = $('#vlCallDuration');

        if (hoursField) {
            hoursField.addEventListener('input', () => {
                lastHoursSource = 'hours';
                syncFromHours();
                if (!isEstimating) recalculate();
            });
        }
        if (callsField) {
            callsField.addEventListener('input', () => {
                lastHoursSource = 'calls';
                syncFromCalls();
                if (!isEstimating) recalculate();
            });
        }
        if (durationField) {
            durationField.addEventListener('input', () => {
                // When duration changes, re-derive based on whichever was last set
                if (lastHoursSource === 'hours') syncFromHours();
                else syncFromCalls();
                if (!isEstimating) recalculate();
            });
        }

        // Bind remaining estimator inputs (not hours/calls/duration — already bound above)
        $$('.estimator-field').forEach(field => {
            if (field.id === 'vlHoursPerMonth' || field.id === 'vlCallsPerMonth' || field.id === 'vlCallDuration') return;
            const handler = () => {
                if (!isEstimating) recalculate();
            };
            field.addEventListener('input', handler);
            field.addEventListener('change', handler);
        });

        // Toggle detail table
        const toggleBtn = $('#toggleTokenDetails');
        const detailDiv = $('#tokenDetails');
        if (toggleBtn && detailDiv) {
            toggleBtn.addEventListener('click', () => {
                const isCollapsed = detailDiv.classList.toggle('collapsed');
                toggleBtn.classList.toggle('expanded', !isCollapsed);
                toggleBtn.querySelector('span').textContent = isCollapsed ? 'Show details' : 'Hide details';
            });
        }


    }

    function syncFromHours() {
        const hours = parseFloat($('#vlHoursPerMonth')?.value) || 0;
        const duration = parseFloat($('#vlCallDuration')?.value) || 5;
        if (duration > 0) {
            const calls = Math.round((hours * 60) / duration);
            $('#vlCallsPerMonth').value = calls;
        }
    }

    function syncFromCalls() {
        const calls = parseFloat($('#vlCallsPerMonth')?.value) || 0;
        const duration = parseFloat($('#vlCallDuration')?.value) || 5;
        const hours = Math.round((calls * duration / 60) * 100) / 100;
        $('#vlHoursPerMonth').value = hours;
    }

    function estimateVoiceLiveTokens() {
        const calls = parseFloat($('#vlCallsPerMonth')?.value) || 0;
        const duration = parseFloat($('#vlCallDuration')?.value) || 5;
        const turns = Math.max(1, parseFloat($('#vlTurnsPerCall')?.value) || 6);
        const speechModel = $('#vlSpeechModel')?.value || 'standard';
        const llmMode = getSelectedLlmMode();
        const caching = $('#vlCaching')?.value || 'none';

        // Token rates (user-editable, defaults from Microsoft docs)
        const tokInPerSec = parseFloat($('#vlTokenRateInput')?.value) || DEFAULT_TOKEN_RATES.input;
        const tokOutPerSec = parseFloat($('#vlTokenRateOutput')?.value) || DEFAULT_TOKEN_RATES.output;

        const totalSecsPerCall = duration * 60;
        // Roughly equal split: user speaks half, system speaks half
        const userSecs = totalSecsPerCall * 0.5;
        const systemSecs = totalSecsPerCall * 0.5;

        // ── Speech Audio tokens (STT/TTS layer) ──
        // Input uses STT rate (~10/sec), output uses TTS rate (~20/sec)
        const speechAudioInput = Math.round(userSecs * tokInPerSec);
        const speechAudioOutput = Math.round(systemSecs * tokOutPerSec);

        // ── LLM tokens per call ──
        // In a multi-turn conversation, each turn the LLM re-processes the
        // accumulated context from all previous turns.
        //
        // Turn k input ≈ k × (user_audio_per_turn) + system_prompt
        // Total input = sum(k=1..N) = user_audio_per_turn × N×(N+1)/2
        //
        // Turn k output ≈ system_audio_per_turn (new response)
        // Total output = N × system_audio_per_turn = total_system_audio
        //
        // This means: more turns → significantly more LLM input tokens
        //             (output stays roughly constant)

        const contextFactor = turns * (turns + 1) / 2;  // triangular accumulation

        const useAudio = (llmMode === 'audio' || llmMode === 'both');
        const useText = (llmMode === 'text' || llmMode === 'both');

        // LLM Audio tokens (input rate for user audio, output rate for system audio)
        const userAudioPerTurn = Math.round(userSecs / turns * tokInPerSec);
        const llmAudioInputPerCall = useAudio ? Math.round(userAudioPerTurn * contextFactor) : 0;
        const llmAudioOutputPerCall = useAudio ? Math.round(systemSecs * tokOutPerSec) : 0;

        // LLM Text tokens
        const textPerTurn = parseFloat($('#vlTextTokensPerTurn')?.value) || DEFAULT_TOKEN_RATES.textPerTurn;
        const llmTextInputPerCall = useText ? Math.round(textPerTurn * 0.6 * contextFactor) : 0;
        const llmTextOutputPerCall = useText ? Math.round(textPerTurn * 0.4 * turns) : 0;

        // ── Caching ──
        const cacheRatio = CACHE_RATIOS[caching] || 0;

        const speechCachedPerCall = Math.round(speechAudioInput * cacheRatio);
        const speechInputNetPerCall = speechAudioInput - speechCachedPerCall;

        const llmAudioCachedPerCall = useAudio ? Math.round(llmAudioInputPerCall * cacheRatio) : 0;
        const llmAudioInputNetPerCall = llmAudioInputPerCall - llmAudioCachedPerCall;

        const llmTextCachedPerCall = useText ? Math.round(llmTextInputPerCall * cacheRatio) : 0;
        const llmTextInputNetPerCall = llmTextInputPerCall - llmTextCachedPerCall;

        // ── Monthly totals in K tokens ──
        const toK = (perCall) => Math.round(perCall * calls / 1000 * 100) / 100;
        const isCustom = (speechModel === 'custom');

        // Speech audio tokens (Standard or Custom)
        const stdAudioIn = isCustom ? 0 : toK(speechInputNetPerCall);
        const stdAudioOut = isCustom ? 0 : toK(speechAudioOutput);
        const stdAudioCached = isCustom ? 0 : toK(speechCachedPerCall);
        const cstAudioIn = isCustom ? toK(speechInputNetPerCall) : 0;
        const cstAudioOut = isCustom ? toK(speechAudioOutput) : 0;
        const cstAudioCached = isCustom ? toK(speechCachedPerCall) : 0;

        // LLM text tokens
        const llmTextIn = toK(llmTextInputNetPerCall);
        const llmTextOut = toK(llmTextOutputPerCall);
        const llmTextCached = toK(llmTextCachedPerCall);

        // LLM audio tokens
        const llmAudioIn = toK(llmAudioInputNetPerCall);
        const llmAudioOut = toK(llmAudioOutputPerCall);
        const llmAudioCachedK = toK(llmAudioCachedPerCall);

        // Write to hidden fields
        setVal('#vlTokenStdAudioIn', stdAudioIn);
        setVal('#vlTokenStdAudioOut', stdAudioOut);
        setVal('#vlTokenStdAudioCached', stdAudioCached);
        setVal('#vlTokenCstAudioIn', cstAudioIn);
        setVal('#vlTokenCstAudioOut', cstAudioOut);
        setVal('#vlTokenCstAudioCached', cstAudioCached);
        setVal('#vlTokenLlmTextIn', llmTextIn);
        setVal('#vlTokenLlmTextOut', llmTextOut);
        setVal('#vlTokenLlmTextCached', llmTextCached);
        setVal('#vlTokenLlmAudioIn', llmAudioIn);
        setVal('#vlTokenLlmAudioOut', llmAudioOut);
        setVal('#vlTokenLlmAudioCached', llmAudioCachedK);

        // Update preview stats
        const totalMinutes = calls * duration;
        const totalK = stdAudioIn + stdAudioOut + stdAudioCached +
                        cstAudioIn + cstAudioOut + cstAudioCached +
                        llmTextIn + llmTextOut + llmTextCached +
                        llmAudioIn + llmAudioOut + llmAudioCachedK;

        const estPreview = $('#estTotalMinutes');
        const estTokens = $('#estTotalTokens');
        if (estPreview) estPreview.textContent = formatNum(totalMinutes);
        if (estTokens) estTokens.textContent = formatNum(totalK);

        // Build detail table and compute cost per call
        updateTokenDetailTable(calls, {
            speechModel,
            stdAudioIn, stdAudioOut, stdAudioCached,
            cstAudioIn, cstAudioOut, cstAudioCached,
            llmTextIn, llmTextOut, llmTextCached,
            llmAudioIn, llmAudioOut, llmAudioCachedK,
            audioInputPerCall: speechInputNetPerCall, audioOutputPerCall: speechAudioOutput, audioCachedPerCall: speechCachedPerCall,
            textInputPerCall: llmTextInputNetPerCall, textOutputPerCall: llmTextOutputPerCall, textCachedPerCall: llmTextCachedPerCall,
            llmAudioInputPerCall: llmAudioInputNetPerCall, llmAudioOutputPerCall, llmAudioCachedPerCall
        });
    }

    function setVal(sel, val) {
        const el = $(sel);
        if (el) el.value = val;
    }

    function updateTokenDetailTable(calls, t) {
        const tbody = $('#tokenTableBody');
        if (!tbody) return;

        const currency = $('#currencySelect')?.value || 'USD';
        const symbol = getCurrencySymbol(currency);
        const tier = selectedTier;

        const rows = [];
        const addRow = (label, perCall, monthlyK, meterKey) => {
            const price = currentPrices.voiceLive[tier]?.[meterKey] ?? 0;
            const costPerCall = perCall * price / 1000;  // perCall is raw tokens, price is per 1K
            const monthlyCost = monthlyK * price;
            rows.push({ label, perCall, monthlyK, price, costPerCall, monthlyCost, meterKey });
        };

        if (t.speechModel === 'standard') {
            addRow('Standard Audio Input', t.audioInputPerCall, t.stdAudioIn, 'standardAudioInput');
            addRow('Standard Audio Output', t.audioOutputPerCall, t.stdAudioOut, 'standardAudioOutput');
            addRow('Standard Audio Cached', t.audioCachedPerCall, t.stdAudioCached, 'standardAudioCached');
        } else {
            addRow('Custom Audio Input', t.audioInputPerCall, t.cstAudioIn, 'customAudioInput');
            addRow('Custom Audio Output', t.audioOutputPerCall, t.cstAudioOut, 'customAudioOutput');
            addRow('Custom Audio Cached', t.audioCachedPerCall, t.cstAudioCached, 'customAudioCached');
        }

        addRow('LLM Text Input', t.textInputPerCall, t.llmTextIn, 'llmTextInput');
        addRow('LLM Text Output', t.textOutputPerCall, t.llmTextOut, 'llmTextOutput');
        addRow('LLM Text Cached', t.textCachedPerCall, t.llmTextCached, 'llmTextCached');

        addRow('LLM Audio Input', t.llmAudioInputPerCall, t.llmAudioIn, 'llmAudioInput');
        addRow('LLM Audio Output', t.llmAudioOutputPerCall, t.llmAudioOut, 'llmAudioOutput');
        addRow('LLM Audio Cached', t.llmAudioCachedPerCall, t.llmAudioCachedK, 'llmAudioCached');

        let totalMonthlyCost = 0;
        let totalPerCallCost = 0;
        let html = '';
        for (const r of rows) {
            totalMonthlyCost += r.monthlyCost;
            totalPerCallCost += r.costPerCall;
            const dimClass = (r.perCall === 0) ? ' style="opacity:0.35"' : '';
            html += `<tr${dimClass}>
                <td>${r.label}</td>
                <td>${formatNum(r.perCall)} tok</td>
                <td>${calls > 0 ? formatNum(r.monthlyK) : '—'}</td>
                <td>${symbol}${formatPrice(r.price)}</td>
                <td>${calls > 0 ? symbol + formatNum(r.monthlyCost) : '—'}</td>
            </tr>`;
        }

        if (!html) {
            html = `<tr>
                <td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px">
                    <i class="fas fa-info-circle" style="margin-right:6px"></i>
                    Enter total hours or number of calls above to see token breakdown
                </td>
            </tr>`;
        }
        tbody.innerHTML = html;

        const totalEl = $('#tokenTableTotal');
        if (totalEl) totalEl.textContent = calls > 0 ? symbol + formatNum(totalMonthlyCost) : '—';

        // Cost per call (computed from prices directly, independent of call count)
        const costEl = $('#estCostPerCall');
        if (costEl) costEl.textContent = symbol + formatPrice(totalPerCallCost);
    }

    // ───── Calculation ─────
    function recalculate() {
        // Re-estimate voice live tokens from call estimator
        if (!isEstimating) {
            isEstimating = true;
            estimateVoiceLiveTokens();
            isEstimating = false;
        }

        const multiplier = $('#billingPeriod').value === 'yearly' ? 12 : 1;
        const currency = $('#currencySelect').value;
        const results = {};
        let grandTotal = 0;

        $$('.calc-input').forEach(input => {
            const qty = parseFloat(input.value) || 0;
            if (qty <= 0) return;

            const category = input.dataset.category;
            const meter = input.dataset.meter;
            let unitPrice = 0;

            if (category === 'voiceLive') {
                unitPrice = currentPrices.voiceLive[selectedTier]?.[meter] ?? 0;
            } else {
                unitPrice = currentPrices[category]?.[meter] ?? 0;
            }

            const cost = qty * unitPrice * multiplier;
            if (cost <= 0) return;

            if (!results[category]) results[category] = { items: [], subtotal: 0 };
            results[category].items.push({
                meter, qty, unitPrice, cost,
                unit: UNIT_LABELS[category]?.[meter] ?? ''
            });
            results[category].subtotal += cost;
            grandTotal += cost;
        });

        renderSummary(results, grandTotal, currency);
    }

    function renderSummary(results, grandTotal, currency) {
        const body = $('#summaryBody');
        const symbol = getCurrencySymbol(currency);

        if (Object.keys(results).length === 0) {
            body.innerHTML = `
                <div class="summary-empty">
                    <i class="fas fa-calculator"></i>
                    <p>Enter usage quantities to see cost breakdown</p>
                </div>`;
            $('#totalAmount').textContent = symbol + '0.00';
            $('#totalCurrency').textContent = currency;
            return;
        }

        let html = '';
        for (const [cat, data] of Object.entries(results)) {
            html += `<div class="summary-category">
                <div class="summary-category-title">${CATEGORY_NAMES[cat] || cat}</div>`;
            for (const item of data.items) {
                html += `<div class="summary-line">
                    <span class="line-label">${METER_NAMES[item.meter] || item.meter}</span>
                    <span class="line-qty">${formatNum(item.qty)} × ${symbol}${formatPrice(item.unitPrice)}</span>
                    <span class="line-cost">${symbol}${formatNum(item.cost)}</span>
                </div>`;
            }
            html += `<div class="summary-subtotal">
                <span>Subtotal</span>
                <span>${symbol}${formatNum(data.subtotal)}</span>
            </div></div>`;
        }

        body.innerHTML = html;
        $('#totalAmount').textContent = symbol + formatNum(grandTotal);
        $('#totalCurrency').textContent = currency;
    }

    // ───── Refresh Prices from Azure API ─────
    function bindRefresh() {
        $('#refreshPrices').addEventListener('click', fetchPrices);
        // Also refresh when region changes
        $('#regionSelect').addEventListener('change', () => {
            if (apiPricesLoaded) fetchPrices();
        });
    }

    async function fetchPrices() {
        const btn = $('#refreshPrices');
        const overlay = $('#loadingOverlay');
        const region = $('#regionSelect').value;
        const currency = $('#currencySelect').value;

        btn.classList.add('loading');
        overlay.classList.add('active');

        try {
            const items = await fetchAllPages(region, currency);
            if (items.length > 0) {
                applyApiPrices(items);
                apiPricesLoaded = true;
                savePricesToCache(items.length);
                updatePriceStatus(true, items.length);
                recalculate();
                updateTierPreviews();
            } else {
                updatePriceStatus(false, 0, 'No prices found for this region');
            }
        } catch (err) {
            console.error('Failed to fetch prices:', err);
            updatePriceStatus(false, 0, 'API request failed');
        } finally {
            btn.classList.remove('loading');
            overlay.classList.remove('active');
        }
    }

    async function fetchAllPages(region, currency) {
        const baseUrl = '/api/retail/prices';
        const filter = `serviceName eq 'Foundry Tools' and armRegionName eq '${region}' and contains(productName, 'Speech')`;
        let url = `${baseUrl}?currencyCode='${currency}'&$filter=${encodeURIComponent(filter)}`;
        let allItems = [];

        while (url) {
            if (url.startsWith('https://prices.azure.com')) {
                url = url.replace('https://prices.azure.com', '');
            }
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            allItems = allItems.concat(data.Items || []);
            url = data.NextPageLink || null;
        }
        return allItems;
    }

    function applyApiPrices(items) {
        // Reset to defaults first
        currentPrices = JSON.parse(JSON.stringify(DEFAULT_PRICES));
        let matchedCount = 0;
        let latestEffectiveDate = null;

        for (const item of items) {
            const mapping = findMapping(item.meterName);
            if (!mapping) continue;

            // Skip if this mapping requires a specific unitOfMeasure (handles duplicate meter names)
            if (mapping.unitFilter && item.unitOfMeasure !== mapping.unitFilter) continue;

            const price = item.retailPrice;

            if (mapping.tier) {
                if (currentPrices.voiceLive[mapping.tier]) {
                    currentPrices.voiceLive[mapping.tier][mapping.key] = price;
                    matchedCount++;
                }
            } else if (mapping.category) {
                if (currentPrices[mapping.category]) {
                    currentPrices[mapping.category][mapping.key] = price;
                    matchedCount++;
                }
            }

            // Track the latest effective date from the API
            if (item.effectiveStartDate) {
                const d = item.effectiveStartDate.split('T')[0];
                if (!latestEffectiveDate || d > latestEffectiveDate) latestEffectiveDate = d;
            }
        }

        // Store the effective date for display
        if (latestEffectiveDate) {
            currentPrices._effectiveDate = latestEffectiveDate;
        }

        console.log(`[Pricing] Matched ${matchedCount} of ${items.length} API meters to calculator fields`);
    }

    function findMapping(meterName) {
        // Exact match first
        if (METER_MAP[meterName]) return METER_MAP[meterName];

        // Case-insensitive exact match
        const meterLower = meterName.toLowerCase();
        for (const [pattern, mapping] of Object.entries(METER_MAP)) {
            if (pattern.toLowerCase() === meterLower) return mapping;
        }

        return null;
    }

    function updatePriceStatus(success, count, error) {
        const dot = $('.status-dot');
        const text = $('.status-text');
        const dateEl = $('.status-date');
        const footerRefresh = $('#lastRefresh');

        if (success) {
            dot.classList.add('live');
            const region = lastRefreshInfo?.region || $('#regionSelect').value;
            text.textContent = `Live prices (${count} meters) · ${region}`;

            const parts = [];
            // Show when the user last fetched
            if (lastRefreshInfo?.date) {
                const d = new Date(lastRefreshInfo.date);
                const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                parts.push(`Fetched ${dateStr} ${timeStr}`);
                if (footerRefresh) footerRefresh.textContent = `${dateStr} ${timeStr}`;
            }
            // Show Azure's effective pricing date
            const effDate = currentPrices._effectiveDate;
            if (effDate) {
                const ed = new Date(effDate + 'T00:00:00');
                parts.push('Azure prices effective ' + ed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));
            }
            if (dateEl) dateEl.textContent = parts.join(' · ');
        } else {
            dot.classList.remove('live');
            text.textContent = error || 'Using default prices';
            if (dateEl) dateEl.textContent = '';
            if (footerRefresh) footerRefresh.textContent = 'Not yet refreshed';
        }
    }

    function updateTierPreviews() {
        const symbol = getCurrencySymbol($('#currencySelect').value);
        $('#proInputPreview').textContent = `${symbol}${formatPrice(currentPrices.voiceLive.pro.standardAudioInput)}/1K tokens`;
        $('#stdInputPreview').textContent = `${symbol}${formatPrice(currentPrices.voiceLive.standard.standardAudioInput)}/1K tokens`;
        $('#liteInputPreview').textContent = `${symbol}${formatPrice(currentPrices.voiceLive.lite.standardAudioInput)}/1K tokens`;
        $('#byoInputPreview').textContent = `${symbol}${formatPrice(currentPrices.voiceLive.byo.standardAudioInput)}/1K tokens`;
    }

    // ───── Export: PDF (BoQ) ─────
    function bindExports() {
        $('#exportPDF').addEventListener('click', exportPDF);
        $('#exportExcel').addEventListener('click', exportExcel);
        $('#saveReport').addEventListener('click', saveReport);
    }

    function gatherBoQData() {
        const multiplier = $('#billingPeriod').value === 'yearly' ? 12 : 1;
        const period = $('#billingPeriod').value === 'yearly' ? 'Yearly' : 'Monthly';
        const currency = $('#currencySelect').value;
        const symbol = getCurrencySymbol(currency);
        const rows = [];
        let grandTotal = 0;

        $$('.calc-input').forEach(input => {
            const qty = parseFloat(input.value) || 0;
            if (qty <= 0) return;
            const category = input.dataset.category;
            const meter = input.dataset.meter;
            let unitPrice = 0;

            if (category === 'voiceLive') {
                unitPrice = currentPrices.voiceLive[selectedTier]?.[meter] ?? 0;
            } else {
                unitPrice = currentPrices[category]?.[meter] ?? 0;
            }

            const cost = qty * unitPrice * multiplier;
            if (cost <= 0) return;

            rows.push({
                category: CATEGORY_NAMES[category] || category,
                item: METER_NAMES[meter] || meter,
                quantity: qty,
                unit: UNIT_LABELS[category]?.[meter] ?? '',
                unitPrice,
                total: cost
            });
            grandTotal += cost;
        });

        return {
            rows, grandTotal, period, currency, symbol,
            customer: $('#customerName').value || 'N/A',
            quoteRef: $('#quoteRef').value,
            region: $('#regionSelect').value,
            tier: selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1),
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        };
    }

    function exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const data = gatherBoQData();

        // Header background
        doc.setFillColor(0, 120, 212);
        doc.rect(0, 0, 210, 42, 'F');

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Azure Voice Live', 14, 18);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Bill of Quantities (BoQ)', 14, 26);
        doc.setFontSize(9);
        doc.text(`Quote: ${data.quoteRef}  |  ${data.date}`, 14, 34);

        // Meta info
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        let y = 52;
        const meta = [
            ['Customer / Project:', data.customer],
            ['Azure Region:', data.region],
            ['Voice Live Tier:', data.tier],
            ['Billing Period:', data.period],
            ['Currency:', data.currency]
        ];
        meta.forEach(([label, val]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 14, y);
            doc.setFont('helvetica', 'normal');
            doc.text(val, 60, y);
            y += 6;
        });

        // Table
        if (data.rows.length > 0) {
            doc.autoTable({
                startY: y + 6,
                head: [['Category', 'Item', 'Qty', 'Unit', 'Unit Price', 'Total']],
                body: data.rows.map(r => [
                    r.category, r.item,
                    formatNum(r.quantity), r.unit,
                    data.symbol + formatPrice(r.unitPrice),
                    data.symbol + formatNum(r.total)
                ]),
                foot: [['', '', '', '', 'GRAND TOTAL', data.symbol + formatNum(data.grandTotal)]],
                theme: 'grid',
                headStyles: { fillColor: [0, 120, 212], fontSize: 9, fontStyle: 'bold' },
                footStyles: { fillColor: [0, 69, 120], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8.5 },
                alternateRowStyles: { fillColor: [245, 246, 250] },
                margin: { left: 14, right: 14 },
                columnStyles: {
                    0: { cellWidth: 36 },
                    1: { cellWidth: 44 },
                    2: { cellWidth: 20, halign: 'right' },
                    3: { cellWidth: 24 },
                    4: { cellWidth: 28, halign: 'right' },
                    5: { cellWidth: 28, halign: 'right' }
                }
            });
        } else {
            doc.setFontSize(11);
            doc.text('No items configured. Please enter usage quantities.', 14, y + 12);
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(
                'Prices are estimates from Azure Retail Prices API. Actual pricing may vary. Generated by Azure Voice Live Pricing Calculator.',
                14, 287
            );
            doc.text(`Page ${i} of ${pageCount}`, 190, 287, { align: 'right' });
        }

        doc.save(`VoiceLive_BoQ_${data.quoteRef}.pdf`);
    }

    // ───── Export: Excel ─────
    async function exportExcel() {
        const data = gatherBoQData();
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Azure Voice Live Pricing Calculator';

        // ── Style constants ──
        const azureBlue = { argb: 'FF0078D4' };
        const darkBlue = { argb: 'FF004578' };
        const lightGray = { argb: 'FFF5F6FA' };
        const white = { argb: 'FFFFFFFF' };
        const borderThin = { style: 'thin', color: { argb: 'FFD0D0D0' } };
        const allBorders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };

        // ══════════════════════════════════════
        // Sheet 1: BoQ
        // ══════════════════════════════════════
        const ws = wb.addWorksheet('BoQ', { views: [{ showGridLines: false }] });
        ws.columns = [
            { width: 24 }, { width: 32 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 18 }
        ];

        // Title row (merged)
        ws.mergeCells('A1:F1');
        const titleCell = ws.getCell('A1');
        titleCell.value = 'Azure Voice Live – Bill of Quantities';
        titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: white };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: azureBlue };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        ws.getRow(1).height = 36;

        // Subtitle row
        ws.mergeCells('A2:F2');
        const subtitleCell = ws.getCell('A2');
        subtitleCell.value = 'Generated by Azure Voice Live Pricing Calculator';
        subtitleCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF888888' } };
        subtitleCell.alignment = { vertical: 'middle' };

        // Metadata rows
        const metaFields = [
            ['Quote Reference', data.quoteRef],
            ['Date', data.date],
            ['Customer / Project', data.customer],
            ['Azure Region', data.region],
            ['Voice Live Tier', data.tier],
            ['Billing Period', data.period],
            ['Currency', data.currency]
        ];
        metaFields.forEach((m, i) => {
            const row = ws.getRow(4 + i);
            row.getCell(1).value = m[0];
            row.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF333333' } };
            row.getCell(2).value = m[1];
            row.getCell(2).font = { name: 'Segoe UI', size: 10, color: { argb: 'FF555555' } };
        });

        // Table header row
        const headerRowNum = 4 + metaFields.length + 1;
        const headers = ['Category', 'Item', 'Quantity', 'Unit', 'Unit Price (' + data.symbol + ')', 'Total Cost (' + data.symbol + ')'];
        const headerRow = ws.getRow(headerRowNum);
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: white };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: azureBlue };
            cell.alignment = { vertical: 'middle', horizontal: i >= 2 ? 'right' : 'left' };
            cell.border = allBorders;
        });
        headerRow.height = 22;

        // Data rows
        data.rows.forEach((r, i) => {
            const rowNum = headerRowNum + 1 + i;
            const row = ws.getRow(rowNum);
            const vals = [r.category, r.item, r.quantity, r.unit, r.unitPrice, r.total];
            vals.forEach((v, ci) => {
                const cell = row.getCell(ci + 1);
                cell.value = v;
                cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF333333' } };
                cell.border = allBorders;
                if (ci >= 2) cell.alignment = { horizontal: 'right' };
                if (ci === 4 || ci === 5) cell.numFmt = '#,##0.0000';
                if (ci === 2) cell.numFmt = '#,##0.00';
            });
            // Alternating row color
            if (i % 2 === 1) {
                for (let ci = 1; ci <= 6; ci++) {
                    row.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: lightGray };
                }
            }
        });

        // Grand total row
        if (data.rows.length > 0) {
            const totalRowNum = headerRowNum + 1 + data.rows.length + 1;
            const totalRow = ws.getRow(totalRowNum);
            ws.mergeCells(totalRowNum, 1, totalRowNum, 5);
            const labelCell = totalRow.getCell(1);
            labelCell.value = 'GRAND TOTAL';
            labelCell.font = { name: 'Segoe UI', size: 12, bold: true, color: white };
            labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: darkBlue };
            labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
            labelCell.border = allBorders;
            const valCell = totalRow.getCell(6);
            valCell.value = data.grandTotal;
            valCell.numFmt = '#,##0.00';
            valCell.font = { name: 'Segoe UI', size: 12, bold: true, color: white };
            valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: darkBlue };
            valCell.alignment = { horizontal: 'right', vertical: 'middle' };
            valCell.border = allBorders;
            totalRow.height = 26;
        }

        // Footer
        const footerRowNum = headerRowNum + data.rows.length + 4;
        ws.mergeCells(footerRowNum, 1, footerRowNum, 6);
        const footerCell = ws.getCell(footerRowNum, 1);
        footerCell.value = 'Prices are estimates from Azure Retail Prices API. Actual pricing may vary.';
        footerCell.font = { name: 'Segoe UI', size: 8, italic: true, color: { argb: 'FF999999' } };

        // ══════════════════════════════════════
        // Sheet 2: Price Reference
        // ══════════════════════════════════════
        const ws2 = wb.addWorksheet('Price Reference', { views: [{ showGridLines: false }] });
        ws2.columns = [{ width: 38 }, { width: 22 }];

        // Title
        ws2.mergeCells('A1:B1');
        const prTitle = ws2.getCell('A1');
        prTitle.value = 'Voice Live API Pricing Reference – ' + data.tier;
        prTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: white };
        prTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: azureBlue };
        prTitle.alignment = { vertical: 'middle' };
        ws2.getRow(1).height = 32;

        let prRow = 3;
        function addPriceSection(title, pricesObj) {
            const secRow = ws2.getRow(prRow);
            ws2.mergeCells(prRow, 1, prRow, 2);
            const secCell = secRow.getCell(1);
            secCell.value = title;
            secCell.font = { name: 'Segoe UI', size: 11, bold: true, color: white };
            secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: darkBlue };
            secCell.border = allBorders;
            secRow.height = 22;
            prRow++;

            // Sub-header
            const subHdr = ws2.getRow(prRow);
            subHdr.getCell(1).value = 'Meter';
            subHdr.getCell(2).value = 'Price per 1K tokens';
            [1, 2].forEach(ci => {
                const c = subHdr.getCell(ci);
                c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF555555' } };
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: lightGray };
                c.border = allBorders;
                if (ci === 2) c.alignment = { horizontal: 'right' };
            });
            prRow++;

            let idx = 0;
            for (const [key, price] of Object.entries(pricesObj)) {
                const r = ws2.getRow(prRow);
                r.getCell(1).value = METER_NAMES[key] || key;
                r.getCell(1).font = { name: 'Segoe UI', size: 10 };
                r.getCell(1).border = allBorders;
                r.getCell(2).value = price;
                r.getCell(2).numFmt = '#,##0.000000';
                r.getCell(2).font = { name: 'Segoe UI', size: 10 };
                r.getCell(2).alignment = { horizontal: 'right' };
                r.getCell(2).border = allBorders;
                if (idx % 2 === 1) {
                    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: lightGray };
                    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: lightGray };
                }
                prRow++;
                idx++;
            }
            prRow++; // blank row between sections
        }

        addPriceSection('Voice Live – ' + data.tier, currentPrices.voiceLive[selectedTier]);
        addPriceSection('Speech to Text', currentPrices.stt);
        addPriceSection('Text to Speech', currentPrices.tts);

        // Write and download
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VoiceLive_BoQ_${data.quoteRef}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ───── Save Report ─────
    async function saveReport() {
        if (!msalAccount) {
            alert('Please sign in to save reports.');
            return;
        }
        const data = gatherBoQData();
        const report = {
            quoteRef: data.quoteRef,
            customer: data.customer,
            region: data.region,
            tier: data.tier,
            period: data.period,
            currency: data.currency,
            grandTotal: data.grandTotal,
            rows: data.rows,
            savedAt: new Date().toISOString(),
            savedBy: msalAccount.username
        };
        try {
            const token = await getAccessToken();
            const resp = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(report)
            });
            if (!resp.ok) throw new Error('Save failed: ' + resp.status);
            alert('Report saved successfully!');
        } catch (err) {
            console.error('Save report error:', err);
            alert('Failed to save report: ' + err.message);
        }
    }

    async function loadReports() {
        if (!msalAccount) return;
        try {
            const token = await getAccessToken();
            const resp = await fetch('/api/reports', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!resp.ok) throw new Error('Load failed');
            const reports = await resp.json();
            renderReports(reports);
            $('#savedReportsModal').style.display = 'flex';
        } catch (err) {
            console.error('Load reports error:', err);
            alert('Failed to load reports.');
        }
    }

    function renderReports(reports) {
        const list = $('#reportsList');
        if (!reports.length) {
            list.innerHTML = '<p class="no-reports">No saved reports yet.</p>';
            return;
        }
        list.innerHTML = reports.map(r => `
            <div class="report-card">
                <div class="report-header">
                    <strong>${r.quoteRef}</strong>
                    <span class="report-date">${new Date(r.savedAt).toLocaleDateString()}</span>
                </div>
                <div class="report-details">
                    <span>${r.customer || 'No customer'}</span>
                    <span>${r.tier} · ${r.region}</span>
                    <span class="report-total">${getCurrencySymbol(r.currency)}${formatNum(r.grandTotal)} ${r.currency}/${r.period}</span>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteReport('${r.id}')">Delete</button>
            </div>
        `).join('');
    }

    // ───── Helpers ─────
    function getCurrencySymbol(code) {
        const symbols = {
            USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$',
            JPY: '¥', KRW: '₩', INR: '₹', BRL: 'R$', CHF: 'CHF ',
            SEK: 'kr', NOK: 'kr', DKK: 'kr', SGD: 'S$', AED: 'د.إ',
            ZAR: 'R', QAR: 'QR'
        };
        return symbols[code] || code + ' ';
    }

    function formatNum(n) {
        if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (n === 0) return '0.00';
        return n.toFixed(2);
    }

    function formatPrice(n) {
        if (n === 0) return '0.00';
        if (n < 0.01) return n.toFixed(4);
        return n.toFixed(n < 1 ? 3 : 2);
    }

    // ───── MSAL Authentication ─────
    const msalConfig = {
        auth: {
            clientId: window.AUTH_CLIENT_ID || '',
            authority: window.AUTH_AUTHORITY || '',
            redirectUri: window.location.origin
        },
        cache: { cacheLocation: 'sessionStorage' }
    };

    let msalInstance = null;
    let msalAccount = null;

    async function initAuth() {
        if (!msalConfig.auth.clientId) {
            // Auth config not set — fetch from server
            try {
                const resp = await fetch('/api/auth/config');
                if (resp.ok) {
                    const cfg = await resp.json();
                    msalConfig.auth.clientId = cfg.clientId;
                    msalConfig.auth.authority = cfg.authority;
                }
            } catch (e) { /* auth not configured, run without auth locally */ }
        }
        if (!msalConfig.auth.clientId) {
            // No auth configured — hide auth UI
            return;
        }
        msalInstance = new msal.PublicClientApplication(msalConfig);
        await msalInstance.initialize();

        // Handle redirect response
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
            msalAccount = response.account;
        } else {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) msalAccount = accounts[0];
        }

        updateAuthUI();
        bindAuthEvents();
    }

    function updateAuthUI() {
        const loginBtn = $('#loginBtn');
        const userInfo = $('#userInfo');
        if (msalAccount) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            $('#userName').textContent = msalAccount.name || msalAccount.username;
        } else {
            loginBtn.style.display = '';
            userInfo.style.display = 'none';
        }
    }

    function bindAuthEvents() {
        $('#loginBtn').addEventListener('click', async () => {
            try {
                const response = await msalInstance.loginPopup({ scopes: ['api://' + msalConfig.auth.clientId + '/access'] });
                msalAccount = response.account;
                updateAuthUI();
            } catch (err) {
                console.error('Login error:', err);
            }
        });
        $('#logoutBtn').addEventListener('click', async () => {
            await msalInstance.logoutPopup();
            msalAccount = null;
            updateAuthUI();
        });
    }

    async function getAccessToken() {
        const request = { scopes: ['api://' + msalConfig.auth.clientId + '/access'], account: msalAccount };
        try {
            const resp = await msalInstance.acquireTokenSilent(request);
            return resp.accessToken;
        } catch (err) {
            const resp = await msalInstance.acquireTokenPopup(request);
            msalAccount = resp.account;
            return resp.accessToken;
        }
    }

    // ───── Boot ─────
    document.addEventListener('DOMContentLoaded', async () => {
        init();
        await initAuth();
        const closeBtn = $('#closeReportsModal');
        if (closeBtn) closeBtn.addEventListener('click', () => $('#savedReportsModal').style.display = 'none');
    });
})();
