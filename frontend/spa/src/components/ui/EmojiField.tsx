import Picker from '@emoji-mart/react';
import { CaretSortIcon } from '@radix-ui/react-icons';
import * as SelectPrimitive from '@radix-ui/react-select';
import { useState } from 'react';

import Emoji from '@/components/ui/Emoji.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/shadecn/Popover.tsx';
import { cn } from '@/lib/utils.ts';
import emojiService from '@/services/EmojiService.ts';
import themeService from '@/services/ThemeService.ts';

interface EmojiFieldProps {
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
}

function EmojiField(props: EmojiFieldProps) {
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(props.value || null);
    const [isPickerVisible, setIsPickerVisible] = useState(false);
    const [data] = useState(emojiService.getEmojis());
    const [theme] = useState(themeService.getTheme());

    const onEmojiSelect = (emoji: { id: string; native: string }) => {
        setSelectedEmoji(emoji.id);
        setIsPickerVisible(false);

        props.onChange?.(emoji.id);
    };

    const onPopoverOpenChange = (isOpen: boolean) => {
        setIsPickerVisible(isOpen);
    };

    return (
        <>
            <Popover onOpenChange={onPopoverOpenChange} open={isPickerVisible}>
                <PopoverTrigger>
                    <div
                        className={cn(
                            'flex w-full text-xl items-center justify-between whitespace-nowrap ' +
                                'border border-[#A7A7A7] px-4 py-2 rounded-md outline-none bg-primary-foreground transition-colors' +
                                'shadow-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                            props.className
                        )}
                    >
                        <div className="text-muted">{selectedEmoji ? <Emoji emoji={selectedEmoji} /> : <span className="px-[var(--btn-radius)]"></span>}</div>
                        <SelectPrimitive.Icon asChild>
                            <CaretSortIcon className="h-4 w-4 opacity-50" />
                        </SelectPrimitive.Icon>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-0">
                    <div>
                        <Picker data={data} onEmojiSelect={onEmojiSelect} previewEmoji={false} previewPosition="none" theme={theme} />
                    </div>
                </PopoverContent>
            </Popover>
        </>
    );
}

export default EmojiField;
