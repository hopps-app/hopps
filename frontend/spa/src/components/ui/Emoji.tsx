import { cn } from '@/lib/utils.ts';

interface EmojiProps {
    emoji: string;
    className?: string;
}

function Emoji({ emoji, className }: EmojiProps) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return <em-emoji id={emoji} class={cn(className)}></em-emoji>;
}

export default Emoji;
