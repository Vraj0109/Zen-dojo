class Solution:
    def distinctPowers(self, n: int) -> int:
        seen = set()
        for a in range(2, n + 1):
            r = a
            k = 1
            base = 2
            while base * base <= a:
                x = base
                e = 1
                while x < a:
                    x *= base
                    e += 1
                if x == a:
                    r = base
                    k = e
                    break
                base += 1
            for b in range(2, n + 1):
                seen.add((r, k * b))
        return len(seen)
