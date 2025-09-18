import * as React from 'react';

import Icon, { IconProps } from '@/components/ui/Icon';
import { BaseButton, BaseButtonProps } from '@/components/ui/shadecn/BaseButton';

interface ButtonProps extends BaseButtonProps {
    title?: string;
    icon?: IconProps['icon'];
    variant?: 'default' | 'outline' | 'link';
    iconColor?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ title, variant, icon, iconColor, children, ...props }, ref) => {
    return (
        <BaseButton variant={variant} ref={ref} {...props}>
            {icon ? <Icon icon={icon} color={iconColor} /> : null}
            {children || title}
        </BaseButton>
    );
});

Button.displayName = 'Button';

export default Button;
