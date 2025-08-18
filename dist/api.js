const { t } = window.SillyTavern.getContext();
/**
 * Access to the AivisSpeech API
 */
export class AivisSpeechApi {
    baseUrl;
    /**
     * Create a connection to the AivisSpeech API
     * @param baseUrl the base URL of the server
     */
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    /**
     * Set new endpoint for the API
     * @param baseUrl the base URL of the server
     */
    setEndpoint(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async baseFetch(route, method = 'get', params, body) {
        let url = this.baseUrl + route;
        if (params) {
            const search = new URLSearchParams(params).toString();
            url += '?' + search;
        }
        const opts = { method };
        if (body) {
            opts.headers = { 'Content-Type': 'application/json' },
                opts.body = JSON.stringify(body);
        }
        const res = await fetch(url, opts);
        if (!res.ok) {
            throw new Error(t `Request to AivisSpeech failed: ${res.statusText}`);
        }
        return res;
    }
    /**
     * Get the version of the engine
     */
    async getVersion() {
        return (await this.baseFetch('/version')).json();
    }
    /**
     * Get the list of speakers
     */
    async getSpeakers() {
        return (await this.baseFetch('/speakers')).json();
    }
    async getSpeakerInfo(uuid) {
        return (await this.baseFetch('/speaker_info', 'get', {
            speaker_uuid: uuid,
            resource_format: 'base64'
        })).json();
    }
    /**
     * Get the initial value for the voice synthesis query
     * @param text text to pronounce
     * @param speaker numerical ID of the speaker style
     */
    async makeAudioQuery(text, speaker) {
        return (await this.baseFetch('/audio_query', 'post', {
            text,
            speaker: speaker.toString(),
        })).json();
    }
    /**
     * Perform voice synthesis based on given audio query
     *
     * Returns the `Response` object that contains audio data in the WAV format.
     *
     * @param query query value retrieved with `makeAudioQuery`
     * @param speaker numerical ID of the speaker style
     */
    async synthesize(query, speaker) {
        return this.baseFetch('/synthesis', 'post', {
            speaker: speaker.toString(),
        }, query);
    }
    /**
     * Generate speech from given text
     *
     * This is a convenience function that combines `makeAudioQuery` and
     * `synthesize`.
     *
     * @param text text to pronounce
     * @param speaker numerical ID of the speaker style
     */
    async textToSpeech(text, speaker) {
        const query = await this.makeAudioQuery(text, speaker);
        return await this.synthesize(query, speaker);
    }
}
