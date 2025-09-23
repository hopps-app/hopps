import { cn } from '@/lib/utils';

interface InputLoaderProps {
    className?: string;
}

const InputLoader = ({ className }: InputLoaderProps) => {
    return (
        <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-primary w-4 h-4 md:w-5 md:h-5', className)}>
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default InputLoader;
