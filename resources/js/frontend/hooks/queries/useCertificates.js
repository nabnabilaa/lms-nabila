import { useQuery } from '@tanstack/react-query';
import { certificateService } from '../../services/certificateService';

export const useCertificatesQuery = () => {
    return useQuery({
        queryKey: ['certificates'],
        queryFn: certificateService.getMyCertificates,
        staleTime: 5 * 60 * 1000,
    });
};
