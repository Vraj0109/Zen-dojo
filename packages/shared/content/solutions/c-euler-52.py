class Solution:
    def permutedMultiples(self, k: int) -> int:
        def sig(v: int) -> str:
            return "".join(sorted(str(v)))

        x = 1
        while True:
            base = sig(x)
            if all(sig(x * m) == base for m in range(2, k + 1)):
                return x
            x += 1
