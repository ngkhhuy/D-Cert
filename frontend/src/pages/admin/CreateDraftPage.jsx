import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ────────── Constants ──────────
const MAJORS = [
    'Công nghệ Thông tin', 'Kỹ thuật Phần mềm', 'Kỹ thuật Máy tính',
    'Kỹ thuật Điện tử - Viễn thông', 'Kỹ thuật Cơ khí', 'Kỹ thuật Xây dựng',
    'Kỹ thuật Hóa học', 'Kiến trúc', 'Kinh tế & Quản lý', 'Kỹ thuật Môi trường',
];
const CLASSIFICATIONS = ['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình'];
const DEGREE_LEVELS = [
    { value: 'BACHELOR', label: 'Cử nhân' },
    { value: 'ENGINEER', label: 'Kỹ sư' },
    { value: 'ARCHITECT', label: 'Kiến trúc sư' },
    { value: 'MASTER', label: 'Thạc sĩ' },
    { value: 'DOCTOR', label: 'Tiến sĩ' },
];

function genDocId() {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `BKDN-${year}-${rand}`;
}

// ────────── Diploma Preview ──────────
function DiplomaPreview({ form }) {
    const degreeLabel = DEGREE_LEVELS.find((d) => d.value === form.degreeLevel)?.label || 'Kỹ sư';
    const isEmpty = !form.holderName && !form.holderId;

    return (
        <div className="bg-white w-full aspect-[1/1.414] shadow-2xl relative p-6 border-[10px] border-yellow-700/20 flex flex-col items-center text-center overflow-hidden">
            {/* Seal */}
            <div className="w-14 h-14 mb-3 bg-blue-900/10 rounded-full flex items-center justify-center border-2 border-blue-900/20">
                <span className="material-symbols-outlined text-[28px] text-blue-900/40">school</span>
            </div>
            <p className="text-[7px] font-bold uppercase tracking-widest text-yellow-700 mb-0.5">
                Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam
            </p>
            <p className="text-[5.5px] font-medium uppercase border-b border-yellow-700/30 pb-1 mb-4 text-gray-500">
                Độc lập - Tự do - Hạnh phúc
            </p>

            <h4 className="text-[11px] font-extrabold text-blue-900 mb-3 uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Bằng {degreeLabel}
            </h4>

            <p className="text-[6.5px] text-gray-400 mb-1">Chứng nhận sinh viên:</p>
            <p className={`text-xs font-bold text-gray-800 mb-4 ${isEmpty ? 'italic text-gray-300' : ''}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                {form.holderName || 'TÊN SINH VIÊN'}
            </p>

            <div className="grid grid-cols-2 gap-3 w-full text-left text-[6px] mt-1 mb-6">
                <div>
                    <p className="text-gray-400">Mã sinh viên:</p>
                    <p className={`font-bold ${isEmpty ? 'text-gray-300 italic' : 'text-gray-700'}`}>
                        {form.holderId || 'MSSV'}
                    </p>
                </div>
                <div>
                    <p className="text-gray-400">Ngành học:</p>
                    <p className="font-bold text-gray-700">{form.major}</p>
                </div>
                <div>
                    <p className="text-gray-400">Xếp loại:</p>
                    <p className="font-bold text-gray-700">{form.classification}</p>
                </div>
                <div>
                    <p className="text-gray-400">Năm tốt nghiệp:</p>
                    <p className="font-bold text-gray-700">{form.graduationYear}</p>
                </div>
            </div>

            {/* Signature area */}
            <div className="absolute bottom-10 left-6 right-6 flex justify-between text-[5.5px] text-gray-400">
                <div className="text-center">
                    <p>Trưởng khoa</p>
                    <p className="font-bold mt-4">Ký tên</p>
                </div>
                <div className="text-center">
                    <p>Hiệu trưởng</p>
                    <p className="font-bold mt-4">Ký tên</p>
                </div>
            </div>

            {/* QR placeholder */}
            <div className="absolute bottom-6 right-6 w-11 h-11 bg-gray-100 border border-gray-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-gray-300">qr_code_2</span>
            </div>

            {/* Watermark */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.025] flex items-center justify-center -rotate-45 select-none">
                <span className="text-3xl font-bold tracking-[0.8rem] text-blue-900">DUT D-CERT</span>
            </div>
        </div>
    );
}

// ────────── Main Page ──────────
export default function CreateDraftPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('manual');
    const [loading, setLoading] = useState(false);
    const [pdfFile, setPdfFile] = useState(null);
    const [csvFile, setCsvFile] = useState(null);
    const [csvResult, setCsvResult] = useState(null);
    const [stats, setStats] = useState({ todayDrafts: 0, pending: 0, rejected: 0 });

    const [form, setForm] = useState({
        docId: genDocId(),
        degreeLevel: 'ENGINEER',
        holderName: '',
        holderId: '',
        dob: '',
        major: MAJORS[0],
        classification: CLASSIFICATIONS[1],
        graduationYear: String(new Date().getFullYear()),
    });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const buildPayload = () => ({
        docId: form.docId,
        docType: 'DIPLOMA',
        degreeLevel: form.degreeLevel,
        holderName: form.holderName,
        holderId: form.holderId,
        metadata: {
            dob: form.dob,
            major: form.major,
            classification: form.classification,
            graduationYear: form.graduationYear,
        },
    });

    const createUploadDraft = async () => {
        if (!pdfFile) {
            throw new Error('Vui lòng chọn file PDF trước khi tạo bản nháp');
        }
        const fd = new FormData();
        fd.append('file', pdfFile);
        await api.post('/docs/draft/upload', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    };

    // Fetch stats từ docs list
    useEffect(() => {
        api.get('/docs').then((res) => {
            const all = res.data.data || [];
            const today = new Date().toDateString();
            const todayDrafts = all.filter(
                (d) => d.status === 'DRAFT' && new Date(d.createdAt).toDateString() === today
            ).length;
            const pending = all.filter((d) => d.status === 'DRAFT').length;
            setStats({ todayDrafts, pending, rejected: 0 });
        }).catch(() => {});
    }, []);

    // Import CSV
    const handleCsvImport = async (e) => {
        e.preventDefault();
        if (!csvFile) { toast.error('Vui lòng chọn file CSV'); return; }
        setLoading(true);
        setCsvResult(null);
        try {
            const fd = new FormData();
            fd.append('csv', csvFile);
            const res = await api.post('/docs/draft/import-csv', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setCsvResult(res.data?.data || null);
            const created = res.data?.data?.created?.length || 0;
            toast.success(`Đã import ${created} bản nháp thành công!`);
            setStats((s) => ({ ...s, todayDrafts: s.todayDrafts + created, pending: s.pending + created }));
            setCsvFile(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi import CSV');
        } finally { setLoading(false); }
    };

    // Tạo bản nháp
    const handleDraft = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === 'upload') {
                await createUploadDraft();
                toast.success('Đã upload PDF và tạo bản nháp thành công!');
            } else {
                await api.post('/docs/draft', buildPayload());
                toast.success('Đã tạo bản nháp PDF & QR Code!');
            }
            setForm((f) => ({ ...f, docId: genDocId() }));
            setPdfFile(null);
            setStats((s) => ({ ...s, todayDrafts: s.todayDrafts + 1, pending: s.pending + 1 }));
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Lỗi khi tạo bản nháp');
        } finally { setLoading(false); }
    };

    return (
        <div className="p-8 min-h-[calc(100vh-73px)]">
            {/* ── Header ── */}
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-[#003b73] tracking-tight mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Hệ thống Quản lý Chứng chỉ
                </h2>
                <p className="text-gray-500 text-sm">
                    Hôm nay bạn có <span className="font-semibold text-[#003b73]">{stats.todayDrafts}</span> bản nháp đã tạo.
                </p>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <StatCard color="#003b73" borderColor="border-l-[#003b73]" icon="edit_document" iconBg="bg-blue-900/10" iconColor="text-[#003b73]"
                    label="Bản nháp đã tạo hôm nay" value={stats.todayDrafts} />
                <StatCard color="#893b01" borderColor="border-l-[#893b01]" icon="schedule" iconBg="bg-orange-100" iconColor="text-[#893b01]"
                    label="Đang chờ BGH duyệt" value={stats.pending} />
                <StatCard color="#ba1a1a" borderColor="border-l-red-600" icon="report" iconBg="bg-red-100" iconColor="text-red-600"
                    label="Bị từ chối / Yêu cầu sửa" value={stats.rejected} />
            </div>

            {/* ── Middle: Form + Preview ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 mb-8">
                {/* Form panel */}
                <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border-t-4 border-[#003b73] overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-[#003b73] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Khu vực Nhập liệu &amp; Tạo bằng
                        </h3>
                        {/* Tabs */}
                        <div className="flex p-1 bg-gray-100 rounded-lg w-fit flex-wrap gap-0.5">
                            {[['manual', 'Nhập thủ công'], ['upload', 'Upload file PDF'], ['csv', 'Import CSV']].map(([m, label]) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => { setMode(m); setCsvResult(null); }}
                                    className={`px-5 py-2 text-sm rounded-md transition-colors ${
                                        mode === m
                                            ? 'font-semibold bg-white text-[#003b73] shadow-sm'
                                            : 'font-medium text-gray-500 hover:text-[#003b73]'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'csv' ? (
                        <form onSubmit={handleCsvImport} className="p-7 space-y-5">
                            <div className="rounded-xl border border-green-100 bg-green-50/70 p-4 space-y-3">
                                <p className="text-sm font-semibold text-[#003b73]">Import danh sách sinh viên từ file CSV</p>
                                <p className="text-xs text-gray-500">
                                    Cột bắt buộc: <code className="bg-white px-1 rounded">holderName</code>, <code className="bg-white px-1 rounded">holderId</code>, <code className="bg-white px-1 rounded">degreeLevel</code><br />
                                    Cột tùy chọn: <code className="bg-white px-1 rounded">docId</code>, <code className="bg-white px-1 rounded">major</code>, <code className="bg-white px-1 rounded">classification</code>, <code className="bg-white px-1 rounded">graduationYear</code>, <code className="bg-white px-1 rounded">dob</code>
                                </p>
                                {/* Download sample CSV */}
                                <a
                                    href="data:text/csv;charset=utf-8,docId,holderName,holderId,degreeLevel,major,classification,graduationYear,dob%0A,Nguy%E1%BB%85n V%C4%83n A,102220001,ENGINEER,C%C3%B4ng ngh%E1%BB%87 Th%C3%B4ng tin,Gi%E1%BB%8Fi,2026,2004-05-10%0A,Tr%E1%BA%A7n Th%E1%BB%8B B,102220002,BACHELOR,Kinh t%E1%BA%BF %26 Qu%E1%BA%A3n l%C3%BD,Xu%E1%BA%A5t s%E1%BA%AFc,2026,2003-08-20"
                                    download="mau-import-sv.csv"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#003b73] hover:underline"
                                >
                                    <span className="material-symbols-outlined text-sm">download</span>
                                    Tải file mẫu CSV
                                </a>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvResult(null); }}
                                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-[#003b73] file:font-semibold hover:file:bg-gray-50"
                                />
                                {csvFile && <p className="text-xs text-gray-500">File: {csvFile.name}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !csvFile}
                                className="px-7 py-3 rounded-xl bg-[#003b73] text-white font-bold hover:bg-[#002855] active:scale-[0.98] transition-all flex items-center gap-2 text-sm disabled:opacity-60"
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                            >
                                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                                {loading ? 'Đang import...' : 'Import danh sách'}
                            </button>

                            {/* Import results */}
                            {csvResult && (
                                <div className="space-y-4">
                                    {/* Summary */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-extrabold text-green-700">{csvResult.created?.length ?? 0}</p>
                                            <p className="text-xs text-green-600 mt-0.5">Tạo mới</p>
                                        </div>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-extrabold text-yellow-700">{csvResult.skipped?.length ?? 0}</p>
                                            <p className="text-xs text-yellow-600 mt-0.5">Bỏ qua</p>
                                        </div>
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-extrabold text-red-700">{csvResult.errors?.length ?? 0}</p>
                                            <p className="text-xs text-red-600 mt-0.5">Lỗi</p>
                                        </div>
                                    </div>

                                    {/* Created list */}
                                    {csvResult.created?.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-green-50 border-b border-green-100">
                                                <p className="text-xs font-bold text-green-700">ĐÃ TẠO THÀNH CÔNG ({csvResult.created.length})</p>
                                            </div>
                                            <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                                                {csvResult.created.map((r, i) => (
                                                    <div key={i} className="flex items-center px-4 py-2 text-sm gap-3">
                                                        <span className="material-symbols-outlined text-green-500 text-[16px]">check_circle</span>
                                                        <span className="font-mono text-xs text-gray-500 w-36 shrink-0">{r.docId}</span>
                                                        <span className="text-gray-700 truncate">{r.holderName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Errors list */}
                                    {csvResult.errors?.length > 0 && (
                                        <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
                                            <div className="px-4 py-2.5 bg-red-50 border-b border-red-100">
                                                <p className="text-xs font-bold text-red-700">LỖI ({csvResult.errors.length})</p>
                                            </div>
                                            <div className="divide-y divide-gray-50 max-h-36 overflow-y-auto">
                                                {csvResult.errors.map((r, i) => (
                                                    <div key={i} className="flex items-start px-4 py-2 text-xs gap-2">
                                                        <span className="material-symbols-outlined text-red-400 text-[14px] mt-0.5">error</span>
                                                        <span className="text-gray-500 shrink-0">Dòng {r.row}:</span>
                                                        <span className="text-red-700">{r.reason}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    ) : (
                    <form id="draft-form" onSubmit={handleDraft}>
                        <div className="p-7 space-y-5">
                            {mode === 'upload' && (
                                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                                    <p className="text-sm font-medium text-[#003b73] mb-2">Tải lên file PDF văn bản có sẵn để tạo bản nháp chờ ký duyệt</p>
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-[#003b73] file:font-semibold hover:file:bg-gray-50"
                                    />
                                    {pdfFile && (
                                        <p className="text-xs text-gray-500 mt-2">Đã chọn: {pdfFile.name}</p>
                                    )}
                                    <p className="text-xs text-blue-700/80 mt-2">Khong can nhap metadata. He thong se tu tao draft va dong QR vao goc PDF.</p>
                                </div>
                            )}

                            {mode === 'manual' && (
                                <>
                                    {/* Mã văn bản + Bậc học */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField label="Mã Văn Bản">
                                            <input
                                                value={form.docId}
                                                onChange={(e) => set('docId', e.target.value)}
                                                required
                                                className="field-input"
                                                placeholder="BKDN-2026-0001"
                                            />
                                        </FormField>
                                        <FormField label="Bậc Đào Tạo">
                                            <select value={form.degreeLevel} onChange={(e) => set('degreeLevel', e.target.value)} className="field-input appearance-none">
                                                {DEGREE_LEVELS.map((d) => (
                                                    <option key={d.value} value={d.value}>{d.label}</option>
                                                ))}
                                            </select>
                                        </FormField>
                                    </div>

                                    {/* MSSV + Họ tên */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField label="Mã Sinh Viên">
                                            <input
                                                value={form.holderId}
                                                onChange={(e) => set('holderId', e.target.value)}
                                                required
                                                className="field-input"
                                                placeholder="VD: 102210xxx"
                                            />
                                        </FormField>
                                        <FormField label="Họ và Tên">
                                            <input
                                                value={form.holderName}
                                                onChange={(e) => set('holderName', e.target.value)}
                                                required
                                                className="field-input"
                                                placeholder="VD: Nguyễn Văn A"
                                            />
                                        </FormField>
                                    </div>

                                    {/* Ngày sinh + Ngành học */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField label="Ngày Sinh">
                                            <input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} className="field-input" />
                                        </FormField>
                                        <FormField label="Ngành Học">
                                            <select value={form.major} onChange={(e) => set('major', e.target.value)} className="field-input appearance-none">
                                                {MAJORS.map((m) => <option key={m}>{m}</option>)}
                                            </select>
                                        </FormField>
                                    </div>

                                    {/* Xếp loại + Năm TN */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <FormField label="Xếp Loại Tốt Nghiệp">
                                            <select value={form.classification} onChange={(e) => set('classification', e.target.value)} className="field-input appearance-none">
                                                {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
                                            </select>
                                        </FormField>
                                        <FormField label="Năm Tốt Nghiệp">
                                            <input
                                                type="number" min="2000" max="2100"
                                                value={form.graduationYear}
                                                onChange={(e) => set('graduationYear', e.target.value)}
                                                className="field-input"
                                            />
                                        </FormField>
                                    </div>
                                </>
                            )}

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-7 py-3 rounded-xl border-2 border-[#003b73] text-[#003b73] font-bold hover:bg-[#003b73]/5 active:scale-[0.98] transition-all flex items-center gap-2 text-sm disabled:opacity-60"
                                    style={{ fontFamily: 'Manrope, sans-serif' }}
                                >
                                    <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                                    {loading
                                        ? 'Đang xử lý...'
                                        : mode === 'upload'
                                            ? 'Upload PDF và tạo bản nháp'
                                            : 'Sinh bản nháp PDF & QR Code'}
                                </button>
                            </div>
                        </div>
                    </form>
                    )}
                </div>

                {/* Preview panel */}
                <div className={`lg:col-span-5 flex flex-col ${mode === 'csv' ? 'hidden lg:flex' : ''}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-800" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Bản xem trước phôi bằng
                        </h3>
                        <div className="flex gap-1">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[20px] text-gray-500">zoom_in</span>
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[20px] text-gray-500">print</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow bg-[#e6e8ea] rounded-xl p-6 flex items-center justify-center min-h-[420px]">
                        {mode === 'upload' ? (
                            <div className="w-full h-full rounded-xl border border-dashed border-gray-300 bg-white/70 flex flex-col items-center justify-center text-center p-6">
                                <span className="material-symbols-outlined text-5xl text-[#003b73]/60 mb-3">picture_as_pdf</span>
                                <p className="text-sm font-semibold text-[#003b73]">Xem trước chế độ Upload PDF</p>
                                <p className="text-xs text-gray-500 mt-1">Sau khi tạo draft, hệ thống sẽ đóng QR vào góc phải dưới của file.</p>
                                {pdfFile ? (
                                    <p className="text-xs text-gray-600 mt-4 font-mono break-all">{pdfFile.name}</p>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-4">Chưa chọn file PDF</p>
                                )}
                            </div>
                        ) : (
                            <div className="w-full max-w-[300px]">
                                <DiplomaPreview form={form} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Quick nav ── */}
            <div className="flex justify-center">
                <button
                    type="button"
                    onClick={() => navigate('/admin/docs')}
                    className="flex items-center gap-2 text-sm text-[#003b73] hover:underline font-semibold"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    Xem danh sách văn bằng đã tạo
                </button>
            </div>
        </div>
    );
}

// ────────── Sub-components ──────────
function StatCard({ label, value, icon, iconBg, iconColor, borderColor, color }) {
    return (
        <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${borderColor} hover:scale-[1.02] transition-transform duration-200`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                    <h3 className="text-4xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color }}>
                        {value}
                    </h3>
                </div>
                <div className={`p-3 ${iconBg} rounded-lg`}>
                    <span className={`material-symbols-outlined text-3xl ${iconColor}`}>{icon}</span>
                </div>
            </div>
        </div>
    );
}

function FormField({ label, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}
