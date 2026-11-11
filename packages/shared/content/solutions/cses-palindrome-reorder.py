class Solution:
    def palindromeReorder(self, s: str) -> str:
        cnt = [0] * 26
        for c in s:
            cnt[ord(c) - ord('A')] += 1
        odd = -1
        odd_count = 0
        for i in range(26):
            if cnt[i] % 2 != 0:
                odd = i
                odd_count += 1
        if odd_count > 1:
            return "NO SOLUTION"
        half = []
        for i in range(26):
            half.append(chr(ord('A') + i) * (cnt[i] // 2))
        half_str = ''.join(half)
        mid = chr(ord('A') + odd) if odd >= 0 else ""
        return half_str + mid + half_str[::-1]
