const { t } = (window as any).SillyTavern.getContext();

export interface Style {
    id: number,
    name: string,
    type: 'talk',
}

export interface Speaker {
    name: string,
    speaker_uuid: string,
    styles: Array<Style>,
}

export interface StyleInfo {
    id: number,
    icon: string,
    voice_samples: Array<string>,
    voice_sample_transcripts: Array<string>,
}

export interface SpeakerInfo {
    policy: string,
    portrait: string,
    style_infos: Array<StyleInfo>,
}

/**
 * Access to the AivisSpeech API
 */
export class AivisSpeechApi {
    /**
     * Create a connection to the AivisSpeech API
     * @param baseUrl the base URL of the server
     */
    constructor(private baseUrl: string) {}

    /**
     * Set new endpoint for the API
     * @param baseUrl the base URL of the server
     */
    setEndpoint(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async baseFetch(
        route: string,
        method: string = 'get',
        params?: Record<string, string>,
        body?: object,
    ): Promise<Response> {
        let url = this.baseUrl + route;
        if (params) {
            const search = new URLSearchParams(params).toString();
            url += '?' + search;
        }
        const opts: RequestInit = { method };
        if (body) {
            opts.headers = { 'Content-Type': 'application/json' },
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(url, opts);
        if (!res.ok) {
            throw new Error(t`Request to AivisSpeech failed: ${res.statusText}`);
        }
        return res;
    }

    /**
     * Get the version of the engine
     */
    async getVersion(): Promise<string> {
        return (await this.baseFetch('/version')).json();
    }

    /**
     * Get the list of speakers
     */
    async getSpeakers(): Promise<Array<Speaker>> {
        return (await this.baseFetch('/speakers')).json();
    }

    async getSpeakerInfo(uuid: string): Promise<SpeakerInfo> {
        return (await this.baseFetch('/speaker_info', 'get', {
            speaker_uuid: uuid,
            resource_format: 'base64'
        })).json()
    }

    /**
     * Get the initial value for the voice synthesis query
     * @param text text to pronounce
     * @param speaker numerical ID of the speaker style
     */
    async makeAudioQuery(text: string, speaker: number): Promise<any> {
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
    async synthesize(query: any, speaker: number) {
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
    async textToSpeech(text: string, speaker: number) {
        const query = await this.makeAudioQuery(text, speaker);
        return await this.synthesize(query, speaker);
    }
}
