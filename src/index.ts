import {
    registerTtsProvider,
    saveTtsProviderSettings
} from '../../../tts/index.js';
import { AivisSpeechApi } from './api.js';

// TODO: make a number
type VoiceId = number;

interface STVoice {
    name: string,
    voice_id: VoiceId,
    preview_url?: string,
    lang?: string,
}

interface AivisSpeechSettings {
    baseUrl: string,
}

const DEFAULT_SETTINGS: AivisSpeechSettings = {
    baseUrl: 'http://127.0.0.1:10101',
};

class AivisSpeechTtsProvider {
    settings: AivisSpeechSettings = null;
    readonly separator = '。';

    private api: AivisSpeechApi;
    private voices: Array<STVoice> = [];

    get settingsHtml() {
        return `
            <div>
                <label for="aivis_base_url">AivisSpeech Endpoint:</label>
                <input id="aivis_base_url" class="text_pole"
                       type="text"
                       value="${DEFAULT_SETTINGS.baseUrl}">
            </div>`;
    }

    onSettingsChange() {
        console.log('settings changed');
        this.settings.baseUrl = $('#aivis_base_url').val() as string;
        this.api.setEndpoint(this.settings.baseUrl);
        saveTtsProviderSettings();
    }

    async loadSettings(settings: AivisSpeechSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        this.api = new AivisSpeechApi(this.settings.baseUrl);

        $('#aivis_base_url').val(this.settings.baseUrl);
        $('#aivis_base_url').on('input', () => this.onSettingsChange());
    }

    async checkReady() {
        await this.api.getVersion();
    }

    async onRefreshClick() {
        return;
    }

    async fetchTtsVoiceObjects(): Promise<Array<STVoice>> {
        this.voices = [];
        for (const speaker of await this.api.getSpeakers()) {
            for (const style of speaker.styles) {
                const name = `${speaker.name}（${style.name}）`;
                this.voices.push({
                    voice_id: style.id,
                    name,
                    lang: 'ja-JP',
                });
            }
        }
        return this.voices;
    }

    async getVoice(voiceName: string) {
        const match = this.voices.find(v => v.name == voiceName);

        if (!match) {
            throw new Error(`TTS Voice name "${voiceName}" not found`);
        }

        return match;
    }

    async generateTts(text: string, voiceId: VoiceId): Promise<Response> {
        return this.api.textToSpeech(text, voiceId);
    }

    async previewTtsVoice(voiceId: VoiceId) {
        toastr.info('このボイスにはプレビュー音声が設定されていません。');
    }
}

registerTtsProvider('AivisSpeech', AivisSpeechTtsProvider);
