# D-CERT

Hệ thống quản lý, phát hành và xác thực văn bằng kết hợp Web3 + AI.

D-CERT là đồ án tốt nghiệp (Kỹ sư - Chuyên ngành Hệ thống Thông tin) nhằm xây dựng một nền tảng cho phép: soạn thảo, phát hành PDF văn bằng/giấy tờ, ghi nhận mã băm trên blockchain (Ethereum Sepolia), cung cấp cổng xác thực công khai và một AI Knowledge Assistant để tra cứu/hỏi đáp về các văn bản học vụ.

Tính năng chính

- Quản lý người dùng (RBAC): SYS_ADMIN, OFFICER, SIGNER, STUDENT.
- Soạn nháp, upload PDF, import CSV để tạo văn bản.
- Phát hành (issue) văn bằng: sinh PDF, gắn QR, băm SHA-256, lưu filesystem và tùy chọn upload lên IPFS (Pinata), ghi nhận txHash on-chain.
- Thu hồi văn bằng (revoke): cập nhật trạng thái DB và ghi revoke lên smart contract.
- Public verifier: tra cứu bằng shortlink/QR hoặc đối chiếu hash bằng upload file.
- AI Knowledge Assistant (RAG): index tài liệu bằng FAISS + embedding, endpoint /api/ai/chat dùng local LLM (Ollama) để trả lời câu hỏi và kèm nguồn tham khảo.

Kiến trúc & Stack

- Backend: Node.js (Express), MongoDB (Mongoose). Thư mục chính: `backend/src`.
- Frontend: React + TailwindCSS — Admin Dashboard, Student Portal, Public Verifier (`frontend/`).
- Blockchain: Solidity contract (DocumentRegistry.sol) deployed trên Sepolia; ethers.js (v6) + Alchemy cho RPC.
- AI microservice: Python (FastAPI) + PyMuPDF, sentence-transformers, FAISS; local LLM qua Ollama.

Các thư mục chính

- `backend/` — API server (Express). Entry: `backend/src/app.js`.
- `ai-service/` — FastAPI service cho embedding, FAISS và chat. Công cụ hữu ích: `ai-service/inspect_faiss.py`.
- `blockchain/` — smart contract & scripts (deploy).
- `frontend/` — React app (Admin, Student, Verifier).
- `Project.md` — tài liệu dự án chi tiết (kiến trúc, schema, API endpoints, lộ trình).

Yêu cầu hệ thống

- Node.js (>=18), npm
- Python 3.10+
- MongoDB (local hoặc remote)
- (Tùy chọn) Ollama local để chạy LLM nội bộ
- (Tùy chọn) Pinata JWT nếu muốn upload file lên IPFS

Cách chạy nhanh (development)

1) Backend

```bash
cd backend
npm install
# tạo file .env theo mẫu (xem backend/.env.example nếu có)
npm run dev    # chạy với nodemon
# hoặc npm run start
```

Các biến .env quan trọng (tối thiểu):
- MONGO_URI — kết nối MongoDB (mặc định Project.md dùng 127.0.0.1:27017)
- JWT_SECRET — khóa ký JWT
- PORT — (tuỳ chọn; mặc định 3000)
- CONTRACT_ADDRESS — địa chỉ contract đã deploy (Sepolia)
- ALCHEMY_API_KEY — để dùng Alchemy RPC
- PINATA_JWT — (tùy chọn) để upload lên Pinata

2) AI service

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# chạy uvicorn (entry phụ thuộc cấu trúc app trong ai-service/app)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Lưu ý: AI service lưu chỉ mục FAISS vào `ai-service/app/storage` (xem `inspect_faiss.py`) — cần cấp quyền ghi và không gian đủ lớn.

3) Frontend

```bash
cd frontend
npm install
npm run dev   # hoặc npm start tùy package.json của frontend
```

API & Endpoints nổi bật

- Auth: POST /api/auth/login
- Profile: GET /api/users/me (yêu cầu JWT)
- Documents: GET /api/docs, GET /api/docs/:id, POST /api/docs/draft, POST /api/docs/issue/:id, POST /api/docs/revoke/:id
- Verification: GET /v/:shortCode (redirect public), GET /api/verify/hash/:hash, POST /api/verify/upload
- Knowledge: POST /api/knowledge/upload, PATCH /api/knowledge/:id/publish (khi publish sẽ gọi AI service để index)
- AI Chat: POST /api/ai/chat

Ghi chú triển khai

- File PDF văn bằng được lưu trên filesystem trong `backend/public/uploads` và `backend/uploads/knowledge`. Khi triển khai thật, cân nhắc storage bền vững (S3, GCS) hoặc IPFS.
- Smart contract ghi/thu hồi hash on-chain trên Sepolia; theo dõi txHash trong DB.
- AI service dùng FAISS local và embedding model tiếng Việt (`bkai-foundation-models/*`) — khi scale, cân nhắc vector DB dịch vụ (Pinecone, Milvus, Weaviate).

Kiểm tra & tiện ích

- `ai-service/inspect_faiss.py` — công cụ đọc `faiss.index` và `metadata.json`, in thông tin, sample vector và demo search.

Tài liệu bổ sung

- Xem `Project.md` để biết mô tả chi tiết schema MongoDB, API list và lộ trình thực hiện.

Đóng góp

1. Fork repository
2. Tạo branch feature: `git checkout -b feature/abc`
3. Commit và PR

License

- (Thêm loại license nếu cần — hiện chưa có file LICENSE)

Người liên hệ

- Tác giả / owner trên GitHub: @ngkhhuy


----
File README này được sinh tự động dựa trên nội dung hiện có trong repository. Nếu bạn muốn tôi bổ sung tiếng Anh, hướng dẫn deploy Docker/production, hoặc template .env đầy đủ, cho tôi biết để tôi cập nhật tiếp.