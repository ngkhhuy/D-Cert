# 🎓 D-CERT: HỆ THỐNG QUẢN LÝ, PHÁT HÀNH & XÁC THỰC VĂN BẰNG (BLOCKCHAIN + AI)

**Định vị dự án:** Đồ án tốt nghiệp Kỹ sư - Chuyên ngành Hệ thống Thông tin, ĐH Bách Khoa Đà Nẵng.
**Thời gian thực hiện:** 3 Tháng.
**Môi trường phát triển:** Ubuntu (Native Dual-boot).
**Mục tiêu:** Xây dựng nền tảng Web3 kết hợp AI Microservice nhằm quản lý, phát hành, xác thực văn bằng và hỗ trợ sinh viên tra cứu thông tin học vụ dựa trên các tài liệu chính thức của nhà trường.

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
- **Lưu trữ file PDF:** Filesystem của máy chủ (`/public/uploads/`). Hỗ trợ tích hợp IPFS (Pinata) tùy chọn khi có cấu hình `PINATA_JWT`.

### 1.3. Lớp Trí tuệ nhân tạo – AI Knowledge Assistant

- **Core:** Python, FastAPI.
- **Document Processing:** PyMuPDF để trích xuất nội dung PDF.
- **Embedding Model:** `bkai-foundation-models/vietnamese-bi-encoder`.
- **Vector Database:** FAISS IndexFlatIP.
- **Local LLM:** Qwen2.5 14B Instruct, tùy chỉnh với tên `dcert-qwen14b-vi`.
- **LLM Runtime:** Ollama.
- **Kiến trúc:** Retrieval-Augmented Generation – RAG.

---

## 🗄 2. LƯỢC ĐỒ CƠ SỞ DỮ LIỆU (MONGODB SCHEMA)

### Bảng 1: `Users` (Quản trị Phân quyền - RBAC)
- `username`, `password` (Hashed), `email`, `fullName`.
- `role`: Enum ['SYS_ADMIN', 'OFFICER', 'SIGNER', 'STUDENT'].
- `studentId`: String (Mã số sinh viên, liên kết với `Document.holderId`).
- `walletAddress`: String (Dùng với role SIGNER để đối chiếu chữ ký Web3).
- `status`: Enum ['ACTIVE', 'LOCKED'].

### Bảng 2: `Documents` (Lưu trữ Văn bản/Văn bằng)
- `docId`: String (Unique) - Số hiệu văn bản (VD: BKDN-2026-001).
- `docType`: Enum ['DIPLOMA', 'DECISION', 'TRANSCRIPT'].
- `degreeLevel`: Enum ['BACHELOR', 'ENGINEER', 'ARCHITECT', 'MASTER', 'DOCTOR'] (Bắt buộc khi `docType = DIPLOMA`).
- `holderName`: String (Tên sinh viên), `holderId`: String (Mã sinh viên).
- `metadata`: Mixed - Dữ liệu linh hoạt (điểm số, môn học, xếp loại...).
- `docHash`: String (Unique, sparse) - Mã băm SHA-256 của file PDF — sinh lúc issue.
- `ipfsHash`: String - CID file PDF trên IPFS/Pinata (chỉ có khi có cấu hình Pinata JWT).
- `txHash`: String - Hash giao dịch xác nhận trên Ethereum Sepolia.
- `issuer`: ObjectId (Ref → User) - Người cấp phát.
- `status`: Enum ['DRAFT', 'ACTIVE', 'REVOKED'].
- `receivedAt`, `receivedBy`: Ghi nhận thời điểm sinh viên nhận/tải văn bằng.

### Bảng 3: `ShortLinks` (Module Rút gọn URL nội bộ)
- `shortCode`: String (Unique) - Mã định danh 6 ký tự (VD: A7k9Xm).
- `docHash`: String (Ref → Documents) - Liên kết tới văn bản gốc.
- `clicks`: Number - Thống kê lượt tra cứu.

