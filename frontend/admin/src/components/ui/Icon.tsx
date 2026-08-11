import * as icons from '@radix-ui/react-icons';

type RemoveIconSuffix<T> = T extends `${infer U}Icon` ? U : T;
export type RadixIcons = RemoveIconSuffix<keyof typeof icons>;

export interface IconProps {
    icon: RadixIcons;
    size?: number;
    className?: string;
    color?: string;
}

function Icon({ icon, color, size, className }: IconProps) {
    const IconComponent = icons[(icon + 'Icon') as keyof typeof icons];

    if (!IconComponent) {
        console.error(`Icon "${icon}" not found`);
        return null;
    }

    const dimension = size ?? 15;

    return <IconComponent className={className} width={dimension} height={dimension} color={color} />;
}

export default Icon;
