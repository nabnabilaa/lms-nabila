import React from 'react';
import { CertificateTemplate } from './PrintableCertificate';

export const MultiPageCertificate = ({ data, config }) => {
    if (!data) return null;

    return (
        <div className="flex flex-col items-center gap-8 w-full overflow-hidden">
            {/* 
                CertificateTemplate renders fixed A4 (297mm). 
                We use CSS transform to scale it down for preview on smaller screens 
                while keeping the layout identical to print.
            */}
            <div className="origin-top transform scale-50 md:scale-75 lg:scale-90 xl:scale-100 transition-transform duration-300">
                <CertificateTemplate data={data} config={config} />
            </div>
        </div>
    );
};