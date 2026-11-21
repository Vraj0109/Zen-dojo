from typing import List

class Solution:
    def rabinKarp(self, pattern: str, text: str) -> List[int]:
        m = len(pattern)
        n = len(text)
        if m > n or m == 0:
            return []
        occurrences = []
        for i in range(n - m + 1):
            if text[i:i + m] == pattern:
                occurrences.append(i)
        return occurrences
