Bạn là senior backend engineer. Hãy triển khai Bước 5 cho dự án D-CERT.

Bối cảnh dự án:
D-CERT là hệ thống quản lý, số hóa và xác thực văn bằng bằng blockchain. Backend đang dùng Node.js, Express.js, MongoDB, Mongoose, JWT, RBAC, multer. Hệ thống đã có các role: SYS_ADMIN, OFFICER, SIGNER, STUDENT. Backend hiện có cấu trúc routes/controllers/services/models/utils. Dự án đã có middleware protect và authorize để xác thực JWT và phân quyền.

Mục tiêu bước này:
Xây dựng module backend quản lý kho văn bản học vụ cho AI Knowledge Assistant. Module này dùng để upload các văn bản như quy chế học vụ, quyết định, thông báo, hướng dẫn, FAQ. Các văn bản này sau khi được publish sẽ được AI Service index vào FAISS để chatbot sinh viên có thể hỏi đáp.

Yêu cầu nghiệp vụ:
1. OFFICER hoặc SYS_ADMIN có thể upload văn bản.
2. Văn bản sau khi upload có trạng thái mặc định là DRAFT.
3. Không được cho AI index ngay sau khi upload.
4. SYS_ADMIN hoặc SIGNER có quyền publish văn bản.
5. Khi publish:
   - status chuyển thành PUBLISHED.
   - aiIndexStatus chuyển thành INDEXING.
   - backend gọi AI Service endpoint /ingest để index tài liệu.
   - Nếu AI Service trả thành công thì aiIndexStatus = INDEXED, indexedAt = current date.
   - Nếu lỗi thì aiIndexStatus = FAILED nhưng văn bản vẫn giữ status = PUBLISHED.
6. SYS_ADMIN hoặc SIGNER có thể archive văn bản.
7. Khi archive:
   - status chuyển thành ARCHIVED.
   - Có thể chưa cần xóa vector khỏi FAISS ở bước này.
   - Chỉ cần cập nhật status trong MongoDB.
8. SYS_ADMIN hoặc SIGNER có thể reindex văn bản đã PUBLISHED.
9. Danh sách văn bản có thể lọc theo status, type, aiIndexStatus và tìm kiếm theo title.
10. API phải trả JSON thống nhất theo dạng:
   {
     success: true/false,
     message: "...",
     data: ...
   }

Cần tạo các API sau:

POST   /api/knowledge
GET    /api/knowledge
GET    /api/knowledge/:id
PATCH  /api/knowledge/:id/publish
PATCH  /api/knowledge/:id/archive
POST   /api/knowledge/:id/reindex

Cấu trúc file cần tạo hoặc chỉnh sửa:

backend/
├── models/
│   └── KnowledgeDocument.js
├── controllers/
│   └── knowledgeController.js
├── routes/
│   └── knowledgeRoutes.js
├── services/
│   └── aiService.js
├── uploads/
│   └── knowledge/
└── server.js hoặc app.js để mount route

1. Tạo model KnowledgeDocument

Schema cần có các field:

- title: String, required, trim
- type: enum:
  REGULATION
  DECISION
  ANNOUNCEMENT
  GUIDELINE
  FAQ
  OTHER
- fileUrl: String, required
- filePath: String, required
- originalFileName: String
- mimeType: String
- fileSize: Number
- sourceUnit: String, default "Phòng Đào tạo"
- issuedDate: Date
- effectiveFrom: Date
- effectiveTo: Date
- status: enum DRAFT, PUBLISHED, ARCHIVED, default DRAFT
- aiIndexStatus: enum NOT_INDEXED, INDEXING, INDEXED, FAILED, default NOT_INDEXED
- indexedAt: Date
- indexError: String
- uploadedBy: ObjectId ref User
- publishedBy: ObjectId ref User
- publishedAt: Date
- archivedBy: ObjectId ref User
- archivedAt: Date

Dùng timestamps true.

2. Upload file

Dùng multer để upload PDF vào thư mục:

backend/uploads/knowledge/

Chỉ cho phép upload các file:
- application/pdf
- application/vnd.openxmlformats-officedocument.wordprocessingml.document
- text/plain

Tạm thời ưu tiên PDF, nhưng code nên cho phép DOCX/TXT để mở rộng.

Giới hạn file size: 20MB.

POST /api/knowledge nhận form-data:
- file
- title
- type
- sourceUnit
- issuedDate
- effectiveFrom
- effectiveTo

Quyền:
- protect
- authorize("OFFICER", "SYS_ADMIN")

Response thành công:
{
  success: true,
  message: "Upload văn bản thành công. Văn bản đang ở trạng thái DRAFT.",
  data: knowledgeDocument
}

3. GET /api/knowledge

Quyền:
- protect
- authorize("SYS_ADMIN", "OFFICER", "SIGNER")

Hỗ trợ query:
- status
- type
- aiIndexStatus
- search
- page
- limit

Sắp xếp mới nhất trước.

Response:
{
  success: true,
  data: {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  }
}

4. GET /api/knowledge/:id

Quyền:
- protect
- authorize("SYS_ADMIN", "OFFICER", "SIGNER")

Trả về chi tiết văn bản.

5. PATCH /api/knowledge/:id/publish

