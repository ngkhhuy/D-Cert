Bạn là senior Node.js/Express backend engineer. Hãy triển khai tiếp Bước 16 + Bước 17 cho backend của dự án D-CERT.

Bối cảnh:
D-CERT là hệ thống quản lý, số hóa và xác thực văn bằng bằng blockchain. Backend dùng Node.js, Express.js, MongoDB, Mongoose, JWT, RBAC. Dự án đã có các role:
- SYS_ADMIN
- OFFICER
- SIGNER
- STUDENT

Giai đoạn 3 đang xây dựng AI Knowledge Assistant cho sinh viên.
AI Service chạy bằng FastAPI tại:
AI_SERVICE_URL=http://localhost:8000

AI Service đã có các endpoint:
- POST /chat
- POST /ingest
- POST /knowledge/archive, nếu đã làm ở FastAPI

Backend đã hoặc sẽ có module KnowledgeDocument với các API:
- POST /api/knowledge
- GET /api/knowledge
- GET /api/knowledge/:id
- PATCH /api/knowledge/:id/publish
- PATCH /api/knowledge/:id/archive
- POST /api/knowledge/:id/reindex

Yêu cầu lần này:
1. Tạo API backend /api/ai/chat để frontend Student Portal gọi.
2. Backend kiểm tra JWT và role.
3. Backend gọi FastAPI /chat.
4. Backend lưu lịch sử chat vào MongoDB.
5. Cập nhật publish/reindex/archive KnowledgeDocument để kết nối với AI Service.
6. Không chỉnh frontend ở bước này.
7. Không chỉnh FastAPI ở bước này, chỉ gọi các endpoint đã có.

==================================================
BƯỚC 16: BACKEND EXPRESS GỌI AI SERVICE /chat
==================================================

Tạo/cập nhật các file:

backend/models/ChatMessage.js
backend/controllers/aiController.js
backend/routes/aiRoutes.js

Nếu project đang dùng tên thư mục middleware khác, hãy tự kiểm tra và import đúng middleware protect/authorize hiện có.

API cần tạo:

POST /api/ai/chat

Quyền:
- STUDENT
- SYS_ADMIN

Luồng xử lý:

1. Kiểm tra user đã đăng nhập bằng middleware protect.
2. Kiểm tra role bằng authorize("STUDENT", "SYS_ADMIN").
3. Nhận body:
   {
     "question": "Điều kiện xét tốt nghiệp là gì?"
   }
4. Validate:
   - question bắt buộc.
   - question.trim() không được rỗng.
   - question không quá dài, giới hạn khoảng 1000 ký tự.
5. Gọi FastAPI:
   POST `${process.env.AI_SERVICE_URL}/chat`

Body gửi sang AI Service:
{
  "question": question.trim(),
  "student_id": req.user?.studentId || null
}

6. Nhận response từ AI Service, ví dụ:
{
  "answer": "...",
  "sources": [...],
  "fallback": false,
  "used_llm": true
}

7. Lưu lịch sử chat vào MongoDB.
8. Trả response về frontend.

--------------------------------
1. Model ChatMessage
--------------------------------

Tạo file:
backend/models/ChatMessage.js

Schema cần có:

- user: ObjectId ref User, required
- studentId: String, optional
- question: String, required
- answer: String, required
- sources: Array, default []
- fallback: Boolean, default false
- usedLlm: Boolean, default false
- llmError: String, optional
- createdAt, updatedAt bằng timestamps true

Gợi ý schema:

const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentId: {
      type: String,
      default: null,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    sources: {
      type: Array,
      default: [],
    },
    fallback: {
      type: Boolean,
      default: false,
    },
    usedLlm: {
      type: Boolean,
      default: false,
    },
    llmError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);

--------------------------------
2. Controller AI
--------------------------------

Tạo/cập nhật file:
backend/controllers/aiController.js

Cần implement:

exports.chatWithAI = async (req, res) => { ... }

Logic chi tiết:
- Lấy question từ req.body.
- Validate question.
- Kiểm tra process.env.AI_SERVICE_URL có tồn tại, nếu không trả 500.
- Gọi axios.post(`${AI_SERVICE_URL}/chat`, body, timeout 120000).
- Nếu AI Service trả thành công:
  - Lấy answer, sources, fallback, used_llm, llm_error.
  - Lưu ChatMessage.
  - Trả:
    {
      success: true,
      message: "Chatbot trả lời thành công.",
      data: {
        answer,
        sources,
        fallback,
        usedLlm,
        llmError
      }
    }

Chú ý mapping field:
- AI Service trả used_llm dạng snake_case.
- Backend trả usedLlm dạng camelCase cho frontend.

Nếu AI Service lỗi:
- Trả 500:
  {
    success: false,
    message: "Không thể kết nối AI Service.",
    error: error message trong môi trường dev nếu cần
  }

Không lưu ChatMessage nếu AI Service lỗi hoàn toàn.

Có thể import:
const axios = require("axios");
const ChatMessage = require("../models/ChatMessage");

--------------------------------
3. Route AI
--------------------------------

