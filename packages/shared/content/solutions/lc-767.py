# verify: skip-stress
class Solution:
    def reorganizeString(self, s: str) -> str:
        cnt = [0] * 26
        for c in s:
            cnt[ord(c) - ord('a')] += 1
        n = len(s)
        def feasible(c_list, rem, last):
            if rem == 0:
                return True
            mx = max(c_list)
            if mx > (rem + 1) // 2:
                return False
            if last >= 0 and c_list[last] > rem // 2:
                return False
            return True
        if not feasible(cnt, n, -1):
            return ""
        out = []
        last = -1
        for pos in range(n):
            placed = False
            for c in range(26):
                if cnt[c] == 0 or c == last:
                    continue
                cnt[c] -= 1
                if feasible(cnt, n - pos - 1, c):
                    out.append(chr(ord('a') + c))
                    last = c
                    placed = True
                    break
                cnt[c] += 1
            if not placed:
                return ""
        return "".join(out)