class Solution:
    def minWindow(self, s: str, t: str) -> str:
        need = [0] * 128
        for c in t:
            need[ord(c)] += 1
        missing = len(t)
        left = 0
        best_start = 0
        best_len = float('inf')
        for right, c in enumerate(s):
            if need[ord(c)] > 0:
                missing -= 1
            need[ord(c)] -= 1
            while missing == 0:
                if right - left + 1 < best_len:
                    best_len = right - left + 1
                    best_start = left
                need[ord(s[left])] += 1
                if need[ord(s[left])] > 0:
                    missing += 1
                left += 1
        return "" if best_len == float('inf') else s[best_start:best_start + best_len]