Tạo/cập nhật file:
backend/routes/aiRoutes.js

Route:
router.post("/chat", protect, authorize("STUDENT", "SYS_ADMIN"), chatWithAI);

Export router.

--------------------------------
4. Mount route
--------------------------------

Trong server.js hoặc app.js, thêm:

app.use("/api/ai", require("./routes/aiRoutes"));

Nếu project đang dùng import ES module hoặc cấu trúc khác, hãy làm theo style hiện tại.

--------------------------------
5. Biến môi trường backend
--------------------------------

Thêm vào backend/.env:

AI_SERVICE_URL=http://localhost:8000

==================================================
BƯỚC 17: CẬP NHẬT KNOWLEDGEDOCUMENT CONNECT AI SERVICE
==================================================

Bối cảnh:
Backend đã có hoặc cần cập nhật:
- backend/models/KnowledgeDocument.js
- backend/controllers/knowledgeController.js
- backend/routes/knowledgeRoutes.js
- backend/services/aiService.js

Yêu cầu:
Cập nhật logic publish/reindex/archive để gọi AI Service.

Nếu module KnowledgeDocument đã tồn tại từ bước trước, hãy cập nhật vào code hiện có, không tạo trùng route/controller.

--------------------------------
1. Tạo/cập nhật service gọi AI
--------------------------------

Tạo/cập nhật file:
backend/services/aiService.js

Cần export các hàm:

1. ingestKnowledgeDocument(doc)
2. archiveKnowledgeDocument(documentId)

Cần dùng axios.

Biến môi trường:
process.env.AI_SERVICE_URL

--------------------------------
1.1. ingestKnowledgeDocument(doc)
--------------------------------

Input:
doc là KnowledgeDocument từ MongoDB.

Logic:
- Validate AI_SERVICE_URL tồn tại.
- Build absolute file path từ doc.filePath.
- Nếu doc.filePath đã là absolute path thì dùng luôn.
- Nếu là relative path thì chuyển sang absolute bằng path.resolve.
- Gọi:
  POST `${AI_SERVICE_URL}/ingest`

Body:
{
  document_id: doc._id.toString(),
  title: doc.title,
  type: doc.type,
  file_path: absoluteFilePath,
  source_unit: doc.sourceUnit,
  issued_date: doc.issuedDate,
  effective_from: doc.effectiveFrom,
  effective_to: doc.effectiveTo
}

Yêu cầu:
- timeout 120000.
- Nếu lỗi thì throw Error rõ ràng.
- Trả response.data nếu thành công.

Lưu ý:
Trong giai đoạn dev, backend Express và FastAPI chạy cùng máy nên absolute file_path dùng được.
Nếu sau này deploy tách server, cần đổi sang upload file trực tiếp sang AI Service hoặc shared storage.

--------------------------------
1.2. archiveKnowledgeDocument(documentId)
--------------------------------

Gọi:
POST `${AI_SERVICE_URL}/knowledge/archive`

Body:
{
  document_id: documentId.toString()
}

Yêu cầu:
- timeout 60000.
- Nếu endpoint chưa tồn tại hoặc lỗi thì throw Error.
- Hàm này được dùng khi archive KnowledgeDocument để cập nhật metadata chunk trong FAISS thành ARCHIVED.
- Nếu lỗi archive AI, backend vẫn có thể archive MongoDB nhưng cần lưu indexError.

--------------------------------
2. Publish KnowledgeDocument
--------------------------------

Cập nhật controller cho route:

PATCH /api/knowledge/:id/publish

Quyền:
- SYS_ADMIN
- SIGNER

Logic:
1. Tìm KnowledgeDocument theo id.
2. Nếu không tồn tại → 404.
3. Nếu status === "ARCHIVED" → không cho publish, trả 400.
4. Set:
   doc.status = "PUBLISHED"
   doc.publishedBy = req.user._id
   doc.publishedAt = new Date()
   doc.aiIndexStatus = "INDEXING"
   doc.indexError = null
5. Save doc.
6. Gọi ingestKnowledgeDocument(doc).
7. Nếu ingest thành công:
   doc.aiIndexStatus = "INDEXED"
   doc.indexedAt = new Date()
   doc.indexError = null
   save doc
   return:
   {
     success: true,
     message: "Publish văn bản thành công và đã index vào AI Service.",
     data: doc
   }
8. Nếu ingest lỗi:
   doc.aiIndexStatus = "FAILED"
   doc.indexError = error.message
   save doc
   return HTTP 200, không phải 500:
   {
     success: true,
     message: "Publish văn bản thành công nhưng AI index thất bại.",
     data: doc
   }

Lý do không trả 500:
Vì nghiệp vụ publish văn bản đã thành công, chỉ phần AI index thất bại. Admin có thể bấm reindex sau.

--------------------------------
3. Reindex KnowledgeDocument
--------------------------------

Cập nhật controller cho route:

POST /api/knowledge/:id/reindex

Quyền:
- SYS_ADMIN
- SIGNER

