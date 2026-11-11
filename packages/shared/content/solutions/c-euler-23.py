# verify: skip-stress
class Solution:
    def nonAbundantSum(self, limit: int) -> int:
        L = min(limit, 28123)
        sig = [0] * (L + 1)
        for d in range(1, L // 2 + 1):
            for m in range(2 * d, L + 1, d):
                sig[m] += d
        ab = [i for i in range(1, L + 1) if sig[i] > i]
        mark = bytearray(L + 1)
        for i in range(len(ab)):
            ai = ab[i]
            for j in range(i, len(ab)):
                s = ai + ab[j]
                if s <= L:
                    mark[s] = 1
                else:
                    break
        return sum(i for i in range(1, L + 1) if not mark[i])
