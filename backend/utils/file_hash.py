import hashlib

def compute_file_hash(file_bytes: bytes) -> str:
    """
    Computes the SHA-256 hash of a byte string.

    Args:
        file_bytes: The input data as bytes.

    Returns:
        The hexadecimal representation of the SHA-256 hash.
    """
    
    # Initialize the SHA-256 hash object
    sha256 = hashlib.sha256()
    # Update the hash object with the input bytes
    sha256.update(file_bytes)
    # Return the hexadecimal digest of the hash
    return sha256.hexdigest()
  