### Bảng 4: `KnowledgeDocuments` (Kho tài liệu AI)
- `title`: String - Tiêu đề tài liệu.
- `type`: Enum ['REGULATION', 'DECISION', 'ANNOUNCEMENT', 'GUIDELINE', 'FAQ', 'OTHER'].
- `fileUrl`, `filePath`, `originalFileName`, `mimeType`, `fileSize`: Thông tin file (PDF/DOCX/TXT, tối đa 20MB).
- `sourceUnit`: String - Đơn vị ban hành (mặc định: 'Phòng Đào tạo').
- `issuedDate`, `effectiveFrom`, `effectiveTo`: Ngày ban hành và hiệu lực.
- `status`: Enum ['DRAFT', 'PUBLISHED', 'ARCHIVED'].
- `aiIndexStatus`: Enum ['NOT_INDEXED', 'INDEXING', 'INDEXED', 'FAILED'].
- `origin`: Enum ['MANUAL_UPLOAD', 'ISSUED_DOCUMENT'] - Nguồn gốc tài liệu.
- `sourceDocument`: ObjectId (Ref → Document) - Nếu từ luồng issue văn bản.

### Bảng 5: `ChatMessages` (Lịch sử hỏi đáp AI)
- `user`: ObjectId (Ref → User).
- `question`, `answer`: String.
- `sources`: Array - Danh sách đoạn tài liệu trích dẫn.
- `fallback`: Boolean - Đánh dấu nếu AI không tìm thấy ngữ cảnh.
- `usedLlm`: Boolean - Đánh dấu nếu đã qua LLM.
- `sessionId`: String - Định danh phiên chat.
- `llmError`: String - Ghi lỗi nếu LLM thất bại.

---

## ⚙️ 3. DANH SÁCH MODULE & API CỐT LÕI (NODE.JS)

### Auth & User Module
- `[POST] /api/auth/login`: Xác thực mật khẩu, trả về JWT.
- `[GET] /api/users/me`: Lấy profile và role của user đang đăng nhập.

### Document & Web3 Module
- `[GET] /api/docs`: Danh sách văn bản (có filter, phân trang).
- `[GET] /api/docs/:id`: Chi tiết văn bản.
- `[POST] /api/docs/draft`: (OFFICER, SYS_ADMIN) Tạo nháp thủ công.
- `[POST] /api/docs/draft/upload`: (OFFICER, SYS_ADMIN) Tạo nháp từ file PDF upload.
- `[POST] /api/docs/draft/import-csv`: (OFFICER, SYS_ADMIN) Import hàng loạt từ CSV.
- `[POST] /api/docs/issue/:id`: (SIGNER, SYS_ADMIN) Phát hành: sinh PDF → đóng QR → băm SHA-256 → lưu filesystem máy chủ → upload IPFS (tùy chọn, cần `PINATA_JWT`) → ghi blockchain → lưu DB.
- `[POST] /api/docs/issue/batch`: (SIGNER, SYS_ADMIN) Phát hành hàng loạt.
- `[POST] /api/docs/revoke/:id`: (SIGNER, SYS_ADMIN) Thu hồi → ghi revoke lên Smart Contract → cập nhật DB.

### Student Module
- `[GET] /api/student/feed`: (STUDENT) Feed văn bản mới nhất (DECISION, TRANSCRIPT).
- `[GET] /api/student/diplomas`: (STUDENT) Danh sách văn bằng cá nhân.
- `[POST] /api/student/docs/:id/receive`: (STUDENT) Nhận/tải văn bằng, ghi log `receivedAt`.

### Verification & ShortLink Module
- `[GET] /v/:shortCode`: Redirect shortlink tới trang xác thực QR.
- `[GET] /api/verify/code/:shortCode`: Tra cứu dữ liệu theo QR/shortCode.
- `[GET] /api/verify/hash/:hash`: Đối chiếu hash trong DB và trạng thái on-chain trên Ethereum.
- `[POST] /api/verify/upload`: Xác thực toàn vẹn bằng cách upload PDF, hệ thống băm lại và đối chiếu.

