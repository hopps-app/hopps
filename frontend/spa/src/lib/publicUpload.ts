// The public upload page behind a bommel's upload link. Submitters have no account, so the app skips the login
// check on this path (see App.tsx).
export const PUBLIC_UPLOAD_PATH = '/upload';

export function isPublicUploadPage(pathname: string = window.location.pathname): boolean {
    return pathname.startsWith(`${PUBLIC_UPLOAD_PATH}/`);
}
