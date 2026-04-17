import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { Award, BarChart3, ThumbsUp, PenTool, Briefcase, ShieldCheck, Terminal } from 'lucide-react';

// ==========================================
// 1. RE-USE CHART & COMPONENTS (Static Render)
// ==========================================
const RadarChart = ({ skills, size = 300 }) => {
    const data = Object.entries(skills);
    const total = data.length;
    if (total < 3) return null;

    const radius = (size / 2) - 60;
    const centerX = size / 2;
    const centerY = size / 2;

    const getCoordinates = (value, index) => {
        const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
        const r = (value / 100) * radius;
        return [centerX + r * Math.cos(angle), centerY + r * Math.sin(angle)];
    };

    const points = data.map(([_, score], i) => getCoordinates(score, i).join(',')).join(' ');

    return (
        <svg width={size} height={size} className="overflow-visible mx-auto" style={{ maxWidth: 'none' }}>
            {[25, 50, 75, 100].map((level, i) => (
                <polygon key={i} points={data.map((_, idx) => getCoordinates(level, idx).join(',')).join(' ')}
                    fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
            ))}
            <polygon points={points} fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth="2.5" />
            {data.map(([_, score], i) => {
                const [x, y] = getCoordinates(score, i);
                return <circle key={i} cx={x} cy={y} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" />;
            })}
            {data.map(([label], i) => {
                const [x, y] = getCoordinates(120, i);
                const labelX = centerX + ((radius + 35) * Math.cos((Math.PI * 2 * i) / total - Math.PI / 2));
                let anchor = 'middle';
                if (labelX < centerX - 10) anchor = 'end';
                if (labelX > centerX + 10) anchor = 'start';
                return (
                    <text key={i} x={x} y={y} fontSize="11" fontWeight="600" fill="#475569" textAnchor={anchor} dominantBaseline="middle" style={{ fontFamily: 'sans-serif' }}>
                        {label}
                    </text>
                );
            })}
        </svg>
    );
};

const ProgressBar = ({ progress, height = "h-2" }) => (
    <div className={`w-full bg-gray-200 rounded-full ${height}`}>
        <div className={`bg-blue-600 h-full rounded-full`} style={{ width: `${progress}%` }}></div>
    </div>
);

