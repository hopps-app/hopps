import { Button } from '@/components/ui/Button.tsx';
import TextField from '@/components/ui/TextField.tsx';

function DemoPage() {
    return (
        <div>
            <h1 className="text-center">Demo page</h1>
            <div className="my-4">
                <h2>Buttons:</h2>
                <div className="flex flex-row gap-4 justify-center">
                    <Button>Default</Button>
                    <Button variant="link">Link</Button>
                </div>
            </div>
            <hr />
            <div className="my-4">
                <h2>Text fields:</h2>
                <div className="flex flex-row gap-4 justify-center">
                    <TextField placeholder="without label" />
                    <TextField placeholder="without label" label="Label" />
                    <TextField placeholder="Password" label="Password" type="password" />
                </div>
            </div>
        </div>
    );
}

export default DemoPage;
