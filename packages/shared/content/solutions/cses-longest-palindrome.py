# verify: skip-stress
class Solution:
    def longestPalindrome(self, s: str) -> str:
        if not s:
            return ""
        t = "^#" + "#".join(s) + "#$"
        m = len(t)
        p = [0] * m
        c = 0
        r = 0
        max_len = 0
        center_index = 0

        for i in range(1, m - 1):
            i_mirror = 2 * c - i
            if r > i:
                p[i] = min(r - i, p[i_mirror])
            while t[i + 1 + p[i]] == t[i - 1 - p[i]]:
                p[i] += 1
            if i + p[i] > r:
                c = i
                r = i + p[i]
            if p[i] > max_len:
                max_len = p[i]
                center_index = i

        start = (center_index - max_len) // 2
        return s[start : start + max_len]
