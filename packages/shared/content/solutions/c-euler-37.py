# verify: skip-stress
class Solution:
    def truncatablePrimeSum(self, limit: int) -> int:
        comp = bytearray(limit + 2)
        comp[0] = comp[1] = 1
        i = 2
        while i * i <= limit:
            if not comp[i]:
                comp[i * i : limit + 1 : i] = b"\x01" * len(range(i * i, limit + 1, i))
            i += 1

        total = 0
        for p in range(11, limit):
            if comp[p]:
                continue
            ok = True
            v = p // 10
            while v > 0:
                if comp[v]:
                    ok = False
                    break
                v //= 10
            if not ok:
                continue
            m = 10
            while m <= p:
                v = p % m
                if v < m // 10 or comp[v]:
                    ok = False
                    break
                m *= 10
            if ok:
                total += p
        return total
