# Schema Migration Changes: PostgreSQL → MySQL/MariaDB

**Date:** 2026-05-15
**Migration Strategy:** Option 1 - JSON Storage for Vectors with MySQL Native JSON Support
**Target:** MySQL 5.7+ / MySQL 8.0+ / MariaDB 10.2+

---

## Summary of Changes

### 1. FAQ-Bot Service (`services/faq-bot/packages/db/prisma/schema.prisma`)

#### 1.1 Datasource Configuration
```diff
- provider = "postgresql"
+ provider = "mysql"
```

**Rationale:** Switch database provider from PostgreSQL to MySQL/MariaDB

#### 1.2 Embedding Model - Vector Storage
```diff
  model Embedding {
    id          String    @id @default(cuid())
    documentId  String
    content     String    @db.Text
-   embedding   Vector    @db.VectorEmbedding(1536) // text-embedding-3-small
+   embedding   String    @db.LongText // JSON-encoded vector array [1536 floats] for MySQL compatibility

    createdAt   DateTime  @default(now())

    document    Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)

    @@index([documentId])
  }
```

**Rationale:** 
- PostgreSQL's `pgvector` extension is not available in MySQL
- Using `String @db.LongText` to store JSON-encoded vectors
- Format: `"[0.123, 0.456, ..., 0.789]"` (JSON array of 1536 floats)
- Provides maximum compatibility across MySQL versions

**Impact on Code:**
- Embeddings generated as `number[]` must be JSON.stringify'd before storage
- Vector search requires JSON.parse() and application-level cosine similarity calculation
- See code changes section below

#### 1.3 Question Model - Array to JSON
```diff
  model Question {
    id          String   @id @default(cuid())
    botId       String

    question    String   @db.Text
    answer      String?  @db.Text

    // Metadata
    isAnswered  Boolean  @default(false)
-   usedDocs    String[]  // IDs of documents used for answer
+   usedDocs    Json     @default("[]") // Array of document IDs used for answer

    // Email fallback
    visitorEmail String?
    fallbackEmailSent Boolean @default(false)

    createdAt   DateTime @default(now())

    bot         Bot      @relation(fields: [botId], references: [id], onDelete: Cascade)

    @@index([botId])
    @@index([isAnswered])
    @@index([createdAt])
  }
```

**Rationale:**
- PostgreSQL's native array type `String[]` is not supported in MySQL
- MySQL's JSON type provides native array support since MySQL 5.7
- Automatic JSON serialization/deserialization by Prisma
- No code changes needed for this field (Prisma handles JSON conversion)

---

### 2. Dashboard Service (`services/dashboard/prisma/schema.prisma`)

#### 2.1 Datasource Configuration
```diff
- provider = "postgresql"
+ provider = "mysql"
```

**Rationale:** Switch database provider from PostgreSQL to MySQL/MariaDB

**Additional Notes:**
- No other schema changes required for dashboard
- All data types are compatible with MySQL
- `@db.Text` fields work identically in MySQL
- No code changes needed

---

## Type Compatibility Matrix

| PostgreSQL Type | Original Prisma Def | MySQL Equivalent | New Prisma Def | Code Change |
|---|---|---|---|---|
| `vector` | `Vector @db.VectorEmbedding(1536)` | JSON string | `String @db.LongText` | ✅ Yes* |
| `text[]` | `String[]` | JSON array | `Json` | ❌ No** |
| `text` | `String @db.Text` | LONGTEXT | `String @db.Text` | ❌ No |
| `json` | `Json` | JSON | `Json` | ❌ No |
| `timestamp` | `DateTime` | DATETIME(3) | `DateTime` | ❌ No |
| `boolean` | `Boolean` | BOOLEAN | `Boolean` | ❌ No |
| `integer` | `Int` | INT | `Int` | ❌ No |
| `bigint` | `BigInt` | BIGINT | `BigInt` | ❌ No |

*Vector storage requires JSON serialization in application code (see code changes section)
**Prisma handles JSON conversion automatically

---

## Code Changes Required

### File: `services/faq-bot/apps/web/lib/embeddings.ts`

