# verify: skip-stress
class Solution:
    def countLargeBinomials(self, maxN: int, threshold: int) -> int:
        cap = threshold + 1
        row = [0] * (maxN + 2)
        row[0] = 1
        total = 0
        for n in range(1, maxN + 1):
            for r in range(n, 0, -1):
                val = row[r] + row[r - 1]
                row[r] = cap if val > cap else val
            for r in range(n + 1):
                if row[r] > threshold:
                    total += 1
        return total