### Knowledge Module
- `[GET] /api/knowledge`: Danh sách tài liệu (SYS_ADMIN, OFFICER, SIGNER).
- `[GET] /api/knowledge/:id`: Chi tiết tài liệu.
- `[POST] /api/knowledge/upload`: Upload tài liệu mới vào kho AI (PDF/DOCX/TXT, tối đa 20MB).
- `[PATCH] /api/knowledge/:id/publish`: Xuất bản và gọi AI Service lập chỉ mục FAISS.
- `[PATCH] /api/knowledge/:id/archive`: Lưu trữ, loại khỏi nguồn tra cứu.
- `[POST] /api/knowledge/:id/reindex`: Lập chỉ mục lại tài liệu.

### AI Chat Module
- `[POST] /api/ai/chat`: (STUDENT, SYS_ADMIN) Nhận câu hỏi → RAG truy xuất FAISS → đưa context vào LLM → trả về câu trả lời + sources.
- `[GET] /api/ai/history`: Lấy lịch sử hỏi đáp của phiên.
- `[DELETE] /api/ai/history`: Xóa lịch sử hỏi đáp.

---

## 🗓 4. LỘ TRÌNH THỰC THI CHI TIẾT (3 THÁNG)

### 🟢 GIAI ĐOẠN 1: XÂY DỰNG LÕI HỆ THỐNG (NODE.JS + MONGODB)
- [x] Khởi tạo thư mục chuẩn 3-Tier Architecture trên Ubuntu.
- [x] Cấu hình MongoDB, các biến môi trường và JWT Auth.
- [x] Code Model Schema (`User`, `Document`, `ShortLink`).
- [x] Viết Utils: Hàm sinh `shortCode`, hàm băm PDF (SHA256).
- [x] Hoàn thiện API Rút gọn Link và chuyển hướng (`/v/:code`).
- [x] Tích hợp thư viện `pdf-lib` & `qrcode` để sinh văn bản tĩnh có dấu QR.
- [x] Test toàn bộ API CRUD bằng Postman.

### 🟡 GIAI ĐOẠN 2: TÍCH HỢP BLOCKCHAIN & FRONTEND (REACTJS)
- [x] Viết Smart Contract `DocumentRegistry.sol` (Lưu & Hủy Hash).
- [x] Deploy Contract lên Ethereum Sepolia. (`CONTRACT_ADDRESS` đã có trong `.env`)
- [x] Viết `BlockchainService` bằng `ethers.js` kết nối Smart Contract.
- [x] Viết `IpfsService` upload file qua Pinata.
- [x] Xây dựng ReactJS: Admin Dashboard (Đăng nhập, Quản lý sinh viên, Form cấp bằng).
- [x] Xây dựng ReactJS: Public Verifier Portal (Giao diện tra cứu 1 chạm cho nhà tuyển dụng).

### � GIAI ĐOẠN 3: AI KNOWLEDGE ASSISTANT

- [x] Dựng FastAPI AI Service.
- [x] Tạo model KnowledgeDocument trong backend.
- [x] Làm chức năng upload văn bản học vụ/quyết định/thông báo.
- [x] Làm trạng thái DRAFT / PUBLISHED / ARCHIVED.
- [x] Khi PUBLISHED thì gọi AI Service để index tài liệu.
- [x] AI Service đọc PDF, tách text (PyMuPDF).
- [x] Chunk text kèm metadata.
- [x] Tạo embedding bằng `bkai-foundation-models/vietnamese-bi-encoder`.
- [x] Lưu vector vào FAISS (local storage).
- [x] Làm API /chat.
- [x] Retrieve top-k đoạn liên quan (RAG pipeline với threshold + rerank).
- [x] Đưa context vào LLM để trả lời (Ollama `dcert-qwen14b-vi`).
- [x] Trả về answer + sources.
- [x] Tích hợp chatbot vào Student Portal.
- [x] Lưu lịch sử hỏi đáp (`ChatMessage` model).
- [x] Có fallback khi không tìm thấy thông tin.
- [x] Generated chunks bổ sung kiến thức cấu trúc (điểm rèn luyện, học bổng, tiếng Anh đầu ra...).