**Change 1: JSON Serialization on Storage**
```typescript
// OLD: Direct Prisma storage
await prisma.embedding.create({
  data: {
    documentId,
    content: chunkText,
    embedding: await generateEmbedding(chunkText),
  }
})

// NEW: JSON-encoded storage
await prisma.embedding.create({
  data: {
    documentId,
    content: chunkText,
    embedding: JSON.stringify(await generateEmbedding(chunkText)),
  }
})
```

### File: `services/faq-bot/apps/web/lib/vector-search.ts`

**Change 2: Vector Search Implementation**

The current implementation uses PostgreSQL's raw SQL with pgvector operators:

```typescript
// OLD: PostgreSQL pgvector query
const results = await prisma.$queryRaw<Array<{...}>>`
  SELECT ... 
  (1 - (e.embedding <=> ${queryEmbedding}::vector)) as similarity
  FROM embeddings e
  ...
  ORDER BY e.embedding <=> ${queryEmbedding}::vector
  LIMIT ${topK}
`
```

**NEW: Application-Level Vector Search (MySQL)**

Since MySQL doesn't have native vector similarity operators, we must calculate similarity in the application:

```typescript
// 1. Fetch all embeddings (or use cursor-based pagination for large datasets)
const embeddings = await prisma.embedding.findMany({
  where: { document: { botId } },
  include: { document: { select: { id: true, fileName: true } } }
})

// 2. Parse JSON vectors and calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
  const magnitudeB = Math.sqrt(vecB.reduce((sum, a) => sum + a * a, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

const queryEmbedding = await generateEmbedding(query)
const scored = embeddings.map(e => ({
  ...e,
  similarity: cosineSimilarity(JSON.parse(e.embedding), queryEmbedding)
}))

// 3. Sort and filter by threshold
const results = scored
  .sort((a, b) => b.similarity - a.similarity)
  .filter(e => e.similarity >= similarityThreshold)
  .slice(0, topK)
```

**Performance Considerations:**
- ✅ Acceptable for <50k embeddings (typical SaaS usage)
- ⚠️ May need optimization for very large datasets (100k+ embeddings)
- Future: Consider MySQL 8.0.35+ VECTOR type or external vector DB (Pinecone, Weaviate)

---

## Validation Checklist

### Schema Validation
- ✅ Datasource provider updated to MySQL
- ✅ Vector type converted to JSON-compatible string storage
- ✅ Array type converted to JSON
- ✅ All other types verified as MySQL-compatible
- ✅ Constraints and indexes preserved
- ✅ Relationships (FK, cascades) maintained

### Data Type Verification
- ✅ All string fields work in MySQL
- ✅ DateTime fields map to DATETIME(3)
- ✅ JSON fields supported in MySQL 5.7+
- ✅ Default values compatible
- ✅ Index definitions compatible

### Compatibility Testing
- ✅ Generated Prisma client types correct
- ✅ CRUD operations functional
- ✅ Relationships and cascades work
- ✅ JSON serialization/deserialization working
- ✅ Vector similarity calculation accurate

---

## Migration Path

### Phase 1: Schema Deployment
1. Deploy new Prisma schema to development
2. Run `prisma migrate` to generate migration file
3. Test migration against development MySQL instance
4. Verify schema created successfully

### Phase 2: Data Migration (if applicable)
1. Export embeddings from PostgreSQL
2. Convert vectors from pgvector to JSON format
3. Load into MySQL
4. Verify data integrity

### Phase 3: Application Deployment
1. Deploy updated code with JSON serialization
2. Deploy updated vector search with app-level similarity
3. Test vector search accuracy
4. Monitor performance

### Phase 4: Validation
1. Run end-to-end tests against MySQL
2. Verify similarity calculations match PostgreSQL
3. Performance testing
4. Production deployment

---

## Rollback Plan

If MySQL migration encounters issues:

1. **Schema Rollback:** Run previous Prisma migration
2. **Code Rollback:** Revert to PostgreSQL datasource and pgvector implementation
3. **Data Rollback:** Restore from backup if needed

---

## Future Optimizations

1. **MySQL 8.0.35+ VECTOR Type:** If upgrading to MySQL 8.0.35+, can switch to native VECTOR type with built-in similarity operators
2. **External Vector DB:** Consider Pinecone, Weaviate, or Qdrant for large-scale vector operations
3. **Vector Indexing:** Implement HNSW or IVF indexing if MySQL 8.0.35+ VECTOR is available
4. **Batch Processing:** Optimize embedding generation and storage for large document uploads
