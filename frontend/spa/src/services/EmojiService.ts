import { init } from 'emoji-mart';

class EmojiService {
    private data: unknown | null = null;

    async init() {
        const data = this.getEmojis();
        await init(data);
    }

    async getEmojis() {
        if (this.data === null) {
            const response = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
            this.data = response.json();
        }

        return this.data;
    }
}

const emojiService = new EmojiService();
export default emojiService;
