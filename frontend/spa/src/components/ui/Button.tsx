import * as React from 'react';

import { BaseButton, BaseButtonProps } from '@/components/ui/shadecn/BaseButton.tsx';
import Icon, { IconProps } from '@/components/ui/Icon.tsx';

interface ButtonProps extends BaseButtonProps {
    title?: string;
    icon?: IconProps['icon'];
    variant?: 'default' | 'outline' | 'link';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ title, variant, icon, children, ...props }, ref) => {
    return (
        <BaseButton variant={variant} ref={ref} {...props}>
            {icon ? <Icon icon={icon} /> : null}
            {children || title}
        </BaseButton>
    );
});

Button.displayName = 'Button';

export default Button;
