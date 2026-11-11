# verify: skip-stress
class Solution:
    def repeatedStringMatch(self, a: str, b: str) -> int:
        k = (len(b) + len(a) - 1) // len(a)
        s = a * k
        if b in s:
            return k
        s += a
        if b in s:
            return k + 1
        return -1