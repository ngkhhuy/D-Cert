# 🎓 D-CERT: HỆ THỐNG QUẢN LÝ, SỐ HÓA & XÁC THỰC VĂN BẰNG (BLOCKCHAIN + AI)

**Định vị dự án:** Đồ án tốt nghiệp Kỹ sư - Chuyên ngành Hệ thống Thông tin, ĐH Bách Khoa Đà Nẵng.
**Thời gian thực hiện:** 3 Tháng.
**Môi trường phát triển:** Ubuntu (Native Dual-boot).
**Mục tiêu:** Xây dựng nền tảng Web3 kết hợp AI Microservice để tự động hóa khâu số hóa dữ liệu và bảo chứng tính toàn vẹn của văn bản hành chính/văn bằng giáo dục.

---

## 🛠 1. TECH STACK & KIẾN TRÚC HỆ THỐNG (ARCHITECTURE)

### 1.1. Lớp Web2 (Nghiệp vụ cốt lõi)
- **Frontend:** ReactJS, TailwindCSS, Axios (Dành cho Admin, Sinh viên và Nhà tuyển dụng).
- **Backend Core:** Node.js, Express.js (Kiến trúc 3-Tier: Route - Controller - Service).
- **Security:** JWT (JSON Web Token), bcrypt (Băm mật khẩu), Helmet, CORS.
- **Database:** MongoDB (Mongoose) chạy local `127.0.0.1:27017`.

### 1.2. Lớp Web3 (Bảo chứng dữ liệu)
- **Blockchain:** Mạng Ethereum Sepolia Testnet.
- **Smart Contract:** Solidity (Viết hàm lưu trữ và thu hồi mã Hash).
- **Tương tác chuỗi:** Ethers.js, Alchemy RPC.
- **Lưu trữ phi tập trung:** IPFS (Pinata) để lưu trữ file PDF văn bằng.

### 1.3. Lớp Trí tuệ nhân tạo (AI Microservices)
*Tối ưu hóa tài nguyên phần cứng, đảm bảo chạy mượt mà trên môi trường CPU cục bộ (cấu hình tương đương Dell Vostro 5620) mà không cần GPU chuyên dụng.*
- **Core:** Python, FastAPI.
- **OCR & NER (Số hóa văn bản):** PaddleOCR (Đọc ảnh thành chữ) + PhoBERT (Bóc tách trường dữ liệu).
- **Semantic Search (Chatbot Quy chế):** `bkai-foundation-models/vietnamese-bi-encoder` kết hợp CSDL Vector cục bộ FAISS.

---

## 🗄 2. LƯỢC ĐỒ CƠ SỞ DỮ LIỆU (MONGODB SCHEMA)

### Bảng 1: `Users` (Quản trị Phân quyền - RBAC)
- `username`, `password` (Hashed), `email`, `fullName`.
- `role`: Enum ['SYS_ADMIN', 'OFFICER', 'SIGNER'] (Chuyên viên tạo nháp, Ban giám hiệu duyệt/ký).
- `walletAddress`: String (Bắt buộc với role SIGNER để đối chiếu chữ ký Web3).
- `status`: Enum ['ACTIVE', 'LOCKED'].

### Bảng 2: `Documents` (Lưu trữ Văn bản/Bảng điểm)
- `docId`: String (Unique) - Số hiệu văn bản (VD: BKDN-2026-001).
- `docType`: Enum ['DIPLOMA', 'DECISION', 'TRANSCRIPT'].
- `holderName`: String (Tên sinh viên), `holderId`: String (Mã sinh viên).
- `metadata`: Object - Dữ liệu linh hoạt (VD: Danh sách điểm các môn học, xếp loại).
- `docHash`: String (Unique) - Mã băm SHA256 của file PDF gốc.
- `ipfsHash`: String - Link file PDF lưu trên IPFS.
- `txHash`: String - Mã giao dịch xác nhận trên Ethereum.
- `issuer`: String - Tham chiếu đến User cấp phát.
- `status`: Enum ['ACTIVE', 'REVOKED'].

### Bảng 3: `ShortLinks` (Module Rút gọn URL nội bộ)
- `shortCode`: String (Unique) - Mã định danh 6 ký tự (VD: A7k9Xm).
- `docHash`: String (Ref -> Documents) - Liên kết tới văn bản gốc.
- `clicks`: Number - Thống kê lượt tra cứu.

---

