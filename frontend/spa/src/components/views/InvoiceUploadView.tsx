import React from 'react';

import InvoiceUploadForm from '../InvoiceUploadForm/InvoiceUploadForm';

const InvoiceUploadView: React.FC = () => {
    return (
        <div className="invoice-upload-page h-full min-h-[inherit] flex flex-col justify-center">
            <div className="bg-white dark:bg-black/20 rounded shadow p-4">
                <InvoiceUploadForm />
            </div>
        </div>
    );
};

export default InvoiceUploadView;
