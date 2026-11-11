class Solution:
    def lychrelCount(self, limit: int, iterations: int) -> int:
        count = 0
        for n in range(1, limit):
            v = n
            found = False
            for _ in range(iterations):
                v = v + int(str(v)[::-1])
                s = str(v)
                if s == s[::-1]:
                    found = True
                    break
            if not found:
                count += 1
        return count