## ⚙️ 3. DANH SÁCH MODULE & API CỐT LÕI (NODE.JS)

### Auth & User Module
- `[POST] /api/auth/login`: Xác thực mật khẩu, trả về JWT.
- `[GET] /api/users/me`: Lấy profile và role của user đang đăng nhập.

### Document & Web3 Module
- `[POST] /api/docs/draft`: (OFFICER) Tạo nháp văn bản.
- `[POST] /api/docs/issue`: (SIGNER) Duyệt cấp phát -> Sinh PDF -> Đóng dấu QR -> Băm SHA256 -> Upload IPFS -> Ký Smart Contract -> Lưu DB.
- `[GET] /api/docs/:id`: Truy xuất chi tiết văn bản & lịch sử cấp phát.

### Verification & ShortLink Module
- `[GET] /v/:shortCode`: Khớp mã rút gọn, tăng `clicks`, redirect tới trang đối chiếu QR.
- `[GET] /api/verify/hash/:hash`: Truy vấn RPC Node để đối chiếu Hash trên mạng Ethereum.
- `[POST] /api/verify/upload`: Tra cứu tính toàn vẹn bằng cách upload trực tiếp file PDF để băm lại.

### AI Integration Module (Gọi sang FastAPI)
- `[POST] /api/ai/extract`: Upload ảnh văn bằng cũ -> Gọi Python xử lý OCR/NER -> Trả về JSON để điền form tự động.
- `[POST] /api/ai/chat`: Gửi câu hỏi -> Gọi FAISS truy xuất ngữ nghĩa quy chế -> Trả về câu trả lời trích xuất. *(Ví dụ kịch bản test: "Điểm tổng kết môn Xử lý tín hiệu số là 3.9 thì có bị điểm F và phải học lại không?", "Điều kiện xét học bổng là gì?").*

---

## 🗓 4. LỘ TRÌNH THỰC THI CHI TIẾT (3 THÁNG)

### 🟢 GIAI ĐOẠN 1: XÂY DỰNG LÕI HỆ THỐNG (NODE.JS + MONGODB)
- [ ] Khởi tạo thư mục chuẩn 3-Tier Architecture trên Ubuntu.
- [ ] Cấu hình MongoDB, các biến môi trường và JWT Auth.
- [ ] Code Model Schema (`User`, `Document`, `ShortLink`).
- [ ] Viết Utils: Hàm sinh `shortCode`, hàm băm PDF (SHA256).
- [ ] Hoàn thiện API Rút gọn Link và chuyển hướng (`/v/:code`).
- [ ] Tích hợp thư viện `pdf-lib` & `qrcode` để sinh văn bản tĩnh có dấu QR.
- [ ] Test toàn bộ API CRUD bằng Postman.

### 🟡 GIAI ĐOẠN 2: TÍCH HỢP BLOCKCHAIN & FRONTEND (REACTJS)
- [ ] Viết Smart Contract `DocumentRegistry.sol` (Lưu & Hủy Hash).
- [ ] Deploy Contract lên Ethereum Sepolia.
- [ ] Viết `BlockchainService` bằng `ethers.js` kết nối Smart Contract.
- [ ] Viết `IpfsService` upload file qua Pinata.
- [ ] Xây dựng ReactJS: Admin Dashboard (Đăng nhập, Quản lý sinh viên, Form cấp bằng).
- [ ] Xây dựng ReactJS: Public Verifier Portal (Giao diện tra cứu 1 chạm cho nhà tuyển dụng).

### 🔴 GIAI ĐOẠN 3: TRIỂN KHAI AI MICROSERVICE & TỔNG DUYỆT
- [ ] Dựng FastAPI Server (Python).
- [ ] Viết script sinh dữ liệu giả (Data Generation) để có ~500 mẫu văn bản tiếng Việt.
- [ ] Cài PaddleOCR và Fine-tune PhoBERT cho bài toán NER trích xuất biểu mẫu.
- [ ] Băm nhỏ file PDF Quy chế học vụ trường, dùng Bi-Encoder tạo vector lưu vào FAISS.
- [ ] Tích hợp API Chatbot tra cứu lên giao diện Student Portal.
- [ ] Fix bug toàn hệ thống, tinh chỉnh UX/UI.
- [ ] Hoàn thiện Slide, Báo cáo quyển Đồ án Tốt nghiệp và chạy Demo thử nghiệm nghiệm thu.