import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateCertificateHtml } from '../components/certificate/CertificateGenerator.jsx';

// Pure Print Page - No UI, just certificate content
export const PrintOnlyPage = () => {
    const [searchParams] = useSearchParams();
    const style = searchParams.get('style') || 'modern';

    // Mock data - in real app, this would come from props or API
    const mockData = {
        studentName: "Fandi Ahmad",
        title: "Fullstack Web Developer Professional",
        instructor: "Rizky Ramadhan",
        dateCompleted: "14 January 2026",
        certificateID: "MAXY-CERT-2026-45MJOV",
        totalScore: 94,
        modules: [
            { name: "Frontend Fundamentals (HTML/CSS)", score: 95, weight: 10 },
            { name: "JavaScript Advanced Concepts", score: 88, weight: 15 },
            { name: "React JS Ecosystem", score: 92, weight: 20 },
            { name: "Backend Development with Laravel", score: 90, weight: 20 },
            { name: "Database Design & SQL", score: 96, weight: 15 },
            { name: "API Development & Security", score: 94, weight: 10 },
            { name: "System Architecture & Deployment", score: 98, weight: 10 }
        ],
        skills: {
            "Frontend": 92,
            "Backend": 94,
            "Database": 96,
            "DevOps": 85
        },
        feedback: {
            strengths: "Demonstrates exceptional problem-solving skills and a deep understanding of full-stack architecture. Consistently delivers high-quality, maintainable code.",
            improvements: "Could focus more on automated testing coverage in future projects. Documentation is good but could be more granular.",
            career: "Highly recommended for Senior Web Developer or Technical Lead roles. Has the potential to architect complex scalable systems."
        }
    };

    const mockConfig = {
        templateStyle: style
    };

    useEffect(() => {
        document.title = `${mockData.studentName}_${mockData.title}_Certificate`;
    }, []);

    const htmlContent = generateCertificateHtml(mockData, mockConfig);

    // Auto-open print dialog after a short delay
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            style={{
                width: '100%',
                margin: 0,
                padding: 0,
                backgroundColor: 'white'
            }}
        />
    );
};
