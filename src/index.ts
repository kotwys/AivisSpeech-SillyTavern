// @ts-ignore
import {
    registerTtsProvider,
    saveTtsProviderSettings
} from '../../../tts/index.js';

// TODO: make a number
type VoiceId = string;

interface AivisSpeechSettings {
    baseUrl: string,
}

const DEFAULT_SETTINGS: AivisSpeechSettings = {
    baseUrl: 'http://127.0.0.1:10101',
};

class AivisSpeechTtsProvider {
    settings: AivisSpeechSettings = null;
    readonly separator = '。';

    private voices = [];

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
        saveTtsProviderSettings();
    }

    async loadSettings(settings: AivisSpeechSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };

        console.log('load settings', settings);
        $('#aivis_base_url').val(this.settings.baseUrl);
        $('#aivis_base_url').on('input', () => this.onSettingsChange());

        this.voices = [];
        try {
            const res = await fetch(`${this.settings.baseUrl}/speakers`);
            const speakers = await res.json();

            for (const speaker of speakers) {
                for (const style of speaker.styles) {
                    const name = `${speaker.name}（${style.name}）`;
                    const id = style.id.toString();

                    this.voices.push({
                        voice_id: id,
                        name,
                        lang: 'ja-JP',
                        preview_url: null,
                    });
                }
            }
        } catch (err) {
            console.error('[AivisSpeech] スピーカー取得失敗:', err);
            toastr.error('話者リストの取得に失敗しました');
        }
    }

    async checkReady() {
        const res = await fetch(`${this.settings.baseUrl}/speakers`);
        if (!res.ok) throw new Error('AivisSpeech に接続できません');
    }

    async onRefreshClick() {
        return;
    }

    async fetchTtsVoiceObjects() {
        return this.voices;
    }

    async getVoice(voiceName: string) {
        const match = this.voices.find(v => v.name == voiceName);

        if (!match) {
            throw new Error(`TTS Voice name "${voiceName}" not found`);
        }

        return match;
    }

    async generateTts(text: string, voiceId: VoiceId) {
        const speaker = parseInt(voiceId);

        try {
            const queryRes = await fetch(`${this.settings.baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, {
                method: 'POST'
            });
            const query = await queryRes.json();

            const synthRes = await fetch(`${this.settings.baseUrl}/synthesis?speaker=${speaker}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(query)
            });

            if (!synthRes.ok) {
                throw new Error(`音声合成に失敗しました: ${synthRes.statusText}`);
            }

            return synthRes;
        } catch (err) {
            console.error('[AivisSpeech] 音声生成中のエラー:', err);
            throw err;
        }
    }

    async previewTtsVoice(voiceId: VoiceId) {
        toastr.info('このボイスにはプレビュー音声が設定されていません。');
    }
}

registerTtsProvider('AivisSpeech', AivisSpeechTtsProvider);
