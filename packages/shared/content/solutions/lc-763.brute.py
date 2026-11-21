class Solution:
    def partitionLabels(self, s: str) -> list[int]:
        def can_split(i: int, j: int) -> bool:
            sub_chars = set(s[i:j + 1])
            outside = s[:i] + s[j + 1:]
            for c in sub_chars:
                if c in outside:
                    return False
            return True

        res = []
        n = len(s)
        start = 0
        while start < n:
            for end in range(start, n):
                if can_split(start, end):
                    res.append(end - start + 1)
                    start = end + 1
                    break
        return res
