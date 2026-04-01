export default function StudentRequestsPage() {
    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h1
                    className="text-3xl font-extrabold text-[#003b73] tracking-tight"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                    Yêu cầu cấp giấy tờ
                </h1>
                <p className="text-[#424751] mt-1 text-sm">
                    Gửi yêu cầu cấp bản sao văn bằng, bảng điểm hoặc giấy xác nhận sinh viên.
                </p>
            </div>

            <div className="bg-white rounded-2xl p-14 text-center shadow-sm border border-slate-100">
                <span className="material-symbols-outlined text-[64px] text-slate-200 block mb-4">
                    construction
                </span>
                <h3
                    className="text-lg font-bold text-slate-400 mb-2"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                    Tính năng đang phát triển
                </h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                    Chức năng yêu cầu cấp giấy tờ sẽ sớm ra mắt. Vui lòng liên hệ Phòng Đào tạo để được hỗ trợ.
                </p>
            </div>
        </div>
    );
}