Logic:
1. Tìm KnowledgeDocument theo id.
2. Nếu không tồn tại → 404.
3. Nếu status !== "PUBLISHED" → trả 400:
   "Chỉ có thể re-index văn bản đang PUBLISHED."
4. Set:
   aiIndexStatus = "INDEXING"
   indexError = null
   save
5. Gọi ingestKnowledgeDocument(doc).
6. Nếu thành công:
   aiIndexStatus = "INDEXED"
   indexedAt = new Date()
   indexError = null
   save
   return success true
7. Nếu lỗi:
   aiIndexStatus = "FAILED"
   indexError = error.message
   save
   return 500 hoặc 200 tùy style hiện tại.
   Khuyến nghị:
   - Với reindex, có thể trả 500 vì thao tác chính là index.
   - Nhưng vẫn trả data doc để admin thấy lỗi.

Response lỗi gợi ý:
{
  success: false,
  message: "Re-index văn bản thất bại.",
  data: doc
}

Lưu ý:
FastAPI /ingest đã tự remove_document(document_id) trước khi add vector mới nên không bị trùng chunks.

--------------------------------
4. Archive KnowledgeDocument
--------------------------------

Cập nhật controller cho route:

PATCH /api/knowledge/:id/archive

Quyền:
- SYS_ADMIN
- SIGNER

Logic:
1. Tìm KnowledgeDocument theo id.
2. Nếu không tồn tại → 404.
3. Set:
   status = "ARCHIVED"
   archivedBy = req.user._id
   archivedAt = new Date()
4. Save MongoDB trước.
5. Gọi archiveKnowledgeDocument(doc._id) để FastAPI cập nhật metadata chunks thành ARCHIVED.
6. Nếu AI archive thành công:
   return:
   {
     success: true,
     message: "Đã lưu trữ văn bản và cập nhật trạng thái trong AI index.",
     data: doc
   }
7. Nếu AI archive lỗi:
   doc.indexError = error.message
   save doc
   vẫn return HTTP 200:
   {
     success: true,
     message: "Đã lưu trữ văn bản trong hệ thống, nhưng cập nhật AI index thất bại. Có thể cần rebuild index.",
     data: doc
   }

Lưu ý:
- Không xóa file vật lý.
- Không xóa KnowledgeDocument khỏi MongoDB.
- Archive chỉ để chatbot không dùng văn bản đó nữa.
- FastAPI answer_question sẽ bỏ qua chunk có status != PUBLISHED.

--------------------------------
5. Route Knowledge
--------------------------------

Đảm bảo routes có:

PATCH /api/knowledge/:id/publish
POST  /api/knowledge/:id/reindex
PATCH /api/knowledge/:id/archive

Quyền:
publish, reindex, archive:
protect + authorize("SYS_ADMIN", "SIGNER")

--------------------------------
6. Validate filePath khi ingest
--------------------------------

Trong ingestKnowledgeDocument(doc):
- Nếu doc.filePath thiếu thì throw Error("Không tìm thấy filePath của văn bản.")
- Nếu file không tồn tại ở absolute path thì throw Error rõ ràng.
- Dùng fs.existsSync để check trước khi gọi AI Service.

--------------------------------
7. Không làm những việc sau
--------------------------------

- Không chỉnh frontend.
- Không chỉnh FastAPI.
- Không thay đổi model Document văn bằng.
- Không nhầm KnowledgeDocument với Document văn bằng/chứng chỉ.
- Không tự động index khi upload DRAFT.
- Chỉ index khi publish hoặc reindex.

==================================================
TEST
==================================================

Sau khi code xong, hãy cung cấp cách test bằng cURL/Postman.

1. Test chat:

curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer <TOKEN_STUDENT>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Điều kiện xét tốt nghiệp là gì?"
  }'

Response mong muốn:
{
  "success": true,
  "message": "Chatbot trả lời thành công.",
  "data": {
    "answer": "...",
    "sources": [...],
    "fallback": false,
    "usedLlm": true
  }
}

2. Test publish:

curl -X PATCH http://localhost:3000/api/knowledge/<id>/publish \
  -H "Authorization: Bearer <TOKEN_SIGNER>"

3. Test reindex:

curl -X POST http://localhost:3000/api/knowledge/<id>/reindex \
  -H "Authorization: Bearer <TOKEN_SIGNER>"

4. Test archive:

curl -X PATCH http://localhost:3000/api/knowledge/<id>/archive \
  -H "Authorization: Bearer <TOKEN_SIGNER>"

==================================================
OUTPUT SAU KHI CODE
==================================================

Sau khi triển khai xong, hãy liệt kê:
1. Các file đã tạo/chỉnh sửa.
2. Các route mới/cập nhật.
3. Biến môi trường cần thêm.
4. Cách test chat.
5. Cách test publish/reindex/archive.
6. Lưu ý vận hành:
   - Backend và FastAPI phải cùng truy cập được file_path.
   - FastAPI phải đang chạy ở AI_SERVICE_URL.
   - Ollama chỉ cần cho bước sinh câu trả lời; bước ingest không phụ thuộc Ollama.
   - Nếu AI index lỗi, Admin có thể bấm reindex.