const BOMMEL_NAME_MAX_LENGTH = 255;

export { BOMMEL_NAME_MAX_LENGTH };

export function validateBommelName(name: string): 'required' | 'maxLength' | null {
    if (!name.trim()) {
        return 'required';
    }
    if (name.trim().length > BOMMEL_NAME_MAX_LENGTH) {
        return 'maxLength';
    }
    return null;
}
