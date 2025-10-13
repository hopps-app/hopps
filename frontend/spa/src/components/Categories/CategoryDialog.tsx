import { useState } from 'react';
import { Dialog, Trigger, Portal, Content, Title, Close, Description, Overlay } from '@radix-ui/react-dialog';

import Button from '@/components/ui/Button';
import CategoryForm from './CategoryForm';

export default function CategoryDialog() {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Trigger asChild>
                <Button type="button">Neue Kategorie</Button>
            </Trigger>

            <Portal>
                <Overlay className="fixed inset-0 bg-black/40" />
                <Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
                    <Title className="text-lg font-semibold">Neue Kategorie erstellen</Title>
                    <Description className="mt-1 text-sm text-gray-600">Geben Sie die Details der neuen Kategorie ein.</Description>

                    <CategoryForm onSuccess={() => setOpen(false)} />

                    <div className="mt-6 flex justify-end gap-3">
                        <Close asChild>
                            <Button variant="secondary" type="button">
                                Abbrechen
                            </Button>
                        </Close>

                        <Button type="submit" form="category-form">
                            Speichern
                        </Button>
                    </div>
                </Content>
            </Portal>
        </Dialog>
    );
}
