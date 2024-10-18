import { Label } from './label';
import { Input } from '@/components/ui/Input.tsx';
import { useState } from 'react';
import * as _ from 'lodash';

interface TextFieldProps {
    label?: string;
    placeholder?: string;
    type?: string;
}

function TextField(props: TextFieldProps) {
    const { label, placeholder, type } = props;
    const [id] = useState(_.uniqueId('text-field-'));

    return (
        <div className="grid w-full max-w-sm items-center gap-1.5">
            {label && <Label htmlFor={id}>{label}</Label>}
            <Input id={id} type={type || 'text'} placeholder={placeholder || ''} />
        </div>
    );
}

export default TextField;
