class Solution:
    def isDaydream(self, s: str) -> bool:
        words = ["dream", "dreamer", "erase", "eraser"]
        n = len(s)
        ok = [False] * (n + 1)
        ok[0] = True
        for i in range(1, n + 1):
            for w in words:
                length = len(w)
                if i >= length and ok[i - length] and s[i - length:i] == w:
                    ok[i] = True
        return ok[n]
