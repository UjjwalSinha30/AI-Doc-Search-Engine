# backend/api/helpers.py
from typing import List, Dict, Any, Tuple
# from collections import defaultdict
# from math import log1p
# import numpy as np

from backend.rag.pipeline import get_or_create_collection
from sentence_transformers import CrossEncoder

# Load the re-ranker model once (global variable)
RERANKER_MODEL =CrossEncoder("BAAI/BGE-reranker-v2-m3", device="cuda")

def rerank_chunks(
    query: str,
    chunks: List[str],
    metadatas: List[Dict[str, Any]],
    top_k: int = 6
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Re-rank retrieved chunks using a cross-encoder for maximum relevance.

    Args:
        query: The original user question
        chunks: List of raw text chunks from vector search
        metadatas: Corresponding metadata list
        top_k: How many final chunks to return

    Returns:
        Tuple of (re-ranked chunks, their metadata)
    """
    # Prepare input pairs for cross-encoder: [(query, chunk1), (query, chunk2), ...]
    pairs = [[query, chunk] for chunk in chunks]
    
    # get relevance scores (higher = better match)
    scores = RERANKER_MODEL.predict(pairs)

    # Sort indices by score descending
    sorted_indices = sorted(range(len(scores)), key= lamda i: scores[i], reverse=True)

    # Take top_k best chunks + metadata
    final_chunks = [chunks[i] for i in sorted_indices[:top_k]]
    final_metadatas = [metadatas[i] for i in sorted_indices[:top_k]]
    
    return final_chunks, final_metadatas

    if not chunks:
        return [], []






def search(
    query: str,
    document_id: int | None = None,
    user_email: str = ""
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Retrieve relevant chunks from the user's Chroma collection (pure vector search).
    """
    collection = get_or_create_collection(user_email)
    where_clause = {"document_id": document_id} if document_id is not None else None

    results = collection.query(
        query_texts=[query],
        n_results=8,
        where=where_clause,
        include=["documents", "metadatas"]
    )

    docs = results["documents"][0] if results.get("documents") and results["documents"][0] else []
    metas = results["metadatas"][0] if results.get("metadatas") and results["metadatas"][0] else []

    return docs, metas


def summarize(chunks: List[str]) -> str:
    """Simple truncation-based summary. Can be upgraded to LLM later."""
    if not chunks:
        return "No content to summarize."
    text = " ".join(chunks)
    return text[:2000] + ("..." if len(text) > 2000 else "")


def extract(chunks: List[str], field: str) -> List[str]:
    """Naive keyword-based extraction."""
    if not chunks:
        return []
    keyword = field.lower()
    return [chunk for chunk in chunks if keyword in chunk.lower()]


# ────────────────────────────────────────────────────────────────
# BM25 KEYWORD SEARCH (pure Python, in-memory)
# ────────────────────────────────────────────────────────────────

# def bm25_keyword_search(
#     query: str,
#     chunks: List[str],
#     k1: float = 1.5,
#     b: float = 0.75,
#     top_k: int = 8
# ) -> List[Tuple[int, float]]:
#     """
#     BM25 scoring for keyword-based search.
#     Returns list of (chunk_index, score) sorted descending.
#     """
#     if not chunks:
#         return []

#     def tokenize(text: str) -> List[str]:
#         return text.lower().split()

#     corpus = [tokenize(chunk) for chunk in chunks]
#     N = len(corpus)

#     # Document frequencies
#     df = defaultdict(int)
#     for doc in corpus:
#         for term in set(doc):
#             df[term] += 1

#     # IDF with smoothing
#     idf = {
#         term: log1p((N - freq + 0.5) / (freq + 0.5) + 1)
#         for term, freq in df.items()
#     }

#     avgdl = sum(len(doc) for doc in corpus) / N if N > 0 else 1

#     query_terms = tokenize(query)
#     if not query_terms:
#         return []

#     scores = []
#     for i, doc in enumerate(corpus):
#         if not doc:
#             continue
#         doc_len = len(doc)
#         tf = defaultdict(int)
#         for term in doc:
#             tf[term] += 1

#         score = 0.0
#         for term in query_terms:
#             if term in tf:
#                 num = tf[term] * (k1 + 1)
#                 den = tf[term] + k1 * (1 - b + b * (doc_len / avgdl))
#                 score += idf.get(term, 0.0) * (num / den)

#         if score > 0:
#             scores.append((i, score))

#     scores.sort(key=lambda x: x[1], reverse=True)
#     return scores[:top_k]


# ────────────────────────────────────────────────────────────────
# HYBRID SEARCH
# ────────────────────────────────────────────────────────────────

# def hybrid_search(
#     query: str,
#     document_id: int | None = None,
#     user_email: str = "",
#     alpha: float = 0.7,          # weight for vector search (semantic)
#     top_k: int = 8
# ) -> tuple[list[str], list[dict[str, Any]]]:
#     """
#     Hybrid vector + BM25 keyword search with simple score fusion.

#     Returns: (hybrid_docs, hybrid_metadatas)
#     """
#     collection = get_or_create_collection(user_email)
#     where = {"document_id": document_id} if document_id is not None else None

#     # 1. Get ALL chunks in scope (needed for BM25)
#     #    WARNING: this can be expensive with large collections!
#     all_res = collection.get(
#         where=where,
#         include=["documents", "metadatas"],
#         limit=5000  # ← safety limit — adjust or implement pagination/caching
#     )

#     all_docs = all_res["documents"] or []
#     all_metas = all_res["metadatas"] or []

#     if not all_docs:
#         return [], []

#     # 2. Vector search (top semantic results)
#     vec_docs, vec_metas = search(query, document_id, user_email)

#     # Mock normalized vector rank scores (1.0 = best, decreasing)
#     vec_scores = [1.0 - (i / max(1, len(vec_docs) - 1)) for i in range(len(vec_docs))]

#     # 3. BM25 keyword search
#     bm25_top = bm25_keyword_search(query, all_docs, top_k=top_k * 2)  # get more candidates

#     if not bm25_top:
#         # Fallback: return pure vector results
#         return vec_docs[:top_k], vec_metas[:top_k]

#     max_bm25 = max(score for _, score in bm25_top) if bm25_top else 1.0
#     bm25_norm = {idx: score / max_bm25 for idx, score in bm25_top}

#     # 4. Fusion
#     fused = {}

#     # From vector results
#     for rank, (doc, meta) in enumerate(zip(vec_docs, vec_metas)):
#         try:
#             idx = all_docs.index(doc)
#         except ValueError:
#             continue
#         v_score = vec_scores[rank]
#         k_score = bm25_norm.get(idx, 0.0)
#         fused_score = alpha * v_score + (1 - alpha) * k_score
#         fused[idx] = (fused_score, doc, meta)

#     # Add pure keyword hits that vector missed
#     for idx, k_score in bm25_norm.items():
#         if idx not in fused:
#             fused[idx] = ((1 - alpha) * k_score, all_docs[idx], all_metas[idx])

#     # 5. Final ranking
#     sorted_items = sorted(
#         fused.items(),
#         key=lambda x: x[1][0],
#         reverse=True
#     )[:top_k]

#     final_docs = [item[1][1] for item in sorted_items]
#     final_metas = [item[1][2] for item in sorted_items]

#     return final_docs, final_metas