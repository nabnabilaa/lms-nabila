import React, { useRef, useState } from 'react';
import { Award, BarChart3, ThumbsUp, PenTool, Briefcase, ShieldCheck, Terminal, Download, Loader2 } from 'lucide-react';
import { ProgressBar } from '../ui';


// ==========================================
// 1. KOMPONEN RADAR CHART (Fixed Layout)
// ==========================================
export const RadarChart = ({ skills, size = 300, color = "#3b82f6" }) => {
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
      {/* Grid Background */}
      {[25, 50, 75, 100].map((level, i) => (
        <polygon key={i} points={data.map((_, idx) => getCoordinates(level, idx).join(',')).join(' ')}
          fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
      ))}

      {/* Area Grafik Biru */}
      <polygon points={points} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2.5" />

      {/* Titik Sudut */}
      {data.map(([_, score], i) => {
        const [x, y] = getCoordinates(score, i);
        return <circle key={i} cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="2" />;
      })}

      {/* Label Text (Smart Align) */}
      {data.map(([label], i) => {
        const [x, y] = getCoordinates(120, i);
        const labelX = centerX + ((radius + 35) * Math.cos((Math.PI * 2 * i) / total - Math.PI / 2));

        let anchor = 'middle';
        if (labelX < centerX - 10) anchor = 'end';
        if (labelX > centerX + 10) anchor = 'start';

        return (
          <text
            key={i} x={x} y={y}
            fontSize="11" fontWeight="600" fill="#475569"
            textAnchor={anchor} dominantBaseline="middle"
            style={{ fontFamily: 'sans-serif' }}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
};

// ==========================================
// 2. TEMPLATE SERTIFIKAT UTAMA
// ==========================================
export const CertificateTemplate = ({ data, config }) => {

  // --- Config Tema Standard (Updated to match User Request) ---
  // --- Config Tema Standard (Updated to match User Request) ---
  const getTemplateStyles = () => {
    switch (config.templateStyle) {
      case 'classic':
        return {
          wrapper: 'bg-[#FFFCF5]', // Warm cream background
          bg: 'bg-[#FFFCF5]',
          border: 'border-[20px] border-double border-[#C5A059]', // Elegant Double Gold Border

          // Typography
          fontHead: 'font-serif tracking-wide',
          fontBody: 'font-serif text-slate-800',
          textColor: 'text-slate-900',
          subTextColor: 'text-slate-600',
          accent: 'text-[#C5A059]', // Gold accent

          // Elements
          badge: 'border-[#C5A059] text-[#9A7B3E] bg-[#FDF6E3]',
          Icon: Award,
          iconBg: 'bg-[#FDF6E3] text-[#C5A059] border border-[#C5A059]',

          // Inner Layouts
          divider: 'border-[#C5A059]/30',
          tableHeaderBorder: 'border-[#C5A059]',
          tableRowDivide: 'divide-[#C5A059]/20',

          // Components
          progressColor: 'bg-[#C5A059]',
          cardBg: 'bg-[#FFFCF5]',
          cardBorder: 'border-[#E6D5B8]',
          cardShadow: 'shadow-sm',

          // Career Card (Specific)
          careerBg: 'bg-[#2C241B]',
          careerBorder: 'border-[#4A3D2F]',
          careerText: 'text-[#FDF6E3]',
          careerIconBg: 'bg-[#4A3D2F] text-[#C5A059]',
        };
      case 'tech':
        return {
          wrapper: 'bg-[#030712]', // Richer, Deepest Blue/Black (Gray-950+)
          bg: 'bg-[#030712]',
          border: 'border border-emerald-500/20 shadow-[0_0_60px_-15px_rgba(16,185,129,0.2)]', // Softer, wider glow

          // Typography
          fontHead: 'font-sans font-bold tracking-widest uppercase',
          fontBody: 'font-sans text-slate-300',
          textColor: 'text-slate-100',
          subTextColor: 'text-slate-400',
          accent: 'bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]', // Gradient Text

          // Elements
          badge: 'border border-emerald-500/30 bg-emerald-950/30 backdrop-blur-md text-emerald-300 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]',
          Icon: Terminal,
          iconBg: 'bg-gradient-to-br from-emerald-900/80 to-slate-900 border border-emerald-500/40 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]',

          // Inner Layouts
          divider: 'border-white/10',
          tableHeaderBorder: 'border-white/10',
          tableRowDivide: 'divide-white/5',

          // Components
          progressColor: 'bg-gradient-to-r from-emerald-500 to-cyan-500', // Gradient Progress
          cardBg: 'bg-slate-900/40 backdrop-blur-md', // Deep Glass
          cardBorder: 'border-white/10',
          cardShadow: 'shadow-2xl shadow-black/50',

          // Career Card
          careerBg: 'bg-gradient-to-br from-slate-900/90 to-black/90 backdrop-blur-xl',
          careerBorder: 'border-emerald-500/30',
          careerText: 'text-emerald-50',
          careerIconBg: 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/20',
        };
      case 'modern':
      default:
        return {
          wrapper: 'bg-white',
          bg: 'bg-white',
          border: 'border-[12px] border-blue-200', // Default thick border

          // Typography
          fontHead: 'font-sans font-bold',
          fontBody: 'font-sans',
          textColor: 'text-gray-900',
          subTextColor: 'text-gray-500',
          accent: 'text-blue-600',

          // Elements
          badge: 'border-blue-200 text-blue-600',
          Icon: ShieldCheck,
          iconBg: 'bg-blue-900 text-white',

          // Inner Layouts
          divider: 'border-gray-200',
          tableHeaderBorder: 'border-gray-100',
          tableRowDivide: 'divide-gray-50',

          // Components
          progressColor: 'bg-blue-600',
          cardBg: 'bg-white',
          cardBorder: 'border-gray-100',
          cardShadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.03)]',

          // Career Card
          careerBg: 'bg-[#0f172a]',
          careerBorder: 'border-slate-800',
          careerText: 'text-gray-100',
          careerIconBg: 'bg-white/10 text-blue-400',
        };
    }
  };

  const style = getTemplateStyles();
  const Icon = style.Icon;
  const ITEMS_PER_PAGE = 10;
  const moduleChunks = [];
  if (data.modules?.length > 0) {
    for (let i = 0; i < data.modules.length; i += ITEMS_PER_PAGE) {
      moduleChunks.push(data.modules.slice(i, i + ITEMS_PER_PAGE));
    }
  } else { moduleChunks.push([]); }

  // Wrapper Halaman A4
  const PageWrapper = ({ children, className = "" }) => (
    <div className={`pdf-page relative box-border overflow-hidden ${className}`}
      style={{ width: '297mm', height: '210mm', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', backgroundColor: config.templateStyle === 'tech' ? '#030712' : undefined }}>
      {/* Tech Decoration: High-End Cyberpunk Ambient */}
      {config.templateStyle === 'tech' && (
        <>
          {/* Deep Ambient Background Flow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_#064e3b_0%,_transparent_50%)] opacity-20 pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,_#0f172a_0%,_transparent_50%)] opacity-40 pointer-events-none"></div>

          {/* Tech Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:50px_50px] pointer-events-none"></div>

          {/* Glowing Accents */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

          {/* Precision Corner Markers */}
          <div className="absolute top-10 left-10 w-2 h-2 bg-emerald-400 shadow-[0_0_10px_#34d399] pointer-events-none"></div>
          <div className="absolute top-10 right-10 w-2 h-2 bg-emerald-400 shadow-[0_0_10px_#34d399] pointer-events-none"></div>
          <div className="absolute bottom-10 left-10 w-2 h-2 bg-emerald-400 shadow-[0_0_10px_#34d399] pointer-events-none"></div>
          <div className="absolute bottom-10 right-10 w-2 h-2 bg-emerald-400 shadow-[0_0_10px_#34d399] pointer-events-none"></div>

          {/* Connecting Lines */}
          <div className="absolute top-11 left-11 right-11 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-11 left-11 right-11 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent pointer-events-none"></div>
        </>
      )}

      {/* Classic Decoration: Inner Border */}
      {config.templateStyle === 'classic' && (
        <div className="absolute inset-4 border border-[#C5A059] pointer-events-none opacity-50"></div>
      )}

      {children}
    </div>
  );

  return (
    <div className="bg-gray-100 font-sans text-slate-800">

      {/* HALAMAN 1 (COVER) */}
      <PageWrapper className={`${style.bg} ${style.border} p-12 flex flex-col items-center text-center`}>
        <div className="mt-8 mb-6 relative z-10">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${style.iconBg}`}>
            <Icon className="w-10 h-10" />
          </div>
          <h1 className={`text-5xl font-serif font-bold tracking-wider ${style.textColor}`}>CERTIFICATE</h1>
          <p className={`text-xl font-serif italic mt-2 ${style.subTextColor}`}>OF COMPETENCE</p>
        </div>

        <div className="flex-1 flex flex-col justify-center w-full relative z-10">
          <p className={`${style.subTextColor} mb-2`}>This is to certify that</p>
          <h2 className={`text-4xl font-bold font-serif mb-6 border-b-2 pb-4 mx-20 ${style.textColor} ${config.templateStyle === 'tech' ? 'border-emerald-500/50' : (config.templateStyle === 'classic' ? 'border-[#C5A059]' : 'border-gray-200')}`}>
            {data.studentName}
          </h2>
          <p className={`${style.subTextColor} mb-2`}>Has successfully completed the intensive bootcamp program:</p>
          <h3 className={`text-3xl font-bold mb-2 ${style.accent}`}>{data.title}</h3>
          <p className={`${style.subTextColor} font-medium`}>Completed on {data.dateCompleted}</p>
        </div>

        <div className="w-full flex justify-between items-end px-20 mb-10 relative z-10">
          <div className="text-center">
            <div className={`w-48 border-b mb-2 font-dancing-script text-2xl ${style.accent} ${config.templateStyle === 'tech' ? 'border-emerald-500/50' : (config.templateStyle === 'classic' ? 'border-[#C5A059]' : 'border-gray-400')}`}>Rizky R.</div>
            <p className={`font-bold ${style.textColor}`}>{data.instructor}</p>
            <p className={`text-xs ${style.subTextColor}`}>Lead Instructor</p>
          </div>
          <div className="text-center">
            <div className={`border-2 rounded-full w-24 h-24 flex items-center justify-center text-xs font-bold p-2 rotate-12 ${style.badge}`}>
              VALID<br />{data.certificateID}
            </div>
          </div>
          <div className="text-center">
            {config.signature2Name && (
              <>
                <div className={`w-48 border-b mb-2 font-dancing-script text-2xl ${style.accent} ${config.templateStyle === 'tech' ? 'border-emerald-500/50' : (config.templateStyle === 'classic' ? 'border-[#C5A059]' : 'border-gray-400')}`}>
                  {config.signature2Name.split(' ')[0]} {/* Simple logic to get first name for "signature" look, or just use full name */}
                </div>
                <p className={`font-bold ${style.textColor}`}>{config.signature2Name}</p>
                <p className={`text-xs ${style.subTextColor}`}>{config.signature2Title}</p>
              </>
            )}
          </div>
        </div>
      </PageWrapper>

      {/* HALAMAN 2 (TRANSKRIP) */}
      {moduleChunks.map((chunk, chunkIndex) => (
        <PageWrapper key={`transcript-${chunkIndex}`} className={`${style.bg} ${style.border} p-12 flex flex-col`}>
          <div className={`border-b-2 ${config.templateStyle === 'tech' ? 'border-emerald-500/30' : (config.templateStyle === 'classic' ? 'border-[#C5A059]' : 'border-gray-200')} pb-4 mb-8 flex justify-between items-end relative z-10`}>
            <div>
              <h2 className={`text-3xl font-bold ${style.textColor}`}>Transkrip Akademik</h2>
              <p className={`${style.subTextColor} text-lg mt-1`}>Detail penilaian modul teknis.</p>
            </div>
            <div className="text-right">
              <p className={`text-base font-bold ${style.textColor}`}>{data.certificateID}</p>
              <p className={`text-sm ${style.subTextColor}`}>{data.studentName}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col relative z-10">
            <table className="w-full text-left mb-6">
              <thead>
                <tr className={`border-b-2 ${config.templateStyle === 'tech' ? 'border-emerald-500/50' : (config.templateStyle === 'classic' ? 'border-[#C5A059]' : 'border-gray-100')}`}>
                  <th className={`py-3 font-bold ${style.subTextColor} w-16 text-lg`}>No</th>
                  <th className={`py-3 font-bold ${style.subTextColor} text-lg`}>Modul</th>
                  <th className={`py-3 font-bold ${style.subTextColor} text-center text-lg w-32`}>Bobot</th>
                  <th className={`py-3 font-bold ${style.subTextColor} text-right text-lg`}>Nilai</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${config.templateStyle === 'tech' ? 'divide-emerald-900' : (config.templateStyle === 'classic' ? 'divide-[#C5A059]/30' : 'divide-gray-50')}`}>
                {chunk.map((mod, idx) => (
                  <tr key={idx}>
                    <td className={`py-4 ${style.subTextColor} text-lg`}>{(chunkIndex * ITEMS_PER_PAGE) + idx + 1}</td>
                    <td className={`py-4 font-medium ${style.textColor} text-lg`}>{mod.name}</td>
                    <td className={`py-4 font-medium ${style.textColor} text-center text-lg`}>{mod.weight || '-'}%</td>
                    <td className={`py-4 font-bold ${style.accent} text-right text-lg`}>{mod.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Score Footer (Only on last page) */}
            {chunkIndex === moduleChunks.length - 1 && (
              <div className={`flex justify-between items-center p-4 rounded-xl mb-8 ${config.templateStyle === 'tech' ? 'bg-emerald-950/30 border border-emerald-500/30' : (config.templateStyle === 'classic' ? 'bg-[#FDF6E3] border border-[#C5A059]' : 'bg-gray-50')}`}>
                <span className={`font-bold text-lg ${style.textColor}`}>Total Score</span>
                <span className={`font-bold text-3xl ${style.accent}`}>{data.totalScore}</span>
              </div>
            )}
          </div>
        </PageWrapper>
      ))}

      {/* HALAMAN 3 (DISTRIBUSI SKILL & CHART) */}
      <PageWrapper className={`${style.bg} ${style.border} p-12 flex flex-col`}>

        {/* Header Page 3 (Matches Page 2 Style) */}
        <div className={`border-b-2 ${config.templateStyle === 'tech' ? 'border-emerald-500/30' : (config.templateStyle === 'classic' ? 'border-[#C5A059]' : 'border-gray-200')} pb-4 mb-8 flex justify-between items-end relative z-10`}>
          <div>
            <h2 className={`text-3xl font-bold ${style.textColor}`}>Kompetensi Skill</h2>
            <p className={`${style.subTextColor} text-lg mt-1`}>Rincian keahlian teknis dan soft skill.</p>
          </div>
          <div className="text-right">
            <p className={`text-base font-bold ${style.textColor}`}>{data.certificateID}</p>
            <p className={`text-sm ${style.subTextColor}`}>{data.studentName}</p>
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col justify-center relative z-10">
          <div className="grid grid-cols-2 gap-12 items-center">

            {/* Left: Progress Bars */}
            <div className="flex flex-col gap-6">
              {Object.entries(data.skills).map(([skill, score]) => (
                <div key={skill}>
                  <div className="flex justify-between text-base mb-2">
                    <span className={`font-medium ${style.subTextColor} text-lg`}>{skill}</span>
                    <span className={`font-bold ${style.accent} text-lg`}>{score}</span>
                  </div>
                  <ProgressBar progress={score} height="h-3" color={config.templateStyle === 'tech' ? 'bg-emerald-500' : (config.templateStyle === 'classic' ? 'bg-[#C5A059]' : 'bg-blue-600')} />
                </div>
              ))}
            </div>

            {/* Right: Radar Chart */}
            <div className={`p-8 rounded-3xl border ${config.templateStyle === 'tech' ? 'border-emerald-500/30 bg-emerald-950/20' : (config.templateStyle === 'classic' ? 'border-[#C5A059] bg-[#FDF6E3]' : 'border-gray-200 bg-gray-50')}`}>
              <div className="text-center mb-6">
                <h4 className={`font-bold ${style.textColor} text-xl`}>Peta Visual</h4>
                <p className={`text-xs ${style.subTextColor} uppercase tracking-wider`}>Visualisasi Skill</p>
              </div>
              <div className="flex justify-center">
                <RadarChart skills={data.skills} size={300} color={config.templateStyle === 'tech' ? '#10b981' : (config.templateStyle === 'classic' ? '#C5A059' : '#3b82f6')} />
              </div>
            </div>

          </div>
        </div>
      </PageWrapper>

      {/* HALAMAN 4 (FEEDBACK) - Dedicated Text Page */}
      <PageWrapper className={`${style.bg} ${style.border} p-12 flex flex-col font-sans`}>

        {/* Header */}
        <div className={`flex items-center gap-5 mb-10 w-full border-b pb-6 ${config.templateStyle === 'tech' ? 'border-emerald-500/30 border-dashed' : (config.templateStyle === 'classic' ? 'border-[#C5A059] border-double' : 'border-gray-200 border-dashed')} relative z-10`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 ${config.templateStyle === 'tech' ? 'bg-emerald-900 shadow-emerald-500/20 border border-emerald-500/50' : (config.templateStyle === 'classic' ? 'bg-[#C5A059]' : 'bg-blue-600 shadow-blue-200')}`}>
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="flex flex-col justify-center">
            <h2 className={`text-3xl font-extrabold ${style.textColor} leading-none mb-2`}>Laporan Kompetensi & Karir</h2>
            <p className={`${style.accent} font-semibold text-lg leading-none`}>Analisis Performa & Rekomendasi Profesional</p>
          </div>
        </div>

        {/* Text Content Grid - Full Width/Height */}
        <div className="grid grid-cols-1 gap-8 flex-1 relative z-10">

          {/* Row 1: Strengths & Improvements */}
          <div className="grid grid-cols-2 gap-8">
            {/* KARTU 1: KEKUATAN */}
            <div className={`p-8 rounded-2xl border shadow-sm flex flex-col ${config.templateStyle === 'tech' ? 'bg-white/5 backdrop-blur-sm border-emerald-500/30' : (config.templateStyle === 'classic' ? 'bg-[#FFFCF5] border-[#C5A059] shadow-sm' : 'bg-white border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]')}`}>
              <div className={`flex items-center gap-4 mb-4 pb-4 border-b ${config.templateStyle === 'tech' ? 'border-emerald-500/30' : (config.templateStyle === 'classic' ? 'border-[#C5A059]/30' : 'border-gray-50')}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.templateStyle === 'tech' ? 'bg-emerald-900/50 text-emerald-400' : (config.templateStyle === 'classic' ? 'bg-[#FDF6E3] text-[#C5A059]' : 'bg-green-50 text-green-600')}`}>
                  <ThumbsUp className="w-6 h-6" />
                </div>
                <h3 className={`font-bold ${style.textColor} text-xl m-0`}>Kekuatan Utama</h3>
              </div>
              <p className={`${style.subTextColor} text-justify leading-relaxed text-lg`}>
                {data.feedback.strengths || "Peserta menunjukkan pemahaman mendalam tentang arsitektur backend dan desain database yang skalabel."}
              </p>
            </div>

            {/* KARTU 2: PENGEMBANGAN */}
            <div className={`p-8 rounded-2xl border shadow-sm flex flex-col ${config.templateStyle === 'tech' ? 'bg-white/5 backdrop-blur-sm border-emerald-500/30' : (config.templateStyle === 'classic' ? 'bg-[#FFFCF5] border-[#C5A059] shadow-sm' : 'bg-white border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]')}`}>
              <div className={`flex items-center gap-4 mb-4 pb-4 border-b ${config.templateStyle === 'tech' ? 'border-emerald-500/30' : (config.templateStyle === 'classic' ? 'border-[#C5A059]/30' : 'border-gray-50')}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.templateStyle === 'tech' ? 'bg-emerald-900/50 text-emerald-400' : (config.templateStyle === 'classic' ? 'bg-[#FDF6E3] text-[#C5A059]' : 'bg-orange-50 text-orange-600')}`}>
                  <PenTool className="w-6 h-6" />
                </div>
                <h3 className={`font-bold ${style.textColor} text-xl m-0`}>Area Pengembangan</h3>
              </div>
              <p className={`${style.subTextColor} text-justify leading-relaxed text-lg`}>
                {data.feedback.improvements || "Disarankan untuk meningkatkan cakupan pengujian otomatis (unit testing) pada modul frontend."}
              </p>
            </div>
          </div>

          {/* Row 2: Career Recommendation */}
          <div className={`${config.templateStyle === 'tech' ? 'bg-emerald-950/40 border-emerald-500/50' : (config.templateStyle === 'classic' ? 'bg-[#2C241B] border-[#4A3D2F]' : 'bg-[#0f172a]')} border p-10 rounded-3xl shadow-2xl flex flex-col justify-center relative overflow-hidden mt-4`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

            <div className="flex items-center gap-6 mb-6 relative z-10">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/5 shadow-inner ${config.templateStyle === 'tech' ? 'bg-emerald-900/50 text-emerald-400' : (config.templateStyle === 'classic' ? 'bg-[#4A3D2F] text-[#C5A059]' : 'bg-white/10 text-yellow-400')}`}>
                <Briefcase className="w-7 h-7" />
              </div>
              <div>
                <h3 className={`font-bold text-2xl m-0 ${config.templateStyle === 'tech' ? 'text-emerald-400' : (config.templateStyle === 'classic' ? 'text-[#C5A059]' : 'text-yellow-400')}`}>Rekomendasi Karir</h3>
                <p className={`${config.templateStyle === 'tech' ? 'text-emerald-400/60' : (config.templateStyle === 'classic' ? 'text-[#C5A059]/70' : 'text-gray-400')} text-sm`}>Berdasarkan hasil analisis performa</p>
              </div>
            </div>
            <p className={`${config.templateStyle === 'tech' ? 'text-emerald-50 border-emerald-500' : (config.templateStyle === 'classic' ? 'text-[#FDF6E3] border-[#C5A059]' : 'text-gray-100 border-yellow-500')} font-medium text-xl leading-relaxed relative z-10 border-l-4 pl-6`}>
              " {data.feedback.career || "Sangat direkomendasikan untuk peran Senior Backend Developer atau Technical Lead."} "
            </p>
          </div>

        </div>
      </PageWrapper>

    </div>
  );
};



// ==========================================
// 3. LOGIKA DOWNLOAD PDF (Removed - now handled by server side Puppeteer)
// ==========================================
// export const PrintableCertificate = ... (Cleaned up)