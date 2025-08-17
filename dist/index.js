import { registerTtsProvider, saveTtsProviderSettings } from '../../../tts/index.js';
import { AivisSpeechApi } from './api.js';
const DEFAULT_SETTINGS = {
    baseUrl: 'http://127.0.0.1:10101',
};
class AivisSpeechTtsProvider {
    settings = null;
    separator = '。';
    api;
    voices = [];
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
        this.settings.baseUrl = $('#aivis_base_url').val();
        this.api.setEndpoint(this.settings.baseUrl);
        saveTtsProviderSettings();
    }
    async loadSettings(settings) {
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
    async fetchTtsVoiceObjects() {
        this.voices = [];
        for (const speaker of await this.api.getSpeakers()) {
            for (const style of speaker.styles) {
                const name = `${speaker.name}（${style.name}）`;
                const id = style.id.toString();
                this.voices.push({
                    voice_id: id,
                    name,
                    lang: 'ja-JP',
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
    async generateTts(text, voiceId) {
        const speaker = parseInt(voiceId);
        const query = await this.api.makeAudioQuery(text, speaker);
        return await this.api.synthesize(query, speaker);
    }
}
registerTtsProvider('AivisSpeech', AivisSpeechTtsProvider);
