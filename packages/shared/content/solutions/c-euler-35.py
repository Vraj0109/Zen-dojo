class Solution:
    def circularPrimes(self, limit: int) -> int:
        bound = 10
        while bound < limit:
            bound *= 10
        comp = bytearray(bound + 1)
        comp[0] = comp[1] = 1
        i = 2
        while i * i <= bound:
            if not comp[i]:
                comp[i * i : bound + 1 : i] = b"\x01" * len(range(i * i, bound + 1, i))
            i += 1
        count = 0
        for p in range(2, limit):
            if comp[p]:
                continue
            s = str(p)
            digits = len(s)
            ok = True
            pw = 10 ** (digits - 1)
            x = p
            for _ in range(digits):
                x = (x % pw) * 10 + x // pw
                if comp[x]:
                    ok = False
                    break
            if ok:
                count += 1
        return count
