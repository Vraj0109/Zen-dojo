# verify: skip-stress
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        n, m = len(haystack), len(needle)
        fail = [0] * m
        k = 0
        for i in range(1, m):
            while k > 0 and needle[i] != needle[k]:
                k = fail[k - 1]
            if needle[i] == needle[k]:
                k += 1
            fail[i] = k
        j = 0
        for i in range(n):
            while j > 0 and haystack[i] != needle[j]:
                j = fail[j - 1]
            if haystack[i] == needle[j]:
                j += 1
            if j == m:
                return i - m + 1
        return -1