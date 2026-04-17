// Wrapper component to pass course data to AdminCertificateBuilder
import { useParams } from 'react-router-dom';
import { AdminCertificateBuilder } from './AdminCertificateBuilder';
import { courseService } from '../../services/courseService';
import { showToast } from '../../components/ui/Toast'; // NEW

export const AdminCertificateBuilderWrapper = ({ globalCourses, currentUser }) => {
    const { courseId } = useParams();
    const course = globalCourses.find(c => c.id === parseInt(courseId));

    const handleSave = async (data) => {
        try {
            await courseService.updateCertificateTemplate(courseId, data);
            showToast("Certificate template saved successfully!", "success");
        } catch (error) {
            console.error("Failed to save template", error);
            showToast("Failed to save template.", "error");
        }
    };

    if (!course) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">Course not found</p>
            </div>
        );
    }

    return (
        <AdminCertificateBuilder
            course={course}
            onSave={handleSave}
            onCancel={() => window.history.back()}
            userRole={currentUser?.role || 'learner'}
        />
    );
};
