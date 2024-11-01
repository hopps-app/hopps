import * as icons from '@radix-ui/react-icons';

type RemoveIconSuffix<T> = T extends `${infer U}Icon` ? U : T;
type RadixIcons = RemoveIconSuffix<keyof typeof icons>;

export interface IconProps {
    icon: RadixIcons;
}

function Icon({ icon, ...props }: IconProps) {
    const IconComponent = icons[(icon + 'Icon') as keyof typeof icons];

    if (!IconComponent) {
        console.error(`Icon "${icon}" not found`);
        return null;
    }
    return <IconComponent {...props} />;
}

export default Icon;
