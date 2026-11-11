class Solution:
    def compareCaseInsensitive(self, a: str, b: str) -> int:
        a_low = a.lower()
        b_low = b.lower()
        if a_low < b_low:
            return -1
        if a_low > b_low:
            return 1
        return 0
