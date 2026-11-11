from typing import List

class Solution:
    def rabinKarp(self, pattern: str, text: str) -> List[int]:
        p_len = len(pattern)
        t_len = len(text)
        if p_len > t_len or p_len == 0:
            return []

        p = 31
        m = 1_000_000_009

        max_len = max(p_len, t_len)
        p_pow = [1] * (max_len + 1)
        for i in range(1, max_len + 1):
            p_pow[i] = (p_pow[i - 1] * p) % m

        h = [0] * (t_len + 1)
        for i in range(t_len):
            h[i + 1] = (h[i] + (ord(text[i]) - ord('a') + 1) * p_pow[i]) % m

        hs = 0
        for i in range(p_len):
            hs = (hs + (ord(pattern[i]) - ord('a') + 1) * p_pow[i]) % m

        occurrences = []
        for i in range(t_len - p_len + 1):
            cur_h = (h[i + p_len] + m - h[i]) % m
            if cur_h == (hs * p_pow[i]) % m:
                if text.startswith(pattern, i):
                    occurrences.append(i)
        return occurrences
