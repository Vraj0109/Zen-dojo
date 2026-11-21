class Solution:
    def minWindow(self, s: str, t: str) -> str:
        target = [0] * 128
        for c in t:
            target[ord(c)] += 1

        n = len(s)
        best = ""
        for i in range(n):
            cur = [0] * 128
            for j in range(i, n):
                cur[ord(s[j])] += 1
                ok = True
                for c in range(128):
                    if cur[c] < target[c]:
                        ok = False
                        break
                if ok:
                    sub = s[i : j + 1]
                    if not best or len(sub) < len(best):
                        best = sub
                    break
        return best
