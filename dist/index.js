import { registerTtsProvider, saveTtsProviderSettings } from '../../../tts/index.js';
import { AivisSpeechApi } from './api.js';
import { CHUNK_SEP, chunkText } from './chunk.js';
const DEFAULT_SETTINGS = {
    baseUrl: 'http://127.0.0.1:10101',
    chunkSize: 500,
    extractQuotes: true,
    quoteLengthThreshold: 10,
};
class AivisSpeechTtsProvider {
    settings;
    separator = CHUNK_SEP;
    api;
    voices = [];
    get settingsHtml() {
        return `
            <div>
                <label for="aivis_base_url">AivisSpeech Endpoint:</label>
                <input id="aivis_base_url" class="text_pole"
                       type="text"
                       value="${DEFAULT_SETTINGS.baseUrl}">
            </div>
            <div class="range-block">
                <div class="range-block-title justifyLeft">
                       Chunk size (characters)
                </div>
                <div class="range-block-range-and-counter">
                       <div class="range-block-range">
                           <input id="aivis_chunk_size" type="range"
                                  value="${DEFAULT_SETTINGS.chunkSize}"
                                  min="0" max="1000" step="10">
                       </div>
                       <div class="range-block-counter">
                           <input id="aivis_chunk_size_counter" type="number"
                                  value="${DEFAULT_SETTINGS.chunkSize}"
                                  min="0" max="1000" step="10"
                                  data-for="aivis_chunk_size">
                       </div>
                </div>
            </div>
            <label class="checkbox_label" for="aivis_extract_quotes"
                   title="Only Japanese single quotes (「」) are considered">
                <input id="aivis_extract_quotes" type="checkbox">
                Extract quotes longer than
                <input id="aivis_extract_quotes_threshold" type="number"
                       class="text_pole textarea_compact widthUnset"
                       value="${DEFAULT_SETTINGS.quoteLengthThreshold}"
                       min="0" max="100" step="1">
                characters
            </label>`;
    }
    onSettingsChange() {
        console.log('settings changed');
        this.settings.baseUrl = $('#aivis_base_url').val();
        this.api.setEndpoint(this.settings.baseUrl);
        this.settings.chunkSize = $('#aivis_chunk_size').val();
        this.settings.extractQuotes = $('#aivis_extract_quotes').is(':checked');
        this.settings.quoteLengthThreshold =
            $('#aivis_extract_quotes_threshold').val();
        saveTtsProviderSettings();
    }
    async loadSettings(settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        this.api = new AivisSpeechApi(this.settings.baseUrl);
        $('#aivis_base_url').val(this.settings.baseUrl);
        $('#aivis_base_url').on('input', () => this.onSettingsChange());
        $('#aivis_chunk_size').val(this.settings.chunkSize);
        $('#aivis_chunk_size_counter').val(this.settings.chunkSize);
        $('#aivis_chunk_size').on('input', () => {
            this.onSettingsChange();
            $('#aivis_chunk_size_counter').val(this.settings.chunkSize);
        });
        $('#aivis_extract_quotes')
            .prop('checked', this.settings.extractQuotes)
            .on('change', () => {
            this.onSettingsChange();
            $('#aivis_extract_quotes_threshold').prop('disabled', !this.settings.extractQuotes);
        });
        $('#aivis_extract_quotes_threshold')
            .prop('disabled', !this.settings.extractQuotes)
            .val(this.settings.quoteLengthThreshold)
            .on('input', () => this.onSettingsChange());
    }
    async checkReady() {
        await this.api.getVersion();
    }
    async onRefreshClick() {
        return;
    }
    async fetchTtsVoiceObjects() {
        this.voices = [];
        for (const speaker of await this.api.getSpeakers()) {
            for (const style of speaker.styles) {
                const name = `${speaker.name}（${style.name}）`;
                this.voices.push({
                    voice_id: style.id,
                    name,
                    lang: 'ja-JP',
                    speakerUuid: speaker.speaker_uuid,
                });
            }
        }
        return this.voices;
    }
    async getVoice(voiceName) {
        const match = this.voices.find(v => v.name == voiceName);
        if (!match) {
            throw new Error(`TTS Voice name "${voiceName}" not found`);
        }
        return match;
    }
    async *generateTts(text, voiceId) {
        const chunks = chunkText(text, {
            chunkSize: this.settings.chunkSize,
            extractQuotes: this.settings.extractQuotes
                ? this.settings.quoteLengthThreshold
                : null,
        });
        for (const chunk of chunks) {
            yield this.api.textToSpeech(chunk, voiceId);
        }
    }
    async previewTtsVoice(voiceId) {
        const voice = this.voices.find(v => v.voice_id == voiceId);
        const info = await this.api.getSpeakerInfo(voice.speakerUuid);
        const style = info.style_infos.find(v => v.id == voiceId);
        if (!style.voice_samples) {
            toastr.info('このボイスにはプレビュー音声が設定されていません。');
            return;
        }
        const idx = Math.floor(Math.random() * style.voice_samples.length);
        const base64 = style.voice_samples[idx];
        const url = `data:audio/wav;base64,${base64}`;
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.src = url;
            audio.play();
            audio.onended = () => resolve();
        });
    }
}
registerTtsProvider('AivisSpeech', AivisSpeechTtsProvider);
