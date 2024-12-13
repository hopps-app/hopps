import { useState } from 'react';

import TextField from '@/components/ui/TextField.tsx';
import Button from '@/components/ui/Button.tsx';
import Radio from '@/components/ui/Radio.tsx';
import Select from '@/components/ui/Select.tsx';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu.tsx';
import { useToast } from '@/hooks/use-toast.ts';

function DemoView() {
    const { toast } = useToast();
    const [radioItems] = useState([
        { label: 'radio item 1', value: '1' },
        { label: 'radio item 2', value: '2' },
    ]);
    const [selectItems] = useState([
        { label: 'item 1', value: '1' },
        { label: 'item 2', value: '2' },
    ]);
    const [selectValue, setSelectValue] = useState('');

    const handleSelectChange = (value: string) => {
        setSelectValue(value);
    };

    const [dropdownMenuItems] = useState<DropdownMenuItem[]>([
        { type: 'label', title: 'Label' },
        { type: 'separator' },
        { title: 'Item with action', onClick: () => alert('action') },
        { title: 'Item without action' },
    ]);

    const onClickTest = async () => {
        await window.fetch('http://localhost:8080/bommel/root/2', {});
    };

    return (
        <div>
            <h1 className="text-center">Demo page</h1>

            <Button onClick={onClickTest}>TEst</Button>

            <div className="my-4">
                <h2 className="text-center">Buttons:</h2>
                <div className="flex flex-row gap-4 justify-center">
                    <Button>Default</Button>
                    <Button title={'title'} />
                    <Button icon="Check">With icon</Button>
                    <Button variant="link">Link</Button>
                    <Button icon="ExternalLink" variant="link" title="Link with icon" />
                </div>
            </div>
            <hr />
            <div className="my-4">
                <h2 className="text-center">Text fields:</h2>
                <div className="flex flex-row gap-4 justify-center">
                    <TextField placeholder="without label" label="Label" />
                    <TextField placeholder="Password" label="Password" type="password" />
                    <TextField placeholder="without label" />
                </div>
            </div>
            <hr />
            <div className="my-4">
                <h2 className="text-center">Selects:</h2>
                <div className="flex flex-row gap-4 justify-center">
                    <div className="flex flex-row">
                        <Select items={selectItems} value={selectValue} onValueChanged={handleSelectChange} />
                    </div>
                    <div>
                        <Select items={selectItems} label="With label" />
                    </div>
                    <div>
                        <Select items={selectItems} label="With Placeholder" placeholder="BaseSelect placeholder" />
                    </div>
                    <div>
                        <Select items={selectItems} label="With select value" value={selectItems[1].value} />
                    </div>
                </div>
            </div>
            <hr />
            <div className="my-4">
                <h2 className="text-center">Radio Group:</h2>
                <div className="flex flex-row gap-4 justify-center">
                    <div>
                        Vertical:
                        <Radio items={radioItems} />
                    </div>
                    <div>
                        horizontal:
                        <Radio items={radioItems} layout="horizontal" />
                    </div>
                </div>
            </div>
            <hr />
            <div className="my-4">
                <h2 className="text-center">Dropdown Menu:</h2>
                <div className="flex flex-row gap-4 justify-center">
                    <DropdownMenu items={dropdownMenuItems}>
                        <Button>Click me</Button>
                    </DropdownMenu>
                </div>
            </div>
            <div className="my-4">
                <h2 className="text-center">Toast notifications:</h2>
                <div className="flex flex-row gap-4 justify-center">
                    <Button title="default" onClick={() => toast({ title: 'Default toast' })} />
                    <Button title="success" onClick={() => toast({ title: 'Success toast', variant: 'success' })} />
                    <Button title="error" onClick={() => toast({ title: 'Error toast', variant: 'error' })} />
                </div>
            </div>
        </div>
    );
}

export default DemoView;