Quyền:
- protect
- authorize("SYS_ADMIN", "SIGNER")

Logic:
- Tìm KnowledgeDocument theo id.
- Nếu không tồn tại trả 404.
- Nếu status đã ARCHIVED thì không cho publish.
- Nếu đã PUBLISHED rồi thì vẫn cho reindex hoặc trả message phù hợp.
- Set:
  status = PUBLISHED
  publishedBy = req.user._id
  publishedAt = new Date()
  aiIndexStatus = INDEXING
  indexError = null
- Lưu document.
- Gọi AI service để ingest.

AI service URL lấy từ env:
AI_SERVICE_URL=http://localhost:8000

Gọi POST `${AI_SERVICE_URL}/ingest` với body:
{
  document_id: doc._id.toString(),
  title: doc.title,
  type: doc.type,
  file_path: absolute path của file trên server,
  source_unit: doc.sourceUnit,
  issued_date: doc.issuedDate,
  effective_from: doc.effectiveFrom,
  effective_to: doc.effectiveTo
}

Lưu ý:
- file_path cần là absolute path vì FastAPI chạy cùng máy local trong giai đoạn dev.
- Nếu sau này deploy tách server thì có thể đổi sang file_url hoặc upload file sang AI service.

Nếu AI service thành công:
- aiIndexStatus = INDEXED
- indexedAt = new Date()
- indexError = null

Nếu AI service lỗi:
- aiIndexStatus = FAILED
- indexError = error.message hoặc response error
- vẫn giữ status = PUBLISHED

Response:
{
  success: true,
  message: "Publish văn bản thành công và đã gửi index sang AI Service.",
  data: doc
}

Nếu AI lỗi:
{
  success: true,
  message: "Publish văn bản thành công nhưng AI index thất bại.",
  data: doc
}

6. PATCH /api/knowledge/:id/archive

Quyền:
- protect
- authorize("SYS_ADMIN", "SIGNER")

Logic:
- Tìm document.
- Nếu không tồn tại trả 404.
- Set:
  status = ARCHIVED
  archivedBy = req.user._id
  archivedAt = new Date()
- Không cần xóa file.
- Không cần xóa FAISS ở bước này.
- Có thể để aiIndexStatus giữ nguyên.

Response:
{
  success: true,
  message: "Đã lưu trữ văn bản. Chatbot sẽ không ưu tiên sử dụng văn bản này sau khi rebuild index.",
  data: doc
}

7. POST /api/knowledge/:id/reindex

Quyền:
- protect
- authorize("SYS_ADMIN", "SIGNER")

Logic:
- Chỉ cho phép reindex nếu status = PUBLISHED.
- Set aiIndexStatus = INDEXING.
- Gọi lại AI Service /ingest như publish.
- Nếu thành công set INDEXED.
- Nếu lỗi set FAILED.

Response tương tự publish.

8. Tạo service gọi AI

Tạo file backend/services/aiService.js

Export function:
- ingestKnowledgeDocument(doc)

Function này:
- build absolute file path
- gọi axios.post(`${process.env.AI_SERVICE_URL}/ingest`, body)
- timeout 60s
- throw error nếu lỗi

9. Mount route

Trong app.js hoặc server.js thêm:
app.use("/api/knowledge", require("./routes/knowledgeRoutes"));

10. Viết code sạch, có try/catch, validate input cơ bản.

11. Không làm frontend ở bước này.

12. Không làm FastAPI ở bước này, chỉ giả định AI service có endpoint /ingest.

13. Không đụng vào các API document văn bằng hiện có.

14. Đảm bảo không nhầm KnowledgeDocument với Document văn bằng. Document văn bằng dùng cho cấp phát/chứng thực văn bằng. KnowledgeDocument dùng cho kho tri thức chatbot.

15. Sau khi code xong, hãy liệt kê:
- Các file đã tạo
- Các route đã thêm
- Cách test bằng Postman/cURL
- Các biến môi trường cần thêm

Biến môi trường cần thêm:
AI_SERVICE_URL=http://localhost:8000

Ví dụ test bằng cURL:

Upload:
curl -X POST http://localhost:3000/api/knowledge \
  -H "Authorization: Bearer <TOKEN_OFFICER>" \
  -F "title=Quy chế học vụ 2025" \
  -F "type=REGULATION" \
  -F "sourceUnit=Phòng Đào tạo" \
  -F "issuedDate=2025-09-01" \
  -F "file=@/path/to/quy-che.pdf"

Publish:
curl -X PATCH http://localhost:3000/api/knowledge/<id>/publish \
  -H "Authorization: Bearer <TOKEN_SIGNER>"

Archive:
curl -X PATCH http://localhost:3000/api/knowledge/<id>/archive \
  -H "Authorization: Bearer <TOKEN_SIGNER>"

Reindex:
curl -X POST http://localhost:3000/api/knowledge/<id>/reindex \
  -H "Authorization: Bearer <TOKEN_SIGNER>"

Hãy triển khai đầy đủ code backend cho bước này.

Trước khi code, hãy đọc cấu trúc backend hiện tại, tìm đúng tên middleware auth/authorize đang dùng trong project, sau đó viết code theo style hiện có. Nếu tên file middleware khác với mô tả, hãy dùng đúng tên file thực tế trong repo.