# backend/api/helpers.py
from typing import List, Dict, Any, Tuple
from rag.pipeline import get_or_create_collection
from sentence_transformers import CrossEncoder
import torch
import numpy as np
from rank_bm25 import BM25Okapi


# Safe GPU detection (same pattern as pipeline.py)
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🔥 Reranker using device: {device.upper()} | GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU only'}")
# Load the re-ranker model once (global variable)
RERANKER_MODEL = CrossEncoder("BAAI/bge-reranker-v2-m3", device=device)

def rerank_chunks(
    query: str,
    chunks: List[str],
    metadatas: List[Dict[str, Any]],
    top_k: int = 6,
    threshold: float = 0.3
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
    if not chunks:
        return [], []

    # Prepare input pairs for cross-encoder: [(query, chunk1), (query, chunk2), ...]
    pairs = [[query, chunk] for chunk in chunks]
    
    # get relevance scores (higher = better match)
    scores = RERANKER_MODEL.predict(pairs)
    
    # log scores 
    # print(f"🔍 Reranker scores for query '{query}':")
    # for i, score in enumerate(scores[:5]):
    #     print(f"  [{i}] Score: {score:.3f} - {chunks[i][:100]}...")

    # filter by threshold before taking top_k
    relevant_indices = [i for i, score in enumerate(scores) if score >= threshold]

    if not relevant_indices:
        print(f"⚠️ No chunks above threshold {threshold} for query: {query}")
        return [], []

    # Sort relevant chunks by score
    sorted_relevant = sorted(relevant_indices, key=lambda i: scores[i], reverse=True)[:top_k]

    # Take top_k best chunks + metadata
    # final_chunks = [chunks[i] for i in sorted_indices[:top_k]]

    
    return [chunks[i] for i in sorted_relevant], [metadatas[i] for i in sorted_relevant]


def search(
    query: str,
    document_id: int | None = None,
    user_email: str = "",
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """
    Hybrid search: dense vector + BM25 keyword matching
    
    Returns: (documents, metadatas) sorted by hybrid relevance
    """
    collection = get_or_create_collection(user_email)
    where_clause = {"document_id": document_id} if document_id is not None else None
    
    # ── 1. Dense retrieval (vector search)
    DENSE_CANDIDATES = 120  # enough for hybrid + reranking

    results = collection.query(
        query_texts=[query],
        n_results=DENSE_CANDIDATES,
        where=where_clause,
        include=["documents", "metadatas", "distances"]
    )

    docs = results["documents"][0] if results.get("documents") and results["documents"][0] else []
    metas = results["metadatas"][0] if results.get("metadatas") and results["metadatas"][0] else []
    distances = results["distances"][0] if results.get("distances") else []

    if not docs:
        return [], []
    
    # Add distance threshold for vector search
    DISTANCE_THRESHOLD = 1.2  # Adjust based on your embedding model

    filtered_docs = []
    filtered_metas = []
    filtered_distances = []

    for doc, meta, dist in zip(docs, metas, distances):
        if dist <= DISTANCE_THRESHOLD:
            filtered_docs.append(doc)
            filtered_metas.append(meta)
            filtered_distances.append(dist)

    if not filtered_docs:
        print(f"⚠️ No documents within distance threshold {DISTANCE_THRESHOLD}")
        return [], []        
    
    # ── 2. BM25 keyword scoring on dense candidates
    tokenized_corpus = [doc.lower().split() for doc in filtered_docs]
    bm25 = BM25Okapi(tokenized_corpus)

    tokenized_query = query.lower().split() 
    bm25_scores = bm25.get_scores(tokenized_query)
    # 3. Simple hybrid score fusion
    # Convert distance → similarity (higher = better)
    vector_sim = [1.0 / (1.0 + d) for d in filtered_distances]

    # Normalize both (very basic min-max to [0,1])
    v_max = max(vector_sim) if vector_sim else 1.0
    vector_norm = [v/ v_max if v_max > 0 else 0.5 for v in vector_sim]

    b_max = max(bm25_scores) if len(bm25_scores) > 0 else 1.0
    bm25_norm = [s / b_max if b_max > 0 else 0.5 for s in bm25_scores]

    # weighted combination
    HYBRID_ALPHA = 0.7
    hybrid_scores = [
        HYBRID_ALPHA * v + (1 - HYBRID_ALPHA) * b
        for v, b in zip(vector_norm, bm25_norm)
    ]

    # sort by hybrid score
    sorted_indices = np.argsort(hybrid_scores)[::-1]
    sorted_docs = [filtered_docs[i] for i in sorted_indices]
    sorted_metas = [filtered_metas[i] for i in sorted_indices]

    return sorted_docs, sorted_metas


def summarize(chunks: List[str],max_length: int = 500) -> str:
    """
    Improved truncation-based summary.
    Tries to end on sentence boundary instead of hard cut.
    """
    if not chunks:
        return "No content to summarize."

    text = " ".join(chunks).strip()

    if len(text) <= max_length:
        return text

    # Smart truncation: try to cut at sentence end
    cutoff = text[:max_length].rsplit(". ", 1)
    if len(cutoff) > 1:
        return cutoff[0] + ". ..."

    return text[:max_length] + "..."


def extract(chunks: List[str], field: str) -> List[str]:
    """Naive keyword-based extraction."""
    if not chunks:
        return []
    keyword = field.lower()
    return [chunk for chunk in chunks if keyword in chunk.lower()]


