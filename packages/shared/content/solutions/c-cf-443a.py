class Solution:
    def countDistinctLetters(self, s: str) -> int:
        return len({c for c in s if 'a' <= c <= 'z'})
