class Solution:
    def stringReorder(self, s: str) -> str:
        cnt = [0] * 26
        for c in s:
            cnt[ord(c) - ord('A')] += 1
        n = len(s)

        def ok(rem: int, last: int) -> bool:
            mx = max(cnt)
            if mx > (rem + 1) // 2:
                return False
            if mx == (rem + 1) // 2 and rem % 2 == 1:
                for i in range(26):
                    if cnt[i] == mx and i == last:
                        return False
            return True

        if not ok(n, -1):
            return "-1"

        out = []
        last = -1
        for pos in range(n):
            for c in range(26):
                if cnt[c] == 0 or c == last:
                    continue
                cnt[c] -= 1
                if ok(n - pos - 1, c):
                    out.append(chr(ord('A') + c))
                    last = c
                    break
                cnt[c] += 1
        return "".join(out)