// ==========================================
// 2. MAIN GENERATOR FUNCTION
// ==========================================
export const generateCertificateHtml = (data, config) => {
    // 2.1 Theme Config
    const mode = config.templateStyle || 'modern';
    const themes = {
        classic: { containerClass: 'bg-[#fffdf5] border-8 border-double border-yellow-700 p-2', innerClass: 'border border-yellow-700 h-full flex flex-col items-center text-center p-8', fontHead: 'font-serif', fontBody: 'font-serif', textMain: 'text-gray-900', textSub: 'text-gray-600', accent: 'text-yellow-800', Icon: Award, iconStyle: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
        tech: { containerClass: 'bg-slate-950 border-2 border-cyan-500 p-2 relative overflow-hidden', innerClass: 'h-full flex flex-col items-center text-center p-8 relative z-10', fontHead: 'font-mono tracking-tighter', fontBody: 'font-mono', textMain: 'text-cyan-50', textSub: 'text-cyan-400', accent: 'text-cyan-400', Icon: Terminal, iconStyle: 'bg-slate-900 text-cyan-400 border border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' },
        modern: { containerClass: 'bg-white border-l-[32px] border-blue-600 p-10', innerClass: 'h-full flex flex-col items-center text-center', fontHead: 'font-sans font-extrabold tracking-tight', fontBody: 'font-sans text-slate-600', textMain: 'text-slate-900', textSub: 'text-slate-500', accent: 'text-blue-600', Icon: ShieldCheck, iconStyle: 'bg-blue-50 text-blue-600' }
    };
    const theme = themes[mode] || themes.modern;
    const Icon = theme.Icon;

    // 2.2 Helper for Page Wrapper
    // Note: We use strict inline styles for dimensions to ensure A4 size in PDF
    const pageStyle = `width: 297mm; height: 210mm; position: relative; overflow: hidden; box-sizing: border-box;`;

    // 2.3 Render Sections to HTML String
    const renderCover = () => (
        <div className={`pdf-page ${theme.containerClass}`} style={{ width: '297mm', height: '210mm' }}>
            {config.templateStyle === 'tech' && (
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                    <div className="grid grid-cols-12 h-full opacity-20">{[...Array(12)].map((_, i) => <div key={i} className="border-r border-cyan-500 h-full"></div>)}</div>
                </div>
            )}
            <div className={theme.innerClass}>
                <div className="mt-6 mb-4">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${theme.iconStyle}`}><Icon className="w-10 h-10" /></div>
                    <h1 className={`text-5xl uppercase mb-1 ${theme.fontHead} ${theme.textMain}`}>Certificate</h1>
                    <p className={`text-xl italic ${theme.fontBody} ${theme.textSub}`}>of Competence</p>
                </div>
                <div className="flex-1 flex flex-col justify-center w-full max-w-4xl px-8 mx-auto">
                    <p className={`mb-3 text-lg ${theme.fontBody} ${theme.textSub}`}>This is to certify that</p>
                    <h2 className={`text-5xl font-bold mb-8 pb-6 border-b-2 leading-relaxed px-4 ${theme.fontHead} ${theme.textMain} ${config.templateStyle === 'tech' ? 'border-cyan-900' : 'border-gray-200'}`}>{data.studentName}</h2>
                    <h3 className={`text-4xl font-bold mb-4 ${theme.fontHead} ${theme.accent}`}>{data.title}</h3>
                    <p className={`font-medium text-lg ${theme.fontBody} ${theme.textSub}`}>Completed on {data.dateCompleted}</p>
                </div>
                <div className="w-full flex justify-between items-end px-16 mb-10 mt-6">
                    <div className="text-center"><div className={`w-56 border-b-2 mb-2 font-dancing-script text-2xl ${theme.accent}`}>Rizky R.</div><p className={`font-bold ${theme.textMain}`}>{data.instructor}</p><p className={`text-sm ${theme.textSub}`}>Lead Instructor</p></div>
                    <div className="text-center"><div className="border-4 rounded-full w-28 h-28 flex flex-col items-center justify-center text-sm font-bold p-2 rotate-12 border-blue-100 text-blue-600"><span>VALID</span><span className="text-xs block mt-1 scale-90">{data.certificateID}</span></div></div>
                    <div className="text-center"><div className={`w-56 border-b-2 mb-2 font-dancing-script text-2xl ${theme.accent}`}>Maxy CEO</div><p className={`font-bold ${theme.textMain}`}>Program Director</p><p className={`text-sm ${theme.textSub}`}>Maxy Academy</p></div>
                </div>
            </div>
        </div>
    );

    const renderTranscripts = () => {
        const ITEMS_PER_PAGE = 5;
        const moduleChunks = [];
        if (data.modules?.length > 0) {
            for (let i = 0; i < data.modules.length; i += ITEMS_PER_PAGE) {
                moduleChunks.push(data.modules.slice(i, i + ITEMS_PER_PAGE));
            }
        } else { moduleChunks.push([]); }

        return moduleChunks.map((chunk, chunkIndex) => (
            <div key={chunkIndex} className="pdf-page border border-gray-200 p-12 flex flex-col" style={{ width: '297mm', height: '210mm', backgroundColor: 'white' }}>
                <div className="border-b-2 border-blue-900 pb-4 mb-8 flex justify-between items-end">
                    <div><h2 className="text-3xl font-bold text-gray-900">Transkrip Akademik</h2><p className="text-gray-500 text-lg mt-1">Detail penilaian modul teknis.</p></div>
                    <div className="text-right"><p className="text-base font-bold text-gray-900">{data.certificateID}</p></div>
                </div>
                <div className="flex-1 flex flex-col">
                    <table className="w-full text-left mb-6">
                        <thead><tr className="border-b-2 border-gray-100"><th className="py-3 font-bold text-gray-600 w-16 text-lg">No</th><th className="py-3 font-bold text-gray-600 text-lg">Modul</th><th className="py-3 font-bold text-gray-600 text-right text-lg">Nilai</th></tr></thead>
                        <tbody className="divide-y divide-gray-50">{chunk.map((mod, idx) => (<tr key={idx}><td className="py-4 text-gray-500 text-lg">{(chunkIndex * ITEMS_PER_PAGE) + idx + 1}</td><td className="py-4 font-medium text-gray-900 text-lg">{mod.name}</td><td className="py-4 font-bold text-blue-600 text-right text-lg">{mod.score}</td></tr>))}</tbody>
                    </table>
                    {chunkIndex === moduleChunks.length - 1 && (
                        <div className="mt-auto pt-6 border-t border-gray-100">
                            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-xl">
                                <BarChart3 className="w-6 h-6 text-blue-600" /> Distribusi Skill
                            </h4>
                            <div className="grid grid-cols-2 gap-x-16 gap-y-4">
                                {Object.entries(data.skills).map(([skill, score]) => (
                                    <div key={skill}><div className="flex justify-between text-base mb-1"><span className="font-medium text-gray-700">{skill}</span><span className="font-bold text-blue-600">{score}</span></div><ProgressBar progress={score} height="h-2" /></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ));
    };

    const renderFeedback = () => (
        <div className="pdf-page bg-white border border-gray-200 p-12 flex flex-col font-sans" style={{ width: '297mm', height: '210mm' }}>
            {/* Header */}
            <div className="pdf-header">
                <div className="pdf-header-row">
                    <div className="pdf-header-icon-cell">
                        <div className="pdf-header-icon">
                            <ShieldCheck />
                        </div>
                    </div>
                    <div className="pdf-header-text-cell">
                        <h2 className="pdf-header-title">Laporan Kompetensi & Karir</h2>
                        <p className="pdf-header-subtitle">Analisis Performa & Rekomendasi Profesional</p>
                    </div>
                </div>
            </div>

            <div className="pdf-grid">
                {/* Left Column */}
                <div className="pdf-col-8">
                    <div className="pdf-card">
                        <div className="pdf-card-header">
                            <div className="pdf-card-icon green"><ThumbsUp /></div>
                            <h3 className="pdf-card-title">Kekuatan Utama</h3>
                        </div>
                        <p className="pdf-card-text">{data.feedback.strengths || "Peserta menunjukkan pemahaman mendalam tentang arsitektur backend."}</p>
                    </div>

                    <div className="pdf-card">
                        <div className="pdf-card-header">
                            <div className="pdf-card-icon orange"><PenTool /></div>
                            <h3 className="pdf-card-title">Area Pengembangan</h3>
                        </div>
                        <p className="pdf-card-text">{data.feedback.improvements || "Disarankan untuk meningkatkan cakupan pengujian otomatis."}</p>
                    </div>

                    <div className="pdf-card-dark">
                        <div className="pdf-card-header">
                            <div className="pdf-card-icon yellow"><Briefcase /></div>
                            <h3 className="pdf-card-title">Rekomendasi Karir</h3>
                        </div>
                        <p className="pdf-card-text">{data.feedback.career || "Sangat direkomendasikan untuk peran Senior Backend Developer."}</p>
                    </div>
                </div>

                {/* Right Column (Chart) */}
                <div className="pdf-col-4">
                    <div className="pdf-chart-container">
                        <div className="pdf-chart-header">
                            <h4 className="pdf-chart-title">Peta Kompetensi</h4>
                            <p className="pdf-chart-subtitle">Visualisasi Skill</p>
                        </div>
                        <div className="pdf-chart-body">
                            <div style={{ transform: 'scale(1.05)', transformOrigin: 'center' }}>
                                <RadarChart skills={data.skills} size={260} />
                            </div>
                        </div>
                        <div className="pdf-chart-footer">
                            <span>Beginner (0)</span><span>Expert (100)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // 2.4 Combine everything into a container
    // We use React Fragment to group, then render to string
    const FullCertificate = (
        <div className="pdf-container" style={{ width: '297mm', margin: '0 auto' }}>
            {renderCover()}
            {renderTranscripts()}
            {renderFeedback()}
        </div>
    );

    return renderToStaticMarkup(FullCertificate);
};
